/**
 * @module pages/Dashboard
 * @description Authenticated user dashboard. Displays a personalised welcome
 * header, summary stats (total itineraries, planned activities, membership tier),
 * and a list of the user's itineraries.
 *
 * Features:
 *  - Auth guard: redirects unauthenticated users to /auth/login via useEffect.
 *  - "New Itinerary" CTA always visible.
 *  - "AI Concierge" button visible only to Premium-tier users; otherwise shows "Upgrade".
 *  - Stats cards sourced from the dashboard summary API endpoint.
 *  - Itinerary list with click-through to /itineraries/:id.
 *  - Empty state with "Plan a Trip" CTA when no itineraries exist.
 *  - Skeleton loading state while data is being fetched.
 *
 * @route /dashboard
 * @auth Required (redirects to /auth/login if unauthenticated)
 * @tier None required (Premium unlocks AI Concierge button)
 */

import { useEffect, useState } from "react";
import { useLocation, Link } from "wouter";
import {
  useGetMe,
  useGetDashboardSummary,
  useListItineraries,
  useListPurchases,
  useCreateChatSession,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Compass, Map, Plus, Shield, MessageSquare, Star, X } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";

/**
 * Dashboard page component.
 *
 * @route /dashboard
 * @auth Required
 * @tier None (Premium enables AI Concierge button)
 */
export default function Dashboard() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  /** Query: current user profile (auth state + tier + role). */
  const { data: user, isLoading: userLoading } = useGetMe();
  /** Query: aggregated dashboard stats (total itineraries, total activities). Only fetched when authenticated. */
  const { data: summary, isLoading: summaryLoading } = useGetDashboardSummary({
    query: { enabled: !!user?.isAuthenticated },
  });
  /** Query: user's itinerary list. Only fetched when authenticated. */
  const { data: itineraries, isLoading: itinerariesLoading } = useListItineraries({
    query: { enabled: !!user?.isAuthenticated },
  });
  /** Query: purchase history — used to determine effective tier. */
  const { data: purchases } = useListPurchases({
    query: { enabled: !!user?.isAuthenticated },
  });

  /** Mutation: create a new AI chat session and navigate to /chat/:sessionId on success. */
  const createChat = useCreateChatSession();

  /** Controls local dismiss for the first-run banner (session-only). */
  const [bannerDismissed, setBannerDismissed] = useState(false);

  /**
   * Auth guard side-effect.
   * Once the user query resolves, if the user is not authenticated,
   * redirect to the login page. This runs on mount and whenever auth state changes.
   */
  useEffect(() => {
    if (!userLoading && !user?.isAuthenticated) {
      setLocation("/auth/login");
    }
  }, [user, userLoading, setLocation]);

  // -- Tier determination (mirrors logic in ActivityDetail) --
  const userTier = user?.tier ?? "free";
  /** True if user has Premium access (profile tier, admin role, or PREMIUM purchase). */
  const isPremium =
    userTier === "premium" ||
    user?.role === "admin" ||
    purchases?.some((p) => p.productType === "PREMIUM");
  /** True if user has at least Basic access (includes Premium). */
  const isBasic =
    isPremium ||
    userTier === "basic" ||
    purchases?.some((p) => p.productType === "BASIC");

  /**
   * Start a new AI Concierge chat session.
   * Creates a session via the API, then navigates to the chat page.
   */
  const startChat = () => {
    createChat.mutate(
      { data: {} },
      {
        onSuccess: (session) => {
          toast({
            title: "AI Concierge ready",
            description: "Starting your concierge session...",
          });
          setLocation(`/chat/${session.id}`);
        },
        onError: () => {
          toast({
            title: "Error",
            description: "Could not start chat. Please try again.",
            variant: "destructive",
          });
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

      {/* First-run onboarding banner — shown until user generates their first itinerary */}
      {!user.hasGeneratedItinerary && !bannerDismissed && (
        <div className="mb-8 bg-primary/10 border border-primary/30 rounded-xl p-5 md:p-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4 min-w-0">
            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
              <Map className="text-primary w-5 h-5" />
            </div>
            <div className="min-w-0">
              <p className="font-serif text-foreground text-base md:text-lg">
                Generate your first itinerary — it's free!
              </p>
              <p className="text-muted-foreground text-sm mt-0.5">
                Build a personalised Aruba adventure in minutes.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <Button asChild size="sm" className="bg-primary text-primary-foreground font-serif uppercase tracking-widest hidden sm:inline-flex">
              <Link href="/itineraries/new">Start Now</Link>
            </Button>
            <button
              onClick={() => setBannerDismissed(true)}
              className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded"
              aria-label="Dismiss banner"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

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

        {/* UX FIX #4: Enhanced empty state — gradient bg, larger icon, motivating copy,
            and social proof line reduce blank-page anxiety and encourage first action. */}
        {itineraries?.length === 0 ? (
          <div className="bg-card border border-border rounded-xl p-10 md:p-12 text-center flex flex-col items-center relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/5 pointer-events-none" />
            <div className="relative">
              <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-primary/10 flex items-center justify-center">
                <Map className="w-10 h-10 text-primary" />
              </div>
              <h3 className="font-serif text-2xl md:text-3xl mb-3 text-foreground">
                Your Next Adventure Awaits
              </h3>
              <p className="text-muted-foreground mb-2 text-lg">
                Aruba's most exclusive experiences,
              </p>
              <p className="text-muted-foreground mb-8 text-lg">
                curated just for you.
              </p>
              <Button asChild size="lg" className="bg-primary text-primary-foreground font-serif uppercase tracking-widest h-14 px-8">
                <Link href="/itineraries/new">Start Planning</Link>
              </Button>
              <p className="text-xs text-muted-foreground/60 mt-8">
                Join 200+ travelers who've crafted their perfect Aruba trip with Aurelion
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            {itineraries?.map((itinerary) => (
              <Link key={itinerary.id} href={`/itineraries/${itinerary.id}`} className="group block">
                {/* UX FIX #5: Micro-interaction — subtle lift + shadow on hover signals interactivity.
                    200ms duration keeps it snappy without jarring. */}
                <div className="bg-card border border-border rounded-xl p-5 md:p-6 hover:border-primary/50 hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200 h-full flex flex-col">
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
