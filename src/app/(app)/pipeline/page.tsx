"use client";

import { useEffect, useState } from "react";
import { StoreTable, type StoreRow } from "@/components/store-table";
import { KanbanBoard } from "@/components/kanban-board";
import { AddStoreDialog, type StoreFormData } from "@/components/add-store-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Plus, LayoutList, Columns3 } from "lucide-react";
import { useRouter } from "next/navigation";

export default function PipelinePage() {
  const [stores, setStores] = useState<StoreRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const router = useRouter();

  async function fetchStores() {
    try {
      const res = await fetch("/api/stores");
      if (!res.ok) {
        console.error("Failed to fetch stores:", res.status);
        setLoading(false);
        return;
      }
      const data = await res.json();
      setStores(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to fetch stores:", err);
    }
    setLoading(false);
  }

  useEffect(() => {
    fetchStores();
  }, []);

  async function handleStageChange(storeId: string, stage: string) {
    // Optimistic update
    setStores((prev) =>
      prev.map((s) => (s.id === storeId ? { ...s, pipelineStage: stage } : s))
    );

    await fetch(`/api/stores/${storeId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pipelineStage: stage }),
    });
  }

  async function handleExtractEmail(storeId: string) {
    const res = await fetch(`/api/stores/${storeId}/extract`, {
      method: "POST",
    });
    const data = await res.json();
    if (data.emails?.length > 0) {
      alert(`Found emails: ${data.emails.join(", ")}`);
    } else {
      alert("No emails found on the website.");
    }
    fetchStores();
  }

  function handleGenerateEmail(storeId: string) {
    router.push(`/stores/${storeId}?tab=email`);
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
    fetchStores();
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-pulse text-muted-foreground">Loading pipeline...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Pipeline</h1>
          <p className="text-muted-foreground">
            Manage your store leads through the outreach pipeline
          </p>
        </div>
        <Button onClick={() => setAddDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Store
        </Button>
      </div>

      <Tabs defaultValue="table">
        <TabsList>
          <TabsTrigger value="table">
            <LayoutList className="h-4 w-4 mr-2" />
            Table
          </TabsTrigger>
          <TabsTrigger value="kanban">
            <Columns3 className="h-4 w-4 mr-2" />
            Kanban
          </TabsTrigger>
        </TabsList>

        <TabsContent value="table">
          <StoreTable
            stores={stores}
            onStageChange={handleStageChange}
            onExtractEmail={handleExtractEmail}
            onGenerateEmail={handleGenerateEmail}
          />
        </TabsContent>

        <TabsContent value="kanban">
          <KanbanBoard stores={stores} onStageChange={handleStageChange} />
        </TabsContent>
      </Tabs>

      <AddStoreDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        onSubmit={handleManualAdd}
      />
    </div>
  );
}
