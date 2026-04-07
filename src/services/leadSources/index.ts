// Registry of all lead source modules
// Adding a new lead type = add a new file + register here

import { type LeadSourceModule } from "./types";
import { groomersModule } from "./groomers";
import { vetsModule } from "./vets";
import { daycareModule } from "./daycare";
import { trainersModule } from "./trainers";
import { boutiqueModule } from "./boutique";
import { groceryModule } from "./grocery";
import { FEATURES } from "@/config/features";

// Map feature flags to modules
const MODULE_REGISTRY: { module: LeadSourceModule; enabled: boolean }[] = [
  { module: groomersModule, enabled: FEATURES.ENABLE_GROOMERS },
  { module: vetsModule, enabled: FEATURES.ENABLE_VETS },
  { module: daycareModule, enabled: FEATURES.ENABLE_DAYCARE },
  { module: trainersModule, enabled: FEATURES.ENABLE_TRAINERS },
  { module: boutiqueModule, enabled: FEATURES.ENABLE_BOUTIQUE },
  { module: groceryModule, enabled: FEATURES.ENABLE_GROCERY },
];

export function getEnabledModules(): LeadSourceModule[] {
  return MODULE_REGISTRY
    .filter((entry) => entry.enabled)
    .map((entry) => entry.module);
}

export function getModuleByType(leadType: string): LeadSourceModule | undefined {
  return MODULE_REGISTRY
    .find((entry) => entry.module.leadType === leadType && entry.enabled)
    ?.module;
}

export type { LeadResult, LeadSourceModule } from "./types";
