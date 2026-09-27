export type AiPlan = {
  summary: string;
  preparation: string[];
  agenda: { step: string; duration_minutes: number; details: string }[];
  backup_plan: string;
  generated_at: string;
};

export function isAiPlan(value: unknown): value is AiPlan {
  if (!value || typeof value !== "object") return false;
  const plan = value as Record<string, unknown>;
  const shortText = (text: unknown) => typeof text === "string" && text.length > 0 && text.length <= 1000;
  return shortText(plan.summary) && shortText(plan.backup_plan) &&
    typeof plan.generated_at === "string" &&
    Array.isArray(plan.preparation) && plan.preparation.length <= 10 && plan.preparation.every(shortText) &&
    Array.isArray(plan.agenda) && plan.agenda.length > 0 && plan.agenda.length <= 10 &&
    plan.agenda.every((item) => item && typeof item === "object" &&
      shortText(item.step) && shortText(item.details) &&
      Number.isInteger(item.duration_minutes) && item.duration_minutes > 0 && item.duration_minutes <= 240);
}
