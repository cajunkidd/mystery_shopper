import type {
  ActionPlan,
  Appeal,
  Comment,
  Location,
  Review,
  Rubric,
  Shop,
  User,
} from "./types";

export const locations: Location[] = [
  { id: "loc-1", code: "STN-SUL", name: "Sulphur", city: "Sulphur", state: "LA", district: "Southwest LA", active: true },
  { id: "loc-2", code: "STN-LCH", name: "Lake Charles", city: "Lake Charles", state: "LA", district: "Southwest LA", active: true },
  { id: "loc-3", code: "STN-LAF", name: "Lafayette", city: "Lafayette", state: "LA", district: "Acadiana", active: true },
  { id: "loc-4", code: "STN-BR", name: "Baton Rouge", city: "Baton Rouge", state: "LA", district: "Capital", active: true },
  { id: "loc-5", code: "STN-NAT", name: "Natchez", city: "Natchez", state: "MS", district: "Natchez", active: true },
];

export const users: User[] = [
  { id: "u-admin", email: "kyle@stine.com", fullName: "Kyle Manuel", role: "admin", primaryLocationId: null, districtIds: [], hireDate: "2018-03-12", active: true },
  { id: "u-dist-1", email: "dana@stine.com", fullName: "Dana Boudreaux", role: "district_manager", primaryLocationId: null, districtIds: ["Southwest LA", "Acadiana"], hireDate: "2015-09-01", active: true },
  { id: "u-mgr-1", email: "marcus@stine.com", fullName: "Marcus Trahan", role: "store_manager", primaryLocationId: "loc-1", districtIds: [], hireDate: "2017-05-20", active: true },
  { id: "u-mgr-2", email: "linda@stine.com", fullName: "Linda Comeaux", role: "store_manager", primaryLocationId: "loc-2", districtIds: [], hireDate: "2016-11-08", active: true },
  { id: "u-emp-1", email: "tyler@stine.com", fullName: "Tyler Fontenot", role: "employee", primaryLocationId: "loc-1", districtIds: [], hireDate: "2022-06-15", active: true },
  { id: "u-emp-2", email: "jada@stine.com", fullName: "Jada Williams", role: "employee", primaryLocationId: "loc-1", districtIds: [], hireDate: "2023-02-01", active: true },
  { id: "u-emp-3", email: "ben@stine.com", fullName: "Ben Hebert", role: "employee", primaryLocationId: "loc-2", districtIds: [], hireDate: "2021-08-22", active: true },
  { id: "u-emp-4", email: "alicia@stine.com", fullName: "Alicia Doucet", role: "employee", primaryLocationId: "loc-1", districtIds: [], hireDate: "2024-01-10", active: true },
];

export const rubrics: Rubric[] = [
  {
    id: "rub-visit-v3",
    name: "In-Store Visit v3",
    type: "visit",
    version: 3,
    status: "active",
    sections: [
      {
        id: "sec-greet",
        name: "Greeting",
        weight: 0.2,
        questions: [
          { id: "q-greet-1", text: "Was the customer greeted within 30 seconds of entering?", type: "yes_no", maxScore: 10, required: true },
          { id: "q-greet-2", text: "Greeting was warm and used the customer's name when appropriate", type: "scale_1_5", maxScore: 10, required: true },
        ],
      },
      {
        id: "sec-product",
        name: "Product Knowledge",
        weight: 0.4,
        questions: [
          { id: "q-prod-1", text: "Associate could answer technical questions about the product", type: "scale_1_5", maxScore: 15, required: true },
          { id: "q-prod-2", text: "Associate offered relevant cross-sell or accessory", type: "yes_no", maxScore: 10, required: true },
          { id: "q-prod-3", text: "Associate's recommendation was a fit for stated need", type: "scale_1_5", maxScore: 15, required: true },
        ],
      },
      {
        id: "sec-close",
        name: "Close",
        weight: 0.25,
        questions: [
          { id: "q-close-1", text: "Associate asked for the sale", type: "yes_no", maxScore: 10, required: true },
          { id: "q-close-2", text: "Associate offered store loyalty / contractor account program", type: "yes_no", maxScore: 10, required: true },
        ],
      },
      {
        id: "sec-store",
        name: "Store Conditions",
        weight: 0.15,
        questions: [
          { id: "q-store-1", text: "Aisles were clean and clearly signed", type: "scale_1_5", maxScore: 10, required: true },
          { id: "q-store-2", text: "Restroom was clean", type: "yes_no", maxScore: 10, required: false },
        ],
      },
    ],
  },
  {
    id: "rub-call-v2",
    name: "Mystery Caller v2",
    type: "call",
    version: 2,
    status: "active",
    sections: [
      {
        id: "sec-c-greet",
        name: "Greeting",
        weight: 0.25,
        questions: [
          { id: "q-c-greet-1", text: "Phone answered within 3 rings", type: "yes_no", maxScore: 10, required: true },
          { id: "q-c-greet-2", text: "Standard branded greeting used", type: "yes_no", maxScore: 10, required: true },
        ],
      },
      {
        id: "sec-c-disc",
        name: "Discovery",
        weight: 0.35,
        questions: [
          { id: "q-c-disc-1", text: "Asked qualifying questions to understand caller's project", type: "scale_1_5", maxScore: 15, required: true },
          { id: "q-c-disc-2", text: "Confirmed correct product before quoting", type: "yes_no", maxScore: 10, required: true },
        ],
      },
      {
        id: "sec-c-close",
        name: "Close",
        weight: 0.4,
        questions: [
          { id: "q-c-close-1", text: "Invited caller to visit the store or place hold", type: "yes_no", maxScore: 15, required: true },
          { id: "q-c-close-2", text: "Captured caller's name and contact info", type: "yes_no", maxScore: 10, required: true },
        ],
      },
    ],
  },
];

const today = new Date("2026-04-29");
function dateOffset(days: number): string {
  const d = new Date(today);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export const shops: Shop[] = [
  {
    id: "shop-001",
    rubricId: "rub-visit-v3",
    type: "visit",
    locationId: "loc-1",
    shopDate: dateOffset(-3),
    evaluatedEmployeeId: "u-emp-1",
    shopperName: "Field Agent #428",
    status: "action_assigned",
    totalScore: 78,
    totalMax: 100,
    percentage: 78,
    narrative:
      "Tyler greeted me promptly and was friendly. Product knowledge on the deck stain was solid — he walked me through the difference between oil and water-based finishes. He didn't ask for the sale or mention the contractor program when I mentioned I was working on a rental property. Aisles were clean.",
    answers: [
      { questionId: "q-greet-1", value: true, scoreAwarded: 10 },
      { questionId: "q-greet-2", value: 4, scoreAwarded: 8 },
      { questionId: "q-prod-1", value: 5, scoreAwarded: 15 },
      { questionId: "q-prod-2", value: false, scoreAwarded: 0, comment: "No accessory offered" },
      { questionId: "q-prod-3", value: 5, scoreAwarded: 15 },
      { questionId: "q-close-1", value: false, scoreAwarded: 0, comment: "Did not ask for the sale" },
      { questionId: "q-close-2", value: false, scoreAwarded: 0, comment: "Contractor account not mentioned despite rental property cue" },
      { questionId: "q-store-1", value: 5, scoreAwarded: 10 },
      { questionId: "q-store-2", value: true, scoreAwarded: 10 },
    ],
    createdAt: dateOffset(-3),
  },
  {
    id: "shop-002",
    rubricId: "rub-visit-v3",
    type: "visit",
    locationId: "loc-1",
    shopDate: dateOffset(-10),
    evaluatedEmployeeId: "u-emp-2",
    shopperName: "Field Agent #119",
    status: "closed",
    totalScore: 92,
    totalMax: 100,
    percentage: 92,
    narrative:
      "Jada was excellent. Greeted me right away, asked great qualifying questions about my project, and recommended exactly what I needed. Asked for the sale and signed me up for the loyalty program. Top-tier visit.",
    answers: [
      { questionId: "q-greet-1", value: true, scoreAwarded: 10 },
      { questionId: "q-greet-2", value: 5, scoreAwarded: 10 },
      { questionId: "q-prod-1", value: 5, scoreAwarded: 15 },
      { questionId: "q-prod-2", value: true, scoreAwarded: 10 },
      { questionId: "q-prod-3", value: 5, scoreAwarded: 15 },
      { questionId: "q-close-1", value: true, scoreAwarded: 10 },
      { questionId: "q-close-2", value: true, scoreAwarded: 10 },
      { questionId: "q-store-1", value: 4, scoreAwarded: 8 },
      { questionId: "q-store-2", value: true, scoreAwarded: 10 },
    ],
    createdAt: dateOffset(-10),
  },
  {
    id: "shop-003",
    rubricId: "rub-call-v2",
    type: "call",
    locationId: "loc-2",
    shopDate: dateOffset(-5),
    evaluatedEmployeeId: "u-emp-3",
    shopperName: "Field Agent #228",
    status: "appealed",
    totalScore: 55,
    totalMax: 100,
    percentage: 55,
    narrative:
      "Phone rang seven times before being picked up. Greeting was casual — no store name. Associate gave me a price but didn't ask any questions about my project or invite me in.",
    answers: [
      { questionId: "q-c-greet-1", value: false, scoreAwarded: 0 },
      { questionId: "q-c-greet-2", value: false, scoreAwarded: 0 },
      { questionId: "q-c-disc-1", value: 2, scoreAwarded: 6 },
      { questionId: "q-c-disc-2", value: true, scoreAwarded: 10 },
      { questionId: "q-c-close-1", value: false, scoreAwarded: 0 },
      { questionId: "q-c-close-2", value: false, scoreAwarded: 0 },
    ],
    audioDurationSeconds: 92,
    createdAt: dateOffset(-5),
  },
  {
    id: "shop-004",
    rubricId: "rub-visit-v3",
    type: "visit",
    locationId: "loc-1",
    shopDate: dateOffset(-1),
    evaluatedEmployeeId: "u-emp-4",
    shopperName: "Field Agent #311",
    status: "submitted",
    totalScore: 84,
    totalMax: 100,
    percentage: 84,
    narrative:
      "New associate. Solid greeting, knew the product line decently, missed the cross-sell opportunity on caulk for the tile job. Closed well and offered the loyalty program.",
    answers: [
      { questionId: "q-greet-1", value: true, scoreAwarded: 10 },
      { questionId: "q-greet-2", value: 5, scoreAwarded: 10 },
      { questionId: "q-prod-1", value: 4, scoreAwarded: 12 },
      { questionId: "q-prod-2", value: false, scoreAwarded: 0, comment: "Missed caulk cross-sell" },
      { questionId: "q-prod-3", value: 4, scoreAwarded: 12 },
      { questionId: "q-close-1", value: true, scoreAwarded: 10 },
      { questionId: "q-close-2", value: true, scoreAwarded: 10 },
      { questionId: "q-store-1", value: 5, scoreAwarded: 10 },
      { questionId: "q-store-2", value: true, scoreAwarded: 10 },
    ],
    createdAt: dateOffset(-1),
  },
  {
    id: "shop-005",
    rubricId: "rub-visit-v3",
    type: "visit",
    locationId: "loc-2",
    shopDate: dateOffset(-14),
    evaluatedEmployeeId: "u-emp-3",
    shopperName: "Field Agent #428",
    status: "closed",
    totalScore: 71,
    totalMax: 100,
    percentage: 71,
    narrative:
      "Ben was professional but distracted. Greeted late, product knowledge was decent, didn't ask for the sale. Store was tidy.",
    answers: [
      { questionId: "q-greet-1", value: false, scoreAwarded: 0 },
      { questionId: "q-greet-2", value: 4, scoreAwarded: 8 },
      { questionId: "q-prod-1", value: 4, scoreAwarded: 12 },
      { questionId: "q-prod-2", value: true, scoreAwarded: 10 },
      { questionId: "q-prod-3", value: 4, scoreAwarded: 12 },
      { questionId: "q-close-1", value: false, scoreAwarded: 0 },
      { questionId: "q-close-2", value: true, scoreAwarded: 10 },
      { questionId: "q-store-1", value: 5, scoreAwarded: 10 },
      { questionId: "q-store-2", value: false, scoreAwarded: 0 },
    ],
    createdAt: dateOffset(-14),
  },
];

export const reviews: Review[] = [
  {
    id: "rev-001",
    shopId: "shop-001",
    reviewerId: "u-mgr-1",
    status: "completed",
    managerSummary:
      "Tyler's product knowledge continues to impress — he's our strongest technical resource on the floor. The miss here is the close. We've talked about this before. The contractor program callout is non-negotiable when a customer signals they're a pro or working a rental. Tyler, let's pair you with Jada on a couple shifts to watch how she handles the close.",
    scoreAdjustment: null,
    scoreJustification: "",
    bonusPoints: null,
    bonusJustification: "",
    reviewedAt: dateOffset(-2),
  },
  {
    id: "rev-002",
    shopId: "shop-002",
    reviewerId: "u-mgr-1",
    status: "completed",
    managerSummary:
      "Textbook visit. Jada is doing the thing — qualifying the project, recommending the right product, asking for the sale, signing them up. Awarding 15 bonus points for the loyalty signup on a first-time customer.",
    scoreAdjustment: null,
    scoreJustification: "",
    bonusPoints: 15,
    bonusJustification: "Loyalty signup on a first-time visit shows full mastery of the close.",
    reviewedAt: dateOffset(-9),
  },
  {
    id: "rev-003",
    shopId: "shop-003",
    reviewerId: "u-mgr-2",
    status: "completed",
    managerSummary:
      "Score reflects what happened on the call. Ben acknowledges he was on the phone with a vendor and asked another associate to grab the call — there's a context the shopper didn't capture. Adjusting +5 to reflect that the dropped greeting was a handoff issue, not a refusal. Action plan focused on close behavior, which is the real gap.",
    scoreAdjustment: 5,
    scoreJustification: "Greeting failure was due to call handoff during vendor call, not associate behavior.",
    bonusPoints: null,
    bonusJustification: "",
    reviewedAt: dateOffset(-3),
  },
  {
    id: "rev-005",
    shopId: "shop-005",
    reviewerId: "u-mgr-2",
    status: "completed",
    managerSummary:
      "Ben — solid product knowledge but the close keeps slipping. Action plan to ride along with me on five customer interactions this week.",
    scoreAdjustment: null,
    scoreJustification: "",
    bonusPoints: null,
    bonusJustification: "",
    reviewedAt: dateOffset(-13),
  },
];

export const actionPlans: ActionPlan[] = [
  {
    id: "ap-001",
    shopId: "shop-001",
    assignedTo: "u-emp-1",
    assignedBy: "u-mgr-1",
    category: "Close",
    description:
      "Shadow Jada on three customer interactions this week, focusing on how she transitions from product recommendation to asking for the sale and offering the loyalty / contractor program. Bring back two takeaways to our 1:1.",
    dueDate: dateOffset(7),
    status: "acknowledged",
    acknowledgedAt: dateOffset(-1),
    completedAt: null,
    verifiedAt: null,
    verificationNotes: "",
  },
  {
    id: "ap-003",
    shopId: "shop-003",
    assignedTo: "u-emp-3",
    assignedBy: "u-mgr-2",
    category: "Close",
    description:
      "Practice the standard close script with me in our 1:1. Run through five role-plays before next shift.",
    dueDate: dateOffset(5),
    status: "open",
    acknowledgedAt: null,
    completedAt: null,
    verifiedAt: null,
    verificationNotes: "",
  },
  {
    id: "ap-005",
    shopId: "shop-005",
    assignedTo: "u-emp-3",
    assignedBy: "u-mgr-2",
    category: "Close",
    description:
      "Ride along with me on five customer interactions this week and capture how each one closes.",
    dueDate: dateOffset(-2),
    status: "completed",
    acknowledgedAt: dateOffset(-12),
    completedAt: dateOffset(-4),
    verifiedAt: null,
    verificationNotes: "",
  },
];

export const appeals: Appeal[] = [
  {
    id: "app-001",
    shopId: "shop-003",
    filedBy: "u-emp-3",
    filedAt: dateOffset(-4),
    reason:
      "I was on the phone with our siding vendor when this call came in. I asked Megan to grab the call and she did. The shopper's call was Megan's, not mine. I should not be evaluated on a call I did not take.",
    requestedChange:
      "Reassign this shop to Megan, or remove it from my record entirely.",
    status: "under_review",
    resolverId: "u-mgr-2",
    resolutionNotes: "",
    resolvedAt: null,
    scoreAdjustmentApplied: null,
  },
];

export const comments: Comment[] = [
  {
    id: "cmt-001",
    shopId: "shop-003",
    authorId: "u-mgr-2",
    body: "Greeting starts here — listen for the lack of branded greeting.",
    audioTimestampSeconds: 4,
    createdAt: dateOffset(-3),
  },
  {
    id: "cmt-002",
    shopId: "shop-003",
    authorId: "u-mgr-2",
    body: "This is the moment to ask qualifying questions before quoting price. We skipped straight to a number.",
    audioTimestampSeconds: 31,
    createdAt: dateOffset(-3),
  },
  {
    id: "cmt-003",
    shopId: "shop-003",
    authorId: "u-mgr-2",
    body: "Caller mentions they're flexible on timing — perfect opening to invite them in. We let them go.",
    audioTimestampSeconds: 71,
    createdAt: dateOffset(-3),
  },
  {
    id: "cmt-004",
    shopId: "shop-001",
    authorId: "u-emp-1",
    body: "Acknowledged — I shadowed Jada this morning. The contractor program callout is a clear pattern in how she frames the close.",
    audioTimestampSeconds: null,
    createdAt: dateOffset(-1),
  },
];
