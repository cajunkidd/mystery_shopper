// Permission matrix from spec §9. Pure function so the API and any future
// admin UI can both consume the same source of truth.

import type { Role } from "@prisma/client";

export interface Capabilities {
  viewOwnShops: boolean;
  viewTeamShops: boolean;
  enterShop: boolean;
  reviewShop: boolean;
  adjustScore: boolean;
  awardBonusPoints: boolean;
  fileAppeal: boolean;
  resolveAppeal: boolean;
  createActionPlan: boolean;
  editRubric: boolean;
  manageUsers: boolean;
  manageGamificationConfig: boolean;
  viewAuditLog: boolean;
  exportCompanyReports: boolean;
}

const MATRIX: Record<Role, Capabilities> = {
  employee: {
    viewOwnShops: true,
    viewTeamShops: false,
    enterShop: false,
    reviewShop: false,
    adjustScore: false,
    awardBonusPoints: false,
    fileAppeal: true,
    resolveAppeal: false,
    createActionPlan: false,
    editRubric: false,
    manageUsers: false,
    manageGamificationConfig: false,
    viewAuditLog: false,
    exportCompanyReports: false,
  },
  store_manager: {
    viewOwnShops: true,
    viewTeamShops: true,
    enterShop: true,
    reviewShop: true,
    adjustScore: true,
    awardBonusPoints: true,
    fileAppeal: false,
    resolveAppeal: true,
    createActionPlan: true,
    editRubric: false,
    manageUsers: false,
    manageGamificationConfig: false,
    viewAuditLog: false,
    exportCompanyReports: false,
  },
  district_manager: {
    viewOwnShops: true,
    viewTeamShops: true,
    enterShop: true,
    reviewShop: true,
    adjustScore: true,
    awardBonusPoints: true,
    fileAppeal: false,
    resolveAppeal: true,
    createActionPlan: true,
    editRubric: false,
    manageUsers: false,
    manageGamificationConfig: false,
    viewAuditLog: false,
    exportCompanyReports: true,
  },
  admin: {
    viewOwnShops: true,
    viewTeamShops: true,
    enterShop: true,
    reviewShop: true,
    adjustScore: true,
    awardBonusPoints: true,
    fileAppeal: false,
    resolveAppeal: true,
    createActionPlan: true,
    editRubric: true,
    manageUsers: true,
    manageGamificationConfig: true,
    viewAuditLog: true,
    exportCompanyReports: true,
  },
};

export function capabilitiesFor(role: Role): Capabilities {
  return MATRIX[role];
}
