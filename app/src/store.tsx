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
import type {
  ActionPlan,
  ActionPlanStatus,
  Appeal,
  AppealStatus,
  Comment,
  Location,
  Review,
  Rubric,
  Shop,
  ShopAnswer,
  ShopStatus,
  User,
} from "./types";

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
}

const StoreContext = createContext<StoreState | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [currentUserId, setCurrentUserId] = useState<string>("u-mgr-1");
  const [users] = useState<User[]>(seedUsers);
  const [locations] = useState<Location[]>(seedLocations);
  const [rubrics] = useState<Rubric[]>(seedRubrics);
  const [shops, setShops] = useState<Shop[]>(seedShops);
  const [reviews, setReviews] = useState<Review[]>(seedReviews);
  const [actionPlans, setActionPlans] = useState<ActionPlan[]>(seedActionPlans);
  const [appeals, setAppeals] = useState<Appeal[]>(seedAppeals);
  const [comments, setComments] = useState<Comment[]>(seedComments);

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

      createActionPlan: (plan) =>
        setActionPlans((prev) => [plan, ...prev]),

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
