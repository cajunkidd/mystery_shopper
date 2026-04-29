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
