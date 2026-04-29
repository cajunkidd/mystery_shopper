import type { PrismaClient } from "@prisma/client";

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
}
