"use client";
import type { Plan } from "@/types";
import { seedPlans } from "@/lib/seed";
const KEY="campus-mvp-plans";
export function loadPlans():Plan[]{if(typeof window==="undefined")return seedPlans;const raw=window.localStorage.getItem(KEY);if(!raw){window.localStorage.setItem(KEY,JSON.stringify(seedPlans));return seedPlans;}try{return JSON.parse(raw) as Plan[]}catch{window.localStorage.setItem(KEY,JSON.stringify(seedPlans));return seedPlans;}}
export function savePlans(plans:Plan[]){window.localStorage.setItem(KEY,JSON.stringify(plans));}
export function createPlan(plan:Plan){const next=[plan,...loadPlans()];savePlans(next);return next;}
export function joinPlan(id:string,member="You"){const plans=loadPlans().map(plan=>{if(plan.id!==id||plan.members.includes(member)||plan.currentMembers>=plan.maxPeople)return plan;return {...plan,currentMembers:plan.currentMembers+1,members:[...plan.members,member]};});savePlans(plans);return plans;}
