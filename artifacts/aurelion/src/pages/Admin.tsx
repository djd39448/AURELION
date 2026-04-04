import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { 
  useGetMe,
  useListActivities,
  useAdminIngestUrl
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { Globe, Plus, Trash2, Edit } from "lucide-react";

export default function Admin() {
  const [location, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [url, setUrl] = useState("");

  const { data: user, isLoading: userLoading } = useGetMe();
  const { data: activities } = useListActivities();
  const ingestMutation = useAdminIngestUrl();

  useEffect(() => {
    if (!userLoading && (!user?.isAuthenticated || user.role !== 'admin')) {
      setLocation("/");
    }
  }, [user, userLoading, setLocation]);

  const handleIngest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;

    ingestMutation.mutate(
      { data: { url } },
      {
        onSuccess: () => {
          toast({ title: "Successfully ingested URL", description: "The content was processed." });
          setUrl("");
          // Note: Ingestion just returns parsed data typically, but for this demo 
          // we might just show success. If it creates an activity, we'd invalidate.
          queryClient.invalidateQueries({ queryKey: ["/api/activities"] });
        },
        onError: () => toast({ title: "Ingestion failed", variant: "destructive" })
      }
    );
  };

  if (userLoading) return null;
  if (!user || user.role !== 'admin') return null;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-12">
        <h1 className="font-serif text-4xl text-foreground mb-2">Admin Dashboard</h1>
        <p className="text-muted-foreground">Manage activities and platform content.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 space-y-8">
          <div className="bg-card border border-border p-6 rounded-xl">
            <h3 className="font-serif text-xl mb-4 flex items-center gap-2">
              <Globe className="w-5 h-5 text-primary" /> Auto-Ingest Activity
            </h3>
            <p className="text-sm text-muted-foreground mb-6">
              Paste a URL from a provider's website to automatically extract and draft a new activity listing.
            </p>
            <form onSubmit={handleIngest} className="space-y-4">
              <Input 
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://example.com/tour"
                className="bg-background border-border"
              />
              <Button 
                type="submit" 
                className="w-full bg-primary text-primary-foreground font-serif uppercase tracking-widest"
                disabled={ingestMutation.isPending || !url.trim()}
              >
                {ingestMutation.isPending ? "Extracting..." : "Extract Data"}
              </Button>
            </form>
          </div>
        </div>

        <div className="lg:col-span-2">
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="p-6 border-b border-border flex justify-between items-center bg-background/50">
              <h3 className="font-serif text-xl">Activity Listings</h3>
              <Button size="sm" className="font-serif uppercase tracking-widest">
                <Plus className="w-4 h-4 mr-2" /> Add Manual
              </Button>
            </div>
            <div className="divide-y divide-border">
              {activities?.map(activity => (
                <div key={activity.id} className="p-6 flex justify-between items-center hover:bg-background/50 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded bg-muted overflow-hidden shrink-0">
                      {activity.imageUrl && <img src={activity.imageUrl} alt={activity.title} className="w-full h-full object-cover" />}
                    </div>
                    <div>
                      <h4 className="font-serif font-medium">{activity.title}</h4>
                      <p className="text-sm text-muted-foreground uppercase tracking-widest text-xs mt-1">{activity.category}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-primary">
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
