export type PlanCategory = "Study"|"Food"|"Sports"|"Event"|"Build";
export type Plan={id:string;creator:string;title:string;category:PlanCategory;description:string;location:string;startsAt:string;duration:string;maxPeople:number;currentMembers:number;matchScore:number;reasons:string[];members:string[]};
