import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import {
  useGetMe,
  useListActivities,
  useAdminIngestUrl,
  useAdminCreateActivity,
  useAdminDeleteActivity,
  useAdminUpdateActivity,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { Globe, Plus, Trash2, Edit, X, Check, ChevronDown, ChevronUp, Users, BarChart2, Activity } from "lucide-react";

const CATEGORIES = [
  "Cliff & Vertical Adventures",
  "Off-Road Expeditions",
  "Ocean Exploration",
  "Wild Terrain & Natural Wonders",
  "Water & Wind Sports",
  "Scenic Riding",
];

const DIFFICULTIES = ["Easy", "Moderate", "Challenging", "Expert"];

type ActivityFormData = {
  title: string;
  category: string;
  difficulty: string;
  description: string;
  durationMinutes: number;
  priceLow: number;
  priceHigh: number;
  location: string;
  imageUrl: string;
};

const emptyForm: ActivityFormData = {
  title: "",
  category: CATEGORIES[0],
  difficulty: "Moderate",
  description: "",
  durationMinutes: 120,
  priceLow: 0,
  priceHigh: 0,
  location: "Aruba",
  imageUrl: "",
};

function ActivityForm({
  initial,
  onSave,
  onCancel,
  saving,
}: {
  initial: ActivityFormData;
  onSave: (data: ActivityFormData) => void;
  onCancel: () => void;
  saving: boolean;
}) {
  const [form, setForm] = useState<ActivityFormData>(initial);
  const set = (k: keyof ActivityFormData, v: string | number) =>
    setForm((f) => ({ ...f, [k]: v }));

  return (
    <div className="bg-background border border-border rounded-xl p-6 space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1 md:col-span-2">
          <Label>Title</Label>
          <Input value={form.title} onChange={(e) => set("title", e.target.value)} placeholder="Activity name" className="bg-card border-border" />
        </div>
        <div className="space-y-1">
          <Label>Category</Label>
          <select
            value={form.category}
            onChange={(e) => set("category", e.target.value)}
            className="w-full h-9 rounded-md border border-border bg-card px-3 text-sm text-foreground"
          >
            {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
          </select>
        </div>
        <div className="space-y-1">
          <Label>Difficulty</Label>
          <select
            value={form.difficulty}
            onChange={(e) => set("difficulty", e.target.value)}
            className="w-full h-9 rounded-md border border-border bg-card px-3 text-sm text-foreground"
          >
            {DIFFICULTIES.map((d) => <option key={d}>{d}</option>)}
          </select>
        </div>
        <div className="space-y-1">
          <Label>Duration (minutes)</Label>
          <Input type="number" value={form.durationMinutes} onChange={(e) => set("durationMinutes", Number(e.target.value))} className="bg-card border-border" />
        </div>
        <div className="space-y-1">
          <Label>Location</Label>
          <Input value={form.location} onChange={(e) => set("location", e.target.value)} className="bg-card border-border" />
        </div>
        <div className="space-y-1">
          <Label>Price Low ($)</Label>
          <Input type="number" value={form.priceLow} onChange={(e) => set("priceLow", Number(e.target.value))} className="bg-card border-border" />
        </div>
        <div className="space-y-1">
          <Label>Price High ($)</Label>
          <Input type="number" value={form.priceHigh} onChange={(e) => set("priceHigh", Number(e.target.value))} className="bg-card border-border" />
        </div>
        <div className="space-y-1 md:col-span-2">
          <Label>Image URL</Label>
          <Input value={form.imageUrl} onChange={(e) => set("imageUrl", e.target.value)} placeholder="https://..." className="bg-card border-border" />
        </div>
        <div className="space-y-1 md:col-span-2">
          <Label>Description</Label>
          <Textarea value={form.description} onChange={(e) => set("description", e.target.value)} rows={4} className="bg-card border-border resize-none" />
        </div>
      </div>
      <div className="flex gap-3 pt-2">
        <Button onClick={() => onSave(form)} disabled={saving || !form.title.trim()} className="bg-primary text-primary-foreground font-serif uppercase tracking-widest">
          <Check className="w-4 h-4 mr-2" /> {saving ? "Saving..." : "Save"}
        </Button>
        <Button variant="ghost" onClick={onCancel} disabled={saving}>
          <X className="w-4 h-4 mr-2" /> Cancel
        </Button>
      </div>
    </div>
  );
}

export default function Admin() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [url, setUrl] = useState("");
  const [ingestResult, setIngestResult] = useState<{ title: string; description: string; rawText: string; suggestedCategory: string } | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);

  const { data: user, isLoading: userLoading } = useGetMe();
  const { data: activities } = useListActivities();
  const ingestMutation = useAdminIngestUrl();
  const createMutation = useAdminCreateActivity();
  const updateMutation = useAdminUpdateActivity();
  const deleteMutation = useAdminDeleteActivity();

  useEffect(() => {
    if (!userLoading && (!user?.isAuthenticated || user.role !== "admin")) {
      setLocation("/");
    }
  }, [user, userLoading, setLocation]);

  if (userLoading || !user?.isAuthenticated || user.role !== "admin") return null;

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["/api/activities"] });

  const handleIngest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;
    ingestMutation.mutate(
      { data: { url } },
      {
        onSuccess: (data) => {
          setIngestResult(data as any);
          setUrl("");
        },
        onError: () => toast({ title: "Failed to fetch URL", variant: "destructive" }),
      }
    );
  };

  const handleCreate = (form: ActivityFormData) => {
    createMutation.mutate(
      { data: { ...form, tags: [] } as any },
      {
        onSuccess: () => {
          toast({ title: "Activity created" });
          setShowCreate(false);
          setIngestResult(null);
          invalidate();
        },
        onError: () => toast({ title: "Failed to create activity", variant: "destructive" }),
      }
    );
  };

  const handleUpdate = (id: number, form: ActivityFormData) => {
    updateMutation.mutate(
      { id, data: form as any },
      {
        onSuccess: () => {
          toast({ title: "Activity updated" });
          setEditingId(null);
          invalidate();
        },
        onError: () => toast({ title: "Failed to update activity", variant: "destructive" }),
      }
    );
  };

  const handleDelete = (id: number) => {
    deleteMutation.mutate(
      { id },
      {
        onSuccess: () => {
          toast({ title: "Activity deleted" });
          setConfirmDeleteId(null);
          invalidate();
        },
        onError: () => toast({ title: "Failed to delete activity", variant: "destructive" }),
      }
    );
  };

  const ingestInitial: ActivityFormData = ingestResult
    ? {
        ...emptyForm,
        title: ingestResult.title,
        description: ingestResult.description,
        category: ingestResult.suggestedCategory ?? emptyForm.category,
      }
    : emptyForm;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-10">
        <h1 className="font-serif text-4xl text-foreground mb-2">Admin Dashboard</h1>
        <p className="text-muted-foreground">Manage activities, content, and platform settings.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
        {[
          { icon: Activity, label: "Total Activities", value: activities?.length ?? 0 },
          { icon: Users, label: "Role", value: "Admin" },
          { icon: BarChart2, label: "Access Tier", value: "Concierge" },
        ].map(({ icon: Icon, label, value }) => (
          <div key={label} className="bg-card border border-border rounded-xl p-5 flex items-center gap-4">
            <Icon className="w-8 h-8 text-primary shrink-0" />
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-widest">{label}</p>
              <p className="font-serif text-xl">{value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-card border border-border p-6 rounded-xl">
            <h3 className="font-serif text-xl mb-2 flex items-center gap-2">
              <Globe className="w-5 h-5 text-primary" /> Auto-Ingest URL
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              Paste a provider URL to extract activity details automatically.
            </p>
            <form onSubmit={handleIngest} className="space-y-3">
              <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://example.com/tour" className="bg-background border-border" />
              <Button type="submit" className="w-full bg-primary text-primary-foreground font-serif uppercase tracking-widest" disabled={ingestMutation.isPending || !url.trim()}>
                {ingestMutation.isPending ? "Extracting..." : "Extract Data"}
              </Button>
            </form>
            {ingestResult && (
              <div className="mt-4 p-3 bg-background rounded-lg border border-border text-sm space-y-1">
                <p className="font-medium text-foreground">{ingestResult.title}</p>
                <p className="text-muted-foreground line-clamp-2">{ingestResult.description}</p>
                <button onClick={() => setShowCreate(true)} className="text-primary underline text-xs mt-1">
                  Review & create activity →
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="lg:col-span-2 space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="font-serif text-xl">Activity Listings ({activities?.length ?? 0})</h3>
            <Button size="sm" onClick={() => { setShowCreate(true); setIngestResult(null); }} className="font-serif uppercase tracking-widest">
              <Plus className="w-4 h-4 mr-2" /> Add Activity
            </Button>
          </div>

          {showCreate && (
            <div className="mb-4">
              <h4 className="font-serif text-lg mb-3">{ingestResult ? "Review Extracted Activity" : "New Activity"}</h4>
              <ActivityForm
                initial={ingestInitial}
                onSave={handleCreate}
                onCancel={() => { setShowCreate(false); setIngestResult(null); }}
                saving={createMutation.isPending}
              />
            </div>
          )}

          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="divide-y divide-border">
              {activities?.map((activity) => (
                <div key={activity.id}>
                  {editingId === activity.id ? (
                    <div className="p-4">
                      <h4 className="font-serif text-base mb-3">Editing: {activity.title}</h4>
                      <ActivityForm
                        initial={{
                          title: activity.title,
                          category: activity.category,
                          difficulty: activity.difficulty,
                          description: activity.description ?? "",
                          durationMinutes: activity.durationMinutes,
                          priceLow: activity.priceLow,
                          priceHigh: activity.priceHigh,
                          location: activity.location,
                          imageUrl: activity.imageUrl ?? "",
                        }}
                        onSave={(form) => handleUpdate(activity.id, form)}
                        onCancel={() => setEditingId(null)}
                        saving={updateMutation.isPending}
                      />
                    </div>
                  ) : (
                    <div className="p-4 flex justify-between items-center hover:bg-background/50 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded bg-muted overflow-hidden shrink-0">
                          {activity.imageUrl && (
                            <img src={activity.imageUrl} alt={activity.title} className="w-full h-full object-cover" />
                          )}
                        </div>
                        <div>
                          <p className="font-serif font-medium text-sm">{activity.title}</p>
                          <p className="text-xs text-muted-foreground uppercase tracking-widest mt-0.5">{activity.category}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        {confirmDeleteId === activity.id ? (
                          <>
                            <span className="text-xs text-muted-foreground mr-2">Delete?</span>
                            <Button size="sm" variant="destructive" onClick={() => handleDelete(activity.id)} disabled={deleteMutation.isPending}>
                              Yes
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => setConfirmDeleteId(null)}>No</Button>
                          </>
                        ) : (
                          <>
                            <Button variant="ghost" size="icon" onClick={() => { setEditingId(activity.id); setShowCreate(false); }} className="text-muted-foreground hover:text-primary">
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => setConfirmDeleteId(activity.id)} className="text-muted-foreground hover:text-destructive">
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
