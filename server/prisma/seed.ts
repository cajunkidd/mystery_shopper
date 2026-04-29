import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function hash(p: string) {
  return bcrypt.hash(p, 10);
}

const LOCATIONS: { code: string; name: string; city: string; state: string; district: string }[] = [
  { code: "STN-SUL", name: "Sulphur", city: "Sulphur", state: "LA", district: "Southwest LA" },
  { code: "STN-LCH", name: "Lake Charles", city: "Lake Charles", state: "LA", district: "Southwest LA" },
  { code: "STN-MOS", name: "Moss Bluff", city: "Moss Bluff", state: "LA", district: "Southwest LA" },
  { code: "STN-DER", name: "DeRidder", city: "DeRidder", state: "LA", district: "Southwest LA" },
  { code: "STN-LAF", name: "Lafayette", city: "Lafayette", state: "LA", district: "South LA" },
  { code: "STN-BRO", name: "Broussard", city: "Broussard", state: "LA", district: "South LA" },
  { code: "STN-NIB", name: "New Iberia", city: "New Iberia", state: "LA", district: "South LA" },
  { code: "STN-OPE", name: "Opelousas", city: "Opelousas", state: "LA", district: "South LA" },
  { code: "STN-BAT", name: "Baton Rouge", city: "Baton Rouge", state: "LA", district: "Central LA" },
  { code: "STN-DEN", name: "Denham Springs", city: "Denham Springs", state: "LA", district: "Central LA" },
  { code: "STN-COV", name: "Covington", city: "Covington", state: "LA", district: "North Shore" },
  { code: "STN-HAM", name: "Hammond", city: "Hammond", state: "LA", district: "North Shore" },
  { code: "STN-MAN", name: "Mandeville", city: "Mandeville", state: "LA", district: "North Shore" },
  { code: "STN-NAT", name: "Natchez", city: "Natchez", state: "MS", district: "Mississippi" },
];

const VISIT_RUBRIC = {
  name: "In-Store Visit v1",
  type: "visit" as const,
  sections: [
    {
      name: "Greeting",
      displayOrder: 1,
      questions: [
        { text: "Was the shopper greeted within 30 seconds of entering?", questionType: "yes_no" as const, maxScore: 10, displayOrder: 1 },
        { text: "Was the greeting friendly and professional?", questionType: "scale_1_5" as const, maxScore: 10, displayOrder: 2 },
      ],
    },
    {
      name: "Product Knowledge",
      displayOrder: 2,
      questions: [
        { text: "Did the associate ask qualifying questions?", questionType: "yes_no" as const, maxScore: 10, displayOrder: 1 },
        { text: "Rate the depth of product knowledge demonstrated.", questionType: "scale_1_5" as const, maxScore: 20, displayOrder: 2 },
        { text: "Did the associate suggest add-on / complementary products?", questionType: "yes_no" as const, maxScore: 10, displayOrder: 3 },
      ],
    },
    {
      name: "Close",
      displayOrder: 3,
      questions: [
        { text: "Did the associate ask for the sale?", questionType: "yes_no" as const, maxScore: 10, displayOrder: 1 },
        { text: "Was contact information collected for follow-up?", questionType: "yes_no" as const, maxScore: 10, displayOrder: 2 },
        { text: "Overall close effectiveness", questionType: "scale_1_5" as const, maxScore: 10, displayOrder: 3 },
      ],
    },
    {
      name: "Store Environment",
      displayOrder: 4,
      questions: [
        { text: "Was the store clean and well-organized?", questionType: "scale_1_5" as const, maxScore: 5, displayOrder: 1 },
        { text: "Were displays properly stocked?", questionType: "scale_1_5" as const, maxScore: 5, displayOrder: 2 },
      ],
    },
  ],
};

const CALL_RUBRIC = {
  name: "Mystery Caller v1",
  type: "call" as const,
  sections: [
    {
      name: "Phone Greeting",
      displayOrder: 1,
      questions: [
        { text: "Was the call answered within 3 rings?", questionType: "yes_no" as const, maxScore: 10, displayOrder: 1 },
        { text: "Was the greeting professional and complete?", questionType: "scale_1_5" as const, maxScore: 10, displayOrder: 2 },
      ],
    },
    {
      name: "Inquiry Handling",
      displayOrder: 2,
      questions: [
        { text: "Did the associate listen actively to the inquiry?", questionType: "scale_1_5" as const, maxScore: 15, displayOrder: 1 },
        { text: "Did the associate provide accurate product information?", questionType: "scale_1_5" as const, maxScore: 20, displayOrder: 2 },
      ],
    },
    {
      name: "Close",
      displayOrder: 3,
      questions: [
        { text: "Did the associate invite the caller to visit the store?", questionType: "yes_no" as const, maxScore: 10, displayOrder: 1 },
        { text: "Did the associate capture the caller's name and number?", questionType: "yes_no" as const, maxScore: 15, displayOrder: 2 },
      ],
    },
  ],
};

async function main() {
  console.log("Seeding…");

  // Locations
  for (const l of LOCATIONS) {
    await prisma.location.upsert({
      where: { code: l.code },
      update: {},
      create: l,
    });
  }
  console.log(`  - ${LOCATIONS.length} locations`);

  const sulphur = await prisma.location.findUnique({ where: { code: "STN-SUL" } });
  const lakeCharles = await prisma.location.findUnique({ where: { code: "STN-LCH" } });

  // Users (idempotent on email)
  const users = [
    { email: "kyle@stine.test", fullName: "Kyle Manuel", role: "admin" as const, password: "admin1234" },
    { email: "manager.sulphur@stine.test", fullName: "Pat Manager", role: "store_manager" as const, password: "manager1234", primaryLocationId: sulphur?.id ?? null },
    { email: "manager.lc@stine.test", fullName: "Sam Manager", role: "store_manager" as const, password: "manager1234", primaryLocationId: lakeCharles?.id ?? null },
    { email: "district.sw@stine.test", fullName: "Jamie District", role: "district_manager" as const, password: "district1234", districtIds: [] },
    { email: "alex.employee@stine.test", fullName: "Alex Sales", role: "employee" as const, password: "employee1234", primaryLocationId: sulphur?.id ?? null },
    { email: "robin.employee@stine.test", fullName: "Robin Sales", role: "employee" as const, password: "employee1234", primaryLocationId: sulphur?.id ?? null },
    { email: "casey.employee@stine.test", fullName: "Casey Sales", role: "employee" as const, password: "employee1234", primaryLocationId: lakeCharles?.id ?? null },
  ];
  for (const u of users) {
    await prisma.user.upsert({
      where: { email: u.email },
      update: {},
      create: {
        email: u.email,
        fullName: u.fullName,
        role: u.role,
        passwordHash: await hash(u.password),
        primaryLocationId: u.primaryLocationId ?? null,
        districtIds: u.districtIds ?? [],
      },
    });
  }
  console.log(`  - ${users.length} users`);

  // Rubrics — only seed if no active visit rubric exists
  const existingVisit = await prisma.rubric.findFirst({ where: { type: "visit", status: "active" } });
  if (!existingVisit) {
    const total = VISIT_RUBRIC.sections.reduce(
      (acc, s) => acc + s.questions.reduce((a, q) => a + q.maxScore, 0),
      0,
    );
    await prisma.rubric.create({
      data: {
        name: VISIT_RUBRIC.name,
        type: VISIT_RUBRIC.type,
        version: 1,
        status: "active",
        totalMaxScore: total,
        sections: {
          create: VISIT_RUBRIC.sections.map((s) => ({
            name: s.name,
            displayOrder: s.displayOrder,
            weight: 1,
            maxScore: s.questions.reduce((a, q) => a + q.maxScore, 0),
            questions: {
              create: s.questions.map((q) => ({
                text: q.text,
                questionType: q.questionType,
                weight: 1,
                maxScore: q.maxScore,
                displayOrder: q.displayOrder,
                required: true,
              })),
            },
          })),
        },
      },
    });
    console.log("  - visit rubric");
  }

  const existingCall = await prisma.rubric.findFirst({ where: { type: "call", status: "active" } });
  if (!existingCall) {
    const total = CALL_RUBRIC.sections.reduce(
      (acc, s) => acc + s.questions.reduce((a, q) => a + q.maxScore, 0),
      0,
    );
    await prisma.rubric.create({
      data: {
        name: CALL_RUBRIC.name,
        type: CALL_RUBRIC.type,
        version: 1,
        status: "active",
        totalMaxScore: total,
        sections: {
          create: CALL_RUBRIC.sections.map((s) => ({
            name: s.name,
            displayOrder: s.displayOrder,
            weight: 1,
            maxScore: s.questions.reduce((a, q) => a + q.maxScore, 0),
            questions: {
              create: s.questions.map((q) => ({
                text: q.text,
                questionType: q.questionType,
                weight: 1,
                maxScore: q.maxScore,
                displayOrder: q.displayOrder,
                required: true,
              })),
            },
          })),
        },
      },
    });
    console.log("  - call rubric");
  }

  console.log("Done. Test login: kyle@stine.test / admin1234");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
