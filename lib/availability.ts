export const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;
export const PERIODS = [
  { key: "night", label: "Night (12–6 AM)" },
  { key: "morning", label: "Morning (6 AM–noon)" },
  { key: "afternoon", label: "Afternoon (noon–6 PM)" },
  { key: "evening", label: "Evening (6 PM–midnight)" },
] as const;

/** Returns the weekly slot containing the plan's start in the student's time zone. */
export function availabilitySlot(isoTime: string | null, timeZone: string | null): string | null {
  if (!isoTime || !timeZone || !Number.isFinite(Date.parse(isoTime))) return null;
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone, weekday: "short", hour: "numeric", hourCycle: "h23",
    }).formatToParts(new Date(isoTime));
    const day = parts.find((part) => part.type === "weekday")?.value;
    const hour = Number(parts.find((part) => part.type === "hour")?.value);
    if (!DAYS.some((value) => value === day) || !Number.isInteger(hour) || hour < 0 || hour > 23) return null;
    const period = hour < 6 ? "night" : hour < 12 ? "morning" : hour < 18 ? "afternoon" : "evening";
    return `${day}-${period}`;
  } catch {
    return null;
  }
}
