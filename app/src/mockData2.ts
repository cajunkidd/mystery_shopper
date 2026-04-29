import type {
  BadgeDef,
  BisTrackDaily,
  Challenge,
  HuntCampaign,
  HuntReveal,
  League,
  SystemConfig,
  TrainingModule,
  UserBadge,
} from "./types";

const today = new Date("2026-04-29");
function dateOffset(days: number): string {
  const d = new Date(today);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export const initialSystemConfig: SystemConfig = {
  gamificationEnabled: true,
  enabledLocationIds: ["loc-1", "loc-2", "loc-3", "loc-4", "loc-5"],
  audioRetentionDays: 365,
  appealEscalationDays: 7,
};

export const badgeCatalog: BadgeDef[] = [
  {
    code: "greeting_gold",
    name: "Greeting Gold",
    description: "5 perfect greeting sections in a quarter",
    category: "absolute",
    icon: "★",
  },
  {
    code: "product_sage",
    name: "Product Sage",
    description: "Perfect product-knowledge in a quarter",
    category: "absolute",
    icon: "✦",
  },
  {
    code: "phone_pro",
    name: "Phone Pro",
    description: "5 perfect mystery calls",
    category: "absolute",
    icon: "☎",
  },
  {
    code: "most_improved_q1",
    name: "Most Improved · Q1",
    description: "Biggest quarter-over-quarter improvement in Q1",
    category: "improvement",
    icon: "↗",
  },
  {
    code: "bounce_back",
    name: "Bounce Back",
    description: "Recovered 20+ points after a sub-70 shop",
    category: "improvement",
    icon: "↻",
  },
  {
    code: "comeback_kid",
    name: "Comeback Kid",
    description: "3 consecutive improving shops",
    category: "improvement",
    icon: "▲",
  },
  {
    code: "veteran",
    name: "Veteran",
    description: "50 shops graded",
    category: "tenure",
    icon: "⌖",
  },
  {
    code: "centurion",
    name: "Centurion",
    description: "100 shops graded",
    category: "tenure",
    icon: "⌘",
  },
  {
    code: "hundred_club",
    name: "100 Club",
    description: "A shop ≥ 100 with bonuses applied",
    category: "special",
    icon: "✪",
  },
];

export const initialUserBadges: UserBadge[] = [
  {
    userId: "u-emp-2",
    badgeCode: "greeting_gold",
    earnedAt: dateOffset(-30),
    earningShopId: "shop-002",
  },
  {
    userId: "u-emp-2",
    badgeCode: "hundred_club",
    earnedAt: dateOffset(-9),
    earningShopId: "shop-002",
  },
  {
    userId: "u-emp-1",
    badgeCode: "product_sage",
    earnedAt: dateOffset(-3),
    earningShopId: "shop-001",
  },
  {
    userId: "u-emp-3",
    badgeCode: "bounce_back",
    earnedAt: dateOffset(-14),
    earningShopId: "shop-005",
  },
];

export const leagues: League[] = [
  {
    id: "lg-swla",
    name: "Southwest LA League",
    periodStart: dateOffset(-29),
    periodEnd: dateOffset(1),
    storeIds: ["loc-1", "loc-2"],
  },
  {
    id: "lg-east",
    name: "Eastern Region League",
    periodStart: dateOffset(-29),
    periodEnd: dateOffset(1),
    storeIds: ["loc-3", "loc-4", "loc-5"],
  },
];

export const challenges: Challenge[] = [
  {
    id: "ch-q2-close",
    name: "Q2 Closing Focus",
    description:
      "Average ≥ 85% on the Close section across all visits this quarter.",
    startsAt: dateOffset(-29),
    endsAt: dateOffset(60),
    metric: "category_avg",
    category: "Close",
    threshold: 85,
    participatingLocationIds: ["loc-1", "loc-2", "loc-3", "loc-4"],
  },
  {
    id: "ch-no-sub70",
    name: "30 Days, No Sub-70",
    description: "30 consecutive days without a shop scoring under 70%.",
    startsAt: dateOffset(-15),
    endsAt: dateOffset(15),
    metric: "score_above_threshold_count",
    category: null,
    threshold: 70,
    participatingLocationIds: ["loc-1", "loc-3"],
  },
];

export const huntCampaigns: HuntCampaign[] = [
  {
    id: "hunt-spring",
    name: "Spring Pro Hunt",
    description:
      "Shoppers will pose as contractors with rental property leads. Trigger phrase: 'I'm a property manager.' Codewords identify successful interactions.",
    startsAt: dateOffset(-7),
    endsAt: dateOffset(20),
    scenarios: [
      { codeword: "RENTAL-7", trigger: "I'm a property manager and have three units." },
      { codeword: "RENO-4", trigger: "Doing a quick reno before the next tenant." },
    ],
    active: true,
  },
];

export const huntReveals: HuntReveal[] = [
  {
    id: "hr-001",
    huntCampaignId: "hunt-spring",
    shopId: "shop-002",
    recognizedEmployeeId: "u-emp-2",
    identifiedByEmployees: ["u-emp-1", "u-emp-4"],
    revealedAt: dateOffset(-2),
  },
];

export const trainingModules: TrainingModule[] = [
  {
    id: "tm-close-1",
    category: "Close",
    title: "Asking for the Sale — fundamentals",
    description:
      "5-minute video walkthrough on natural-feeling closing language with three scripts to practice in the 1:1.",
    durationMinutes: 5,
  },
  {
    id: "tm-close-2",
    category: "Close",
    title: "Contractor Account Cue Recognition",
    description:
      "How to spot pro-customer signals and pivot to the contractor program offer.",
    durationMinutes: 7,
  },
  {
    id: "tm-greet-1",
    category: "Greeting",
    title: "30-Second Greeting Standard",
    description:
      "What our greeting standard is, why, and how to recover when you miss the window.",
    durationMinutes: 4,
  },
  {
    id: "tm-product-1",
    category: "Product Knowledge",
    title: "Stain & Finish: oil vs water-based",
    description:
      "Quick reference on the most common technical question in the deck aisle.",
    durationMinutes: 8,
  },
  {
    id: "tm-disc-1",
    category: "Discovery",
    title: "Qualifying questions before quoting",
    description:
      "The four questions that should always come before a price quote on a phone inquiry.",
    durationMinutes: 6,
  },
];

function genBisTrack(locationId: string, baseSales: number, baseAov: number): BisTrackDaily[] {
  const out: BisTrackDaily[] = [];
  for (let i = 30; i >= 0; i--) {
    const wobble = ((i * 13) % 7) / 10 - 0.3;
    const sales = Math.round(baseSales * (1 + wobble * 0.15));
    const aov = Math.round(baseAov * (1 + wobble * 0.05));
    const transactions = Math.round(sales / aov);
    out.push({
      locationId,
      date: dateOffset(-i),
      sales,
      transactions,
      aov,
      footTraffic: Math.round(transactions * 1.7),
    });
  }
  return out;
}

export const bisTrackData: BisTrackDaily[] = [
  ...genBisTrack("loc-1", 32000, 280),
  ...genBisTrack("loc-2", 28000, 245),
  ...genBisTrack("loc-3", 41000, 310),
  ...genBisTrack("loc-4", 38000, 295),
  ...genBisTrack("loc-5", 22000, 220),
];
