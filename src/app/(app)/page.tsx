"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Store,
  Mail,
  TrendingUp,
  Target,
  AlertCircle,
  ArrowRight,
  Plus,
} from "lucide-react";
import { PIPELINE_STAGES, getStageInfo, formatDate } from "@/lib/utils";
import Link from "next/link";

interface DashboardData {
  totalStores: number;
  pipeline: Record<string, number>;
  hotLeads: number;
  withEmail: number;
  withTreats: number;
  recentStores: {
    id: string;
    name: string;
    pipelineStage: string;
    relevanceScore: number | null;
    createdAt: string;
  }[];
  actionItems: {
    id: string;
    name: string;
    pipelineStage: string;
    contactedAt: string | null;
    email: string | null;
    phone: string | null;
  }[];
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/dashboard")
      .then((r) => r.json())
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-pulse text-muted-foreground">Loading dashboard...</div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">
            Prime Pet Leads — B2B outreach overview
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/search">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Find Stores
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Stores</p>
                <p className="text-3xl font-bold mt-1">{data.totalStores}</p>
              </div>
              <Store className="h-8 w-8 text-muted-foreground/50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Hot Leads</p>
                <p className="text-3xl font-bold mt-1 text-green-600">
                  {data.hotLeads}
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-500/50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">With Email</p>
                <p className="text-3xl font-bold mt-1">{data.withEmail}</p>
              </div>
              <Mail className="h-8 w-8 text-muted-foreground/50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Sell Treats</p>
                <p className="text-3xl font-bold mt-1">{data.withTreats}</p>
              </div>
              <Target className="h-8 w-8 text-muted-foreground/50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pipeline Overview */}
      <Card>
        <CardHeader>
          <CardTitle>Pipeline</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            {PIPELINE_STAGES.map((stage) => (
              <div
                key={stage.value}
                className="flex items-center gap-2 rounded-lg border px-4 py-3 min-w-[140px]"
              >
                <Badge className={stage.color}>{stage.label}</Badge>
                <span className="font-bold text-lg">
                  {data.pipeline[stage.value] || 0}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Action Items */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-yellow-500" />
              Follow-Up Needed
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.actionItems.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4">
                No follow-ups needed right now. Nice work!
              </p>
            ) : (
              <div className="space-y-3">
                {data.actionItems.map((item) => {
                  const stage = getStageInfo(item.pipelineStage);
                  return (
                    <Link
                      key={item.id}
                      href={`/stores/${item.id}`}
                      className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                    >
                      <div>
                        <p className="font-medium text-sm">{item.name}</p>
                        <p className="text-xs text-muted-foreground">
                          Contacted{" "}
                          {item.contactedAt
                            ? formatDate(item.contactedAt)
                            : "—"}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={stage.color}>{stage.label}</Badge>
                        <ArrowRight className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Stores */}
        <Card>
          <CardHeader>
            <CardTitle>Recently Added</CardTitle>
          </CardHeader>
          <CardContent>
            {data.recentStores.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4">
                No stores yet.{" "}
                <Link href="/search" className="text-primary hover:underline">
                  Find some!
                </Link>
              </p>
            ) : (
              <div className="space-y-3">
                {data.recentStores.map((store) => {
                  const stage = getStageInfo(store.pipelineStage);
                  return (
                    <Link
                      key={store.id}
                      href={`/stores/${store.id}`}
                      className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                    >
                      <div>
                        <p className="font-medium text-sm">{store.name}</p>
                        <p className="text-xs text-muted-foreground">
                          Score:{" "}
                          {store.relevanceScore != null
                            ? store.relevanceScore
                            : "—"}
                        </p>
                      </div>
                      <Badge className={stage.color}>{stage.label}</Badge>
                    </Link>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
