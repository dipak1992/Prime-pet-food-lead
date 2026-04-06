"use client";

import { useEffect, useState, use } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmailGenerator } from "@/components/email-generator";
import { PIPELINE_STAGES, getStageInfo, formatDate } from "@/lib/utils";
import {
  ArrowLeft,
  Globe,
  Mail,
  Phone,
  Save,
  Trash2,
  Loader2,
  ExternalLink,
  Copy,
  Check,
  Send,
} from "lucide-react";
import Link from "next/link";

interface StoreDetail {
  id: string;
  name: string;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string;
  website: string | null;
  email: string | null;
  phone: string | null;
  instagram: string | null;
  facebook: string | null;
  preferredChannel: string;
  sellsDogTreats: boolean | null;
  sellsCompetitorProducts: boolean;
  competitorBrands: string[];
  relevanceScore: number | null;
  pipelineStage: string;
  lostReason: string | null;
  notes: string | null;
  source: string;
  contactedAt: string | null;
  nextFollowUpAt: string | null;
  createdAt: string;
  updatedAt: string;
  outreachEmails: {
    id: string;
    sequenceStep: number;
    channel: string;
    subject: string | null;
    body: string;
    sentAt: string | null;
    repliedAt: string | null;
    status: string;
    createdAt: string;
  }[];
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

export default function StoreDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const searchParams = useSearchParams();
  const defaultTab = searchParams.get("tab") || "details";

  const [store, setStore] = useState<StoreDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [sendingEmailId, setSendingEmailId] = useState<string | null>(null);
  const [bulkSending, setBulkSending] = useState(false);

  // Editable fields
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [instagram, setInstagram] = useState("");
  const [notes, setNotes] = useState("");
  const [pipelineStage, setPipelineStage] = useState("new");
  const [sellsDogTreats, setSellsDogTreats] = useState("unknown");

  useEffect(() => {
    fetch(`/api/stores/${id}`)
      .then((r) => r.json())
      .then((data: StoreDetail) => {
        setStore(data);
        setEmail(data.email || "");
        setPhone(data.phone || "");
        setInstagram(data.instagram || "");
        setNotes(data.notes || "");
        setPipelineStage(data.pipelineStage);
        setSellsDogTreats(
          data.sellsDogTreats === true
            ? "yes"
            : data.sellsDogTreats === false
              ? "no"
              : "unknown"
        );
      })
      .finally(() => setLoading(false));
  }, [id]);

  async function handleSave() {
    setSaving(true);
    await fetch(`/api/stores/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: email || null,
        phone: phone || null,
        instagram: instagram || null,
        notes: notes || null,
        pipelineStage,
        sellsDogTreats:
          sellsDogTreats === "yes"
            ? true
            : sellsDogTreats === "no"
              ? false
              : null,
      }),
    });
    // Refresh
    const res = await fetch(`/api/stores/${id}`);
    setStore(await res.json());
    setSaving(false);
  }

  async function handleDelete() {
    if (!confirm("Delete this store? This cannot be undone.")) return;
    await fetch(`/api/stores/${id}`, { method: "DELETE" });
    router.push("/pipeline");
  }

  async function handleExtract() {
    setExtracting(true);
    const res = await fetch(`/api/stores/${id}/extract`, { method: "POST" });
    const data = await res.json();
    if (data.emails?.length > 0 && !email) {
      setEmail(data.emails[0]);
    }
    if (data.instagram && !instagram) {
      setInstagram(data.instagram);
    }
    // Refresh store
    const storeRes = await fetch(`/api/stores/${id}`);
    setStore(await storeRes.json());
    setExtracting(false);
    alert(
      data.emails?.length > 0
        ? `Found: ${data.emails.join(", ")}${data.treatKeywords?.length ? `\nTreat keywords: ${data.treatKeywords.join(", ")}` : ""}`
        : "No emails found on the website."
    );
  }

  async function handleDeleteEmail(emailId: string) {
    if (!confirm("Delete this email?")) return;
    try {
      const res = await fetch(`/api/stores/${id}/emails`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emailId }),
      });
      if (!res.ok) {
        const data = await res.json();
        alert(`Delete failed: ${data.error}`);
        return;
      }
      // Refresh store
      const storeRes = await fetch(`/api/stores/${id}`);
      setStore(await storeRes.json());
    } catch {
      alert("Failed to delete email.");
    }
  }

  async function handleSendEmail(emailId: string) {
    setSendingEmailId(emailId);
    try {
      const res = await fetch("/api/emails/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emailId }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(`Send failed: ${data.error}`);
        return;
      }
      alert(`Email sent to ${data.sentTo}`);
      // Refresh store
      const storeRes = await fetch(`/api/stores/${id}`);
      setStore(await storeRes.json());
    } catch {
      alert("Failed to send email. Please try again.");
    } finally {
      setSendingEmailId(null);
    }
  }

  async function handleBulkSend() {
    if (!store) return;
    const drafts = store.outreachEmails.filter((e) => e.status === "draft");
    if (drafts.length === 0) {
      alert("No draft emails to send.");
      return;
    }
    if (!store.email) {
      alert("This store has no email address. Add one in the Details tab first.");
      return;
    }
    if (!confirm(`Send ${drafts.length} draft email(s) to ${store.email}?`)) return;

    setBulkSending(true);
    try {
      const res = await fetch("/api/emails/bulk-send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emailIds: drafts.map((e) => e.id) }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(`Bulk send failed: ${data.error}`);
        return;
      }
      alert(`Sent: ${data.summary.sent}, Skipped: ${data.summary.skipped}, Failed: ${data.summary.failed}`);
      // Refresh store
      const storeRes = await fetch(`/api/stores/${id}`);
      setStore(await storeRes.json());
    } catch {
      alert("Bulk send failed. Please try again.");
    } finally {
      setBulkSending(false);
    }
  }

  async function handleSaveEmail(emailData: {
    subject: string;
    body: string;
    sequenceStep: number;
  }) {
    await fetch(`/api/stores/${id}/emails`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(emailData),
    });
    // Refresh store
    const res = await fetch(`/api/stores/${id}`);
    setStore(await res.json());
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-pulse text-muted-foreground">Loading store...</div>
      </div>
    );
  }

  if (!store) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Store not found</p>
        <Link href="/pipeline">
          <Button variant="outline" className="mt-4">
            Back to Pipeline
          </Button>
        </Link>
      </div>
    );
  }

  const stageInfo = getStageInfo(store.pipelineStage);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <Link href="/pipeline">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">{store.name}</h1>
            <p className="text-muted-foreground">
              {[store.city, store.state].filter(Boolean).join(", ")} {store.zip}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge className={stageInfo.color}>{stageInfo.label}</Badge>
          {store.relevanceScore != null && (
            <Badge
              variant={
                store.relevanceScore >= 70
                  ? "success"
                  : store.relevanceScore >= 40
                    ? "warning"
                    : "secondary"
              }
            >
              Score: {store.relevanceScore}
            </Badge>
          )}
        </div>
      </div>

      <Tabs defaultValue={defaultTab}>
        <TabsList>
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="email">Email Studio</TabsTrigger>
          <TabsTrigger value="outreach">
            Outreach ({store.outreachEmails.length})
          </TabsTrigger>
        </TabsList>

        {/* Details Tab */}
        <TabsContent value="details">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Contact Info */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Contact Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Email</Label>
                  <div className="flex gap-2">
                    <Input
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="store@email.com"
                    />
                    {store.website && (
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={handleExtract}
                        disabled={extracting}
                        title="Extract from website"
                      >
                        {extracting ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <ExternalLink className="h-4 w-4" />
                        )}
                      </Button>
                    )}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Phone</Label>
                  <Input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="(555) 123-4567"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Instagram</Label>
                  <Input
                    value={instagram}
                    onChange={(e) => setInstagram(e.target.value)}
                    placeholder="storename"
                  />
                </div>
                <div className="flex gap-3 text-sm">
                  {store.website && (
                    <a
                      href={store.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-primary hover:underline"
                    >
                      <Globe className="h-3.5 w-3.5" />
                      Website
                    </a>
                  )}
                  {store.facebook && (
                    <a
                      href={`https://facebook.com/${store.facebook}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-primary hover:underline"
                    >
                      Facebook
                    </a>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Store Details */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Store Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Pipeline Stage</Label>
                  <Select value={pipelineStage} onValueChange={setPipelineStage}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PIPELINE_STAGES.map((s) => (
                        <SelectItem key={s.value} value={s.value}>
                          {s.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Sells Dog Treats</Label>
                  <Select value={sellsDogTreats} onValueChange={setSellsDogTreats}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unknown">Unknown</SelectItem>
                      <SelectItem value="yes">Yes</SelectItem>
                      <SelectItem value="no">No</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {store.sellsCompetitorProducts && (
                  <div>
                    <Label>Competitor Brands Detected</Label>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {store.competitorBrands.map((brand) => (
                        <Badge key={brand} variant="warning">
                          {brand}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                <div className="space-y-2">
                  <Label>Notes</Label>
                  <Textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={4}
                    placeholder="Notes about this store..."
                  />
                </div>
                <div className="text-xs text-muted-foreground space-y-1">
                  <p>Source: {store.source}</p>
                  <p>Added: {formatDate(store.createdAt)}</p>
                  {store.contactedAt && (
                    <p>First contacted: {formatDate(store.contactedAt)}</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Save / Delete */}
          <div className="flex items-center justify-between pt-4">
            <Button variant="destructive" size="sm" onClick={handleDelete}>
              <Trash2 className="h-4 w-4 mr-2" />
              Delete Store
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Save Changes
            </Button>
          </div>
        </TabsContent>

        {/* Email Studio Tab */}
        <TabsContent value="email">
          <EmailGenerator
            storeName={store.name}
            storeId={store.id}
            storeEmail={store.email}
            storeCity={store.city}
            storeState={store.state}
            storeWebsite={store.website}
            sellsCompetitorProducts={store.sellsCompetitorProducts}
            competitorBrands={store.competitorBrands}
            sellsDogTreats={store.sellsDogTreats}
            onSave={handleSaveEmail}
          />
        </TabsContent>

        {/* Outreach History Tab */}
        <TabsContent value="outreach">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Outreach History</CardTitle>
              {store.outreachEmails.some((e) => e.status === "draft") && (
                <Button
                  size="sm"
                  onClick={handleBulkSend}
                  disabled={bulkSending}
                >
                  {bulkSending ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Send className="h-4 w-4 mr-2" />
                  )}
                  Send All Drafts
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {store.outreachEmails.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4">
                  No emails generated yet. Go to Email Studio to create one.
                </p>
              ) : (
                <div className="space-y-4">
                  {store.outreachEmails.map((outreach) => (
                    <div
                      key={outreach.id}
                      className="border rounded-lg p-4 space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary">
                            Step {outreach.sequenceStep}
                          </Badge>
                          <Badge
                            variant={
                              outreach.status === "replied"
                                ? "success"
                                : outreach.status === "sent"
                                  ? "default"
                                  : "secondary"
                            }
                          >
                            {outreach.status}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {outreach.channel}
                          </span>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {formatDate(outreach.createdAt)}
                        </span>
                      </div>
                      {outreach.subject && (
                        <p className="font-medium text-sm">
                          {outreach.subject}
                        </p>
                      )}
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                        {outreach.body}
                      </p>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            const text = outreach.subject
                              ? `Subject: ${outreach.subject}\n\n${outreach.body}`
                              : outreach.body;
                            navigator.clipboard.writeText(text);
                          }}
                        >
                          <Copy className="h-3.5 w-3.5 mr-1" />
                          Copy
                        </Button>
                        {outreach.status === "draft" && (
                          <Button
                            size="sm"
                            onClick={() => handleSendEmail(outreach.id)}
                            disabled={sendingEmailId === outreach.id}
                          >
                            {sendingEmailId === outreach.id ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                            ) : (
                              <Send className="h-3.5 w-3.5 mr-1" />
                            )}
                            Send
                          </Button>
                        )}
                        {outreach.sentAt && (
                          <span className="text-xs text-muted-foreground self-center">
                            Sent {formatDate(outreach.sentAt)}
                          </span>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-destructive hover:text-destructive ml-auto"
                          onClick={() => handleDeleteEmail(outreach.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5 mr-1" />
                          Delete
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
