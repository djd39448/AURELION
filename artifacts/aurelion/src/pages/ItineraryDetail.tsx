import { useState } from "react";
import { useParams, Link } from "wouter";
import {
  useGetItinerary,
  useAddItineraryItem,
  useRemoveItineraryItem,
  useListActivities,
  useGetMe,
  exportItinerary,
} from "@workspace/api-client-react";
import { printItineraryPDF } from "@/lib/pdf-export";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { Clock, Download, MapPin, Plus, Trash2 } from "lucide-react";
import { PremiumLock } from "@/components/ui/premium-lock";
import { getImageUrl } from "@/lib/image-url";

export default function ItineraryDetail() {
  const params = useParams();
  const id = parseInt(params.id || "0", 10);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeDay, setActiveDay] = useState(1);
  const [isAddingActivity, setIsAddingActivity] = useState(false);
  const [search, setSearch] = useState("");
  const [exporting, setExporting] = useState(false);

  const { data: user } = useGetMe();
  const { data: itinerary, isLoading } = useGetItinerary(id, {
    query: { enabled: !!id, queryKey: [`/api/itineraries/${id}`] },
  });
  const { data: activities } = useListActivities({ search: search || undefined });

  const addMutation = useAddItineraryItem();
  const removeMutation = useRemoveItineraryItem();

  const userTier = user?.tier ?? "free";
  const canExport = userTier === "basic" || userTier === "premium" || user?.role === "admin";
  const isPremium = userTier === "premium" || user?.role === "admin";

  const handleAddActivity = (activityId: number, timeSlot: string) => {
    addMutation.mutate(
      { id, data: { activityId, dayNumber: activeDay, timeSlot } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: [`/api/itineraries/${id}`] });
          toast({ title: "Added to itinerary" });
          setIsAddingActivity(false);
        },
        onError: () => toast({ title: "Error adding activity", variant: "destructive" }),
      }
    );
  };

  const handleRemoveActivity = (itemId: number) => {
    removeMutation.mutate(
      { id, itemId },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: [`/api/itineraries/${id}`] });
          toast({ title: "Removed from itinerary" });
        },
        onError: () => toast({ title: "Error removing activity", variant: "destructive" }),
      }
    );
  };

  const handleExport = async () => {
    if (!canExport) return;
    setExporting(true);
    try {
      const data = await exportItinerary(id);
      printItineraryPDF(data as any);
      toast({ title: "PDF opened — choose 'Save as PDF' in the print dialog" });
    } catch {
      toast({ title: "Export failed", variant: "destructive" });
    } finally {
      setExporting(false);
    }
  };

  if (isLoading)
    return <div className="p-24 text-center font-serif text-muted-foreground">Loading...</div>;
  if (!itinerary)
    return <div className="p-24 text-center font-serif text-muted-foreground">Itinerary not found</div>;

  const days = Array.from({ length: itinerary.totalDays }, (_, i) => i + 1);
  const currentDayItems = (itinerary.items ?? []).filter((item) => item.dayNumber === activeDay);
  const timeSlots = ["morning", "afternoon", "evening"];

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
      {/* Mobile header */}
      <div className="mb-6 md:hidden">
        <h2 className="font-serif text-2xl text-foreground mb-1">{itinerary.title}</h2>
        <p className="text-sm text-muted-foreground uppercase tracking-widest">
          {itinerary.totalDays} Days · {itinerary.status}
        </p>
      </div>

      {/* Mobile day selector — horizontal scroll */}
      <div className="flex gap-2 overflow-x-auto pb-3 mb-6 md:hidden no-scrollbar">
        {days.map((day) => (
          <button
            key={day}
            onClick={() => setActiveDay(day)}
            className={`shrink-0 px-5 py-2 text-sm font-serif uppercase tracking-wide rounded-full transition-colors border ${
              activeDay === day
                ? "bg-primary text-primary-foreground border-primary"
                : "border-border text-muted-foreground hover:border-primary/40"
            }`}
          >
            Day {day}
          </button>
        ))}
      </div>

      {/* Mobile export */}
      <div className="mb-6 md:hidden">
        {canExport ? (
          <Button
            onClick={handleExport}
            variant="outline"
            className="w-full border-primary text-primary font-serif uppercase tracking-widest"
            disabled={exporting}
          >
            <Download className="w-4 h-4 mr-2" />
            {exporting ? "Preparing PDF..." : "Export PDF"}
          </Button>
        ) : (
          <Button
            asChild
            variant="outline"
            className="w-full border-primary/30 text-primary font-serif uppercase tracking-widest"
          >
            <Link href="/pricing">
              <Download className="w-4 h-4 mr-2" /> Upgrade to Export PDF
            </Link>
          </Button>
        )}
      </div>

      <div className="flex flex-col md:flex-row gap-8">
        {/* Desktop Sidebar */}
        <div className="hidden md:block w-64 shrink-0 space-y-4">
          <div className="bg-card border border-border p-6 rounded-xl">
            <h2 className="font-serif text-2xl text-foreground mb-1">{itinerary.title}</h2>
            <p className="text-sm text-muted-foreground uppercase tracking-widest">
              {itinerary.totalDays} Days · {itinerary.status}
            </p>
            <div className="mt-6 space-y-2">
              {days.map((day) => (
                <button
                  key={day}
                  onClick={() => setActiveDay(day)}
                  className={`w-full text-left px-4 py-3 rounded-lg text-sm font-medium tracking-wide transition-colors font-serif uppercase ${
                    activeDay === day
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-primary/10 text-muted-foreground"
                  }`}
                >
                  Day {day}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-card border border-border p-6 rounded-xl">
            <h3 className="font-serif text-lg mb-4">Export & Share</h3>
            {canExport ? (
              <Button
                onClick={handleExport}
                className="w-full bg-primary text-primary-foreground font-serif uppercase tracking-widest"
                disabled={exporting}
              >
                <Download className="w-4 h-4 mr-2" />
                {exporting ? "Preparing PDF..." : "Export PDF"}
              </Button>
            ) : (
              <PremiumLock
                title="Planner Access Required"
                description="Upgrade to Planner to export your itinerary."
              >
                <Button
                  asChild
                  variant="outline"
                  className="w-full border-primary text-primary font-serif uppercase tracking-widest mt-4"
                >
                  <Link href="/pricing">Upgrade for $9.99</Link>
                </Button>
              </PremiumLock>
            )}
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 space-y-8 min-w-0">
          <div className="flex justify-between items-center border-b border-border pb-4">
            <h2 className="font-serif text-2xl md:text-3xl text-foreground">Day {activeDay}</h2>

            <Dialog open={isAddingActivity} onOpenChange={setIsAddingActivity}>
              <DialogTrigger asChild>
                <Button className="bg-primary text-primary-foreground font-serif uppercase tracking-widest text-xs md:text-sm">
                  <Plus className="w-4 h-4 mr-1 md:mr-2" />
                  <span className="hidden sm:inline">Add </span>Experience
                </Button>
              </DialogTrigger>
              <DialogContent className="w-[calc(100vw-2rem)] max-w-3xl bg-card border-border h-[85vh] flex flex-col p-0">
                <DialogHeader className="px-4 md:px-6 pt-4 md:pt-6 pb-0">
                  <DialogTitle className="font-serif text-xl md:text-2xl">
                    Add to Day {activeDay}
                  </DialogTitle>
                </DialogHeader>
                <div className="px-4 md:px-6 py-3 border-b border-border">
                  <input
                    type="text"
                    placeholder="Search experiences..."
                    className="w-full bg-background border border-border rounded-md px-4 py-2 text-foreground text-sm"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
                <ScrollArea className="flex-1 px-4 md:px-6 py-4">
                  <div className="space-y-3 md:space-y-4">
                    {activities?.map((activity) => (
                      <div
                        key={activity.id}
                        className="flex border border-border rounded-lg overflow-hidden bg-background"
                      >
                        {activity.imageUrl && (
                          <div className="w-20 md:w-32 shrink-0">
                            <img
                              src={getImageUrl(activity.imageUrl)}
                              alt={activity.title}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        )}
                        <div className="p-3 md:p-4 flex-1 flex flex-col justify-between min-w-0">
                          <div>
                            <h4 className="font-serif text-base md:text-lg mb-1 truncate">
                              {activity.title}
                            </h4>
                            <p className="text-xs md:text-sm text-muted-foreground flex gap-3">
                              <span className="flex items-center">
                                <Clock className="w-3 h-3 mr-1" />
                                {activity.durationMinutes}m
                              </span>
                              <span className="flex items-center truncate">
                                <MapPin className="w-3 h-3 mr-1 shrink-0" />
                                {activity.location}
                              </span>
                            </p>
                          </div>
                          <div className="mt-3 flex gap-1.5 md:gap-2 flex-wrap">
                            {["morning", "afternoon", "evening"].map((slot) => (
                              <Button
                                key={slot}
                                size="sm"
                                variant="outline"
                                className="text-xs uppercase tracking-wider border-primary/30 hover:bg-primary/10 text-primary h-7 px-2 md:px-3"
                                onClick={() => handleAddActivity(activity.id, slot)}
                                disabled={addMutation.isPending}
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

          {timeSlots.map((slot) => {
            const slotItems = currentDayItems.filter((item) => item.timeSlot === slot);
            return (
              <div key={slot} className="space-y-4">
                <h3 className="font-serif text-lg md:text-xl uppercase tracking-widest text-muted-foreground pb-2 border-b border-border/50">
                  {slot}
                </h3>
                {slotItems.length === 0 ? (
                  <div className="p-6 md:p-8 border border-dashed border-border rounded-lg text-center bg-card/30">
                    <p className="text-muted-foreground font-serif italic text-sm">
                      No experiences scheduled
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {slotItems.map((item) => (
                      <div
                        key={item.id}
                        className="flex border border-border bg-card rounded-lg overflow-hidden group"
                      >
                        {item.activity?.imageUrl && (
                          <div className="w-24 sm:w-32 md:w-48 shrink-0 relative">
                            <img
                              src={getImageUrl(item.activity.imageUrl)}
                              alt={item.activity.title}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        )}
                        <div className="p-4 md:p-6 flex-1 flex flex-col justify-between min-w-0">
                          <div>
                            <div className="flex justify-between items-start gap-2">
                              <h4 className="font-serif text-lg md:text-2xl mb-2 leading-tight">
                                <Link
                                  href={`/activities/${item.activity?.id}`}
                                  className="hover:text-primary transition-colors"
                                >
                                  {item.activity?.title}
                                </Link>
                              </h4>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 shrink-0 -mt-1 -mr-1"
                                onClick={() => handleRemoveActivity(item.id)}
                                disabled={removeMutation.isPending}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                            <p className="text-sm text-muted-foreground mb-3 md:mb-4 line-clamp-2">
                              {item.activity?.description}
                            </p>
                            <div className="flex flex-wrap gap-3 text-xs font-serif uppercase tracking-widest text-muted-foreground">
                              <span className="flex items-center gap-1 text-primary">
                                <Clock className="w-3 h-3" />
                                {item.activity?.durationMinutes}m
                              </span>
                              <span className="flex items-center gap-1 text-primary">
                                <MapPin className="w-3 h-3" />
                                {item.activity?.location}
                              </span>
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
    </div>
  );
}
