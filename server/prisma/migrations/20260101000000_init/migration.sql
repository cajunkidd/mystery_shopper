-- Initial schema migration. Hand-written baseline for first deployment.
--
-- Before relying on this in CI/prod, run against a fresh database and diff:
--   npx prisma migrate diff \
--     --from-empty --to-schema-datamodel prisma/schema.prisma --script > expected.sql
--   diff expected.sql migration.sql
-- and reconcile any drift. Prisma's generator may use slightly different
-- index / FK names than the ones below.

CREATE TYPE "Role" AS ENUM ('employee', 'store_manager', 'district_manager', 'admin');
CREATE TYPE "RubricType" AS ENUM ('visit', 'call', 'web_inquiry', 'social_inquiry');
CREATE TYPE "RubricStatus" AS ENUM ('draft', 'active', 'retired');
CREATE TYPE "QuestionType" AS ENUM ('yes_no', 'scale_1_5', 'multi_choice', 'free_text', 'photo_required', 'audio_required');
CREATE TYPE "ShopStatus" AS ENUM ('draft', 'submitted', 'under_review', 'action_assigned', 'closed', 'appealed');
CREATE TYPE "ShopSource" AS ENUM ('manual_entry', 'agency_import', 'internal_shop');
CREATE TYPE "ReviewStatus" AS ENUM ('pending', 'in_progress', 'completed');
CREATE TYPE "ActionPlanStatus" AS ENUM ('open', 'acknowledged', 'in_progress', 'completed', 'verified', 'overdue');
CREATE TYPE "AppealStatus" AS ENUM ('open', 'under_review', 'approved', 'partially_approved', 'denied');

CREATE TABLE "Location" (
  "id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "address" TEXT,
  "city" TEXT,
  "state" TEXT,
  "zip" TEXT,
  "district" TEXT,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Location_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Location_code_key" ON "Location"("code");

CREATE TABLE "User" (
  "id" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "passwordHash" TEXT NOT NULL,
  "fullName" TEXT NOT NULL,
  "role" "Role" NOT NULL,
  "primaryLocationId" TEXT,
  "districtIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "hireDate" TIMESTAMP(3),
  "active" BOOLEAN NOT NULL DEFAULT true,
  "notifyByEmail" BOOLEAN NOT NULL DEFAULT true,
  "notifyBySms" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
ALTER TABLE "User" ADD CONSTRAINT "User_primaryLocationId_fkey" FOREIGN KEY ("primaryLocationId") REFERENCES "Location"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "Rubric" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "type" "RubricType" NOT NULL,
  "version" INTEGER NOT NULL DEFAULT 1,
  "status" "RubricStatus" NOT NULL DEFAULT 'draft',
  "totalMaxScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "createdById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "retiredAt" TIMESTAMP(3),
  CONSTRAINT "Rubric_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "RubricSection" (
  "id" TEXT NOT NULL,
  "rubricId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "displayOrder" INTEGER NOT NULL,
  "weight" DOUBLE PRECISION NOT NULL DEFAULT 1,
  "maxScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
  CONSTRAINT "RubricSection_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "RubricSection" ADD CONSTRAINT "RubricSection_rubricId_fkey" FOREIGN KEY ("rubricId") REFERENCES "Rubric"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "RubricQuestion" (
  "id" TEXT NOT NULL,
  "sectionId" TEXT NOT NULL,
  "text" TEXT NOT NULL,
  "questionType" "QuestionType" NOT NULL,
  "weight" DOUBLE PRECISION NOT NULL DEFAULT 1,
  "maxScore" DOUBLE PRECISION NOT NULL DEFAULT 1,
  "options" JSONB,
  "conditionalLogic" JSONB,
  "required" BOOLEAN NOT NULL DEFAULT true,
  "displayOrder" INTEGER NOT NULL,
  CONSTRAINT "RubricQuestion_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "RubricQuestion" ADD CONSTRAINT "RubricQuestion_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "RubricSection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "Shop" (
  "id" TEXT NOT NULL,
  "rubricId" TEXT NOT NULL,
  "rubricVersion" INTEGER NOT NULL,
  "type" "RubricType" NOT NULL,
  "locationId" TEXT NOT NULL,
  "shopDate" TIMESTAMP(3) NOT NULL,
  "shopTime" TEXT,
  "evaluatedEmployeeId" TEXT,
  "shopperName" TEXT,
  "shopperExternalRef" TEXT,
  "status" "ShopStatus" NOT NULL DEFAULT 'draft',
  "totalScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "totalMax" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "percentage" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "narrative" TEXT,
  "source" "ShopSource" NOT NULL DEFAULT 'manual_entry',
  "audioFileId" TEXT,
  "createdById" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "submittedAt" TIMESTAMP(3),
  "closedAt" TIMESTAMP(3),
  CONSTRAINT "Shop_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Shop_audioFileId_key" ON "Shop"("audioFileId");
CREATE INDEX "Shop_locationId_status_idx" ON "Shop"("locationId", "status");
CREATE INDEX "Shop_evaluatedEmployeeId_shopDate_idx" ON "Shop"("evaluatedEmployeeId", "shopDate");
CREATE INDEX "Shop_shopDate_idx" ON "Shop"("shopDate");
ALTER TABLE "Shop" ADD CONSTRAINT "Shop_rubricId_fkey" FOREIGN KEY ("rubricId") REFERENCES "Rubric"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Shop" ADD CONSTRAINT "Shop_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Shop" ADD CONSTRAINT "Shop_evaluatedEmployeeId_fkey" FOREIGN KEY ("evaluatedEmployeeId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Shop" ADD CONSTRAINT "Shop_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "ShopAnswer" (
  "id" TEXT NOT NULL,
  "shopId" TEXT NOT NULL,
  "questionId" TEXT NOT NULL,
  "answerValue" JSONB NOT NULL,
  "scoreAwarded" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "comment" TEXT,
  CONSTRAINT "ShopAnswer_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "ShopAnswer" ADD CONSTRAINT "ShopAnswer_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ShopAnswer" ADD CONSTRAINT "ShopAnswer_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "RubricQuestion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "Attachment" (
  "id" TEXT NOT NULL,
  "shopId" TEXT,
  "shopAnswerId" TEXT,
  "filePath" TEXT NOT NULL,
  "originalName" TEXT NOT NULL,
  "mimeType" TEXT NOT NULL,
  "fileSizeBytes" INTEGER NOT NULL,
  "durationSeconds" INTEGER,
  "uploadedById" TEXT NOT NULL,
  "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "retentionUntil" TIMESTAMP(3),
  CONSTRAINT "Attachment_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "Attachment" ADD CONSTRAINT "Attachment_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Attachment" ADD CONSTRAINT "Attachment_shopAnswerId_fkey" FOREIGN KEY ("shopAnswerId") REFERENCES "ShopAnswer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
-- Shop.audioFileId circular FK; declared after Attachment exists.
ALTER TABLE "Shop" ADD CONSTRAINT "Shop_audioFileId_fkey" FOREIGN KEY ("audioFileId") REFERENCES "Attachment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "Review" (
  "id" TEXT NOT NULL,
  "shopId" TEXT NOT NULL,
  "reviewerId" TEXT NOT NULL,
  "status" "ReviewStatus" NOT NULL DEFAULT 'pending',
  "managerSummary" TEXT,
  "managerScoreAdjustment" DOUBLE PRECISION,
  "managerScoreJustification" TEXT,
  "bonusPointsAwarded" INTEGER,
  "bonusJustification" TEXT,
  "reviewedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Review_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Review_shopId_key" ON "Review"("shopId");
ALTER TABLE "Review" ADD CONSTRAINT "Review_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Review" ADD CONSTRAINT "Review_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "ActionPlan" (
  "id" TEXT NOT NULL,
  "shopId" TEXT NOT NULL,
  "reviewId" TEXT,
  "assignedToId" TEXT NOT NULL,
  "assignedById" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "dueDate" TIMESTAMP(3) NOT NULL,
  "status" "ActionPlanStatus" NOT NULL DEFAULT 'open',
  "acknowledgedAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "verifiedAt" TIMESTAMP(3),
  "verificationNotes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ActionPlan_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "ActionPlan_assignedToId_status_idx" ON "ActionPlan"("assignedToId", "status");
CREATE INDEX "ActionPlan_status_dueDate_idx" ON "ActionPlan"("status", "dueDate");
ALTER TABLE "ActionPlan" ADD CONSTRAINT "ActionPlan_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ActionPlan" ADD CONSTRAINT "ActionPlan_reviewId_fkey" FOREIGN KEY ("reviewId") REFERENCES "Review"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ActionPlan" ADD CONSTRAINT "ActionPlan_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ActionPlan" ADD CONSTRAINT "ActionPlan_assignedById_fkey" FOREIGN KEY ("assignedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "Appeal" (
  "id" TEXT NOT NULL,
  "shopId" TEXT NOT NULL,
  "filedById" TEXT NOT NULL,
  "filedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "reason" TEXT NOT NULL,
  "requestedChange" TEXT,
  "status" "AppealStatus" NOT NULL DEFAULT 'open',
  "resolverId" TEXT,
  "resolutionNotes" TEXT,
  "resolvedAt" TIMESTAMP(3),
  "scoreAdjustmentApplied" DOUBLE PRECISION,
  CONSTRAINT "Appeal_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "Appeal" ADD CONSTRAINT "Appeal_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Appeal" ADD CONSTRAINT "Appeal_filedById_fkey" FOREIGN KEY ("filedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Appeal" ADD CONSTRAINT "Appeal_resolverId_fkey" FOREIGN KEY ("resolverId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "Comment" (
  "id" TEXT NOT NULL,
  "shopId" TEXT,
  "actionPlanId" TEXT,
  "appealId" TEXT,
  "audioTimestampSeconds" INTEGER,
  "authorId" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Comment_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_actionPlanId_fkey" FOREIGN KEY ("actionPlanId") REFERENCES "ActionPlan"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_appealId_fkey" FOREIGN KEY ("appealId") REFERENCES "Appeal"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "PointsLedger" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "sourceType" TEXT NOT NULL,
  "sourceRefId" TEXT,
  "points" INTEGER NOT NULL,
  "reason" TEXT,
  "awardedById" TEXT,
  "awardedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PointsLedger_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "PointsLedger" ADD CONSTRAINT "PointsLedger_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "Badge" (
  "id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "iconPath" TEXT,
  "category" TEXT NOT NULL,
  "earnCriteria" JSONB,
  "active" BOOLEAN NOT NULL DEFAULT true,
  CONSTRAINT "Badge_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Badge_code_key" ON "Badge"("code");

CREATE TABLE "UserBadge" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "badgeId" TEXT NOT NULL,
  "earnedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "earningShopId" TEXT,
  CONSTRAINT "UserBadge_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "UserBadge_userId_badgeId_key" ON "UserBadge"("userId", "badgeId");
ALTER TABLE "UserBadge" ADD CONSTRAINT "UserBadge_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "UserBadge" ADD CONSTRAINT "UserBadge_badgeId_fkey" FOREIGN KEY ("badgeId") REFERENCES "Badge"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "League" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "tier" INTEGER NOT NULL DEFAULT 1,
  "periodStart" TIMESTAMP(3) NOT NULL,
  "periodEnd" TIMESTAMP(3) NOT NULL,
  "storeIds" TEXT[],
  "rolledOverAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "League_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Challenge" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "startsAt" TIMESTAMP(3) NOT NULL,
  "endsAt" TIMESTAMP(3) NOT NULL,
  "metric" TEXT NOT NULL,
  "category" TEXT,
  "threshold" DOUBLE PRECISION,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Challenge_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ChallengeParticipation" (
  "id" TEXT NOT NULL,
  "challengeId" TEXT NOT NULL,
  "locationId" TEXT NOT NULL,
  "currentValue" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "targetValue" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "completed" BOOLEAN NOT NULL DEFAULT false,
  CONSTRAINT "ChallengeParticipation_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ChallengeParticipation_challengeId_locationId_key" ON "ChallengeParticipation"("challengeId", "locationId");
ALTER TABLE "ChallengeParticipation" ADD CONSTRAINT "ChallengeParticipation_challengeId_fkey" FOREIGN KEY ("challengeId") REFERENCES "Challenge"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "HuntCampaign" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "startsAt" TIMESTAMP(3) NOT NULL,
  "endsAt" TIMESTAMP(3) NOT NULL,
  "scenarios" JSONB,
  "active" BOOLEAN NOT NULL DEFAULT true,
  CONSTRAINT "HuntCampaign_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TrainingModule" (
  "id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "url" TEXT,
  "durationMinutes" INTEGER,
  "rubricSectionMatch" TEXT,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TrainingModule_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "TrainingModule_code_key" ON "TrainingModule"("code");

CREATE TABLE "TrainingAssignment" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "trainingModuleId" TEXT NOT NULL,
  "shopId" TEXT,
  "status" TEXT NOT NULL DEFAULT 'assigned',
  "triggerSection" TEXT,
  "triggerScorePct" DOUBLE PRECISION,
  "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completedAt" TIMESTAMP(3),
  "verifiedAt" TIMESTAMP(3),
  "retestShopId" TEXT,
  CONSTRAINT "TrainingAssignment_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "TrainingAssignment_userId_status_idx" ON "TrainingAssignment"("userId", "status");
ALTER TABLE "TrainingAssignment" ADD CONSTRAINT "TrainingAssignment_trainingModuleId_fkey" FOREIGN KEY ("trainingModuleId") REFERENCES "TrainingModule"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "CalibrationSession" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "notes" TEXT,
  "createdById" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CalibrationSession_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CalibrationEntry" (
  "id" TEXT NOT NULL,
  "sessionId" TEXT NOT NULL,
  "shopId" TEXT NOT NULL,
  "reviewerId" TEXT NOT NULL,
  "scorePercentage" DOUBLE PRECISION NOT NULL,
  "notes" TEXT,
  "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CalibrationEntry_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "CalibrationEntry_sessionId_shopId_reviewerId_key" ON "CalibrationEntry"("sessionId", "shopId", "reviewerId");
ALTER TABLE "CalibrationEntry" ADD CONSTRAINT "CalibrationEntry_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "CalibrationSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "HuntReveal" (
  "id" TEXT NOT NULL,
  "huntCampaignId" TEXT NOT NULL,
  "shopId" TEXT NOT NULL,
  "recognizedEmployeeId" TEXT NOT NULL,
  "identifiedByEmployees" TEXT[],
  "revealedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "HuntReveal_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "HuntReveal" ADD CONSTRAINT "HuntReveal_huntCampaignId_fkey" FOREIGN KEY ("huntCampaignId") REFERENCES "HuntCampaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "AuditLog" (
  "id" TEXT NOT NULL,
  "actorId" TEXT,
  "entityType" TEXT NOT NULL,
  "entityId" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "before" JSONB,
  "after" JSONB,
  "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "ipAddress" TEXT,
  "userAgent" TEXT,
  CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SystemConfig" (
  "key" TEXT NOT NULL,
  "value" JSONB NOT NULL,
  "updatedBy" TEXT,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SystemConfig_pkey" PRIMARY KEY ("key")
);

CREATE TABLE "Notification" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "kind" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "body" TEXT,
  "link" TEXT,
  "read" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "readAt" TIMESTAMP(3),
  CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "Notification_userId_read_createdAt_idx" ON "Notification"("userId", "read", "createdAt");
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "EmailOutbox" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "toEmail" TEXT NOT NULL,
  "subject" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "link" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "sentAt" TIMESTAMP(3),
  "failedAt" TIMESTAMP(3),
  "failedReason" TEXT,
  CONSTRAINT "EmailOutbox_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "EmailOutbox_sentAt_createdAt_idx" ON "EmailOutbox"("sentAt", "createdAt");
