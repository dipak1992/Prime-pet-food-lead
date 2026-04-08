"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/utils";
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Target,
  BarChart3,
  Award,
  XCircle,
  Clock,
  Play,
  Pause,
  Square,
  Send,
  Loader2,
  Mail,
} from "lucide-react";
import Link from "next/link";

interface AnalyticsData {
  deals: {
    total: number;
    won: number;
    lost: number;
    open: number;
    totalRevenue: number;
    winRate: string;
  };
  pipeline: Record<string, number>;
  conversionRate: string;
  responseRate: string;
  emailCounts: Record<string, number>;
  followUps: { active: number; completed: number };
  recentWins: {
    id: string;
    title: string;
    value: string;
    closedAt: string;
    store: { id: string; name: string; city: string | null; state: string | null };
  }[];
  recentLosses: {
    id: string;
    title: string;
    value: string;
    lostReason: string | null;
    closedAt: string;
    store: { id: string; name: string; city: string | null; state: string | null };
  }[];
  lostReasons: { reason: string; count: number }[];
}

interface FollowUpSequence {
  id: string;
  storeId: string;
  status: string;
  currentStep: number;
  totalSteps: number;
  nextSendAt: string | null;
  lastSentAt: string | null;
  category: string;
  store: {
    id: string;
    name: string;
    email: string | null;
    city: string | null;
    state: string | null;
    pipelineStage: string;
  };
}

export default function DealsPage() {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [followUps, setFollowUps] = useState<FollowUpSequence[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [checkingReplies, setCheckingReplies] = useState(false);
  const [actioningId, setActioningId] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetch("/api/analytics").then((r) => r.json()),
      fetch("/api/follow-ups").then((r) => r.json()),
    ])
      .then(([analyticsData, followUpsData]) => {
        setAnalytics(analyticsData);
        setFollowUps(Array.isArray(followUpsData) ? followUpsData : []);
      })
      .finally(() => setLoading(false));
  }, []);

  async function processFollowUps() {
    setProcessing(true);
    try {
      const res = await fetch("/api/follow-ups/process");
      const data = await res.json();
      alert(`Processed: ${data.sent} sent, ${data.skipped} skipped, ${data.failed} failed`);
      // Refresh
      const [a, f] = await Promise.all([
        fetch("/api/analytics").then((r) => r.json()),
        fetch("/api/follow-ups").then((r) => r.json()),
      ]);
      setAnalytics(a);
      setFollowUps(Array.isArray(f) ? f : []);
    } catch {
      alert("Failed to process follow-ups");
    } finally {
      setProcessing(false);
    }
  }

  async function checkReplies() {
    setCheckingReplies(true);
    try {
      const res = await fetch("/api/replies/process");
      const data = await res.json();
      if (!res.ok) {
        alert(`Reply check failed: ${data.error}`);
        return;
      }
      alert(`Checked ${data.checked} store emails. Found ${data.repliesFound} new replies!`);
      // Refresh analytics
      const a = await fetch("/api/analytics").then((r) => r.json());
      setAnalytics(a);
    } catch {
      alert("Failed to check replies");
    } finally {
      setCheckingReplies(false);
    }
  }

  async function handleSequenceAction(seqId: string, action: "pause" | "resume" | "cancel") {
    setActioningId(seqId);
    try {
      await fetch(`/api/follow-ups/${seqId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const f = await fetch("/api/follow-ups").then((r) => r.json());
      setFollowUps(Array.isArray(f) ? f : []);
    } finally {
      setActioningId(null);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-pulse text-muted-foreground">Loading analytics...</div>
      </div>
    );
  }

  if (!analytics) return null;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Deals & Analytics</h1>
        <p className="text-muted-foreground">
          Revenue tracking, win/loss analysis, and auto follow-ups
        </p>
      </div>

      {/* Revenue Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Revenue</p>
                <p className="text-3xl font-bold mt-1 text-green-600">
                  ${analytics.deals.totalRevenue.toLocaleString()}
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-green-500/50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Win Rate</p>
                <p className="text-3xl font-bold mt-1">{analytics.deals.winRate}%</p>
              </div>
              <TrendingUp className="h-8 w-8 text-muted-foreground/50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Open Deals</p>
                <p className="text-3xl font-bold mt-1">{analytics.deals.open}</p>
              </div>
              <Target className="h-8 w-8 text-muted-foreground/50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Response Rate</p>
                <p className="text-3xl font-bold mt-1">{analytics.responseRate}%</p>
              </div>
              <BarChart3 className="h-8 w-8 text-muted-foreground/50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Follow-Up Sequences */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Auto Follow-Up Sequences</CardTitle>
          <Button size="sm" onClick={processFollowUps} disabled={processing}>
            {processing ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Send className="h-4 w-4 mr-2" />
            )}
            Process Due Follow-Ups
          </Button>
        </CardHeader>
        <CardContent>
          {followUps.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">
              No follow-up sequences yet. Start one from a store&apos;s detail page.
            </p>
          ) : (
            <div className="space-y-3">
              {followUps.map((seq) => (
                <div key={seq.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/stores/${seq.store.id}`}
                        className="font-medium text-sm hover:text-primary"
                      >
                        {seq.store.name}
                      </Link>
                      <Badge
                        variant={
                          seq.status === "active" ? "success" :
                          seq.status === "paused" ? "warning" :
                          seq.status === "completed" ? "secondary" : "destructive"
                        }
                      >
                        {seq.status}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        Step {seq.currentStep}/{seq.totalSteps}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                      {seq.store.email && <span>{seq.store.email}</span>}
                      {seq.nextSendAt && seq.status === "active" && (
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          Next: {formatDate(seq.nextSendAt)}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    {seq.status === "active" && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleSequenceAction(seq.id, "pause")}
                        disabled={actioningId === seq.id}
                        title="Pause"
                      >
                        <Pause className="h-3.5 w-3.5" />
                      </Button>
                    )}
                    {seq.status === "paused" && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleSequenceAction(seq.id, "resume")}
                        disabled={actioningId === seq.id}
                        title="Resume"
                      >
                        <Play className="h-3.5 w-3.5" />
                      </Button>
                    )}
                    {(seq.status === "active" || seq.status === "paused") && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-destructive"
                        onClick={() => handleSequenceAction(seq.id, "cancel")}
                        disabled={actioningId === seq.id}
                        title="Cancel"
                      >
                        <Square className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Wins */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5 text-green-500" />
              Recent Wins
            </CardTitle>
          </CardHeader>
          <CardContent>
            {analytics.recentWins.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4">
                No deals won yet. Keep reaching out!
              </p>
            ) : (
              <div className="space-y-3">
                {analytics.recentWins.map((deal) => (
                  <Link
                    key={deal.id}
                    href={`/stores/${deal.store.id}`}
                    className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                  >
                    <div>
                      <p className="font-medium text-sm">{deal.store.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {[deal.store.city, deal.store.state].filter(Boolean).join(", ")}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-green-600">${Number(deal.value).toLocaleString()}</p>
                      <p className="text-xs text-muted-foreground">{formatDate(deal.closedAt)}</p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Losses + Reasons */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <XCircle className="h-5 w-5 text-red-500" />
              Recent Losses
            </CardTitle>
          </CardHeader>
          <CardContent>
            {analytics.recentLosses.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4">
                No deals lost. Great track record!
              </p>
            ) : (
              <div className="space-y-3">
                {analytics.recentLosses.map((deal) => (
                  <Link
                    key={deal.id}
                    href={`/stores/${deal.store.id}`}
                    className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                  >
                    <div>
                      <p className="font-medium text-sm">{deal.store.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {deal.lostReason || "No reason given"}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-red-600">${Number(deal.value).toLocaleString()}</p>
                      <p className="text-xs text-muted-foreground">{formatDate(deal.closedAt)}</p>
                    </div>
                  </Link>
                ))}
              </div>
            )}

            {analytics.lostReasons.length > 0 && (
              <div className="mt-4 pt-4 border-t">
                <p className="text-xs font-medium text-muted-foreground uppercase mb-2">Top Loss Reasons</p>
                <div className="space-y-1">
                  {analytics.lostReasons.map((r) => (
                    <div key={r.reason} className="flex items-center justify-between text-sm">
                      <span>{r.reason}</span>
                      <Badge variant="secondary">{r.count}</Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Email Performance */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Email Performance</CardTitle>
          <Button size="sm" variant="outline" onClick={checkReplies} disabled={checkingReplies}>
            {checkingReplies ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Mail className="h-4 w-4 mr-2" />
            )}
            Check Replies
          </Button>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center gap-2 rounded-lg border px-4 py-3">
              <span className="text-sm text-muted-foreground">Drafts</span>
              <span className="font-bold text-lg">{analytics.emailCounts["draft"] || 0}</span>
            </div>
            <div className="flex items-center gap-2 rounded-lg border px-4 py-3">
              <span className="text-sm text-muted-foreground">Sent</span>
              <span className="font-bold text-lg">{analytics.emailCounts["sent"] || 0}</span>
            </div>
            <div className="flex items-center gap-2 rounded-lg border px-4 py-3">
              <span className="text-sm text-muted-foreground">Replied</span>
              <span className="font-bold text-lg text-green-600">{analytics.emailCounts["replied"] || 0}</span>
            </div>
            <div className="flex items-center gap-2 rounded-lg border px-4 py-3">
              <span className="text-sm text-muted-foreground">No Response</span>
              <span className="font-bold text-lg text-muted-foreground">{analytics.emailCounts["no_response"] || 0}</span>
            </div>
            <div className="flex items-center gap-2 rounded-lg border px-4 py-3">
              <span className="text-sm text-muted-foreground">Active Sequences</span>
              <span className="font-bold text-lg">{analytics.followUps.active}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
