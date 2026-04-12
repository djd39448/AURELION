/**
 * @fileoverview Email delivery via Resend for the AURELION platform.
 *
 * Uses Resend's Node.js SDK to send transactional emails.
 * The `RESEND_API_KEY` environment variable must be set for emails to send.
 * When the key is absent (e.g., local dev without an API key), a warning is
 * logged and the send is skipped gracefully — the caller never throws.
 *
 * @module api-server/lib/email
 */

import { Resend } from "resend";
import { logger } from "./logger";

/** Lazily-initialised Resend client. `null` when RESEND_API_KEY is not set. */
const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

/**
 * Send a welcome email to a newly registered user.
 *
 * Fires-and-forgets from the caller's perspective — errors are logged but
 * not re-thrown so a Resend outage never breaks the registration response.
 *
 * @param to   - Recipient email address.
 * @param name - Recipient's display name for personalisation.
 */
export async function sendWelcomeEmail(to: string, name: string): Promise<void> {
  if (!resend) {
    logger.warn("RESEND_API_KEY not set — skipping welcome email");
    return;
  }

  const firstName = name.split(" ")[0];

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
</head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:'Georgia',serif;color:#e8e0d0;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0a;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background:#111;border:1px solid #2a2520;border-radius:8px;overflow:hidden;">

          <!-- Header -->
          <tr>
            <td style="background:#1a1512;padding:40px 48px 32px;border-bottom:1px solid #2a2520;">
              <p style="margin:0;font-size:11px;letter-spacing:4px;text-transform:uppercase;color:#c9a96e;">AURELION</p>
              <h1 style="margin:12px 0 0;font-size:28px;font-weight:normal;letter-spacing:1px;color:#e8e0d0;">Your Aruba adventure<br>starts here.</h1>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:40px 48px;">
              <p style="margin:0 0 20px;font-size:15px;line-height:1.7;color:#c0b8a8;">Welcome, ${firstName}.</p>
              <p style="margin:0 0 20px;font-size:15px;line-height:1.7;color:#c0b8a8;">
                AURELION is your personal guide to the finest adventures Aruba has to offer —
                from sunrise kite-surfing on Arashi Beach to private sunset catamaran cruises.
                Whether you're planning a honeymoon escape or a family expedition, we'll help
                you craft an itinerary that matches your pace and ambitions.
              </p>
              <p style="margin:0 0 32px;font-size:15px;line-height:1.7;color:#c0b8a8;">
                Your first itinerary is on us — no payment required.
              </p>

              <!-- CTA -->
              <table cellpadding="0" cellspacing="0">
                <tr>
                  <td style="background:#c9a96e;border-radius:4px;">
                    <a href="https://aurelion.com/itineraries/new"
                       style="display:inline-block;padding:14px 32px;font-size:12px;letter-spacing:3px;text-transform:uppercase;color:#0a0a0a;text-decoration:none;font-family:'Georgia',serif;">
                      Generate Your Itinerary
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:24px 48px;border-top:1px solid #2a2520;">
              <p style="margin:0;font-size:12px;color:#6b6358;line-height:1.6;">
                Questions? Reply to this email or contact us at
                <a href="mailto:hello@aurelion.com" style="color:#c9a96e;text-decoration:none;">hello@aurelion.com</a>.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  try {
    const { error } = await resend.emails.send({
      from: "hello@aurelion.com",
      to,
      subject: "Welcome to AURELION — Your Aruba adventure starts here",
      html,
    });

    if (error) {
      logger.error({ error, to }, "Resend API returned an error on welcome email");
    } else {
      logger.info({ to }, "Welcome email sent");
    }
  } catch (err) {
    logger.error({ err, to }, "Failed to send welcome email");
  }
}
