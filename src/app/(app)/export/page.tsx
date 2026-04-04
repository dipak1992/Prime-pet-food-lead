"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, FileSpreadsheet } from "lucide-react";

export default function ExportPage() {
  function handleExport() {
    window.location.href = "/api/export";
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Export</h1>
        <p className="text-muted-foreground">
          Download your store leads as CSV
        </p>
      </div>

      <Card className="max-w-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Export to CSV
          </CardTitle>
          <CardDescription>
            Download all stores with contact info, pipeline stage, relevance
            scores, and notes.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={handleExport} className="w-full">
            <Download className="h-4 w-4 mr-2" />
            Download CSV
          </Button>
          <p className="text-xs text-muted-foreground mt-3">
            Includes: name, address, email, phone, Instagram, pipeline stage,
            relevance score, competitor info, and notes.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
