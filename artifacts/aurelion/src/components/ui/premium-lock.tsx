/**
 * @module components/ui/premium-lock
 * @description Simple premium feature gate with blurred background content.
 * Renders a lock icon overlay with an upgrade CTA over blurred child content
 * (or a skeleton placeholder). Used for teaser content behind paywalls on
 * activity detail pages and the itinerary builder.
 *
 * For a more conversion-focused gate with feature lists and price anchoring,
 * see {@link PremiumLockEnhanced}.
 */

import { Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { ReactNode } from "react";

interface PremiumLockProps {
  /** Gate title displayed below the lock icon. */
  title?: string;
  /** Descriptive text explaining what's behind the gate. */
  description?: string;
  /** Optional child content rendered blurred behind the overlay. */
  children?: ReactNode;
}

/**
 * Premium content gate component.
 * Displays a lock overlay with upgrade CTA. Child content is rendered
 * blurred and non-interactive behind the overlay.
 */
export function PremiumLock({ 
  title = "Concierge Intelligence", 
  description = "Unlock insider tips, premium booking guides, and AI concierge planning with Aurelion Premium.",
  children
}: PremiumLockProps) {
  const [, setLocation] = useLocation();

  return (
    <div className="relative overflow-hidden rounded-xl border border-border bg-card">
      <div className="absolute inset-0 bg-background/40 backdrop-blur-[6px] z-10 flex flex-col items-center justify-center p-6 text-center">
        <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
          <Lock className="h-5 w-5 text-primary" />
        </div>
        <h4 className="font-serif text-xl mb-2 text-foreground">{title}</h4>
        <p className="text-sm text-muted-foreground max-w-[280px] mb-6">
          {description}
        </p>
        <Button 
          onClick={() => setLocation("/pricing")}
          className="bg-primary hover:bg-primary/90 text-primary-foreground font-serif tracking-wide"
        >
          UPGRADE TO UNLOCK
        </Button>
      </div>
      
      {/* Blurred background content if provided, otherwise generic skeleton */}
      <div className="p-6 opacity-30 select-none pointer-events-none" aria-hidden="true">
        {children || (
          <div className="space-y-4">
            <div className="h-4 w-3/4 bg-muted rounded"></div>
            <div className="h-4 w-full bg-muted rounded"></div>
            <div className="h-4 w-5/6 bg-muted rounded"></div>
            <div className="h-4 w-1/2 bg-muted rounded"></div>
          </div>
        )}
      </div>
    </div>
  );
}
