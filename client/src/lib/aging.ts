// Aging badge for review-queue rows. Drives the manager's eye toward the
// oldest waiting shop. Tuned per spec §6.6 ("queue at top of dashboard"): 0–1
// days = grey, 2–4 = amber, 5+ = rose. Pure function so it's trivially testable.

export interface AgeBadge {
  label: string;
  cls: string;
}

export function ageBadge(submittedAt: string | null, now: number = Date.now()): AgeBadge {
  if (!submittedAt) return { label: "draft", cls: "bg-slate-100 text-slate-600" };
  const days = Math.floor((now - new Date(submittedAt).getTime()) / 86_400_000);
  if (days >= 5) return { label: `${days}d waiting`, cls: "bg-rose-100 text-rose-800" };
  if (days >= 2) return { label: `${days}d waiting`, cls: "bg-amber-100 text-amber-800" };
  return { label: days === 0 ? "today" : `${days}d`, cls: "bg-slate-100 text-slate-700" };
}
