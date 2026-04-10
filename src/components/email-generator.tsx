"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Copy, Check, Loader2, RefreshCw, Send, Sparkles } from "lucide-react";

interface EmailGeneratorProps {
  storeName: string;
  storeId?: string;
  storeEmail?: string | null;
  storeCity?: string | null;
  storeState?: string | null;
  storeWebsite?: string | null;
  leadType?: string | null;
  sellsCompetitorProducts?: boolean;
  competitorBrands?: string[];
  sellsDogTreats?: boolean | null;
  onSave?: (email: { subject: string; body: string; sequenceStep: number }) => void;
}

interface EmailVariant {
  type: "A" | "B" | "C";
  label: string;
  subject: string;
  body: string;
}

const VARIANT_DESCRIPTIONS: Record<string, string> = {
  A: "Curiosity — low pressure, starts conversation",
  B: "Value-Driven — shows business benefit & margins",
  C: "Ultra-Short — under 60 words, quick reply",
};

export function EmailGenerator({
  storeName,
  storeId,
  storeEmail,
  storeCity,
  storeState,
  storeWebsite,
  leadType,
  sellsCompetitorProducts,
  competitorBrands,
  sellsDogTreats,
  onSave,
}: EmailGeneratorProps) {
  const [sequenceStep, setSequenceStep] = useState(1);
  const [variants, setVariants] = useState<EmailVariant[]>([]);
  const [selectedVariant, setSelectedVariant] = useState<"A" | "B" | "C">("A");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [sending, setSending] = useState(false);

  // Which variant object is active
  const activeVariant = variants.find((v) => v.type === selectedVariant);

  async function generate() {
    setLoading(true);
    setVariants([]);
    setSubject("");
    setBody("");

    try {
      const res = await fetch("/api/generate-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storeName,
          storeCity,
          storeState,
          storeWebsite,
          leadType,
          sequenceStep,
          sellsCompetitorProducts,
          competitorBrands,
          sellsDogTreats,
        }),
      });
      const data = await res.json();

      if (data.variants) {
        // Step 1: 3-variant response
        setVariants(data.variants);
        const first = data.variants[0];
        if (first) {
          setSelectedVariant(first.type);
          setSubject(first.subject);
          setBody(first.body);
        }
      } else if (data.subject) {
        // Steps 2-5: single email
        setSubject(data.subject);
        setBody(data.body);
      }
    } catch {
      // Fallback
      setSubject(`Following up — Prime Yak Chews × ${storeName}`);
      setBody(`Hi ${storeName},\n\nWanted to reach out about Prime Yak Chews. Would you be open to learning more?\n\n– [Your Name]\nPrime Pet Food`);
    } finally {
      setLoading(false);
    }
  }

  function selectVariant(type: "A" | "B" | "C") {
    setSelectedVariant(type);
    const v = variants.find((v) => v.type === type);
    if (v) {
      setSubject(v.subject);
      setBody(v.body);
    }
  }

  async function copyAll() {
    const text = `Subject: ${subject}\n\n${body}`;
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const hasContent = !!(subject || body);
  const showVariantTabs = variants.length > 0 && sequenceStep === 1;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          Email Generator
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">

        {/* Controls */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Select
            value={String(sequenceStep)}
            onValueChange={(v) => {
              setSequenceStep(Number(v));
              setVariants([]);
              setSubject("");
              setBody("");
            }}
          >
            <SelectTrigger className="sm:w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">Step 1: Cold Outreach</SelectItem>
              <SelectItem value="2">Step 2: Follow-up (Day 3)</SelectItem>
              <SelectItem value="3">Step 3: Value Add (Day 7)</SelectItem>
              <SelectItem value="4">Step 4: Sample Offer (Day 10)</SelectItem>
              <SelectItem value="5">Step 5: Final (Day 17)</SelectItem>
            </SelectContent>
          </Select>

          <Button onClick={generate} disabled={loading} className="sm:w-auto">
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            {loading
              ? "Generating..."
              : variants.length > 0
                ? "Regenerate"
                : "Generate"}
          </Button>
        </div>

        {sequenceStep === 1 && !hasContent && !loading && (
          <p className="text-xs text-muted-foreground">
            Generates 3 variants — Curiosity, Value-Driven, and Ultra-Short — optimized for reply rate.
          </p>
        )}

        {/* Variant selector tabs (step 1 only) */}
        {showVariantTabs && (
          <div className="grid grid-cols-3 gap-2">
            {variants.map((v) => (
              <button
                key={v.type}
                onClick={() => selectVariant(v.type)}
                className={`text-left rounded-lg border p-3 transition-all text-sm ${
                  selectedVariant === v.type
                    ? "border-primary bg-primary/5 ring-1 ring-primary"
                    : "border-border hover:border-primary/50"
                }`}
              >
                <div className="flex items-center gap-1.5 mb-1">
                  <Badge
                    variant={selectedVariant === v.type ? "default" : "secondary"}
                    className="text-[10px] px-1.5 py-0"
                  >
                    {v.type}
                  </Badge>
                  <span className="font-medium text-xs">{v.label}</span>
                </div>
                <p className="text-[10px] text-muted-foreground leading-tight">
                  {VARIANT_DESCRIPTIONS[v.type]}
                </p>
              </button>
            ))}
          </div>
        )}

        {/* Email fields */}
        {hasContent && (
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Subject
              </label>
              <Textarea
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                rows={1}
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Body
              </label>
              <Textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={10}
                className="mt-1 font-mono text-sm"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button onClick={copyAll} variant="outline" size="sm">
                {copied ? (
                  <Check className="h-4 w-4 mr-1 text-green-600" />
                ) : (
                  <Copy className="h-4 w-4 mr-1" />
                )}
                {copied ? "Copied!" : "Copy All"}
              </Button>
              {onSave && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onSave({ subject, body, sequenceStep })}
                >
                  Save Draft
                </Button>
              )}
              {storeId && storeEmail && (
                <Button
                  size="sm"
                  onClick={async () => {
                    if (!confirm(`Send this email to ${storeEmail}?`)) return;
                    setSending(true);
                    try {
                      const saveRes = await fetch(`/api/stores/${storeId}/emails`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ subject, body, sequenceStep }),
                      });
                      const saved = await saveRes.json();

                      const sendRes = await fetch("/api/emails/send", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ emailId: saved.id }),
                      });
                      const sendData = await sendRes.json();
                      if (!sendRes.ok) {
                        alert(`Send failed: ${sendData.error}`);
                      } else {
                        alert(`Email sent to ${storeEmail}!`);
                        setSubject("");
                        setBody("");
                        setVariants([]);
                      }
                    } catch {
                      alert("Failed to send. Please try again.");
                    } finally {
                      setSending(false);
                    }
                  }}
                  disabled={sending}
                >
                  {sending ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-1" />
                  ) : (
                    <Send className="h-4 w-4 mr-1" />
                  )}
                  {sending ? "Sending..." : "Save & Send"}
                </Button>
              )}
              {storeId && !storeEmail && (
                <span className="text-xs text-muted-foreground self-center">
                  Add store email to enable sending
                </span>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
