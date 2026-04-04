"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmailGenerator } from "@/components/email-generator";
import { formatDate } from "@/lib/utils";
import { Copy, Check } from "lucide-react";

interface StoreWithEmails {
  id: string;
  name: string;
  city: string | null;
  state: string | null;
  email: string | null;
  website: string | null;
  sellsCompetitorProducts: boolean;
  competitorBrands: string[];
  sellsDogTreats: boolean | null;
  _count: { outreachEmails: number };
}

export default function EmailsPage() {
  const [stores, setStores] = useState<StoreWithEmails[]>([]);
  const [selectedStore, setSelectedStore] = useState<StoreWithEmails | null>(
    null
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/stores?stage=all")
      .then((r) => r.json())
      .then((data) => {
        const list = Array.isArray(data) ? data : [];
        setStores(list);
        if (list.length > 0) setSelectedStore(list[0]);
      })
      .catch(() => setStores([]))
      .finally(() => setLoading(false));
  }, []);

  async function handleSaveEmail(emailData: {
    subject: string;
    body: string;
    sequenceStep: number;
  }) {
    if (!selectedStore) return;
    await fetch(`/api/stores/${selectedStore.id}/emails`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(emailData),
    });
    // Refresh counts
    const res = await fetch("/api/stores?stage=all");
    setStores(await res.json());
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-pulse text-muted-foreground">
          Loading email studio...
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Email Studio</h1>
        <p className="text-muted-foreground">
          Generate personalized outreach emails for your stores
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Store Selector */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Select Store</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="max-h-[600px] overflow-y-auto">
                {stores.map((store) => (
                  <button
                    key={store.id}
                    onClick={() => setSelectedStore(store)}
                    className={`w-full text-left px-4 py-3 border-b hover:bg-muted/50 transition-colors cursor-pointer ${
                      selectedStore?.id === store.id ? "bg-primary/5" : ""
                    }`}
                  >
                    <p className="font-medium text-sm truncate">{store.name}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-muted-foreground">
                        {[store.city, store.state].filter(Boolean).join(", ")}
                      </span>
                      {store._count.outreachEmails > 0 && (
                        <Badge variant="secondary" className="text-[10px]">
                          {store._count.outreachEmails} email
                          {store._count.outreachEmails !== 1 ? "s" : ""}
                        </Badge>
                      )}
                    </div>
                  </button>
                ))}
                {stores.length === 0 && (
                  <p className="text-sm text-muted-foreground p-4">
                    No stores yet. Add some from the Search page.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Email Generator */}
        <div className="lg:col-span-2">
          {selectedStore ? (
            <EmailGenerator
              storeName={selectedStore.name}
              storeCity={selectedStore.city}
              storeState={selectedStore.state}
              storeWebsite={selectedStore.website}
              sellsCompetitorProducts={selectedStore.sellsCompetitorProducts}
              competitorBrands={selectedStore.competitorBrands}
              sellsDogTreats={selectedStore.sellsDogTreats}
              onSave={handleSaveEmail}
            />
          ) : (
            <Card>
              <CardContent className="p-12 text-center text-muted-foreground">
                Select a store to generate outreach emails
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
