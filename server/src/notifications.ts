import type { PrismaClient } from "@prisma/client";

// Notification kinds we treat as "important enough to email" when the user
// has opted in. Routine/low-stakes kinds (digest, badge_earned, hunt_guess)
// stay in-app only to avoid noise.
const EMAILABLE_KINDS = new Set([
  "review_completed",
  "shop_submitted",
  "action_plan_assigned",
  "action_plan_overdue",
  "appeal_filed",
  "appeal_resolved",
  "retest_improved",
  "training_assigned",
  "hunt_reveal",
]);

export async function notify(
  prisma: PrismaClient,
  userId: string,
  kind: string,
  title: string,
  body?: string,
  link?: string,
): Promise<void> {
  await prisma.notification.create({
    data: { userId, kind, title, body, link },
  });

  // Defer email creation if the user opted in and the kind is important.
  // The actual sender doesn't exist yet; rows queue up in EmailOutbox until
  // SMTP infra is wired (see prisma/schema.prisma → EmailOutbox).
  if (!EMAILABLE_KINDS.has(kind)) return;
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true, notifyByEmail: true },
  });
  if (!user || !user.notifyByEmail) return;
  await prisma.emailOutbox.create({
    data: {
      userId,
      toEmail: user.email,
      subject: title,
      body: body ?? "",
      link: link ?? null,
    },
  });
}
