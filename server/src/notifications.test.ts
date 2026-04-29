// notify() should always create the in-app row. EmailOutbox writes happen
// only when the kind is in the EMAILABLE_KINDS list AND the user has
// notifyByEmail=true.

import { describe, it, expect, vi, beforeEach } from "vitest";
import { notify } from "./notifications.js";

function mockPrisma(opts: { user: { email: string; notifyByEmail: boolean } | null }) {
  const notificationCreated: Record<string, unknown>[] = [];
  const outboxCreated: Record<string, unknown>[] = [];
  const prisma = {
    notification: {
      create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => {
        notificationCreated.push(data);
        return data;
      }),
    },
    user: {
      findUnique: vi.fn(async () => opts.user),
    },
    emailOutbox: {
      create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => {
        outboxCreated.push(data);
        return data;
      }),
    },
  } as unknown as Parameters<typeof notify>[0];
  return { prisma, notificationCreated, outboxCreated };
}

describe("notify", () => {
  beforeEach(() => undefined);

  it("always writes an in-app notification", async () => {
    const { prisma, notificationCreated } = mockPrisma({
      user: { email: "u@stine.test", notifyByEmail: false },
    });
    await notify(prisma, "u-1", "review_completed", "title", "body", "/x");
    expect(notificationCreated).toHaveLength(1);
    expect(notificationCreated[0]).toMatchObject({
      userId: "u-1",
      kind: "review_completed",
      title: "title",
      body: "body",
      link: "/x",
    });
  });

  it("queues an EmailOutbox row when the kind is emailable and user opted in", async () => {
    const { prisma, outboxCreated } = mockPrisma({
      user: { email: "u@stine.test", notifyByEmail: true },
    });
    await notify(prisma, "u-1", "review_completed", "Your shop was reviewed", "Score: 87%", "/shops/1");
    expect(outboxCreated).toHaveLength(1);
    expect(outboxCreated[0]).toMatchObject({
      userId: "u-1",
      toEmail: "u@stine.test",
      subject: "Your shop was reviewed",
      body: "Score: 87%",
      link: "/shops/1",
    });
  });

  it("skips EmailOutbox when the user has notifyByEmail=false", async () => {
    const { prisma, outboxCreated } = mockPrisma({
      user: { email: "u@stine.test", notifyByEmail: false },
    });
    await notify(prisma, "u-1", "review_completed", "x");
    expect(outboxCreated).toHaveLength(0);
  });

  it("skips EmailOutbox for routine kinds (badge_earned, manager_digest)", async () => {
    const { prisma, outboxCreated } = mockPrisma({
      user: { email: "u@stine.test", notifyByEmail: true },
    });
    await notify(prisma, "u-1", "badge_earned", "New badge");
    await notify(prisma, "u-1", "manager_digest", "Weekly digest");
    expect(outboxCreated).toHaveLength(0);
  });

  it("skips EmailOutbox when user is not found", async () => {
    const { prisma, outboxCreated, notificationCreated } = mockPrisma({ user: null });
    await notify(prisma, "u-deleted", "review_completed", "x");
    expect(notificationCreated).toHaveLength(1);
    expect(outboxCreated).toHaveLength(0);
  });
});
