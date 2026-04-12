/**
 * @module pages/Account
 * @description Authenticated user account page. Shows the user's profile
 * information (email, membership tier, member since date), their itinerary
 * history (newest first), an upgrade CTA for Free-tier users, and a log-out
 * button.
 *
 * Features:
 *  - Auth guard: redirects unauthenticated users to /auth/login.
 *  - Profile card: email, tier badge, member-since date.
 *  - Itinerary list (GET /api/account/itineraries) with link to each detail view.
 *  - Upgrade CTA visible only to Free-tier users.
 *  - Log out button.
 *  - Skeleton loading state while data is being fetched.
 *  - Empty state when the user has no itineraries yet.
 *
 * @route /account
 * @auth Required (redirects to /auth/login if unauthenticated)
 */

import { useEffect } from "react";
import { useLocation, Link } from "wouter";
import { useGetMe, useListAccountItineraries, useLogout, useListPurchases } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Map, LogOut, Star, Shield, CalendarDays, Mail } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

/** Formatted tier label for display. */
function tierLabel(tier: string, isPremium: boolean, isBasic: boolean): string {
  if (isPremium) return "Premium";
  if (isBasic) return "Basic";
  return "Free";
}

/** Tailwind badge classes per tier. */
function tierBadgeClasses(label: string): string {
  if (label === "Premium") return "bg-primary/20 text-primary border border-primary/30";
  if (label === "Basic") return "bg-blue-500/10 text-blue-600 border border-blue-500/20";
  return "bg-muted text-muted-foreground border border-border";
}

/**
 * Account page component.
 *
 * @route /account
 * @auth Required
 */
export default function Account() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();

  const { data: user, isLoading: userLoading } = useGetMe();
  const { data: itineraries, isLoading: itinerariesLoading } = useListAccountItineraries({
    query: { enabled: !!user?.isAuthenticated },
  });
  const { data: purchases } = useListPurchases({
    query: { enabled: !!user?.isAuthenticated },
  });
  const logoutMutation = useLogout();

  /** Auth guard: redirect to login when not authenticated. */
  useEffect(() => {
    if (!userLoading && !user?.isAuthenticated) {
      setLocation("/auth/login");
    }
  }, [user, userLoading, setLocation]);

  // Tier determination (mirrors Dashboard logic)
  const userTier = user?.tier ?? "free";
  const isPremium =
    userTier === "premium" ||
    user?.role === "admin" ||
    purchases?.some((p) => p.productType === "PREMIUM");
  const isBasic =
    isPremium ||
    userTier === "basic" ||
    purchases?.some((p) => p.productType === "BASIC");
  const isFree = !isPremium && !isBasic;

  const currentTierLabel = tierLabel(userTier, !!isPremium, !!isBasic);

  const handleLogout = () => {
    logoutMutation.mutate(undefined, {
      onSuccess: () => {
        queryClient.clear();
        setLocation("/");
      },
    });
  };

  if (userLoading || itinerariesLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12">
        <Skeleton className="h-10 w-48 mb-8 bg-muted" />
        <Skeleton className="h-40 bg-muted rounded-xl mb-8" />
        <Skeleton className="h-64 bg-muted rounded-xl" />
      </div>
    );
  }

  if (!user?.isAuthenticated) return null;

  // Format member-since date
  const memberSince = user.createdAt
    ? new Date(user.createdAt).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : null;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
      {/* Header */}
      <div className="mb-8 md:mb-10 flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div>
          <span className="text-primary font-serif tracking-widest text-sm uppercase mb-2 block">
            My Account
          </span>
          <h1 className="font-serif text-3xl md:text-4xl text-foreground">
            {user.name}
          </h1>
        </div>
        <Button
          onClick={handleLogout}
          variant="outline"
          className="border-border text-muted-foreground hover:text-foreground font-serif uppercase tracking-widest"
          disabled={logoutMutation.isPending}
        >
          <LogOut className="w-4 h-4 mr-2" />
          {logoutMutation.isPending ? "Signing out…" : "Sign out"}
        </Button>
      </div>

      {/* Profile card */}
      <div className="bg-card border border-border rounded-xl p-6 md:p-8 mb-8 md:mb-10">
        <h2 className="font-serif text-lg text-foreground mb-5 uppercase tracking-widest text-sm">
          Profile
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          {/* Email */}
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
              <Mail className="text-primary w-4 h-4" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground uppercase tracking-widest font-serif mb-1">
                Email
              </p>
              <p className="text-sm text-foreground truncate">{user.email}</p>
            </div>
          </div>

          {/* Membership tier */}
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
              <Shield className="text-primary w-4 h-4" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-widest font-serif mb-1">
                Membership
              </p>
              <span
                className={`inline-block text-xs font-serif uppercase tracking-widest px-2 py-0.5 rounded-full ${tierBadgeClasses(currentTierLabel)}`}
              >
                {currentTierLabel}
              </span>
            </div>
          </div>

          {/* Member since */}
          {memberSince && (
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                <CalendarDays className="text-primary w-4 h-4" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-widest font-serif mb-1">
                  Member Since
                </p>
                <p className="text-sm text-foreground">{memberSince}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Upgrade CTA — Free tier only */}
      {isFree && (
        <div className="bg-primary/5 border border-primary/20 rounded-xl p-5 md:p-6 mb-8 md:mb-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <p className="font-serif text-foreground text-base md:text-lg mb-1">
              Unlock more with Basic or Premium
            </p>
            <p className="text-muted-foreground text-sm">
              Export itineraries, access insider tips, and unlock AI Concierge.
            </p>
          </div>
          <div className="flex gap-3 shrink-0">
            <Button asChild className="bg-primary text-primary-foreground font-serif uppercase tracking-widest">
              <Link href="/pricing">
                <Star className="w-4 h-4 mr-2" /> Upgrade to Basic
              </Link>
            </Button>
          </div>
        </div>
      )}

      {/* Itinerary history */}
      <div>
        <h2 className="font-serif text-xl md:text-2xl mb-5 md:mb-6 text-foreground border-b border-border pb-2">
          Itinerary History
        </h2>

        {!itineraries || itineraries.length === 0 ? (
          <div className="bg-card border border-border rounded-xl p-10 md:p-12 text-center flex flex-col items-center">
            <div className="w-16 h-16 mx-auto mb-5 rounded-full bg-primary/10 flex items-center justify-center">
              <Map className="w-8 h-8 text-primary" />
            </div>
            <h3 className="font-serif text-xl md:text-2xl mb-3 text-foreground">
              No itineraries yet
            </h3>
            <p className="text-muted-foreground mb-6">
              Start planning your Aruba adventure.
            </p>
            <Button asChild className="bg-primary text-primary-foreground font-serif uppercase tracking-widest">
              <Link href="/itineraries/new">Plan a Trip</Link>
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {itineraries.map((itinerary) => (
              <Link
                key={itinerary.id}
                href={`/itineraries/${itinerary.id}`}
                className="group block"
              >
                <div className="bg-card border border-border rounded-xl px-5 py-4 hover:border-primary/50 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <h3 className="font-serif text-base md:text-lg text-foreground group-hover:text-primary transition-colors truncate">
                      {itinerary.title}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {new Date(itinerary.createdAt).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </p>
                  </div>
                  <div className="shrink-0">
                    <span
                      className={`text-xs font-serif uppercase tracking-widest px-2 py-0.5 rounded-full ${
                        itinerary.tierType === "PREMIUM"
                          ? "bg-primary/20 text-primary border border-primary/30"
                          : itinerary.tierType === "BASIC"
                          ? "bg-blue-500/10 text-blue-600 border border-blue-500/20"
                          : "bg-muted text-muted-foreground border border-border"
                      }`}
                    >
                      {itinerary.tierType === "PREMIUM"
                        ? "Premium"
                        : itinerary.tierType === "BASIC"
                        ? "Basic"
                        : "Free"}
                    </span>
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
