// Startup env validation. Called once from src/index.ts. We don't crash on
// missing optional vars — only on the ones the API can't function without.

interface EnvIssue {
  variable: string;
  problem: "missing" | "weak";
  hint?: string;
}

const REQUIRED = ["DATABASE_URL", "JWT_SECRET"] as const;

const WEAK_JWT_SECRETS = new Set([
  "change-me-in-production",
  "secret",
  "dev-secret",
  "test",
  "test-secret",
]);

export function validateEnv(): EnvIssue[] {
  const issues: EnvIssue[] = [];
  for (const key of REQUIRED) {
    if (!process.env[key]) {
      issues.push({ variable: key, problem: "missing" });
    }
  }
  const jwt = process.env.JWT_SECRET;
  if (jwt && process.env.NODE_ENV === "production") {
    if (WEAK_JWT_SECRETS.has(jwt)) {
      issues.push({
        variable: "JWT_SECRET",
        problem: "weak",
        hint: "Refusing to start in production with a placeholder secret.",
      });
    }
    if (jwt.length < 24) {
      issues.push({
        variable: "JWT_SECRET",
        problem: "weak",
        hint: `Use at least 24 characters in production (current length: ${jwt.length}).`,
      });
    }
  }
  return issues;
}

export function enforceEnv(): void {
  const issues = validateEnv();
  if (issues.length === 0) return;
  console.error("✗ Environment validation failed:");
  for (const i of issues) {
    console.error(`  • ${i.variable} ${i.problem}${i.hint ? ` — ${i.hint}` : ""}`);
  }
  // Soft-fail in non-production; hard-fail when shipping live.
  if (process.env.NODE_ENV === "production") {
    process.exit(1);
  } else {
    console.error("  (continuing in non-production — set NODE_ENV=production to make this fatal)");
  }
}
