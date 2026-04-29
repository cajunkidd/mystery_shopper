// Scheduled jobs.
// Runs an interval inside the API process. For multi-instance deployments,
// move to a real scheduler (BullMQ, pg-cron, etc.).

import fs from "node:fs";
import { prisma } from "./db.js";
import { uploadPath } from "./uploads.js";
import { notify } from "./notifications.js";

interface JobResult {
  overdueMarked: number;
  remindersSent: number;
  attachmentsDeleted: number;
  digestsSent: number;
}

const DIGEST_INTERVAL_MS = 7 * 86400 * 1000;

async function sendManagerDigests(now: Date): Promise<number> {
  const managers = await prisma.user.findMany({
    where: { role: "store_manager", active: true, primaryLocationId: { not: null } },
    select: { id: true, primaryLocationId: true },
  });
  let sent = 0;
  for (const m of managers) {
    const lastDigest = await prisma.notification.findFirst({
      where: { userId: m.id, kind: "manager_digest" },
      orderBy: { createdAt: "desc" },
    });
    if (lastDigest && now.getTime() - lastDigest.createdAt.getTime() < DIGEST_INTERVAL_MS) continue;

    const since = new Date(now.getTime() - DIGEST_INTERVAL_MS);
    const [recent, queueCount, openAppeals, openPlans] = await Promise.all([
      prisma.shop.findMany({
        where: {
          locationId: m.primaryLocationId!,
          status: { not: "draft" },
          shopDate: { gte: since },
        },
        select: { percentage: true },
      }),
      prisma.shop.count({
        where: { locationId: m.primaryLocationId!, status: { in: ["submitted", "under_review"] } },
      }),
      prisma.appeal.count({
        where: { shop: { locationId: m.primaryLocationId! }, status: { in: ["open", "under_review"] } },
      }),
      prisma.actionPlan.count({
        where: {
          shop: { locationId: m.primaryLocationId! },
          status: { in: ["open", "acknowledged", "in_progress", "overdue"] },
        },
      }),
    ]);
    const avg = recent.length ? recent.reduce((a, s) => a + s.percentage, 0) / recent.length : 0;
    const body =
      `Past 7 days: ${recent.length} shops, avg ${avg.toFixed(0)}%. ` +
      `Queue: ${queueCount}. Open appeals: ${openAppeals}. Open action plans: ${openPlans}.`;
    await prisma.notification.create({
      data: {
        userId: m.id,
        kind: "manager_digest",
        title: "Weekly digest",
        body,
        link: "/",
      },
    });
    sent += 1;
  }
  return sent;
}

export async function runJobs(): Promise<JobResult> {
  const now = new Date();

  // 1. Mark action plans as overdue when their due date has passed.
  const stale = await prisma.actionPlan.findMany({
    where: {
      dueDate: { lt: now },
      status: { in: ["open", "acknowledged", "in_progress"] },
    },
    select: { id: true, assignedToId: true, assignedById: true, description: true },
  });
  for (const ap of stale) {
    await prisma.actionPlan.update({
      where: { id: ap.id },
      data: { status: "overdue" },
    });
    await notify(prisma, ap.assignedToId, "action_plan_overdue", "An action plan is overdue", ap.description, "/action-plans");
    await notify(prisma, ap.assignedById, "action_plan_overdue", "An action plan you assigned is overdue", ap.description, "/action-plans");
  }

  // 2. "Due in 3 days" reminder — sent once per plan when the window opens.
  const threeDays = new Date(now.getTime() + 3 * 86400 * 1000);
  const dueSoon = await prisma.actionPlan.findMany({
    where: {
      dueDate: { gte: now, lte: threeDays },
      status: { in: ["open", "acknowledged", "in_progress"] },
    },
    select: { id: true, assignedToId: true, dueDate: true, description: true },
  });
  let remindersSent = 0;
  for (const ap of dueSoon) {
    const already = await prisma.notification.findFirst({
      where: { userId: ap.assignedToId, kind: "action_plan_due_soon", body: { contains: ap.id } },
    });
    if (already) continue;
    await notify(
      prisma,
      ap.assignedToId,
      "action_plan_due_soon",
      `Action plan due in ≤3 days`,
      `${ap.description} (id ${ap.id})`,
      "/action-plans",
    );
    remindersSent += 1;
  }

  // 3. Audio retention — delete attachments past their retention_until.
  const expired = await prisma.attachment.findMany({
    where: { retentionUntil: { lt: now } },
  });
  let attachmentsDeleted = 0;
  for (const att of expired) {
    try {
      const p = uploadPath(att.filePath);
      if (fs.existsSync(p)) fs.unlinkSync(p);
    } catch (e) {
      console.error(`failed to delete file for attachment ${att.id}:`, e);
    }
    // If it's the shop audio, clear the shop's pointer first.
    await prisma.shop.updateMany({
      where: { audioFileId: att.id },
      data: { audioFileId: null },
    });
    await prisma.attachment.delete({ where: { id: att.id } });
    attachmentsDeleted += 1;
  }

  // 4. Manager weekly digest.
  const digestsSent = await sendManagerDigests(now);

  return { overdueMarked: stale.length, remindersSent, attachmentsDeleted, digestsSent };
}

let started = false;
export function startScheduler(): void {
  if (started || process.env.NODE_ENV === "test" || process.env.SCHEDULER_DISABLED === "1") return;
  started = true;
  // Run once on startup, then every hour.
  void runJobs().catch((e) => console.error("job run failed:", e));
  setInterval(() => {
    void runJobs().catch((e) => console.error("job run failed:", e));
  }, 60 * 60 * 1000);
}
