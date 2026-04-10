"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Loader2,
  Globe,
  Mail,
  Import,
  Check,
  Zap,
  Package,
  RefreshCw,
  ExternalLink,
  Copy,
} from "lucide-react";
import type { IntentLead, IntentLeadType } from "@/services/intentLeads/types";
import {
  INTENT_LEVEL_LABELS,
  INTENT_LEVEL_COLORS,
} from "@/services/scoring/intentScore";
import {
  getIntentEmails,
  type IntentEmail,
} from "@/services/outreach/intentEmailAdapter";

const FILTER_OPTIONS: { value: IntentLeadType | "all"; label: string; icon: React.ReactNode }[] = [
  { value: "all", label: "All Intent Leads", icon: <Zap className="h-4 w-4" /> },
  { value: "distributor", label: "Distributors", icon: <Package className="h-4 w-4" /> },
  { value: "reseller", label: "Resellers", icon: <Globe className="h-4 w-4" /> },
];

const LEAD_TYPE_LABELS: Record<IntentLeadType, string> = {
  distributor: "Distributor",
  reseller: "Reseller",
};

const LEAD_TYPE_COLORS: Record<IntentLeadType, string> = {
  distributor: "bg-purple-100 text-purple-800 border-purple-200",
  reseller: "bg-blue-100 text-blue-800 border-blue-200",
};

export default function IntentLeadsPage() {
  const [filter, setFilter] = useState<IntentLeadType | "all">("all");
  const [leads, setLeads] = useState<IntentLead[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [noBingKey, setNoBingKey] = useState(false);
  const [importedIds, setImportedIds] = useState<Set<string>>(new Set());
  const [importing, setImporting] = useState<string | null>(null);

  // Email preview dialog
  const [emailDialogLead, setEmailDialogLead] = useState<IntentLead | null>(null);
  const [selectedEmailType, setSelectedEmailType] = useState<"A" | "B" | "C">("A");
  const [copiedEmail, setCopiedEmail] = useState(false);

  const filtered =
    filter === "all" ? leads : leads.filter((l) => l.leadType === filter);

  async function handleSearch() {
    setLoading(true);
    setError("");
    setLeads([]);

    const types =
      filter === "all" ? "distributor,reseller" : filter;

    try {
      const res = await fetch(`/api/intent-leads?types=${types}`);
      const data = await res.json();

      if (!data.hasBingKey) {
        setNoBingKey(true);
        setLoading(false);
        return;
      }

      setNoBingKey(false);

      if (data.error && !data.leads?.length) {
        setError(data.error);
      } else {
        setLeads(data.leads || []);
        if ((data.leads || []).length === 0) {
          setError("No results found. Try again — Bing rotates queries each run.");
        }
      }
    } catch {
      setError("Search failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleImport(lead: IntentLead) {
    setImporting(lead.id);
    try {
      const res = await fetch("/api/intent-leads/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: lead.name,
          website: lead.website,
          email: lead.email,
          description: lead.description,
          leadType: lead.leadType,
          intentLevel: lead.intentLevel,
        }),
      });

      if (res.ok || res.status === 409) {
        setImportedIds((prev) => new Set([...prev, lead.id]));
      } else {
        const data = await res.json();
        alert(data.error || "Import failed");
      }
    } catch {
      alert("Import failed. Please try again.");
    } finally {
      setImporting(null);
    }
  }

  function openEmailDialog(lead: IntentLead) {
    setEmailDialogLead(lead);
    setSelectedEmailType("A");
    setCopiedEmail(false);
  }

  const emailTemplates: IntentEmail[] = emailDialogLead
    ? getIntentEmails(
        emailDialogLead.leadType === "distributor" ? "distributor" : "reseller"
      )
    : [];

  const activeEmail = emailTemplates.find((e) => e.type === selectedEmailType);

  async function copyEmail() {
    if (!activeEmail) return;
    await navigator.clipboard.writeText(
      `Subject: ${activeEmail.subject}\n\n${activeEmail.body}`
    );
    setCopiedEmail(true);
    setTimeout(() => setCopiedEmail(false), 2000);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Zap className="h-6 w-6 text-orange-500" />
          High-Intent Leads
        </h1>
        <p className="text-muted-foreground mt-1">
          Businesses actively sourcing wholesale pet products — found via Bing Web Search.
        </p>
      </div>

      {/* Filter + Search */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex gap-2">
              {FILTER_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setFilter(opt.value)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium border transition-colors ${
                    filter === opt.value
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-background border-border text-muted-foreground hover:border-primary/50"
                  }`}
                >
                  {opt.icon}
                  {opt.label}
                </button>
              ))}
            </div>
            <Button onClick={handleSearch} disabled={loading} className="ml-auto">
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              {loading ? "Searching..." : "Search Now"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* No Bing key warning */}
      {noBingKey && (
        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="p-4 space-y-2">
            <p className="font-medium text-orange-800">Bing Search API key not configured</p>
            <p className="text-sm text-orange-700">
              To enable high-intent lead search, add your Bing Search API key:
            </p>
            <ol className="text-sm text-orange-700 list-decimal list-inside space-y-1">
              <li>Go to <strong>portal.azure.com</strong> → Create resource → <strong>Bing Search v7</strong></li>
              <li>Create a free-tier resource (1,000 queries/month free)</li>
              <li>Copy the API key from Keys and Endpoint</li>
              <li>Add to Vercel env vars: <code className="bg-orange-100 px-1 rounded">BING_SEARCH_API_KEY=your_key</code></li>
              <li>Redeploy</li>
            </ol>
          </CardContent>
        </Card>
      )}

      {/* Error */}
      {error && !noBingKey && (
        <Card className="border-destructive/50">
          <CardContent className="p-4 text-sm text-destructive">{error}</CardContent>
        </Card>
      )}

      {/* Results */}
      {filtered.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {filtered.length} lead{filtered.length !== 1 ? "s" : ""} found
              {filter !== "all" && ` · ${LEAD_TYPE_LABELS[filter]}`}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filtered.map((lead) => {
              const isImported = importedIds.has(lead.id);
              const isImporting = importing === lead.id;

              return (
                <Card key={lead.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-5 space-y-3">
                    {/* Name + badges */}
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-semibold leading-tight">{lead.name}</h3>
                        <div className="flex gap-1.5 shrink-0 flex-wrap justify-end">
                          <Badge
                            variant="outline"
                            className={`text-[10px] ${LEAD_TYPE_COLORS[lead.leadType]}`}
                          >
                            {LEAD_TYPE_LABELS[lead.leadType]}
                          </Badge>
                          <Badge
                            variant="outline"
                            className={`text-[10px] ${INTENT_LEVEL_COLORS[lead.intentLevel]}`}
                          >
                            <Zap className="h-2.5 w-2.5 mr-0.5" />
                            {INTENT_LEVEL_LABELS[lead.intentLevel]} Intent
                          </Badge>
                        </div>
                      </div>

                      {/* Description */}
                      <p className="text-xs text-muted-foreground mt-1.5 line-clamp-2">
                        {lead.description}
                      </p>
                    </div>

                    {/* Contact info */}
                    <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                      {lead.website && (
                        <a
                          href={lead.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 hover:text-primary"
                        >
                          <Globe className="h-3.5 w-3.5" />
                          <span className="truncate max-w-[160px]">
                            {lead.website.replace(/^https?:\/\/(www\.)?/, "")}
                          </span>
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                      {lead.email && (
                        <span className="flex items-center gap-1">
                          <Mail className="h-3.5 w-3.5" />
                          {lead.email}
                        </span>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 pt-1">
                      <Button
                        size="sm"
                        variant={isImported ? "secondary" : "default"}
                        disabled={isImported || isImporting}
                        onClick={() => handleImport(lead)}
                        className="flex-1"
                      >
                        {isImported ? (
                          <>
                            <Check className="h-4 w-4 mr-1 text-green-600" />
                            Imported
                          </>
                        ) : isImporting ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin mr-1" />
                            Importing...
                          </>
                        ) : (
                          <>
                            <Import className="h-4 w-4 mr-1" />
                            Import
                          </>
                        )}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openEmailDialog(lead)}
                      >
                        <Mail className="h-4 w-4 mr-1" />
                        Email Templates
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Empty state */}
      {!loading && !noBingKey && leads.length === 0 && !error && (
        <Card>
          <CardContent className="p-12 text-center text-muted-foreground">
            <Zap className="h-10 w-10 mx-auto mb-3 text-orange-300" />
            <p className="font-medium">Ready to find high-intent leads</p>
            <p className="text-sm mt-1">
              Select a filter and click Search Now to find distributors and resellers actively
              sourcing wholesale pet products.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Email templates dialog */}
      <Dialog
        open={!!emailDialogLead}
        onOpenChange={(o) => !o && setEmailDialogLead(null)}
      >
        <DialogContent className="max-w-xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Email Templates — {emailDialogLead?.leadType === "distributor" ? "Distributor" : "Reseller"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Variant selector */}
            <div className="grid grid-cols-3 gap-2">
              {emailTemplates.map((e) => (
                <button
                  key={e.type}
                  onClick={() => setSelectedEmailType(e.type)}
                  className={`text-left rounded-lg border p-3 transition-all text-sm ${
                    selectedEmailType === e.type
                      ? "border-primary bg-primary/5 ring-1 ring-primary"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <Badge
                      variant={selectedEmailType === e.type ? "default" : "secondary"}
                      className="text-[10px] px-1.5 py-0"
                    >
                      {e.type}
                    </Badge>
                    <span className="font-medium text-xs">{e.label}</span>
                  </div>
                </button>
              ))}
            </div>

            {activeEmail && (
              <div className="space-y-3">
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium mb-1">
                    Subject
                  </p>
                  <p className="text-sm font-medium bg-muted px-3 py-2 rounded-md">
                    {activeEmail.subject}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium mb-1">
                    Body
                  </p>
                  <pre className="text-sm whitespace-pre-wrap bg-muted px-3 py-2 rounded-md font-sans leading-relaxed">
                    {activeEmail.body}
                  </pre>
                </div>
                <Button onClick={copyEmail} variant="outline" className="w-full">
                  {copiedEmail ? (
                    <>
                      <Check className="h-4 w-4 mr-2 text-green-600" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4 mr-2" />
                      Copy Subject + Body
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
