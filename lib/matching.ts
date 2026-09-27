import type { Profile } from "@/lib/auth";
import type { Plan } from "@/types";

export type MatchResult = { score: number; reasons: string[] } | null;

const normalize = (value: string) => value.normalize("NFKC").toLocaleLowerCase().trim().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
const normalizeCourse = (value: string) => normalize(value).replace(/\s+/g, "");
const tokens = (value: string) => normalize(value).split(/\s+/).filter(Boolean);

function mentions(text: string, term: string): boolean {
  const phrase = tokens(term);
  if (!phrase.length) return false;
  const words = tokens(text);
  return words.some((_, index) => phrase.every((word, offset) => words[index + offset] === word));
}

/** Scores only evidence supplied by the student and the plan. Null means insufficient data. */
export function matchPlan(plan: Plan, profile: Profile | null): MatchResult {
  if (!profile) return null;
  const text = `${plan.title} ${plan.description} ${plan.category}`;
  const taggedCourses = new Set(plan.courses.map(normalizeCourse).filter(Boolean));
  const courses = (profile.courses ?? []).filter((course) =>
    taggedCourses.has(normalizeCourse(course)) || (!taggedCourses.size && mentions(text, course))
  );
  const taggedInterests = new Set(plan.interests.map(normalize).filter(Boolean));
  const interests = (profile.interests ?? []).filter((interest) =>
    taggedInterests.has(normalize(interest)) || (!taggedInterests.size && mentions(text, interest))
  );
  const preference = profile.preferred_group_size;
  const hasPreference = typeof preference === "number" && preference >= 2;
  if (!courses.length && !interests.length && !hasPreference) return null;

  let score = 0;
  const reasons: string[] = [];
  if ((profile.courses ?? []).length) {
    if (courses.length) {
      score += 35;
      reasons.push(`Same course: ${[...new Set(courses)].slice(0, 3).join(", ")}`);
    }
  }
  if ((profile.interests ?? []).length) {
    if (interests.length) {
      score += 50;
      reasons.push(`Shared interest: ${[...new Set(interests)].slice(0, 3).join(", ")}`);
    }
  }
  if (hasPreference) {
    if (plan.maxPeople <= preference!) {
      score += 15;
      reasons.push("Group size fits your preference");
    }
  }
  return { score, reasons };
}
