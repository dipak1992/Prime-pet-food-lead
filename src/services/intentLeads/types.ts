export type IntentLeadType = "distributor" | "reseller";

export type IntentLevel = "very_high" | "high" | "medium";

export interface IntentLead {
  id: string;
  name: string;
  website: string;
  email?: string;
  description: string;
  leadType: IntentLeadType;
  intentLevel: IntentLevel;
  sourceQuery?: string;
}
