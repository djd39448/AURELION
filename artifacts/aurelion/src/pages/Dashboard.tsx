import { useEffect } from "react";
import { useLocation, Link } from "wouter";
import {
  useGetMe,
  useGetDashboardSummary,
  useListItineraries,
  useListPurchases,
  useCreateChatSession,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Compass, Map, Plus, Shield, MessageSquare, Star } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function Dashboard() {
  const [, setLocation] = useLocation();
  const { data: user, isLoading: userLoading } = useGetMe();
  const { data: summary, isLoading: summaryLoading } = useGetDashboardSummary({
    query: { enabled: !!user?.isAuthenticated },
  });
  const { data: itineraries, isLoading: itinerariesLoading } = useListItineraries({
    query: { enabled: !!user?.isAuthenticated },
  });
  const { data: purchases } = useListPurchases({
    query: { enabled: !!user?.isAuthenticated },
  });

  const createChat = useCreateChatSession();

  useEffect(() => {
    if (!userLoading && !user?.isAuthenticated) {
      setLocation("/auth/login");
    }
  }, [user, userLoading, setLocation]);

  const userTier = user?.tier ?? "free";
  const isPremium =
    userTier === "premium" ||
    user?.role === "admin" ||
    purchases?.some((p) => p.productType === "PREMIUM");
  const isBasic =
    isPremium ||
    userTier === "basic" ||
    purchases?.some((p) => p.productType === "BASIC");

  const startChat = () => {
    createChat.mutate(
      { data: {} },
      {
        onSuccess: (session) => {
          setLocation(`/chat/${session.id}`);
        },
      }
    );
  };

  if (userLoading || summaryLoading || itinerariesLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-12">
        <Skeleton className="h-12 w-64 mb-8 bg-muted" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-12">
          <Skeleton className="h-32 bg-muted rounded-xl" />
          <Skeleton className="h-32 bg-muted rounded-xl" />
          <Skeleton className="h-32 bg-muted rounded-xl" />
        </div>
        <Skeleton className="h-64 bg-muted rounded-xl" />
      </div>
    );
  }

  if (!user?.isAuthenticated) return null;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
      {/* Header */}
      <div className="mb-8 md:mb-12">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
          <div>
            <span className="text-primary font-serif tracking-widest text-sm uppercase mb-2 block">
              Welcome Back
            </span>
            <h1 className="font-serif text-3xl md:text-4xl lg:text-5xl text-foreground">
              {user.name}'s Concierge
            </h1>
          </div>
          <div className="flex flex-wrap gap-3 w-full sm:w-auto">
            <Button
              asChild
              className="bg-primary text-primary-foreground font-serif uppercase tracking-widest flex-1 sm:flex-none"
            >
              <Link href="/itineraries/new">
                <Plus className="w-4 h-4 mr-2" /> New Itinerary
              </Link>
            </Button>
            {isPremium ? (
              <Button
                onClick={startChat}
                variant="outline"
                className="border-primary text-primary font-serif uppercase tracking-widest flex-1 sm:flex-none"
              >
                <MessageSquare className="w-4 h-4 mr-2" /> AI Concierge
              </Button>
            ) : (
              <Button
                asChild
                variant="outline"
                className="border-primary/30 font-serif uppercase tracking-widest flex-1 sm:flex-none"
              >
                <Link href="/pricing">
                  <Star className="w-4 h-4 mr-2 text-primary" /> Upgrade
                </Link>
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-6 mb-8 md:mb-12">
        <div className="bg-card border border-border p-5 md:p-6 rounded-xl flex items-center gap-4 md:gap-6">
          <div className="w-11 h-11 md:w-12 md:h-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            <Map className="text-primary w-5 h-5 md:w-6 md:h-6" />
          </div>
          <div>
            <p className="text-xs md:text-sm text-muted-foreground uppercase tracking-widest font-serif">
              Itineraries
            </p>
            <p className="text-2xl md:text-3xl font-serif text-foreground">
              {summary?.totalItineraries || 0}
            </p>
          </div>
        </div>

        <div className="bg-card border border-border p-5 md:p-6 rounded-xl flex items-center gap-4 md:gap-6">
          <div className="w-11 h-11 md:w-12 md:h-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            <Compass className="text-primary w-5 h-5 md:w-6 md:h-6" />
          </div>
          <div>
            <p className="text-xs md:text-sm text-muted-foreground uppercase tracking-widest font-serif">
              Planned Activities
            </p>
            <p className="text-2xl md:text-3xl font-serif text-foreground">
              {summary?.totalActivities || 0}
            </p>
          </div>
        </div>

        <div className="bg-card border border-border p-5 md:p-6 rounded-xl flex items-center gap-4 md:gap-6">
          <div className="w-11 h-11 md:w-12 md:h-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            <Shield className="text-primary w-5 h-5 md:w-6 md:h-6" />
          </div>
          <div>
            <p className="text-xs md:text-sm text-muted-foreground uppercase tracking-widest font-serif">
              Membership
            </p>
            <p className="text-lg md:text-xl font-serif text-foreground mt-0.5">
              {isPremium ? "Concierge" : isBasic ? "Planner" : "Explorer"}
            </p>
          </div>
        </div>
      </div>

      {/* Itineraries */}
      <div>
        <h2 className="font-serif text-xl md:text-2xl mb-5 md:mb-6 text-foreground border-b border-border pb-2">
          Your Itineraries
        </h2>

        {itineraries?.length === 0 ? (
          <div className="bg-card border border-border rounded-xl p-10 md:p-12 text-center flex flex-col items-center">
            <Map className="w-10 h-10 md:w-12 md:h-12 text-muted-foreground/30 mb-4" />
            <h3 className="font-serif text-xl mb-2">No itineraries yet</h3>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              Start planning your perfect Aruba adventure by creating your first itinerary.
            </p>
            <Button
              asChild
              className="bg-primary text-primary-foreground font-serif uppercase tracking-widest"
            >
              <Link href="/itineraries/new">Plan a Trip</Link>
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            {itineraries?.map((itinerary) => (
              <Link key={itinerary.id} href={`/itineraries/${itinerary.id}`} className="group block">
                <div className="bg-card border border-border rounded-xl p-5 md:p-6 hover:border-primary/50 transition-colors h-full flex flex-col">
                  <h3 className="font-serif text-lg md:text-xl text-foreground mb-2 group-hover:text-primary transition-colors">
                    {itinerary.title}
                  </h3>
                  <div className="flex justify-between text-sm text-muted-foreground mt-auto pt-4 border-t border-border/50">
                    <span>{itinerary.totalDays} Days</span>
                    <span className="uppercase tracking-widest text-xs">{itinerary.status}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
