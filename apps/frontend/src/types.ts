export type Role = "employee" | "store_manager" | "district_manager" | "admin";

export interface User {
  id: string;
  email: string;
  fullName: string;
  role: Role;
  primaryLocationId: string | null;
  districtIds: string[];
  hireDate: string;
  active: boolean;
}

export interface Location {
  id: string;
  code: string;
  name: string;
  city: string;
  state: string;
  district: string;
  active: boolean;
}

export type RubricType = "visit" | "call" | "web_inquiry" | "social_inquiry";

export type QuestionType =
  | "yes_no"
  | "scale_1_5"
  | "multi_choice"
  | "free_text";

export interface RubricQuestion {
  id: string;
  text: string;
  type: QuestionType;
  maxScore: number;
  options?: string[];
  required: boolean;
}

export interface RubricSection {
  id: string;
  name: string;
  weight: number;
  questions: RubricQuestion[];
}

export interface Rubric {
  id: string;
  name: string;
  type: RubricType;
  version: number;
  status: "draft" | "active" | "retired";
  sections: RubricSection[];
}

export interface ShopAnswer {
  questionId: string;
  value: string | number | boolean;
  scoreAwarded: number;
  comment?: string;
}

export type ShopStatus =
  | "draft"
  | "submitted"
  | "under_review"
  | "action_assigned"
  | "closed"
  | "appealed";

export interface Shop {
  id: string;
  rubricId: string;
  type: RubricType;
  locationId: string;
  shopDate: string;
  evaluatedEmployeeId: string | null;
  shopperName: string;
  status: ShopStatus;
  totalScore: number;
  totalMax: number;
  percentage: number;
  narrative: string;
  answers: ShopAnswer[];
  audioDurationSeconds?: number | null;
  createdAt: string;
}

export interface Review {
  id: string;
  shopId: string;
  reviewerId: string;
  status: "pending" | "in_progress" | "completed";
  managerSummary: string;
  scoreAdjustment: number | null;
  scoreJustification: string;
  bonusPoints: number | null;
  bonusJustification: string;
  reviewedAt: string | null;
}

export type ActionPlanStatus =
  | "open"
  | "acknowledged"
  | "in_progress"
  | "completed"
  | "verified"
  | "overdue";

export interface ActionPlan {
  id: string;
  shopId: string;
  assignedTo: string;
  assignedBy: string;
  category: string;
  description: string;
  dueDate: string;
  status: ActionPlanStatus;
  acknowledgedAt: string | null;
  completedAt: string | null;
  verifiedAt: string | null;
  verificationNotes: string;
}

export type AppealStatus =
  | "open"
  | "under_review"
  | "approved"
  | "partially_approved"
  | "denied";

export interface Appeal {
  id: string;
  shopId: string;
  filedBy: string;
  filedAt: string;
  reason: string;
  requestedChange: string;
  status: AppealStatus;
  resolverId: string | null;
  resolutionNotes: string;
  resolvedAt: string | null;
  scoreAdjustmentApplied: number | null;
}

export interface Comment {
  id: string;
  shopId: string;
  authorId: string;
  body: string;
  audioTimestampSeconds: number | null;
  createdAt: string;
}

export type PointsSource =
  | "shop_score"
  | "type_multiplier"
  | "streak_bonus"
  | "improvement_bonus"
  | "manager_bonus"
  | "badge_earned"
  | "hunt_reveal";

export interface PointsEntry {
  id: string;
  userId: string;
  source: PointsSource;
  sourceRefId: string;
  points: number;
  reason: string;
  awardedBy: string | null;
  awardedAt: string;
}

export type BadgeCategory = "absolute" | "improvement" | "tenure" | "special";

export interface BadgeDef {
  code: string;
  name: string;
  description: string;
  category: BadgeCategory;
  icon: string;
}

export interface UserBadge {
  userId: string;
  badgeCode: string;
  earnedAt: string;
  earningShopId: string | null;
}

export interface League {
  id: string;
  name: string;
  periodStart: string;
  periodEnd: string;
  storeIds: string[];
}

export interface Challenge {
  id: string;
  name: string;
  description: string;
  startsAt: string;
  endsAt: string;
  metric: "avg_score" | "score_above_threshold_count" | "category_avg";
  category: string | null;
  threshold: number | null;
  participatingLocationIds: string[];
}

export interface HuntCampaign {
  id: string;
  name: string;
  description: string;
  startsAt: string;
  endsAt: string;
  scenarios: { codeword: string; trigger: string }[];
  active: boolean;
}

export interface HuntReveal {
  id: string;
  huntCampaignId: string;
  shopId: string;
  recognizedEmployeeId: string;
  identifiedByEmployees: string[];
  revealedAt: string;
}

export interface SystemConfig {
  gamificationEnabled: boolean;
  enabledLocationIds: string[];
  audioRetentionDays: number;
  appealEscalationDays: number;
}

export interface TrainingModule {
  id: string;
  category: string;
  title: string;
  description: string;
  durationMinutes: number;
}

export interface BisTrackDaily {
  locationId: string;
  date: string;
  sales: number;
  transactions: number;
  aov: number;
  footTraffic: number;
}

export type AuditAction =
  | "create"
  | "update"
  | "score_change"
  | "status_change"
  | "login"
  | "export";

export interface AuditEntry {
  id: string;
  actorId: string;
  entityType: string;
  entityId: string;
  action: AuditAction;
  description: string;
  occurredAt: string;
}
