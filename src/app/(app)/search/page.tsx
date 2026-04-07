"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AddStoreDialog, type StoreFormData } from "@/components/add-store-dialog";
import { Badge } from "@/components/ui/badge";
import { LEAD_TYPE_OPTIONS, LEAD_TYPE_LABELS, type LeadType } from "@/config/features";
import {
  Search,
  Loader2,
  Plus,
  MapPin,
  Globe,
  Phone,
  Import,
  Check,
  Mail,
} from "lucide-react";

interface SearchResult {
  osmId: string;
  name: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  phone: string | null;
  website: string | null;
  email: string | null;
  latitude: number | null;
  longitude: number | null;
  leadType?: string;
}

// US states for dropdown
const US_STATES = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA",
  "HI","ID","IL","IN","IA","KS","KY","LA","ME","MD",
  "MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ",
  "NM","NY","NC","ND","OH","OK","OR","PA","RI","SC",
  "SD","TN","TX","UT","VT","VA","WA","WV","WI","WY",
] as const;

const STATE_NAMES: Record<string, string> = {
  AL:"Alabama",AK:"Alaska",AZ:"Arizona",AR:"Arkansas",CA:"California",
  CO:"Colorado",CT:"Connecticut",DE:"Delaware",FL:"Florida",GA:"Georgia",
  HI:"Hawaii",ID:"Idaho",IL:"Illinois",IN:"Indiana",IA:"Iowa",KS:"Kansas",
  KY:"Kentucky",LA:"Louisiana",ME:"Maine",MD:"Maryland",MA:"Massachusetts",
  MI:"Michigan",MN:"Minnesota",MS:"Mississippi",MO:"Missouri",MT:"Montana",
  NE:"Nebraska",NV:"Nevada",NH:"New Hampshire",NJ:"New Jersey",
  NM:"New Mexico",NY:"New York",NC:"North Carolina",ND:"North Dakota",
  OH:"Ohio",OK:"Oklahoma",OR:"Oregon",PA:"Pennsylvania",RI:"Rhode Island",
  SC:"South Carolina",SD:"South Dakota",TN:"Tennessee",TX:"Texas",UT:"Utah",
  VT:"Vermont",VA:"Virginia",WA:"Washington",WV:"West Virginia",
  WI:"Wisconsin",WY:"Wyoming",
};

export default function SearchPage() {
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [leadType, setLeadType] = useState<LeadType>("pet_store");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [importedIds, setImportedIds] = useState<Set<string>>(new Set());
  const [importing, setImporting] = useState<string | null>(null);

  function hasContactInfo(store: SearchResult): boolean {
    return !!(store.phone || store.email || store.website);
  }

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!city) return;
    setLoading(true);
    setError("");
    setResults([]);

    try {
      const stateName = state ? (STATE_NAMES[state] || state) : undefined;

      if (leadType === "pet_store") {
        // Use existing /api/search endpoint — UNCHANGED
        const params = new URLSearchParams({ city });
        if (stateName) params.set("state", stateName);

        const res = await fetch(`/api/search?${params}`);
        const data = await res.json();
        if (data.error) {
          setError(data.error);
        } else {
          const stores = (data.stores || []).map((s: SearchResult) => ({ ...s, leadType: "pet_store" }));
          setResults(stores);
          if (stores.length === 0) {
            setError(
              `No independent pet stores found in ${city}${state ? `, ${state}` : ""}. Try a larger city or add stores manually.`
            );
          }
        }
      } else {
        // Use new /api/search-leads endpoint for other lead types
        const params = new URLSearchParams({ city, type: leadType });
        if (stateName) params.set("state", stateName);

        const res = await fetch(`/api/search-leads?${params}`);
        const data = await res.json();
        if (data.error) {
          setError(data.error);
        } else {
          setResults(data.stores || []);
          if (data.stores?.length === 0) {
            const typeLabel = LEAD_TYPE_LABELS[leadType] || leadType;
            setError(
              `No ${typeLabel.toLowerCase()}s found in ${city}${state ? `, ${state}` : ""}. Try a larger city or different lead type.`
            );
          }
        }
      }
    } catch {
      setError("Search failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleImport(store: SearchResult) {
    setImporting(store.osmId);
    try {
      const res = await fetch("/api/stores", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: store.name,
          address: store.address,
          city: store.city,
          state: store.state,
          zip: store.zip,
          phone: store.phone,
          website: store.website,
          email: store.email,
          source: "api_search",
          leadType: store.leadType || leadType,
        }),
      });

      if (res.ok) {
        setImportedIds((prev) => new Set([...prev, store.osmId]));
      } else {
        let errorMsg = `Import failed (${res.status})`;
        try {
          const data = await res.json();
          errorMsg = data.error || errorMsg;
        } catch {
          const text = await res.text();
          errorMsg = text.slice(0, 200) || errorMsg;
        }
        if (res.status === 409) {
          setImportedIds((prev) => new Set([...prev, store.osmId]));
        } else {
          alert(errorMsg);
        }
      }
    } finally {
      setImporting(null);
    }
  }

  async function handleImportAll() {
    for (const store of results) {
      if (!importedIds.has(store.osmId) && hasContactInfo(store)) {
        await handleImport(store);
      }
    }
  }

  async function handleManualAdd(data: StoreFormData) {
    const res = await fetch("/api/stores", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json();
      alert(err.error || "Failed to add store");
      throw new Error(err.error);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Find B2B Leads</h1>
          <p className="text-muted-foreground">
            Search pet businesses by city &amp; state (excludes major chains)
          </p>
        </div>
        <Button variant="outline" onClick={() => setAddDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Manually
        </Button>
      </div>

      {/* Search Form */}
      <Card>
        <CardContent className="p-6">
          <form onSubmit={handleSearch} className="flex gap-3 flex-wrap">
            <select
              value={leadType}
              onChange={(e) => setLeadType(e.target.value as LeadType)}
              className="h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              {LEAD_TYPE_OPTIONS.filter((o) => o.enabled).map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            <div className="relative flex-1 min-w-[180px] max-w-xs">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="City (e.g. Denver)"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="pl-10"
              />
            </div>
            <select
              value={state}
              onChange={(e) => setState(e.target.value)}
              className="h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">All States</option>
              {US_STATES.map((s) => (
                <option key={s} value={s}>
                  {s} — {STATE_NAMES[s]}
                </option>
              ))}
            </select>
            <Button type="submit" disabled={loading || !city}>
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Search className="h-4 w-4 mr-2" />
              )}
              Search
            </Button>
          </form>
          <p className="text-xs text-muted-foreground mt-2">
            Powered by OpenStreetMap — excludes major chains
          </p>
        </CardContent>
      </Card>

      {error && (
        <Card className="border-destructive/50">
          <CardContent className="p-4 text-sm text-destructive">
            {error}
          </CardContent>
        </Card>
      )}

      {/* Results */}
      {results.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Found {results.length} {LEAD_TYPE_LABELS[leadType]?.toLowerCase() || "result"}{results.length !== 1 ? "s" : ""}{" "}
              in {city}{state ? `, ${state}` : ""}
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={handleImportAll}
              disabled={results.every((s) => importedIds.has(s.osmId))}
            >
              <Import className="h-4 w-4 mr-2" />
              Import All
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {results.map((store) => {
              const isImported = importedIds.has(store.osmId);
              const isImporting = importing === store.osmId;
              const canImport = hasContactInfo(store);
              return (
                <Card key={store.osmId} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold truncate">{store.name}</h3>
                          {store.leadType && store.leadType !== "pet_store" && (
                            <Badge variant="secondary" className="text-[10px] shrink-0">
                              {LEAD_TYPE_LABELS[store.leadType as LeadType] || store.leadType}
                            </Badge>
                          )}
                        </div>
                        {store.address && (
                          <p className="text-sm text-muted-foreground mt-1">
                            {store.address}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground">
                          {[store.city, store.state, store.zip]
                            .filter(Boolean)
                            .join(", ")}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground">
                      {store.phone && (
                        <span className="flex items-center gap-1">
                          <Phone className="h-3.5 w-3.5" />
                          {store.phone}
                        </span>
                      )}
                      {store.website && (
                        <a
                          href={store.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 hover:text-primary"
                        >
                          <Globe className="h-3.5 w-3.5" />
                          Website
                        </a>
                      )}
                      {store.email && (
                        <span className="flex items-center gap-1">
                          <Mail className="h-3.5 w-3.5" />
                          {store.email}
                        </span>
                      )}
                    </div>

                    <div className="mt-4">
                      {canImport ? (
                        <Button
                          size="sm"
                          variant={isImported ? "secondary" : "default"}
                          disabled={isImported || isImporting}
                          onClick={() => handleImport(store)}
                          className="w-full"
                        >
                          {isImported ? (
                            <>
                              <Check className="h-4 w-4 mr-2 text-green-600" />
                              Imported
                            </>
                          ) : isImporting ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin mr-2" />
                              Importing...
                            </>
                          ) : (
                            <>
                              <Import className="h-4 w-4 mr-2" />
                              Import to Pipeline
                            </>
                          )}
                        </Button>
                      ) : (
                        <p className="text-xs text-muted-foreground text-center py-1">
                          No contact info available
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      <AddStoreDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        onSubmit={handleManualAdd}
      />
    </div>
  );
}
