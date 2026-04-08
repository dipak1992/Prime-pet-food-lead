"use client";

import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import {
  Upload,
  FileSpreadsheet,
  Loader2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Download,
  X,
} from "lucide-react";

interface CsvImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete?: () => void;
}

interface ParsedRow {
  [key: string]: string;
}

interface ImportResult {
  row: number;
  name: string;
  status: "imported" | "duplicate" | "error";
  error?: string;
}

interface ImportResponse {
  total: number;
  imported: number;
  duplicates: number;
  errors: number;
  results: ImportResult[];
}

// Known column names mapped to our field names
const COLUMN_MAP: Record<string, string> = {
  name: "name",
  "store name": "name",
  "business name": "name",
  "company name": "name",
  storename: "name",
  address: "address",
  "street address": "address",
  street: "address",
  city: "city",
  state: "state",
  st: "state",
  zip: "zip",
  "zip code": "zip",
  zipcode: "zip",
  postal: "zip",
  "postal code": "zip",
  website: "website",
  url: "website",
  web: "website",
  email: "email",
  "email address": "email",
  phone: "phone",
  "phone number": "phone",
  telephone: "phone",
  tel: "phone",
  instagram: "instagram",
  ig: "instagram",
  facebook: "facebook",
  fb: "facebook",
  notes: "notes",
  "lead type": "leadType",
  leadtype: "leadType",
  type: "leadType",
  "sells dog treats": "sellsDogTreats",
  "dog treats": "sellsDogTreats",
  treats: "sellsDogTreats",
};

function parseCSV(text: string): { headers: string[]; rows: ParsedRow[] } {
  const lines = text.split(/\r?\n/).filter((line) => line.trim());
  if (lines.length === 0) return { headers: [], rows: [] };

  // Parse header
  const headers = parseCsvLine(lines[0]);

  // Parse data rows
  const rows: ParsedRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const values = parseCsvLine(lines[i]);
    if (values.every((v) => !v.trim())) continue; // skip empty rows
    const row: ParsedRow = {};
    headers.forEach((h, idx) => {
      row[h] = values[idx]?.trim() || "";
    });
    rows.push(row);
  }

  return { headers, rows };
}

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
}

function mapColumns(
  headers: string[],
  rows: ParsedRow[]
): { mappedHeaders: Record<string, string>; mappedRows: Record<string, string>[] } {
  const mappedHeaders: Record<string, string> = {};

  for (const header of headers) {
    const normalized = header.toLowerCase().trim();
    if (COLUMN_MAP[normalized]) {
      mappedHeaders[header] = COLUMN_MAP[normalized];
    }
  }

  const mappedRows = rows.map((row) => {
    const mapped: Record<string, string> = {};
    for (const [original, field] of Object.entries(mappedHeaders)) {
      if (row[original]) {
        mapped[field] = row[original];
      }
    }
    return mapped;
  });

  return { mappedHeaders, mappedRows };
}

function downloadSampleCSV() {
  const csv = `name,address,city,state,zip,email,phone,website,instagram,facebook,notes,leadType,sellsDogTreats
Happy Paws Pet Shop,123 Main St,Denver,CO,80202,info@happypaws.com,(303) 555-0100,https://happypaws.com,happypawspet,,Great local shop,pet_store,yes
Bark & Bath Grooming,456 Oak Ave,Boulder,CO,80301,hello@barkandbath.com,(303) 555-0200,https://barkandbath.com,,,Mobile grooming too,groomer,unknown`;

  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "sample-leads.csv";
  a.click();
  URL.revokeObjectURL(url);
}

type Step = "upload" | "preview" | "importing" | "done";

export function CsvImportDialog({
  open,
  onOpenChange,
  onComplete,
}: CsvImportDialogProps) {
  const [step, setStep] = useState<Step>("upload");
  const [file, setFile] = useState<File | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [mappedHeaders, setMappedHeaders] = useState<Record<string, string>>({});
  const [rows, setRows] = useState<Record<string, string>[]>([]);
  const [importResult, setImportResult] = useState<ImportResponse | null>(null);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const reset = useCallback(() => {
    setStep("upload");
    setFile(null);
    setHeaders([]);
    setMappedHeaders({});
    setRows([]);
    setImportResult(null);
    setProgress(0);
    setError("");
    setDragOver(false);
  }, []);

  function handleClose(open: boolean) {
    if (!open) reset();
    onOpenChange(open);
  }

  async function handleFile(f: File) {
    setError("");

    if (!f.name.endsWith(".csv")) {
      setError("Please upload a .csv file");
      return;
    }

    if (f.size > 5 * 1024 * 1024) {
      setError("File too large. Maximum 5MB.");
      return;
    }

    setFile(f);

    try {
      const text = await f.text();
      const parsed = parseCSV(text);

      if (parsed.headers.length === 0) {
        setError("Could not parse CSV headers");
        return;
      }

      if (parsed.rows.length === 0) {
        setError("CSV has no data rows");
        return;
      }

      setHeaders(parsed.headers);
      const { mappedHeaders: mh, mappedRows: mr } = mapColumns(
        parsed.headers,
        parsed.rows
      );

      if (!mh || !Object.values(mh).includes("name")) {
        setError(
          'Could not find a "name" column. Make sure your CSV has a column called "name", "store name", or "business name".'
        );
        return;
      }

      setMappedHeaders(mh);
      setRows(mr);
      setStep("preview");
    } catch {
      setError("Failed to parse CSV file");
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  }

  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) handleFile(f);
  }

  async function handleImport() {
    setStep("importing");
    setProgress(0);

    // Send in batches of 50 for progress updates
    const BATCH_SIZE = 50;
    const allResults: ImportResult[] = [];
    let totalImported = 0;
    let totalDuplicates = 0;
    let totalErrors = 0;

    for (let i = 0; i < rows.length; i += BATCH_SIZE) {
      const batch = rows.slice(i, i + BATCH_SIZE);

      try {
        const res = await fetch("/api/stores/bulk-import", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ rows: batch }),
        });

        if (!res.ok) {
          const data = await res.json().catch(() => ({ error: "Import failed" }));
          // Mark remaining in batch as errors
          batch.forEach((row, idx) => {
            allResults.push({
              row: i + idx + 1,
              name: row.name || "(unknown)",
              status: "error",
              error: data.error || "Import failed",
            });
          });
          totalErrors += batch.length;
        } else {
          const data: ImportResponse = await res.json();
          // Adjust row numbers for batch offset
          const adjusted = data.results.map((r) => ({
            ...r,
            row: r.row + i,
          }));
          allResults.push(...adjusted);
          totalImported += data.imported;
          totalDuplicates += data.duplicates;
          totalErrors += data.errors;
        }
      } catch {
        batch.forEach((row, idx) => {
          allResults.push({
            row: i + idx + 1,
            name: row.name || "(unknown)",
            status: "error",
            error: "Network error",
          });
        });
        totalErrors += batch.length;
      }

      setProgress(Math.min(((i + batch.length) / rows.length) * 100, 100));
    }

    setImportResult({
      total: rows.length,
      imported: totalImported,
      duplicates: totalDuplicates,
      errors: totalErrors,
      results: allResults,
    });
    setStep("done");
    onComplete?.();
  }

  const validRows = rows.filter((r) => r.name?.trim());
  const mappedFieldNames = Object.values(mappedHeaders);
  const unmappedHeaders = headers.filter((h) => !mappedHeaders[h]);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            CSV Bulk Import
          </DialogTitle>
          <DialogDescription>
            Upload a CSV file to import leads into your pipeline in bulk.
          </DialogDescription>
        </DialogHeader>

        {/* Step 1: Upload */}
        {step === "upload" && (
          <div className="space-y-4">
            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer ${
                dragOver
                  ? "border-primary bg-primary/5"
                  : "border-muted-foreground/25 hover:border-primary/50"
              }`}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
              <p className="font-medium">
                Drop your CSV file here or click to browse
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Max 500 rows, 5MB limit
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                className="hidden"
                onChange={handleFileInput}
              />
            </div>

            {error && (
              <div className="flex items-start gap-2 p-3 bg-destructive/10 text-destructive rounded-md text-sm">
                <XCircle className="h-4 w-4 mt-0.5 shrink-0" />
                {error}
              </div>
            )}

            <div className="flex items-center justify-between pt-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={downloadSampleCSV}
                className="text-muted-foreground"
              >
                <Download className="h-4 w-4 mr-2" />
                Download sample CSV
              </Button>
              <div className="text-xs text-muted-foreground">
                Supported columns: name, address, city, state, zip, email,
                phone, website, instagram, facebook, notes, leadType,
                sellsDogTreats
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Preview */}
        {step === "preview" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">{file?.name}</p>
                <p className="text-sm text-muted-foreground">
                  {rows.length} rows found, {validRows.length} valid
                </p>
              </div>
              <Button variant="ghost" size="sm" onClick={reset}>
                <X className="h-4 w-4 mr-1" />
                Change file
              </Button>
            </div>

            {/* Column mapping */}
            <div className="space-y-2">
              <p className="text-sm font-medium">Column Mapping</p>
              <div className="flex flex-wrap gap-2">
                {mappedFieldNames.map((field) => (
                  <Badge key={field} variant="default" className="text-xs">
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    {field}
                  </Badge>
                ))}
                {unmappedHeaders.map((h) => (
                  <Badge key={h} variant="outline" className="text-xs text-muted-foreground">
                    <AlertTriangle className="h-3 w-3 mr-1" />
                    {h} (skipped)
                  </Badge>
                ))}
              </div>
            </div>

            {/* Preview table */}
            <div className="border rounded-md overflow-x-auto max-h-60">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 sticky top-0">
                  <tr>
                    <th className="text-left p-2 font-medium text-muted-foreground">
                      #
                    </th>
                    {mappedFieldNames.map((f) => (
                      <th
                        key={f}
                        className="text-left p-2 font-medium text-muted-foreground whitespace-nowrap"
                      >
                        {f}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.slice(0, 10).map((row, i) => (
                    <tr key={i} className="border-t">
                      <td className="p-2 text-muted-foreground">{i + 1}</td>
                      {mappedFieldNames.map((f) => (
                        <td key={f} className="p-2 max-w-[200px] truncate">
                          {row[f] || (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              {rows.length > 10 && (
                <p className="text-xs text-muted-foreground p-2 text-center border-t bg-muted/30">
                  ... and {rows.length - 10} more rows
                </p>
              )}
            </div>

            {rows.length - validRows.length > 0 && (
              <div className="flex items-center gap-2 text-sm text-yellow-600">
                <AlertTriangle className="h-4 w-4" />
                {rows.length - validRows.length} rows missing a name will be
                skipped
              </div>
            )}

            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => handleClose(false)}>
                Cancel
              </Button>
              <Button onClick={handleImport} disabled={validRows.length === 0}>
                <Upload className="h-4 w-4 mr-2" />
                Import {validRows.length} leads
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Importing */}
        {step === "importing" && (
          <div className="space-y-4 py-4">
            <div className="text-center">
              <Loader2 className="h-10 w-10 animate-spin mx-auto text-primary mb-3" />
              <p className="font-medium">Importing leads...</p>
              <p className="text-sm text-muted-foreground mt-1">
                {Math.round(progress)}% complete
              </p>
            </div>
            <div className="w-full bg-muted rounded-full h-2.5">
              <div
                className="bg-primary h-2.5 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        {/* Step 4: Done */}
        {step === "done" && importResult && (
          <div className="space-y-4">
            <div className="text-center py-2">
              <CheckCircle2 className="h-10 w-10 mx-auto text-green-600 mb-2" />
              <p className="font-medium text-lg">Import Complete</p>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="text-center p-3 bg-green-50 rounded-lg">
                <p className="text-2xl font-bold text-green-700">
                  {importResult.imported}
                </p>
                <p className="text-xs text-green-600">Imported</p>
              </div>
              <div className="text-center p-3 bg-yellow-50 rounded-lg">
                <p className="text-2xl font-bold text-yellow-700">
                  {importResult.duplicates}
                </p>
                <p className="text-xs text-yellow-600">Duplicates</p>
              </div>
              <div className="text-center p-3 bg-red-50 rounded-lg">
                <p className="text-2xl font-bold text-red-700">
                  {importResult.errors}
                </p>
                <p className="text-xs text-red-600">Errors</p>
              </div>
            </div>

            {/* Show errors/duplicates detail */}
            {(importResult.errors > 0 || importResult.duplicates > 0) && (
              <div className="border rounded-md max-h-40 overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 sticky top-0">
                    <tr>
                      <th className="text-left p-2 font-medium text-muted-foreground">Row</th>
                      <th className="text-left p-2 font-medium text-muted-foreground">Name</th>
                      <th className="text-left p-2 font-medium text-muted-foreground">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {importResult.results
                      .filter((r) => r.status !== "imported")
                      .map((r) => (
                        <tr key={r.row} className="border-t">
                          <td className="p-2 text-muted-foreground">{r.row}</td>
                          <td className="p-2">{r.name}</td>
                          <td className="p-2">
                            {r.status === "duplicate" ? (
                              <Badge variant="outline" className="text-yellow-600">
                                Duplicate
                              </Badge>
                            ) : (
                              <span className="text-destructive text-xs">
                                {r.error || "Error"}
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="flex justify-end">
              <Button onClick={() => handleClose(false)}>Done</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
