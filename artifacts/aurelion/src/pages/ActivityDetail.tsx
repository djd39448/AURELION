/**
 * @module pages/ActivityDetail
 * @description Single activity detail page. Shows a full-bleed hero image,
 * metadata (location, duration, price, difficulty), a description section,
 * optional "What to Bring" / "What to Expect" cards, and a tier-gated
 * "Concierge Intelligence" section with booking guides and provider contacts.
 *
 * Business logic:
 *  - The "Concierge Intelligence" section is only visible to Premium-tier users
 *    (or admins). Free/Basic users see a PremiumLock upgrade prompt.
 *  - The sidebar CTA adapts: authenticated users get "Go to Dashboard",
 *    guests get "Sign in to Plan".
 *  - A mobile sticky bottom bar mirrors the desktop sidebar CTA.
 *
 * @route /activities/:id
 * @auth None required (public page)
 * @tier Premium required for Concierge Intelligence section
 */

import { useParams } from "wouter";
import { useGetActivity, useGetMe, useListPurchases } from "@workspace/api-client-react";
import { PremiumLockEnhanced } from "@/components/ui/premium-lock-enhanced";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { Button } from "@/components/ui/button";
import { MapPin, Clock, DollarSign, Activity as ActivityIcon, Info, Shield, Check } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { getActivityImageUrl } from "@/lib/image-url";

/**
 * ActivityDetail page component.
 *
 * @route /activities/:id
 * @auth None
 * @tier Premium (for Concierge Intelligence); all other content is public
 */
export default function ActivityDetail() {
  /** Extract the activity ID from the URL param and parse to integer. */
  const params = useParams();
  const id = parseInt(params.id || "0", 10);

  /** Query: fetch the single activity by ID. Disabled when id is falsy. */
  const { data: activity, isLoading } = useGetActivity(id, {
    query: { enabled: !!id, queryKey: [`/api/activities/${id}`] },
  });

  /** Query: current authenticated user (returns isAuthenticated: false for guests). */
  const { data: user } = useGetMe();
  /** Query: user's purchase history — used to determine effective tier. Only runs if authenticated. */
  const { data: purchases } = useListPurchases({
    query: { enabled: !!user?.isAuthenticated },
  });

  // -- Tier determination logic --
  // The effective tier is derived from the user's profile tier, their role,
  // AND their purchase history (a purchase of PREMIUM overrides the profile tier).
  const userTier = user?.tier ?? "free";
  /** True if user has Premium access (profile tier, admin role, or PREMIUM purchase). */
  const isPremium =
    userTier === "premium" ||
    user?.role === "admin" ||
    purchases?.some((p) => p.productType === "PREMIUM");
  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-12">
        <Skeleton className="h-12 w-2/3 mb-4 bg-muted" />
        <Skeleton className="h-[60vh] w-full mb-12 bg-muted" />
      </div>
    );
  }

  if (!activity) {
    return <div className="p-24 text-center">Activity not found</div>;
  }

  // -- Dynamic CTA based on auth state --
  // Authenticated users are directed to their dashboard; guests to the login page.
  const ctaHref = user?.isAuthenticated ? "/dashboard" : "/auth/login";
  const ctaLabel = user?.isAuthenticated ? "Go to Dashboard" : "Sign in to Plan";

  return (
    <div className="w-full pb-24 lg:pb-0">
      {/* Hero */}
      <div className="relative h-[50vh] md:h-[60vh] min-h-[360px]">
        <img
          src={getActivityImageUrl(activity.imageUrl, activity.category)}
          alt={activity.title}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent"></div>
        <div className="absolute bottom-0 left-0 right-0 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8 md:pb-12">
          <span className="text-primary font-serif tracking-widest text-sm uppercase mb-3 block">
            {activity.category}
          </span>
          <h1 className="font-serif text-3xl sm:text-4xl md:text-5xl lg:text-6xl text-foreground mb-4 md:mb-6 max-w-4xl leading-tight">
            {activity.title}
          </h1>
          <div className="flex flex-wrap gap-3 md:gap-6 text-xs md:text-sm text-muted-foreground uppercase tracking-widest">
            <div className="flex items-center gap-1.5">
              <MapPin className="w-3 h-3 md:w-4 md:h-4 text-primary shrink-0" />
              {activity.location}
            </div>
            <div className="flex items-center gap-1.5">
              <Clock className="w-3 h-3 md:w-4 md:h-4 text-primary shrink-0" />
              {activity.durationMinutes} MIN
            </div>
            <div className="flex items-center gap-1.5">
              {/* UX FIX #8: Price hierarchy — emphasise starting price, show range only when it differs */}
              <DollarSign className="w-3 h-3 md:w-4 md:h-4 text-primary shrink-0" />
              <span className="font-serif">${activity.priceLow}</span>
              {activity.priceHigh > activity.priceLow && (
                <span className="text-muted-foreground">– ${activity.priceHigh}</span>
              )}
              <span className="text-muted-foreground text-xs ml-1">/ person</span>
            </div>
            <div className="flex items-center gap-1.5">
              <ActivityIcon className="w-3 h-3 md:w-4 md:h-4 text-primary shrink-0" />
              {activity.difficulty}
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-16">
        {/* UX FIX #7: Breadcrumbs — helps users orient in deep pages and navigate
            back without relying on browser history. Category link pre-filters the
            directory, encouraging further browsing within the same category. */}
        <Breadcrumbs items={[
          { label: "Activities", href: "/activities" },
          { label: activity.category, href: `/activities?category=${encodeURIComponent(activity.category)}` },
          { label: activity.title },
        ]} />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 lg:gap-16">
          <div className="lg:col-span-2 space-y-10 md:space-y-12">
            <section>
              <h2 className="font-serif text-2xl md:text-3xl mb-4 md:mb-6 text-foreground">
                The Experience
              </h2>
              <div className="prose prose-invert max-w-none text-muted-foreground font-light leading-relaxed">
                <p>{activity.description}</p>
              </div>
            </section>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
              {activity.whatToBring && (
                <section className="bg-card p-6 md:p-8 border border-border">
                  <h3 className="font-serif text-xl mb-4 flex items-center gap-2">
                    <Check className="text-primary w-5 h-5 shrink-0" /> What to Bring
                  </h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    {activity.whatToBring}
                  </p>
                </section>
              )}
              {activity.whatToExpect && (
                <section className="bg-card p-6 md:p-8 border border-border">
                  <h3 className="font-serif text-xl mb-4 flex items-center gap-2">
                    <Info className="text-primary w-5 h-5 shrink-0" /> What to Expect
                  </h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    {activity.whatToExpect}
                  </p>
                </section>
              )}
            </div>

            <section>
              <h2 className="font-serif text-2xl md:text-3xl mb-6 text-foreground border-b border-border pb-4">
                Concierge Intelligence
              </h2>

              {isPremium ? (
                <div className="space-y-6 bg-primary/5 p-6 md:p-8 border border-primary/20 rounded-lg">
                  <div className="flex items-center gap-3 mb-4">
                    <Shield className="text-primary w-6 h-6" />
                    <h3 className="font-serif text-2xl text-primary">Premium Insider Guide</h3>
                  </div>
                  <div className="prose prose-invert max-w-none text-foreground/90">
                    <p>
                      <strong>Booking Guide:</strong>{" "}
                      {activity.basicBookingGuide ||
                        "Book 2-3 weeks in advance. Request the morning slot for best conditions."}
                    </p>
                    <p>
                      <strong>Provider:</strong>{" "}
                      {activity.providerName || "Local Elite Provider"}
                    </p>
                    {activity.providerWebsite && (
                      <p>
                        <strong>Website:</strong> {activity.providerWebsite}
                      </p>
                    )}
                    {activity.providerPhone && (
                      <p>
                        <strong>Contact:</strong> {activity.providerPhone}
                      </p>
                    )}
                  </div>
                </div>
              ) : (
                <PremiumLockEnhanced
                  title="Unlock Insider Intelligence"
                  description="Get exact booking guides, provider direct contacts, and insider tips from our luxury concierge team."
                  preview={activity.basicBookingGuide ? activity.basicBookingGuide.slice(0, 100) + "..." : undefined}
                  features={[
                    "Complete booking guide with best times",
                    "Direct provider contact information",
                    "Insider tips from local experts",
                    "Access to AI Concierge chat",
                  ]}
                />
              )}
            </section>
          </div>

          {/* Desktop sidebar — hidden on mobile, use sticky bottom bar instead */}
          <div className="hidden lg:block lg:col-span-1">
            <div className="sticky top-28 bg-card border border-border p-8 rounded-xl">
              <h3 className="font-serif text-2xl mb-6 text-foreground">Add to Itinerary</h3>
              <p className="text-muted-foreground text-sm mb-8">
                Plan your perfect trip by adding this experience to your custom itinerary.
              </p>
              <Button
                className="w-full bg-primary text-primary-foreground font-serif uppercase tracking-widest h-12"
                asChild
              >
                <a href={ctaHref}>{ctaLabel}</a>
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile sticky bottom bar — pb uses safe-area-inset for devices with notch/home indicator */}
      <div className="fixed bottom-0 left-0 right-0 z-40 lg:hidden bg-background/95 backdrop-blur-md border-t border-border px-4 pt-3 flex items-center gap-4" style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-muted-foreground uppercase tracking-widest font-serif truncate">
            {activity.title}
          </p>
          <p className="text-sm font-serif text-primary">
            ${activity.priceLow} – ${activity.priceHigh}
          </p>
        </div>
        <Button
          className="shrink-0 bg-primary text-primary-foreground font-serif uppercase tracking-widest"
          asChild
        >
          <a href={ctaHref}>{ctaLabel}</a>
        </Button>
      </div>
    </div>
  );
}
