"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/utils";
import { Package, Truck, MessageSquare, ShoppingCart } from "lucide-react";
import Link from "next/link";

interface SampleStore {
  id: string;
  name: string;
  city: string | null;
  state: string | null;
  pipelineStage: string;
  samples: {
    id: string;
    status: string;
    shippedAt: string | null;
    deliveredAt: string | null;
    feedback: string | null;
    trackingNumber: string | null;
    createdAt: string;
  }[];
}

const SAMPLE_STATUS_MAP: Record<
  string,
  { label: string; color: "default" | "secondary" | "success" | "warning" | "destructive" }
> = {
  requested: { label: "Requested", color: "secondary" },
  shipped: { label: "Shipped", color: "default" },
  delivered: { label: "Delivered", color: "warning" },
  feedback_received: { label: "Feedback", color: "success" },
  order_placed: { label: "Order Placed!", color: "success" },
  declined: { label: "Declined", color: "destructive" },
};

export default function SamplesPage() {
  const [stores, setStores] = useState<SampleStore[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/stores?stage=sample_sent")
      .then((r) => r.json())
      .then((data) => {
        setStores(data.filter((s: SampleStore) => s.pipelineStage === "sample_sent" || (s.samples && s.samples.length > 0)));
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-pulse text-muted-foreground">Loading samples...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Sample Tracking</h1>
        <p className="text-muted-foreground">
          Track sample shipments and store feedback
        </p>
      </div>

      {stores.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Package className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
            <p className="text-muted-foreground">
              No samples to track yet. Move stores to &ldquo;Sample Sent&rdquo; stage in the
              pipeline to track them here.
            </p>
            <Link href="/pipeline">
              <Button variant="outline" className="mt-4">
                Go to Pipeline
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {stores.map((store) => (
            <Card key={store.id}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <Link
                    href={`/stores/${store.id}`}
                    className="hover:text-primary transition-colors"
                  >
                    <CardTitle className="text-base">{store.name}</CardTitle>
                  </Link>
                  <Badge variant="secondary">
                    {[store.city, store.state].filter(Boolean).join(", ")}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                {store.samples?.length > 0 ? (
                  <div className="space-y-2">
                    {store.samples.map((sample) => {
                      const statusInfo =
                        SAMPLE_STATUS_MAP[sample.status] ||
                        SAMPLE_STATUS_MAP.requested;
                      return (
                        <div
                          key={sample.id}
                          className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                        >
                          <div>
                            <Badge variant={statusInfo.color}>
                              {statusInfo.label}
                            </Badge>
                            {sample.trackingNumber && (
                              <p className="text-xs text-muted-foreground mt-1">
                                Tracking: {sample.trackingNumber}
                              </p>
                            )}
                            {sample.feedback && (
                              <p className="text-xs mt-1">{sample.feedback}</p>
                            )}
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {formatDate(sample.createdAt)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Stage set to Sample Sent — add tracking info in store details.
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
