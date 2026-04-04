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
import { Copy, Check, Loader2, RefreshCw } from "lucide-react";

interface EmailGeneratorProps {
  storeName: string;
  storeCity?: string | null;
  storeState?: string | null;
  storeWebsite?: string | null;
  sellsCompetitorProducts?: boolean;
  competitorBrands?: string[];
  sellsDogTreats?: boolean | null;
  onSave?: (email: { subject: string; body: string; sequenceStep: number }) => void;
}

const TEMPLATE_CATEGORIES = [
  { value: "local_pet_store", label: "Local Pet Store" },
  { value: "boutique", label: "Boutique Pet Shop" },
  { value: "premium_organic", label: "Premium/Organic Store" },
  { value: "competitor_carrier", label: "Carries Competitor" },
  { value: "online_store", label: "Online Store" },
];

export function EmailGenerator({
  storeName,
  storeCity,
  storeState,
  storeWebsite,
  sellsCompetitorProducts,
  competitorBrands,
  sellsDogTreats,
  onSave,
}: EmailGeneratorProps) {
  const [category, setCategory] = useState(
    sellsCompetitorProducts ? "competitor_carrier" : "local_pet_store"
  );
  const [sequenceStep, setSequenceStep] = useState(1);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  async function generateEmail() {
    setLoading(true);
    try {
      const res = await fetch("/api/generate-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storeName,
          storeCity,
          storeState,
          storeWebsite,
          category,
          sequenceStep,
          sellsCompetitorProducts,
          competitorBrands,
          sellsDogTreats,
        }),
      });
      const data = await res.json();
      if (data.subject) setSubject(data.subject);
      if (data.body) setBody(data.body);
    } catch {
      // Fallback template
      setSubject(`Wholesale Partnership — Prime Yak Chews × ${storeName}`);
      setBody(getFallbackTemplate(storeName, storeCity, storeState, category));
    } finally {
      setLoading(false);
    }
  }

  async function copyAll() {
    const text = `Subject: ${subject}\n\n${body}`;
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Email Generator</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="sm:w-52">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TEMPLATE_CATEGORIES.map((c) => (
                <SelectItem key={c.value} value={c.value}>
                  {c.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={String(sequenceStep)}
            onValueChange={(v) => setSequenceStep(Number(v))}
          >
            <SelectTrigger className="sm:w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">Step 1: Intro</SelectItem>
              <SelectItem value="2">Step 2: Follow-up</SelectItem>
              <SelectItem value="3">Step 3: Value Add</SelectItem>
              <SelectItem value="4">Step 4: Sample Offer</SelectItem>
              <SelectItem value="5">Step 5: Last Chance</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={generateEmail} disabled={loading}>
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            Generate
          </Button>
        </div>

        {subject && (
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
                className="mt-1"
              />
            </div>
            <div className="flex gap-2">
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
                  onClick={() => onSave({ subject, body, sequenceStep })}
                >
                  Save to Outreach
                </Button>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function getFallbackTemplate(
  storeName: string,
  city?: string | null,
  state?: string | null,
  category?: string
): string {
  const location = [city, state].filter(Boolean).join(", ");

  if (category === "competitor_carrier") {
    return `Hi ${storeName} Team,

I noticed you already carry yak cheese chews — great taste in products! I'd love to introduce Prime Yak Chews as a complementary (or alternative) option.

Our chews are:
• Single ingredient — 100% Himalayan yak cheese
• Long-lasting — keeps dogs busy 2-3 hours
• 60%+ retail margins on wholesale pricing

Would you be open to trying a free sample pack? I can ship one this week.

Best,
Prime Pet Food Team
info@primepetfood.com`;
  }

  return `Hi ${storeName} Team,

I'm reaching out from Prime Pet Food${location ? ` — we're connecting with great pet stores in ${location}` : ""}.

We make Prime Yak Chews — a premium, single-ingredient Himalayan yak cheese dog chew that customers love:
• 100% natural, no preservatives
• Long-lasting (2-3 hours of chew time)  
• Strong retail margins (60%+)
• Customers come back for more — high repeat purchase rate

Would you be open to a quick chat about wholesale pricing? I'd also be happy to send a free sample pack.

Best,
Prime Pet Food Team
info@primepetfood.com`;
}
