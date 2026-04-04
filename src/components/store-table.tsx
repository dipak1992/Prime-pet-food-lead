"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { getStageInfo, PIPELINE_STAGES, formatDate } from "@/lib/utils";
import {
  Globe,
  Mail,
  Phone,
  ExternalLink,
  ChevronUp,
  ChevronDown,
  MoreHorizontal,
  Sparkles,
  Copy,
} from "lucide-react";
import Link from "next/link";

export interface StoreRow {
  id: string;
  name: string;
  city?: string | null;
  state?: string | null;
  zip: string;
  website?: string | null;
  email?: string | null;
  phone?: string | null;
  instagram?: string | null;
  sellsDogTreats?: boolean | null;
  sellsCompetitorProducts: boolean;
  relevanceScore?: number | null;
  pipelineStage: string;
  source: string;
  createdAt: string;
  contactedAt?: string | null;
  nextFollowUpAt?: string | null;
}

interface StoreTableProps {
  stores: StoreRow[];
  onStageChange: (storeId: string, stage: string) => void;
  onExtractEmail: (storeId: string) => void;
  onGenerateEmail: (storeId: string) => void;
}

type SortField = "name" | "relevanceScore" | "createdAt" | "pipelineStage";
type SortDir = "asc" | "desc";

export function StoreTable({
  stores,
  onStageChange,
  onExtractEmail,
  onGenerateEmail,
}: StoreTableProps) {
  const [search, setSearch] = useState("");
  const [stageFilter, setStageFilter] = useState("all");
  const [sortField, setSortField] = useState<SortField>("createdAt");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const filtered = stores
    .filter((s) => {
      const q = search.toLowerCase();
      const matchesSearch =
        !q ||
        s.name.toLowerCase().includes(q) ||
        s.city?.toLowerCase().includes(q) ||
        s.state?.toLowerCase().includes(q) ||
        s.zip.includes(q);
      const matchesStage =
        stageFilter === "all" || s.pipelineStage === stageFilter;
      return matchesSearch && matchesStage;
    })
    .sort((a, b) => {
      const dir = sortDir === "asc" ? 1 : -1;
      if (sortField === "name") return a.name.localeCompare(b.name) * dir;
      if (sortField === "relevanceScore")
        return ((a.relevanceScore || 0) - (b.relevanceScore || 0)) * dir;
      if (sortField === "pipelineStage")
        return a.pipelineStage.localeCompare(b.pipelineStage) * dir;
      return (
        (new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()) *
        dir
      );
    });

  function toggleSort(field: SortField) {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("desc");
    }
  }

  const SortIcon = ({ field }: { field: SortField }) =>
    sortField === field ? (
      sortDir === "asc" ? (
        <ChevronUp className="h-3 w-3" />
      ) : (
        <ChevronDown className="h-3 w-3" />
      )
    ) : (
      <MoreHorizontal className="h-3 w-3 opacity-30" />
    );

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Input
          placeholder="Search stores..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="sm:max-w-xs"
        />
        <Select value={stageFilter} onValueChange={setStageFilter}>
          <SelectTrigger className="sm:w-48">
            <SelectValue placeholder="All stages" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Stages</SelectItem>
            {PIPELINE_STAGES.map((s) => (
              <SelectItem key={s.value} value={s.value}>
                {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="text-sm text-muted-foreground self-center ml-auto">
          {filtered.length} store{filtered.length !== 1 ? "s" : ""}
        </div>
      </div>

      {/* Table */}
      <div className="border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th
                  className="text-left px-4 py-3 font-medium cursor-pointer select-none"
                  onClick={() => toggleSort("name")}
                >
                  <span className="flex items-center gap-1">
                    Store <SortIcon field="name" />
                  </span>
                </th>
                <th className="text-left px-4 py-3 font-medium">Location</th>
                <th className="text-left px-4 py-3 font-medium">Contact</th>
                <th
                  className="text-left px-4 py-3 font-medium cursor-pointer select-none"
                  onClick={() => toggleSort("relevanceScore")}
                >
                  <span className="flex items-center gap-1">
                    Score <SortIcon field="relevanceScore" />
                  </span>
                </th>
                <th
                  className="text-left px-4 py-3 font-medium cursor-pointer select-none"
                  onClick={() => toggleSort("pipelineStage")}
                >
                  <span className="flex items-center gap-1">
                    Stage <SortIcon field="pipelineStage" />
                  </span>
                </th>
                <th className="text-right px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtered.map((store) => {
                const stage = getStageInfo(store.pipelineStage);
                return (
                  <tr key={store.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3">
                      <Link
                        href={`/stores/${store.id}`}
                        className="font-medium hover:text-primary transition-colors"
                      >
                        {store.name}
                      </Link>
                      <div className="flex items-center gap-2 mt-1">
                        {store.sellsDogTreats === true && (
                          <Badge variant="success" className="text-[10px]">
                            Treats
                          </Badge>
                        )}
                        {store.sellsCompetitorProducts && (
                          <Badge variant="warning" className="text-[10px]">
                            Competitor
                          </Badge>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {[store.city, store.state].filter(Boolean).join(", ")}{" "}
                      {store.zip}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {store.email && (
                          <button
                            title={store.email}
                            className="text-muted-foreground hover:text-primary cursor-pointer"
                            onClick={() =>
                              navigator.clipboard.writeText(store.email!)
                            }
                          >
                            <Mail className="h-4 w-4" />
                          </button>
                        )}
                        {store.phone && (
                          <a
                            href={`tel:${store.phone}`}
                            className="text-muted-foreground hover:text-primary"
                          >
                            <Phone className="h-4 w-4" />
                          </a>
                        )}
                        {store.website && (
                          <a
                            href={store.website}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-muted-foreground hover:text-primary"
                          >
                            <Globe className="h-4 w-4" />
                          </a>
                        )}
                        {store.instagram && (
                          <a
                            href={`https://instagram.com/${store.instagram.replace("@", "")}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-muted-foreground hover:text-primary text-xs"
                            title={`@${store.instagram}`}
                          >
                            IG
                          </a>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {store.relevanceScore != null ? (
                        <span
                          className={`font-semibold ${
                            store.relevanceScore >= 70
                              ? "text-green-600"
                              : store.relevanceScore >= 40
                                ? "text-yellow-600"
                                : "text-gray-400"
                          }`}
                        >
                          {store.relevanceScore}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <Select
                        value={store.pipelineStage}
                        onValueChange={(v) => onStageChange(store.id, v)}
                      >
                        <SelectTrigger className="h-7 text-xs w-32 border-0 bg-transparent">
                          <Badge className={stage.color}>{stage.label}</Badge>
                        </SelectTrigger>
                        <SelectContent>
                          {PIPELINE_STAGES.map((s) => (
                            <SelectItem key={s.value} value={s.value}>
                              {s.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        {store.website && !store.email && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => onExtractEmail(store.id)}
                            title="Extract email from website"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => onGenerateEmail(store.id)}
                          title="Generate outreach email"
                        >
                          <Sparkles className="h-3.5 w-3.5" />
                        </Button>
                        {store.email && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() =>
                              navigator.clipboard.writeText(store.email!)
                            }
                            title="Copy email"
                          >
                            <Copy className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-12 text-center text-muted-foreground"
                  >
                    No stores found. Try adjusting your filters or add a store
                    manually.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
