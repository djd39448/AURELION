/**
 * @module pages/Terms
 * @description Terms of Service page for AURELION. Covers service description,
 * payment and refund policy, AI disclaimer, and limitation of liability.
 *
 * This page is entirely static content with no data fetching or auth checks.
 *
 * @route /terms
 * @auth None required
 * @tier None required
 */

import { Link } from "wouter";

/**
 * Terms of Service page component.
 *
 * @route /terms
 * @auth None
 * @tier None
 */
export default function Terms() {
  return (
    <div className="w-full">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
        <div className="mb-16">
          <span className="text-primary font-serif tracking-[0.2em] text-sm uppercase mb-6 block">
            Legal
          </span>
          <h1 className="font-serif text-5xl text-foreground mb-4">Terms of Service</h1>
          <p className="text-muted-foreground text-sm">Last updated: April 11, 2026</p>
        </div>

        <div className="prose prose-invert prose-lg max-w-none font-light text-muted-foreground leading-relaxed space-y-10">
          <section>
            <h2 className="font-serif text-2xl text-foreground mb-4">1. Service Description</h2>
            <p>
              AURELION is a luxury travel concierge platform that provides curated activity listings,
              personalized itinerary planning, and AI-assisted travel recommendations for Aruba. We offer
              two paid membership tiers — <strong className="text-foreground">Basic (Planner)</strong> and{" "}
              <strong className="text-foreground">Premium (Concierge)</strong> — in addition to a free
              Explorer tier.
            </p>
            <p>
              Our platform connects discerning travelers with hand-selected local experiences and activity
              providers. AURELION acts as a marketplace and concierge service; we do not directly operate
              the activities or tours listed on the platform.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-2xl text-foreground mb-4">2. Membership &amp; Payment</h2>
            <p>
              Paid memberships are purchased on a per-trip basis through our secure Stripe-powered checkout.
              By completing a purchase, you agree to the following terms:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>
                <strong className="text-foreground">Basic (Planner) — $9.99 per trip:</strong> Unlocks
                curated itinerary generation and access to the full activity directory with detailed
                information.
              </li>
              <li>
                <strong className="text-foreground">Premium (Concierge) — $49.99 per trip:</strong> Includes
                all Basic features plus unlimited access to the AURELION AI Concierge for personalized,
                real-time travel guidance.
              </li>
            </ul>
            <p>
              All prices are displayed in US dollars. Payment is processed at the time of purchase via Stripe.
              AURELION does not store your payment card details.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-2xl text-foreground mb-4">3. Refund Policy</h2>
            <p>We understand plans change. Our refund policy is as follows:</p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>
                <strong className="text-foreground">Basic (Planner) memberships</strong> are eligible for a
                full refund within <strong className="text-foreground">48 hours</strong> of purchase,
                provided you have not yet used the itinerary generation feature. After 48 hours or upon first
                use, all sales are final and non-refundable.
              </li>
              <li>
                <strong className="text-foreground">Premium (Concierge) memberships</strong> are eligible
                for a full refund within <strong className="text-foreground">7 days</strong> of purchase,
                provided you have not initiated more than one AI Concierge session. After 7 days or upon
                second AI session, all sales are final and non-refundable.
              </li>
            </ul>
            <p>
              To request a refund, contact us at{" "}
              <a href="mailto:support@aurelion.app" className="text-primary hover:underline">
                support@aurelion.app
              </a>{" "}
              with your order details. Refunds are processed within 5–10 business days.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-2xl text-foreground mb-4">4. AI Concierge Disclaimer</h2>
            <p>
              AURELION's AI Concierge is designed to provide personalized travel guidance based on
              aggregated data about Aruba's activities, weather, and local conditions. However:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>
                AI recommendations are provided for informational purposes only and do not constitute
                professional travel, safety, or legal advice.
              </li>
              <li>
                Conditions in Aruba — including weather, sea states, vendor availability, and local
                regulations — can change rapidly. AURELION cannot guarantee the accuracy or timeliness of
                AI-generated recommendations.
              </li>
              <li>
                You are responsible for independently verifying activity availability, safety conditions,
                and any applicable local requirements before participating in any experience.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="font-serif text-2xl text-foreground mb-4">5. Limitation of Liability for Vendor Bookings</h2>
            <p>
              AURELION curates and vets activity providers to the best of our ability, but we are not
              responsible for the actions, omissions, or negligence of third-party vendors and tour
              operators listed on our platform. Specifically:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>
                AURELION is not liable for personal injury, property damage, or financial loss arising from
                participation in any vendor-operated activity or tour.
              </li>
              <li>
                All direct bookings with vendors are subject to the vendor's own terms, cancellation
                policies, and liability waivers.
              </li>
              <li>
                To the maximum extent permitted by applicable law, AURELION's total liability to you for any
                claim arising out of these Terms or our services shall not exceed the amount you paid for the
                relevant membership.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="font-serif text-2xl text-foreground mb-4">6. User Conduct</h2>
            <p>
              You agree to use AURELION only for lawful purposes. You may not use the platform to transmit
              harmful, offensive, or fraudulent content, or to attempt to gain unauthorized access to our
              systems or other user accounts.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-2xl text-foreground mb-4">7. Changes to These Terms</h2>
            <p>
              We may update these Terms from time to time. We will notify registered users of material
              changes via email. Your continued use of AURELION after any change constitutes your acceptance
              of the new Terms.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-2xl text-foreground mb-4">8. Contact</h2>
            <p>
              If you have questions about these Terms, please contact us at{" "}
              <a href="mailto:legal@aurelion.app" className="text-primary hover:underline">
                legal@aurelion.app
              </a>
              . You can also visit our{" "}
              <Link href="/about" className="text-primary hover:underline">
                About page
              </Link>{" "}
              for more information about AURELION.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
