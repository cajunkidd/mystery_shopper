import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import {
  actionPlans as seedActionPlans,
  appeals as seedAppeals,
  comments as seedComments,
  locations as seedLocations,
  reviews as seedReviews,
  rubrics as seedRubrics,
  shops as seedShops,
  users as seedUsers,
} from "./mockData";
import {
  badgeCatalog,
  bisTrackData,
  challenges as seedChallenges,
  huntCampaigns as seedHuntCampaigns,
  huntReveals as seedHuntReveals,
  initialSystemConfig,
  initialUserBadges,
  leagues as seedLeagues,
  trainingModules as seedTrainingModules,
} from "./mockData2";
import type {
  ActionPlan,
  ActionPlanStatus,
  Appeal,
  AppealStatus,
  AuditEntry,
  BadgeDef,
  BisTrackDaily,
  Challenge,
  Comment,
  HuntCampaign,
  HuntReveal,
  League,
  Location,
  PointsEntry,
  Review,
  Rubric,
  Shop,
  ShopAnswer,
  ShopStatus,
  SystemConfig,
  TrainingModule,
  User,
  UserBadge,
} from "./types";
import { buildPointsLedger } from "./points";

interface StoreState {
  currentUserId: string;
  setCurrentUserId: (id: string) => void;
  currentUser: User;

  users: User[];
  locations: Location[];
  rubrics: Rubric[];

  shops: Shop[];
  reviews: Review[];
  actionPlans: ActionPlan[];
  appeals: Appeal[];
  comments: Comment[];

  pointsLedger: PointsEntry[];
  badgeCatalog: BadgeDef[];
  userBadges: UserBadge[];
  leagues: League[];
  challenges: Challenge[];
  huntCampaigns: HuntCampaign[];
  huntReveals: HuntReveal[];

  trainingModules: TrainingModule[];
  bisTrack: BisTrackDaily[];

  systemConfig: SystemConfig;
  setSystemConfig: (cfg: SystemConfig) => void;

  auditLog: AuditEntry[];

  getShop: (id: string) => Shop | undefined;
  getReview: (shopId: string) => Review | undefined;
  getRubric: (id: string) => Rubric | undefined;
  getUser: (id: string) => User | undefined;
  getLocation: (id: string) => Location | undefined;
  getActionPlansForShop: (shopId: string) => ActionPlan[];
  getAppealsForShop: (shopId: string) => Appeal[];
  getCommentsForShop: (shopId: string) => Comment[];

  addComment: (comment: Comment) => void;

  createShop: (shop: Shop) => void;
  updateShopStatus: (shopId: string, status: ShopStatus) => void;
  saveReview: (review: Review) => void;
  createActionPlan: (plan: ActionPlan) => void;
  updateActionPlanStatus: (id: string, status: ActionPlanStatus, note?: string) => void;
  fileAppeal: (appeal: Appeal) => void;
  resolveAppeal: (
    id: string,
    status: AppealStatus,
    notes: string,
    scoreAdjustment: number | null,
  ) => void;
  importShops: (shops: Shop[]) => void;
  appendAudit: (entry: Omit<AuditEntry, "id" | "occurredAt">) => void;

  saveRubric: (rubric: Rubric) => void;
  activateRubric: (rubricId: string) => void;
  retireRubric: (rubricId: string) => void;
}

const StoreContext = createContext<StoreState | null>(null);

const seedAuditLog: AuditEntry[] = [
  {
    id: "audit-1",
    actorId: "u-mgr-1",
    entityType: "Shop",
    entityId: "shop-001",
    action: "score_change",
    description: "No adjustment applied; manager confirmed shopper score.",
    occurredAt: "2026-04-27",
  },
  {
    id: "audit-2",
    actorId: "u-mgr-2",
    entityType: "Review",
    entityId: "rev-003",
    action: "score_change",
    description: "Applied +5 score adjustment with justification (call handoff).",
    occurredAt: "2026-04-26",
  },
  {
    id: "audit-3",
    actorId: "u-emp-3",
    entityType: "Appeal",
    entityId: "app-001",
    action: "create",
    description: "Filed appeal disputing call attribution.",
    occurredAt: "2026-04-25",
  },
];

export function StoreProvider({ children }: { children: ReactNode }) {
  const [currentUserId, setCurrentUserId] = useState<string>("u-mgr-1");
  const [users] = useState<User[]>(seedUsers);
  const [locations] = useState<Location[]>(seedLocations);
  const [rubrics, setRubrics] = useState<Rubric[]>(seedRubrics);
  const [shops, setShops] = useState<Shop[]>(seedShops);
  const [reviews, setReviews] = useState<Review[]>(seedReviews);
  const [actionPlans, setActionPlans] = useState<ActionPlan[]>(seedActionPlans);
  const [appeals, setAppeals] = useState<Appeal[]>(seedAppeals);
  const [comments, setComments] = useState<Comment[]>(seedComments);
  const [userBadges] = useState<UserBadge[]>(initialUserBadges);
  const [leagues] = useState<League[]>(seedLeagues);
  const [challenges] = useState<Challenge[]>(seedChallenges);
  const [huntCampaigns] = useState<HuntCampaign[]>(seedHuntCampaigns);
  const [huntReveals] = useState<HuntReveal[]>(seedHuntReveals);
  const [systemConfig, setSystemConfig] = useState<SystemConfig>(initialSystemConfig);
  const [auditLog, setAuditLog] = useState<AuditEntry[]>(seedAuditLog);

  const pointsLedger = useMemo(
    () => buildPointsLedger(shops, reviews),
    [shops, reviews],
  );

  const value = useMemo<StoreState>(() => {
    const currentUser = users.find((u) => u.id === currentUserId)!;
    return {
      currentUserId,
      setCurrentUserId,
      currentUser,
      users,
      locations,
      rubrics,
      shops,
      reviews,
      actionPlans,
      appeals,
      comments,
      pointsLedger,
      badgeCatalog,
      userBadges,
      leagues,
      challenges,
      huntCampaigns,
      huntReveals,
      trainingModules: seedTrainingModules,
      bisTrack: bisTrackData,
      systemConfig,
      setSystemConfig,
      auditLog,
      getShop: (id) => shops.find((s) => s.id === id),
      getReview: (shopId) => reviews.find((r) => r.shopId === shopId),
      getRubric: (id) => rubrics.find((r) => r.id === id),
      getUser: (id) => users.find((u) => u.id === id),
      getLocation: (id) => locations.find((l) => l.id === id),
      getActionPlansForShop: (shopId) =>
        actionPlans.filter((a) => a.shopId === shopId),
      getAppealsForShop: (shopId) => appeals.filter((a) => a.shopId === shopId),
      getCommentsForShop: (shopId) =>
        comments.filter((c) => c.shopId === shopId),

      addComment: (comment) => setComments((prev) => [...prev, comment]),

      createShop: (shop) => setShops((prev) => [shop, ...prev]),
      updateShopStatus: (shopId, status) =>
        setShops((prev) =>
          prev.map((s) => (s.id === shopId ? { ...s, status } : s)),
        ),

      saveReview: (review) =>
        setReviews((prev) => {
          const existing = prev.find((r) => r.shopId === review.shopId);
          if (existing) return prev.map((r) => (r.id === existing.id ? review : r));
          return [review, ...prev];
        }),

      createActionPlan: (plan) => setActionPlans((prev) => [plan, ...prev]),

      updateActionPlanStatus: (id, status, note) =>
        setActionPlans((prev) =>
          prev.map((p) => {
            if (p.id !== id) return p;
            const now = new Date().toISOString().slice(0, 10);
            const next = { ...p, status };
            if (status === "acknowledged" && !p.acknowledgedAt) next.acknowledgedAt = now;
            if (status === "completed" && !p.completedAt) next.completedAt = now;
            if (status === "verified") {
              next.verifiedAt = now;
              if (note) next.verificationNotes = note;
            }
            return next;
          }),
        ),

      fileAppeal: (appeal) => {
        setAppeals((prev) => [appeal, ...prev]);
        setShops((prev) =>
          prev.map((s) =>
            s.id === appeal.shopId ? { ...s, status: "appealed" } : s,
          ),
        );
      },

      resolveAppeal: (id, status, notes, scoreAdjustment) =>
        setAppeals((prev) =>
          prev.map((a) =>
            a.id === id
              ? {
                  ...a,
                  status,
                  resolutionNotes: notes,
                  scoreAdjustmentApplied: scoreAdjustment,
                  resolvedAt: new Date().toISOString().slice(0, 10),
                }
              : a,
          ),
        ),

      importShops: (newShops) => setShops((prev) => [...newShops, ...prev]),

      saveRubric: (rubric) =>
        setRubrics((prev) => {
          const existing = prev.find((r) => r.id === rubric.id);
          if (existing) return prev.map((r) => (r.id === rubric.id ? rubric : r));
          return [...prev, rubric];
        }),

      activateRubric: (rubricId) =>
        setRubrics((prev) => {
          const target = prev.find((r) => r.id === rubricId);
          if (!target) return prev;
          return prev.map((r) => {
            if (r.id === rubricId) return { ...r, status: "active" };
            if (r.type === target.type && r.status === "active")
              return { ...r, status: "retired" };
            return r;
          });
        }),

      retireRubric: (rubricId) =>
        setRubrics((prev) =>
          prev.map((r) =>
            r.id === rubricId ? { ...r, status: "retired" } : r,
          ),
        ),

      appendAudit: (entry) =>
        setAuditLog((prev) => [
          {
            ...entry,
            id: `audit-${Math.random().toString(36).slice(2, 8)}`,
            occurredAt: new Date().toISOString().slice(0, 10),
          },
          ...prev,
        ]),
    };
  }, [
    currentUserId,
    users,
    locations,
    rubrics,
    shops,
    reviews,
    actionPlans,
    appeals,
    comments,
    pointsLedger,
    userBadges,
    leagues,
    challenges,
    huntCampaigns,
    huntReveals,
    systemConfig,
    auditLog,
  ]);

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreState {
  const v = useContext(StoreContext);
  if (!v) throw new Error("StoreProvider missing");
  return v;
}

export function computeShopScore(rubric: Rubric, answers: ShopAnswer[]) {
  const total = answers.reduce((sum, a) => sum + a.scoreAwarded, 0);
  const max = rubric.sections
    .flatMap((s) => s.questions)
    .reduce((sum, q) => sum + q.maxScore, 0);
  return { total, max, percentage: max ? Math.round((total / max) * 100) : 0 };
}

export function gamificationActiveForLocation(
  cfg: SystemConfig,
  locationId: string | null,
): boolean {
  if (!cfg.gamificationEnabled) return false;
  if (!locationId) return true;
  return cfg.enabledLocationIds.includes(locationId);
}
