export function scoreClass(percentage: number): "green" | "amber" | "red" {
  if (percentage >= 85) return "green";
  if (percentage >= 70) return "amber";
  return "red";
}

export function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function formatRelative(iso: string, today = new Date("2026-04-29")): string {
  const d = new Date(iso);
  const days = Math.round((today.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
  if (days === 0) return "today";
  if (days === 1) return "yesterday";
  if (days > 0 && days < 7) return `${days} days ago`;
  if (days < 0 && days > -7) return `in ${-days} days`;
  return formatDate(iso);
}

export function statusPillClass(status: string): string {
  if (["closed", "completed", "verified", "approved", "acknowledged"].includes(status)) return "green";
  if (["submitted", "under_review", "in_progress", "pending", "open"].includes(status)) return "blue";
  if (["action_assigned", "appealed", "overdue", "denied", "partially_approved"].includes(status)) return "amber";
  return "";
}

export function humanizeStatus(status: string): string {
  return status.replace(/_/g, " ");
}
