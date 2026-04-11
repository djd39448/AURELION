/**
 * @module pages/About
 * @description Brand story page for AURELION. Communicates the platform's
 * mission, curation process, and AI Concierge offering through long-form prose.
 * Ends with a CTA linking to the activity directory.
 *
 * This page is entirely static content with no data fetching or auth checks.
 *
 * @route /about
 * @auth None required
 * @tier None required
 */

import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { getImageUrl } from "@/lib/image-url";
import { SEOMeta } from "@/components/SEOMeta";

/**
 * About page component.
 *
 * @route /about
 * @auth None
 * @tier None
 */
export default function About() {
  return (
    <>
    <SEOMeta
      title="About"
      description="Learn about AURELION — Aruba's premier luxury adventure platform. Discover our curation philosophy, AI Concierge service, and commitment to vetted excellence."
      path="/about"
    />
    <div className="w-full">
      {/* Hero */}
      <div className="relative h-[50vh] min-h-[400px] flex items-center justify-center">
        <img
          src={getImageUrl("/about-hero.png")}
          alt="Aurelion Concierge"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-background/70 backdrop-blur-sm"></div>
        <div className="relative z-10 text-center max-w-3xl px-4">
          <span className="text-primary font-serif tracking-[0.2em] text-sm uppercase mb-6 block">
            Our Story
          </span>
          <h1 className="font-serif text-5xl md:text-7xl text-foreground mb-6">
            Redefining Travel.
          </h1>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
        <div className="prose prose-invert prose-lg max-w-none font-light text-muted-foreground leading-relaxed space-y-8">
          <p className="text-2xl text-foreground font-serif leading-normal mb-12">
            Aurelion was born from a simple realization: the best experiences in Aruba aren't found in generic top-10 lists or crowded booking platforms. They are known only to the locals and the elite concierges of five-star resorts.
          </p>

          <p>
            We set out to democratize that level of access while maintaining the exclusivity and quality of the experiences. We are a platform for the discerning traveler—the one who prefers a private sunset sail over a crowded party boat, the hidden cliffside trail over the paved tourist path.
          </p>

          <h2 className="font-serif text-3xl text-foreground mt-16 mb-8">The Curation Process</h2>
          <p>
            Every activity on Aurelion is rigorously vetted. We evaluate providers on safety, equipment quality, environmental stewardship, and the ability to deliver a truly premium experience. If it doesn't meet our standards, it doesn't make the list.
          </p>

          <h2 className="font-serif text-3xl text-foreground mt-16 mb-8">The AI Concierge</h2>
          <p>
            To provide 24/7 personalized support, we've trained our AI Concierge on thousands of data points about Aruba—tide charts, seasonal wind patterns, restaurant waitlists, and secret spots. Available exclusively to our Premium members, it's like having a local expert in your pocket.
          </p>
        </div>

        <div className="mt-24 text-center border-t border-border pt-16">
          <h3 className="font-serif text-2xl text-foreground mb-6">Ready to plan your escape?</h3>
          <Button asChild size="lg" className="bg-primary text-primary-foreground font-serif uppercase tracking-widest">
            <Link href="/activities">Explore The Directory</Link>
          </Button>
        </div>
      </div>
    </div>
    </>
  );
}
