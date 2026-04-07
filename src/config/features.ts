// Feature flags for safe rollout of new modules
// Set to false to disable any feature without breaking the app

export const FEATURES = {
  // New lead types
  ENABLE_GROOMERS: true,
  ENABLE_VETS: true,
  ENABLE_DAYCARE: true,
  ENABLE_TRAINERS: true,
  ENABLE_BOUTIQUE: true,
  ENABLE_GROCERY: true,

  // AI scoring
  ENABLE_LEAD_SCORING: true,

  // Multi-channel outreach
  ENABLE_INSTAGRAM_DM: true,
  ENABLE_CONTACT_FORM: true,
} as const;

export type LeadType =
  | "pet_store"
  | "groomer"
  | "vet"
  | "daycare"
  | "trainer"
  | "boutique"
  | "grocery";

export const LEAD_TYPE_LABELS: Record<LeadType, string> = {
  pet_store: "Pet Store",
  groomer: "Dog Groomer",
  vet: "Veterinary Clinic",
  daycare: "Pet Boarding / Daycare",
  trainer: "Dog Trainer",
  boutique: "Boutique Pet Shop",
  grocery: "Grocery (Pet Section)",
};

export const LEAD_TYPE_OPTIONS: { value: LeadType; label: string; enabled: boolean }[] = [
  { value: "pet_store", label: "Pet Stores", enabled: true }, // always on
  { value: "groomer", label: "Dog Groomers", enabled: FEATURES.ENABLE_GROOMERS },
  { value: "vet", label: "Veterinary Clinics", enabled: FEATURES.ENABLE_VETS },
  { value: "daycare", label: "Pet Boarding / Daycare", enabled: FEATURES.ENABLE_DAYCARE },
  { value: "trainer", label: "Dog Trainers", enabled: FEATURES.ENABLE_TRAINERS },
  { value: "boutique", label: "Boutique Pet Shops", enabled: FEATURES.ENABLE_BOUTIQUE },
  { value: "grocery", label: "Grocery (Pet Section)", enabled: FEATURES.ENABLE_GROCERY },
];
