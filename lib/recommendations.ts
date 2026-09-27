import type { Plan } from "@/types";

/** Suggest open plans with a shared course, interest, or available start time. */
export function recommendPlans(plans: Plan[], userId: string, limit = 3): Plan[] {
  return plans
    .filter((plan) =>
      plan.creatorId !== userId &&
      !plan.memberIds.includes(userId) &&
      plan.currentMembers < plan.maxPeople &&
      (!plan.startsAtIso || Date.parse(plan.startsAtIso) > Date.now()) &&
      plan.matchScore !== null &&
      plan.reasons.some((reason) => reason.startsWith("Same course:") || reason.startsWith("Shared interest:") || reason.startsWith("Start time fits"))
    )
    .sort((a, b) => (b.matchScore ?? 0) - (a.matchScore ?? 0))
    .slice(0, limit);
}
