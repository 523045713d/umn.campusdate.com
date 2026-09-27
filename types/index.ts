export type PlanCategory = "Study" | "Food" | "Sports" | "Event" | "Build";

export type Plan = {
  id: string;
  creator: string;
  creatorId: string | null;
  title: string;
  category: PlanCategory;
  description: string;
  interests: string[];
  location: string;
  startsAt: string;
  duration: string;
  maxPeople: number;
  currentMembers: number;
  matchScore: number | null;
  reasons: string[];
  members: string[];
  memberIds: string[];
};
