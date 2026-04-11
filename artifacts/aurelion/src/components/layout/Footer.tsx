/**
 * @module components/layout/Footer
 * @description Site-wide footer rendered at the bottom of every page via MainLayout.
 * Contains the AURELION brand mark, "Discover" navigation links (Experiences,
 * Membership, Our Story), placeholder legal links, and a copyright notice.
 *
 * This is a purely presentational component with no data fetching or state.
 */

import { Link } from "wouter";
import { Compass } from "lucide-react";

/**
 * Footer component — rendered beneath all page content in MainLayout.
 */
export function Footer() {
  return (
    <footer className="bg-background border-t border-border pt-16 pb-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 md:gap-8 mb-12">
          <div className="col-span-1 md:col-span-2">
            <Link href="/" className="flex items-center gap-2 group mb-6">
              <Compass className="h-6 w-6 text-primary" />
              <span className="font-serif text-2xl tracking-widest text-foreground font-semibold">
                AURELION
              </span>
            </Link>
            <p className="text-muted-foreground text-sm max-w-sm leading-relaxed">
              The luxury concierge platform for discerning adventurers. 
              Precision-crafted itineraries for Aruba's most exclusive and wild experiences.
            </p>
          </div>
          
          <div>
            <h4 className="font-serif text-lg text-foreground mb-6">Discover</h4>
            <ul className="space-y-4">
              <li>
                <Link href="/activities" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                  Experiences
                </Link>
              </li>
              <li>
                <Link href="/pricing" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                  Membership
                </Link>
              </li>
              <li>
                <Link href="/about" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                  Our Story
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-serif text-lg text-foreground mb-6">Legal</h4>
            <ul className="space-y-4">
              <li>
                <Link href="/terms" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                  Privacy Policy
                </Link>
              </li>
            </ul>
          </div>
        </div>
        
        <div className="pt-8 border-t border-border flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} AURELION. All rights reserved.
          </p>
          <p className="text-xs text-muted-foreground tracking-widest uppercase">
            Aruba
          </p>
        </div>
      </div>
    </footer>
  );
}
