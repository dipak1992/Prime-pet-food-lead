"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { PIPELINE_STAGES } from "@/lib/utils";

interface AddStoreDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: StoreFormData) => void;
}

export interface StoreFormData {
  name: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  website: string;
  email: string;
  phone: string;
  instagram: string;
  facebook: string;
  notes: string;
  pipelineStage: string;
  sellsDogTreats: string;
}

const US_STATES = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA",
  "KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ",
  "NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT",
  "VA","WA","WV","WI","WY",
];

export function AddStoreDialog({ open, onOpenChange, onSubmit }: AddStoreDialogProps) {
  const [form, setForm] = useState<StoreFormData>({
    name: "",
    address: "",
    city: "",
    state: "",
    zip: "",
    website: "",
    email: "",
    phone: "",
    instagram: "",
    facebook: "",
    notes: "",
    pipelineStage: "new",
    sellsDogTreats: "unknown",
  });
  const [loading, setLoading] = useState(false);

  function handleChange(field: keyof StoreFormData, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name || !form.zip) return;
    setLoading(true);
    try {
      await onSubmit(form);
      setForm({
        name: "",
        address: "",
        city: "",
        state: "",
        zip: "",
        website: "",
        email: "",
        phone: "",
        instagram: "",
        facebook: "",
        notes: "",
        pipelineStage: "new",
        sellsDogTreats: "unknown",
      });
      onOpenChange(false);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Store</DialogTitle>
          <DialogDescription>Add a pet store manually to your lead pipeline.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="name">Store Name *</Label>
              <Input
                id="name"
                value={form.name}
                onChange={(e) => handleChange("name", e.target.value)}
                placeholder="Happy Paws Pet Shop"
                required
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="address">Address</Label>
              <Input
                id="address"
                value={form.address}
                onChange={(e) => handleChange("address", e.target.value)}
                placeholder="123 Main St"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="city">City</Label>
              <Input
                id="city"
                value={form.city}
                onChange={(e) => handleChange("city", e.target.value)}
                placeholder="Denver"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="state">State</Label>
              <Select value={form.state} onValueChange={(v) => handleChange("state", v)}>
                <SelectTrigger><SelectValue placeholder="Select state" /></SelectTrigger>
                <SelectContent>
                  {US_STATES.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="zip">ZIP Code *</Label>
              <Input
                id="zip"
                value={form.zip}
                onChange={(e) => handleChange("zip", e.target.value)}
                placeholder="80202"
                required
                maxLength={10}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                value={form.phone}
                onChange={(e) => handleChange("phone", e.target.value)}
                placeholder="(303) 555-0100"
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="website">Website</Label>
              <Input
                id="website"
                value={form.website}
                onChange={(e) => handleChange("website", e.target.value)}
                placeholder="https://happypawspet.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={form.email}
                onChange={(e) => handleChange("email", e.target.value)}
                placeholder="info@store.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="instagram">Instagram</Label>
              <Input
                id="instagram"
                value={form.instagram}
                onChange={(e) => handleChange("instagram", e.target.value)}
                placeholder="@happypawspet"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="facebook">Facebook</Label>
              <Input
                id="facebook"
                value={form.facebook}
                onChange={(e) => handleChange("facebook", e.target.value)}
                placeholder="happypawspetshop"
              />
            </div>
            <div className="space-y-2">
              <Label>Sells Dog Treats?</Label>
              <Select
                value={form.sellsDogTreats}
                onValueChange={(v) => handleChange("sellsDogTreats", v)}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="unknown">Unknown</SelectItem>
                  <SelectItem value="yes">Yes</SelectItem>
                  <SelectItem value="no">No</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Pipeline Stage</Label>
              <Select
                value={form.pipelineStage}
                onValueChange={(v) => handleChange("pipelineStage", v)}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PIPELINE_STAGES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={form.notes}
                onChange={(e) => handleChange("notes", e.target.value)}
                placeholder="Any notes about this store..."
                rows={3}
              />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading || !form.name || !form.zip}>
              {loading ? "Adding..." : "Add Store"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
