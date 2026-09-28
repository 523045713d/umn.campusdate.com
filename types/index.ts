export type PlanCategory = "Study" | "Food" | "Sports" | "Event" | "Others";

export type ExternalEvent = {
  id: string;
  externalId: string;
  importerName: string;
  sourceName: string;
  sourceUrl: string;
  title: string;
  summary: string;
  organizerName: string | null;
  location: string;
  startsAt: string;
  startsAtIso: string;
  endsAtIso: string | null;
  expiresAtIso: string;
  timezone: string;
  isAllDay: boolean;
  status: "active" | "canceled" | "expired";
  categories: string[];
  audiences: string[];
  tags: string[];
};

export type PlanExternalEvent = Pick<
  ExternalEvent,
  "id" | "sourceName" | "sourceUrl" | "organizerName"
>;

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
  externalEvent: PlanExternalEvent | null;
};
