"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { AddStoreDialog, type StoreFormData } from "@/components/add-store-dialog";
import {
  Search,
  Loader2,
  Plus,
  MapPin,
  Globe,
  Phone,
  Import,
  Check,
} from "lucide-react";

interface SearchResult {
  foursquareId: string;
  name: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  phone: string | null;
  website: string | null;
  googleRating: number | null;
  latitude: number | null;
  longitude: number | null;
}

export default function SearchPage() {
  const [zip, setZip] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [importedIds, setImportedIds] = useState<Set<string>>(new Set());
  const [importing, setImporting] = useState<string | null>(null);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!zip) return;
    setLoading(true);
    setError("");
    setResults([]);

    try {
      const res = await fetch(`/api/search?zip=${encodeURIComponent(zip)}`);
      const data = await res.json();
      if (data.error) {
        setError(data.error);
      } else {
        setResults(data.stores || []);
        if (data.stores?.length === 0) {
          setError("No pet stores found for this ZIP code. Try a nearby ZIP or add stores manually.");
        }
      }
    } catch {
      setError("Search failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleImport(store: SearchResult) {
    setImporting(store.foursquareId);
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
          source: "api_search",
        }),
      });

      if (res.ok) {
        setImportedIds((prev) => new Set([...prev, store.foursquareId]));
      } else {
        const data = await res.json();
        if (res.status === 409) {
          // Already exists
          setImportedIds((prev) => new Set([...prev, store.foursquareId]));
        } else {
          alert(data.error || "Failed to import");
        }
      }
    } finally {
      setImporting(null);
    }
  }

  async function handleImportAll() {
    for (const store of results) {
      if (!importedIds.has(store.foursquareId)) {
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
          <h1 className="text-2xl font-bold">Find Pet Stores</h1>
          <p className="text-muted-foreground">
            Search by ZIP code or add stores manually
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
          <form onSubmit={handleSearch} className="flex gap-3">
            <div className="relative flex-1 max-w-xs">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Enter ZIP code (e.g. 80202)"
                value={zip}
                onChange={(e) => setZip(e.target.value)}
                className="pl-10"
                maxLength={10}
              />
            </div>
            <Button type="submit" disabled={loading || !zip}>
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Search className="h-4 w-4 mr-2" />
              )}
              Search
            </Button>
          </form>
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
              Found {results.length} pet store{results.length !== 1 ? "s" : ""}{" "}
              near {zip}
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={handleImportAll}
              disabled={results.every((s) => importedIds.has(s.foursquareId))}
            >
              <Import className="h-4 w-4 mr-2" />
              Import All
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {results.map((store) => {
              const isImported = importedIds.has(store.foursquareId);
              const isImporting = importing === store.foursquareId;
              return (
                <Card key={store.foursquareId} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold truncate">{store.name}</h3>
                        <p className="text-sm text-muted-foreground mt-1">
                          {store.address}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {[store.city, store.state, store.zip]
                            .filter(Boolean)
                            .join(", ")}
                        </p>
                      </div>
                      {store.googleRating && (
                        <Badge variant="secondary">
                          ★ {store.googleRating.toFixed(1)}
                        </Badge>
                      )}
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
                    </div>

                    <div className="mt-4">
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
