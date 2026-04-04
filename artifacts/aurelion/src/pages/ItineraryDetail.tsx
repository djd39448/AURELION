import { useState } from "react";
import { useParams, Link } from "wouter";
import { 
  useGetItinerary, 
  useAddItineraryItem, 
  useRemoveItineraryItem, 
  useUpdateItineraryItem,
  useListActivities,
  useExportItinerary,
  useListPurchases,
  useGetMe,
  useCreateCheckout
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { Clock, Download, MapPin, Plus, Trash2, Shield, CalendarDays } from "lucide-react";
import { PremiumLock } from "@/components/ui/premium-lock";

export default function ItineraryDetail() {
  const params = useParams();
  const id = parseInt(params.id || "0", 10);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeDay, setActiveDay] = useState(1);
  const [isAddingActivity, setIsAddingActivity] = useState(false);
  const [search, setSearch] = useState("");

  const { data: user } = useGetMe();
  const { data: itinerary, isLoading } = useGetItinerary(id, {
    query: { enabled: !!id, queryKey: [`/api/itineraries/${id}`] }
  });
  
  const { data: purchases } = useListPurchases({
    query: { enabled: !!user?.isAuthenticated }
  });
  
  const { data: activities } = useListActivities({ search: search || undefined });
  
  const addMutation = useAddItineraryItem();
  const removeMutation = useRemoveItineraryItem();
  const exportMutation = useExportItinerary();
  const checkoutMutation = useCreateCheckout();

  const isPremium = purchases?.some(p => p.productType === 'PREMIUM');
  const isBasic = purchases?.some(p => p.productType === 'BASIC') || isPremium;

  const handleAddActivity = (activityId: number, timeSlot: string) => {
    addMutation.mutate(
      [id, { data: { activityId, dayNumber: activeDay, timeSlot } }],
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: [`/api/itineraries/${id}`] });
          toast({ title: "Added to itinerary" });
          setIsAddingActivity(false);
        },
        onError: () => toast({ title: "Error adding activity", variant: "destructive" })
      }
    );
  };

  const handleRemoveActivity = (itemId: number) => {
    removeMutation.mutate(
      [id, itemId],
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: [`/api/itineraries/${id}`] });
          toast({ title: "Removed from itinerary" });
        },
        onError: () => toast({ title: "Error removing activity", variant: "destructive" })
      }
    );
  };

  const handleExport = () => {
    exportMutation.mutate(
      [id, {}],
      {
        onSuccess: () => {
          toast({ title: "Itinerary Exported", description: "Your PDF is downloading." });
        },
        onError: () => toast({ title: "Export failed", variant: "destructive" })
      }
    );
  };

  const handleUpgrade = () => {
    checkoutMutation.mutate({ data: { itineraryId: id, productType: 'BASIC' } }, {
      onSuccess: (res) => {
        window.location.href = res.url;
      }
    });
  };

  if (isLoading) return <div className="p-24 text-center">Loading...</div>;
  if (!itinerary) return <div className="p-24 text-center">Itinerary not found</div>;

  const days = Array.from({ length: itinerary.totalDays }, (_, i) => i + 1);
  const currentDayItems = itinerary.items?.filter(item => item.dayNumber === activeDay) || [];

  const timeSlots = ["morning", "afternoon", "evening"];

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 flex flex-col md:flex-row gap-8">
      
      {/* Sidebar - Days */}
      <div className="w-full md:w-64 shrink-0 space-y-4">
        <div className="bg-card border border-border p-6 rounded-xl">
          <h2 className="font-serif text-2xl text-foreground mb-1">{itinerary.title}</h2>
          <p className="text-sm text-muted-foreground uppercase tracking-widest">{itinerary.totalDays} Days • {itinerary.status}</p>
          
          <div className="mt-6 space-y-2">
            {days.map(day => (
              <button
                key={day}
                onClick={() => setActiveDay(day)}
                className={`w-full text-left px-4 py-3 rounded-lg text-sm font-medium tracking-wide transition-colors ${
                  activeDay === day 
                    ? "bg-primary text-primary-foreground font-serif uppercase" 
                    : "hover:bg-primary/10 text-muted-foreground font-serif uppercase"
                }`}
              >
                Day {day}
              </button>
            ))}
          </div>
        </div>

        <div className="bg-card border border-border p-6 rounded-xl">
          <h3 className="font-serif text-lg mb-4">Export & Share</h3>
          {isBasic ? (
            <Button onClick={handleExport} className="w-full bg-primary text-primary-foreground font-serif uppercase tracking-widest" disabled={exportMutation.isPending}>
              <Download className="w-4 h-4 mr-2" />
              {exportMutation.isPending ? "Exporting..." : "Export PDF"}
            </Button>
          ) : (
            <PremiumLock title="Planner Access Required" description="Upgrade to Planner to export your itinerary as a beautiful PDF to share.">
              <Button onClick={handleUpgrade} variant="outline" className="w-full border-primary text-primary font-serif uppercase tracking-widest mt-4">
                Upgrade for $9.99
              </Button>
            </PremiumLock>
          )}
        </div>
      </div>

      {/* Main Content - Day View */}
      <div className="flex-1 space-y-8">
        <div className="flex justify-between items-center border-b border-border pb-4">
          <h2 className="font-serif text-3xl text-foreground">Day {activeDay}</h2>
          
          <Dialog open={isAddingActivity} onOpenChange={setIsAddingActivity}>
            <DialogTrigger asChild>
              <Button className="bg-primary text-primary-foreground font-serif uppercase tracking-widest">
                <Plus className="w-4 h-4 mr-2" /> Add Experience
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl bg-card border-border h-[80vh] flex flex-col">
              <DialogHeader>
                <DialogTitle className="font-serif text-2xl">Add to Day {activeDay}</DialogTitle>
              </DialogHeader>
              
              <div className="p-4 border-b border-border">
                <input 
                  type="text" 
                  placeholder="Search experiences..." 
                  className="w-full bg-background border border-border rounded-md px-4 py-2 text-foreground"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              
              <ScrollArea className="flex-1 p-4">
                <div className="space-y-4">
                  {activities?.map(activity => (
                    <div key={activity.id} className="flex border border-border rounded-lg overflow-hidden bg-background">
                      {activity.imageUrl && (
                        <div className="w-32 shrink-0">
                          <img src={activity.imageUrl} alt={activity.title} className="w-full h-full object-cover" />
                        </div>
                      )}
                      <div className="p-4 flex-1 flex flex-col justify-between">
                        <div>
                          <h4 className="font-serif text-lg mb-1">{activity.title}</h4>
                          <p className="text-sm text-muted-foreground flex gap-4">
                            <span className="flex items-center"><Clock className="w-3 h-3 mr-1" />{activity.durationMinutes}m</span>
                            <span className="flex items-center"><MapPin className="w-3 h-3 mr-1" />{activity.location}</span>
                          </p>
                        </div>
                        <div className="mt-4 flex gap-2">
                          {timeSlots.map(slot => (
                            <Button 
                              key={slot} 
                              size="sm" 
                              variant="outline" 
                              className="text-xs uppercase tracking-wider border-primary/30 hover:bg-primary/10 text-primary"
                              onClick={() => handleAddActivity(activity.id, slot)}
                            >
                              {slot}
                            </Button>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </DialogContent>
          </Dialog>
        </div>

        {timeSlots.map(slot => {
          const slotItems = currentDayItems.filter(item => item.timeSlot === slot);
          
          return (
            <div key={slot} className="space-y-4">
              <h3 className="font-serif text-xl uppercase tracking-widest text-muted-foreground pb-2 border-b border-border/50">{slot}</h3>
              
              {slotItems.length === 0 ? (
                <div className="p-8 border border-dashed border-border rounded-lg text-center bg-card/30">
                  <p className="text-muted-foreground font-serif italic text-sm">No experiences scheduled</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {slotItems.map(item => (
                    <div key={item.id} className="flex border border-border bg-card rounded-lg overflow-hidden group">
                      {item.activity.imageUrl && (
                        <div className="w-48 shrink-0 relative hidden sm:block">
                          <img src={item.activity.imageUrl} alt={item.activity.title} className="w-full h-full object-cover" />
                        </div>
                      )}
                      <div className="p-6 flex-1 flex flex-col justify-between">
                        <div>
                          <div className="flex justify-between items-start">
                            <h4 className="font-serif text-2xl mb-2">
                              <Link href={`/activities/${item.activity.id}`} className="hover:text-primary transition-colors">
                                {item.activity.title}
                              </Link>
                            </h4>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 -mt-2 -mr-2"
                              onClick={() => handleRemoveActivity(item.id)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                          <p className="text-sm text-muted-foreground mb-4 line-clamp-2">{item.activity.description}</p>
                          <div className="flex gap-4 text-xs font-serif uppercase tracking-widest text-muted-foreground">
                            <span className="flex items-center gap-1 text-primary"><Clock className="w-3 h-3" />{item.activity.durationMinutes}m</span>
                            <span className="flex items-center gap-1 text-primary"><MapPin className="w-3 h-3" />{item.activity.location}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
