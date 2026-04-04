"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PIPELINE_STAGES, getStageInfo } from "@/lib/utils";
import { GripVertical, Mail, Phone } from "lucide-react";

interface KanbanStore {
  id: string;
  name: string;
  city?: string | null;
  state?: string | null;
  zip: string;
  email?: string | null;
  phone?: string | null;
  instagram?: string | null;
  relevanceScore?: number | null;
  pipelineStage: string;
  sellsDogTreats?: boolean | null;
  sellsCompetitorProducts: boolean;
}

interface KanbanBoardProps {
  stores: KanbanStore[];
  onStageChange: (storeId: string, newStage: string) => void;
}

export function KanbanBoard({ stores, onStageChange }: KanbanBoardProps) {
  const [draggedId, setDraggedId] = useState<string | null>(null);

  function handleDragStart(storeId: string) {
    setDraggedId(storeId);
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
  }

  function handleDrop(stage: string) {
    if (draggedId) {
      onStageChange(draggedId, stage);
      setDraggedId(null);
    }
  }

  return (
    <div className="flex gap-4 overflow-x-auto pb-4 min-h-[600px]">
      {PIPELINE_STAGES.map((stage) => {
        const stageStores = stores.filter(
          (s) => s.pipelineStage === stage.value
        );
        return (
          <div
            key={stage.value}
            className="flex-shrink-0 w-72"
            onDragOver={handleDragOver}
            onDrop={() => handleDrop(stage.value)}
          >
            <div className="flex items-center justify-between mb-3 px-1">
              <div className="flex items-center gap-2">
                <Badge className={stage.color}>{stage.label}</Badge>
                <span className="text-xs text-muted-foreground">
                  {stageStores.length}
                </span>
              </div>
            </div>
            <div className="space-y-2 min-h-[200px] rounded-lg bg-muted/30 p-2">
              {stageStores.map((store) => (
                <Card
                  key={store.id}
                  className="cursor-grab active:cursor-grabbing shadow-sm hover:shadow-md transition-shadow"
                  draggable
                  onDragStart={() => handleDragStart(store.id)}
                >
                  <CardContent className="p-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">
                          {store.name}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {[store.city, store.state].filter(Boolean).join(", ")}{" "}
                          {store.zip}
                        </p>
                      </div>
                      <GripVertical className="h-4 w-4 text-muted-foreground/50 flex-shrink-0" />
                    </div>
                    <div className="flex items-center gap-2 mt-2">
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
                      {store.relevanceScore != null &&
                        store.relevanceScore >= 70 && (
                          <Badge variant="default" className="text-[10px]">
                            Hot
                          </Badge>
                        )}
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      {store.email && (
                        <Mail className="h-3 w-3 text-muted-foreground" />
                      )}
                      {store.phone && (
                        <Phone className="h-3 w-3 text-muted-foreground" />
                      )}
                      {store.instagram && (
                        <span className="text-[10px] text-muted-foreground font-medium">IG</span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
