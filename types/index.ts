export type PlanCategory = "Study" | "Food" | "Sports" | "Event" | "Others";

export type Plan = {
  id: string;
  creator: string;
  creatorId: string | null;
  title: string;
  category: PlanCategory;
  description: string;
  interests: string[];
  courses: string[];
  location: string;
  startsAt: string;
  startsAtIso: string | null;
  duration: string;
  maxPeople: number;
  currentMembers: number;
  matchScore: number | null;
  reasons: string[];
  members: string[];
  memberIds: string[];
};
