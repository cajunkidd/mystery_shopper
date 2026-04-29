import type { PrismaClient } from "@prisma/client";
import type { Request } from "express";

export async function audit(
  prisma: PrismaClient,
  req: Request,
  entityType: string,
  entityId: string,
  action: string,
  before: unknown,
  after: unknown,
): Promise<void> {
  await prisma.auditLog.create({
    data: {
      actorId: req.user?.id,
      entityType,
      entityId,
      action,
      before: (before ?? undefined) as never,
      after: (after ?? undefined) as never,
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"]?.toString() ?? null,
    },
  });
}
