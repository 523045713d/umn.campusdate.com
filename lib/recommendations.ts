import type { Plan } from "@/types";

/** Suggest plans with a course or interest in common, excluding plans already joined or full. */
export function recommendPlans(plans: Plan[], userId: string, limit = 3): Plan[] {
  return plans
    .filter((plan) =>
      plan.creatorId !== userId &&
      !plan.memberIds.includes(userId) &&
      plan.currentMembers < plan.maxPeople &&
      plan.matchScore !== null &&
      plan.reasons.some((reason) => reason.startsWith("Same course:") || reason.startsWith("Shared interest:"))
    )
    .sort((a, b) => (b.matchScore ?? 0) - (a.matchScore ?? 0))
    .slice(0, limit);
}
