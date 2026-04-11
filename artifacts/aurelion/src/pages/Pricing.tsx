/**
 * @module pages/Pricing
 * @description Three-tier pricing page for AURELION memberships.
 * Presents Explorer (free), Planner ($9.99/trip), and Concierge ($49.99/trip)
 * tiers in a responsive card grid. Each paid tier has a "Upgrade" button that
 * initiates a Stripe Checkout session via the `useCreateCheckout` mutation.
 *
 * Business logic:
 *  - Unauthenticated users clicking "Upgrade" are redirected to /auth/login first.
 *  - Already-purchased tiers show a disabled "Purchased" / "Active" button.
 *  - The Planner card is visually elevated (border-2, shadow, -translate-y) with a "Popular" badge.
 *
 * @route /pricing
 * @auth None required (public page; auth required to initiate checkout)
 * @tier None required
 */

import { Button } from "@/components/ui/button";
import { useCreateCheckout, useListPurchases, useGetMe } from "@workspace/api-client-react";
import { Check, Compass, Star, Shield } from "lucide-react";
import { useLocation } from "wouter";

/**
 * Pricing page component.
 *
 * @route /pricing
 * @auth None (redirects to login on upgrade attempt if unauthenticated)
 * @tier None
 */
export default function Pricing() {
  const [, setLocation] = useLocation();
  /** Query: current user profile — used for auth check before checkout. */
  const { data: user } = useGetMe();
  /** Query: purchase history — determines which tiers are already owned. */
  const { data: purchases } = useListPurchases({
    query: { enabled: !!user?.isAuthenticated }
  });

  /** Mutation: creates a Stripe Checkout session and returns a redirect URL. */
  const checkoutMutation = useCreateCheckout();

  /**
   * Initiate the upgrade flow for a given tier.
   * If the user is not authenticated, redirect to login instead.
   * On success, perform a full-page redirect to the Stripe-hosted checkout URL.
   *
   * @param tier - The product type to purchase ('BASIC' or 'PREMIUM').
   */
  const handleUpgrade = (tier: 'BASIC' | 'PREMIUM') => {
    // Guard: redirect unauthenticated users to login first
    if (!user?.isAuthenticated) {
      setLocation("/auth/login");
      return;
    }

    // itineraryId: 0 is used for a generic (non-itinerary-specific) upgrade
    checkoutMutation.mutate({ data: { itineraryId: 0, productType: tier } }, {
      onSuccess: (res) => {
        // Full-page redirect to Stripe Checkout
        window.location.href = res.url;
      }
    });
  };

  /** Whether the user already owns a Premium purchase. */
  const isPremium = purchases?.some(p => p.productType === 'PREMIUM');
  /** Whether the user already owns a Basic purchase. */
  const isBasic = purchases?.some(p => p.productType === 'BASIC');

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
      <div className="text-center max-w-3xl mx-auto mb-16">
        <span className="text-primary font-serif tracking-widest text-sm uppercase mb-4 block">Membership</span>
        <h1 className="font-serif text-5xl text-foreground mb-6">Elevate Your Aruba Experience</h1>
        <p className="text-xl text-muted-foreground font-light leading-relaxed">
          From basic planning to full concierge intelligence, choose the level of guidance you need for your perfect trip.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* FREE */}
        <div className="bg-card border border-border p-8 rounded-xl flex flex-col">
          <div className="mb-8">
            <h3 className="font-serif text-2xl text-foreground mb-2">Explorer</h3>
            <div className="text-4xl font-serif text-foreground mb-4">$0</div>
            <p className="text-sm text-muted-foreground">Essential access to the directory.</p>
          </div>
          <ul className="space-y-4 mb-8 flex-1">
            <li className="flex gap-3 text-sm text-foreground"><Check className="w-5 h-5 text-primary shrink-0" /> Browse curated activities</li>
            <li className="flex gap-3 text-sm text-foreground"><Check className="w-5 h-5 text-primary shrink-0" /> Build basic itineraries</li>
            <li className="flex gap-3 text-sm text-muted-foreground line-through opacity-50"><Check className="w-5 h-5 shrink-0" /> Export to PDF/Share</li>
            <li className="flex gap-3 text-sm text-muted-foreground line-through opacity-50"><Check className="w-5 h-5 shrink-0" /> Insider booking intelligence</li>
            <li className="flex gap-3 text-sm text-muted-foreground line-through opacity-50"><Check className="w-5 h-5 shrink-0" /> AI Concierge Chat</li>
          </ul>
          <Button variant="outline" className="w-full border-primary/30 font-serif tracking-widest uppercase" onClick={() => setLocation("/auth/register")}>
            Current Plan
          </Button>
        </div>

        {/* BASIC */}
        <div className="bg-background border-2 border-primary/50 p-8 rounded-xl flex flex-col relative transform md:-translate-y-4 shadow-2xl shadow-primary/5">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-primary text-primary-foreground px-4 py-1 text-xs font-serif uppercase tracking-widest rounded-full flex items-center gap-1">
            <Compass className="w-3 h-3" /> Popular
          </div>
          <div className="mb-8">
            <h3 className="font-serif text-2xl text-foreground mb-2">Planner</h3>
            <div className="text-4xl font-serif text-foreground mb-4">$9.99<span className="text-lg text-muted-foreground">/trip</span></div>
            <p className="text-sm text-muted-foreground">Perfect for organizing your stay.</p>
          </div>
          <ul className="space-y-4 mb-8 flex-1">
            <li className="flex gap-3 text-sm text-foreground"><Check className="w-5 h-5 text-primary shrink-0" /> Browse curated activities</li>
            <li className="flex gap-3 text-sm text-foreground"><Check className="w-5 h-5 text-primary shrink-0" /> Build basic itineraries</li>
            <li className="flex gap-3 text-sm text-foreground"><Check className="w-5 h-5 text-primary shrink-0" /> Export to PDF/Share</li>
            <li className="flex gap-3 text-sm text-muted-foreground line-through opacity-50"><Check className="w-5 h-5 shrink-0" /> Insider booking intelligence</li>
            <li className="flex gap-3 text-sm text-muted-foreground line-through opacity-50"><Check className="w-5 h-5 shrink-0" /> AI Concierge Chat</li>
          </ul>
          <Button 
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-serif tracking-widest uppercase"
            onClick={() => handleUpgrade('BASIC')}
            disabled={isPremium || isBasic}
          >
            {isPremium || isBasic ? "Purchased" : "Upgrade to Planner"}
          </Button>
        </div>

        {/* PREMIUM */}
        <div className="bg-card border border-border p-8 rounded-xl flex flex-col relative overflow-hidden">
          <div className="absolute -right-12 -top-12 opacity-5 pointer-events-none">
            <Shield className="w-48 h-48 text-primary" />
          </div>
          <div className="mb-8 relative z-10">
            <h3 className="font-serif text-2xl text-primary mb-2 flex items-center gap-2"><Star className="w-5 h-5" fill="currentColor" /> Concierge</h3>
            <div className="text-4xl font-serif text-foreground mb-4">$49.99<span className="text-lg text-muted-foreground">/trip</span></div>
            <p className="text-sm text-muted-foreground">The ultimate luxury planning experience.</p>
          </div>
          <ul className="space-y-4 mb-8 flex-1 relative z-10">
            <li className="flex gap-3 text-sm text-foreground"><Check className="w-5 h-5 text-primary shrink-0" /> Browse curated activities</li>
            <li className="flex gap-3 text-sm text-foreground"><Check className="w-5 h-5 text-primary shrink-0" /> Build basic itineraries</li>
            <li className="flex gap-3 text-sm text-foreground"><Check className="w-5 h-5 text-primary shrink-0" /> Export to PDF/Share</li>
            <li className="flex gap-3 text-sm text-foreground"><Check className="w-5 h-5 text-primary shrink-0" /> Insider booking intelligence</li>
            <li className="flex gap-3 text-sm text-foreground"><Check className="w-5 h-5 text-primary shrink-0" /> Provider direct contacts</li>
            <li className="flex gap-3 text-sm text-foreground font-medium text-primary"><Check className="w-5 h-5 text-primary shrink-0" /> 24/7 AI Concierge Chat</li>
          </ul>
          <Button 
            variant="outline"
            className="w-full border-primary text-primary hover:bg-primary hover:text-primary-foreground font-serif tracking-widest uppercase relative z-10 transition-colors"
            onClick={() => handleUpgrade('PREMIUM')}
            disabled={isPremium}
          >
            {isPremium ? "Active" : "Unlock Concierge"}
          </Button>
        </div>
      </div>
    </div>
  );
}
