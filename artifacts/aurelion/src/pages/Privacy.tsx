/**
 * @module pages/Privacy
 * @description Privacy Policy page for AURELION. Covers data collected,
 * data usage, cookie policy, and user rights.
 *
 * This page is entirely static content with no data fetching or auth checks.
 *
 * @route /privacy
 * @auth None required
 * @tier None required
 */

import { Link } from "wouter";

/**
 * Privacy Policy page component.
 *
 * @route /privacy
 * @auth None
 * @tier None
 */
export default function Privacy() {
  return (
    <div className="w-full">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
        <div className="mb-16">
          <span className="text-primary font-serif tracking-[0.2em] text-sm uppercase mb-6 block">
            Legal
          </span>
          <h1 className="font-serif text-5xl text-foreground mb-4">Privacy Policy</h1>
          <p className="text-muted-foreground text-sm">Last updated: April 11, 2026</p>
        </div>

        <div className="prose prose-invert prose-lg max-w-none font-light text-muted-foreground leading-relaxed space-y-10">
          <section>
            <h2 className="font-serif text-2xl text-foreground mb-4">1. Introduction</h2>
            <p>
              AURELION ("we," "us," or "our") is committed to protecting your privacy. This Privacy Policy
              explains what information we collect when you use our platform, how we use it, and the choices
              you have regarding your data.
            </p>
            <p>
              By using AURELION, you agree to the collection and use of information as described in this
              policy.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-2xl text-foreground mb-4">2. Information We Collect</h2>
            <p>We collect the following categories of information:</p>

            <h3 className="font-serif text-xl text-foreground mt-6 mb-3">2.1 Account Information</h3>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>
                <strong className="text-foreground">Email address</strong> — collected when you register for
                an account. Used to authenticate you, send transactional emails (receipts, password resets),
                and notify you of material changes to our policies.
              </li>
              <li>
                <strong className="text-foreground">Password</strong> — stored as a one-way cryptographic
                hash. We never store or transmit your plaintext password.
              </li>
            </ul>

            <h3 className="font-serif text-xl text-foreground mt-6 mb-3">2.2 Payment Information</h3>
            <p>
              Payment processing is handled entirely by{" "}
              <a
                href="https://stripe.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                Stripe
              </a>
              . AURELION does not store your credit card number, expiration date, or CVV. We retain only the
              Stripe customer ID and a record of your purchase tier and date for membership verification
              purposes.
            </p>

            <h3 className="font-serif text-xl text-foreground mt-6 mb-3">2.3 Usage Data</h3>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Pages visited and time spent on each page</li>
              <li>Itineraries and activities viewed or saved</li>
              <li>AI Concierge session content (Premium members only) — used to improve AI response quality</li>
              <li>Device type, browser type, and general geographic region (country-level)</li>
            </ul>
          </section>

          <section>
            <h2 className="font-serif text-2xl text-foreground mb-4">3. How We Use Your Information</h2>
            <p>We use collected information to:</p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Provide, operate, and improve the AURELION platform</li>
              <li>Authenticate your account and verify your membership tier</li>
              <li>Process payments and send purchase confirmations</li>
              <li>Personalize your experience and activity recommendations</li>
              <li>Send transactional and operational emails (no unsolicited marketing without consent)</li>
              <li>Detect and prevent fraud or abuse</li>
              <li>Comply with legal obligations</li>
            </ul>
          </section>

          <section>
            <h2 className="font-serif text-2xl text-foreground mb-4">4. We Do Not Sell Your Data</h2>
            <p>
              AURELION does not sell, rent, or trade your personal information to third parties for their
              marketing purposes. Period.
            </p>
            <p>
              We may share data with trusted service providers (such as Stripe for payment processing and
              our hosting provider) solely to operate the platform. These providers are contractually
              required to handle your data securely and only as directed by us.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-2xl text-foreground mb-4">5. Cookies</h2>
            <p>AURELION uses cookies and similar tracking technologies to:</p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>
                <strong className="text-foreground">Authentication cookies</strong> — keep you logged in
                across sessions
              </li>
              <li>
                <strong className="text-foreground">Preference cookies</strong> — remember your display and
                language preferences
              </li>
              <li>
                <strong className="text-foreground">Analytics cookies</strong> — understand aggregate usage
                patterns to improve the platform (no cross-site tracking)
              </li>
            </ul>
            <p>
              You can control cookie behavior through your browser settings. Disabling cookies may affect
              certain platform functionality, including login persistence.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-2xl text-foreground mb-4">6. Data Retention</h2>
            <p>
              We retain your account information for as long as your account is active. If you delete your
              account, we will remove your personal data within 30 days, except where we are required to
              retain it for legal or tax compliance purposes (e.g., payment records for up to 7 years).
            </p>
          </section>

          <section>
            <h2 className="font-serif text-2xl text-foreground mb-4">7. Your Rights</h2>
            <p>Depending on your jurisdiction, you may have the right to:</p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Access the personal data we hold about you</li>
              <li>Request correction of inaccurate data</li>
              <li>Request deletion of your account and associated data</li>
              <li>Object to or restrict certain data processing</li>
              <li>Data portability (receive your data in a structured format)</li>
            </ul>
            <p>
              To exercise any of these rights, contact us at{" "}
              <a href="mailto:privacy@aurelion.app" className="text-primary hover:underline">
                privacy@aurelion.app
              </a>
              .
            </p>
          </section>

          <section>
            <h2 className="font-serif text-2xl text-foreground mb-4">8. Security</h2>
            <p>
              We implement industry-standard security measures to protect your data, including TLS
              encryption in transit, hashed password storage, and access controls limiting who within our
              organization can access user data.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-2xl text-foreground mb-4">9. Changes to This Policy</h2>
            <p>
              We may update this Privacy Policy from time to time. We will notify you of material changes
              via email. Your continued use of AURELION after any change constitutes your acceptance of the
              updated policy.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-2xl text-foreground mb-4">10. Contact</h2>
            <p>
              If you have questions or concerns about this Privacy Policy, please contact us at{" "}
              <a href="mailto:privacy@aurelion.app" className="text-primary hover:underline">
                privacy@aurelion.app
              </a>
              . You can also review our{" "}
              <Link href="/terms" className="text-primary hover:underline">
                Terms of Service
              </Link>{" "}
              for additional information.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
