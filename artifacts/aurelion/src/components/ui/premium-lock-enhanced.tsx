/**
 * @component PremiumLockEnhanced
 * @description Enhanced premium gate with preview content, pricing, and feature list.
 * Shows users exactly what they're missing and how to unlock it.
 * Replaces the basic PremiumLock in key conversion points (ActivityDetail, Chat)
 * to improve upgrade conversion by making the value proposition concrete.
 *
 * @example
 * <PremiumLockEnhanced
 *   title="Unlock Insider Intelligence"
 *   description="Get exact booking guides, provider contacts, and insider tips"
 *   preview="Book 2-5 days in advance. Morning tours are less crowded..."
 *   price="$49.99/mo"
 *   features={["Booking guides", "Direct contacts", "Insider tips"]}
 * />
 */

import { Lock, Check, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";

interface PremiumLockEnhancedProps {
  title: string;
  description: string;
  /** First ~100 chars of premium content shown blurred as a teaser */
  preview?: string;
  /** Display price — defaults to "$49.99" */
  price?: string;
  /** List of features the user will unlock */
  features?: string[];
  /** CTA button text — defaults to "Upgrade to Concierge" */
  ctaText?: string;
  /** CTA link target — defaults to "/pricing" */
  ctaHref?: string;
}

export function PremiumLockEnhanced({
  title,
  description,
  preview,
  price = "$49.99",
  features = [],
  ctaText = "Upgrade to Concierge",
  ctaHref = "/pricing",
}: PremiumLockEnhancedProps) {
  return (
    <div className="bg-card border-2 border-primary/20 rounded-xl p-6 md:p-8 relative overflow-hidden">
      {/* Subtle gradient background effect */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/5 pointer-events-none" />

      <div className="relative">
        <div className="flex items-start gap-4 mb-6">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            <Lock className="w-6 h-6 text-primary" />
          </div>
          <div className="flex-1">
            <h3 className="font-serif text-2xl text-foreground mb-2">{title}</h3>
            <p className="text-muted-foreground">{description}</p>
          </div>
        </div>

        {/* Preview content (blurred) — teases what's behind the paywall */}
        {preview && (
          <div className="mb-6 relative">
            <div className="bg-background/50 border border-border rounded-lg p-4 relative">
              <p className="text-sm text-foreground/70 blur-sm select-none">
                {preview}
              </p>
              <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-background/90 rounded-lg" />
            </div>
            <p className="text-xs text-center text-muted-foreground mt-2 italic">
              Premium content preview
            </p>
          </div>
        )}

        {/* Feature checklist — makes the value concrete */}
        {features.length > 0 && (
          <div className="mb-6 space-y-3">
            <p className="text-sm uppercase tracking-widest font-serif text-primary mb-3">
              What You'll Get:
            </p>
            {features.map((feature, i) => (
              <div key={i} className="flex items-center gap-2">
                <Check className="w-4 h-4 text-primary shrink-0" />
                <span className="text-sm text-foreground">{feature}</span>
              </div>
            ))}
          </div>
        )}

        {/* CTA with price anchor */}
        <div className="flex items-center justify-between pt-6 border-t border-border">
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-widest font-serif mb-1">
              Concierge Membership
            </p>
            <p className="text-2xl font-serif text-foreground">{price}</p>
          </div>
          <Button
            asChild
            className="bg-primary text-primary-foreground font-serif uppercase tracking-widest group"
          >
            <Link href={ctaHref}>
              {ctaText}
              <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
