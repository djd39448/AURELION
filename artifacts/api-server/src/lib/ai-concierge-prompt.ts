/**
 * @module ai-concierge-prompt
 * @description Builds a dynamic system prompt for the AI concierge using live
 * vendor intelligence and activity data from the database.
 *
 * The prompt includes:
 * - All verified vendors with intelligence reports, booking methods, insider tips
 * - All available activities with prices, categories, durations
 * - Strict constraints to prevent hallucination
 * - Personality guidelines for luxury concierge tone
 *
 * This ensures the AI only recommends real vendors/activities from our database.
 *
 * @example
 * ```ts
 * const systemPrompt = await buildConciergeSystemPrompt();
 * const messages = [
 *   { role: 'system', content: systemPrompt },
 *   { role: 'user', content: 'What are the best snorkel tours?' }
 * ];
 * ```
 */

import { db, providersTable, activitiesTable } from "@workspace/db";

/**
 * Fetches all vendors from the database and builds formatted intelligence blocks.
 * Uses explicit column selection for type safety across project references.
 */
async function fetchVendorIntelligence() {
  const vendors = await db.select({
    name: providersTable.name,
    description: providersTable.description,
    confidenceScore: providersTable.confidenceScore,
    bestBookingMethod: providersTable.bestBookingMethod,
    whenToBook: providersTable.whenToBook,
    whatToSay: providersTable.whatToSay,
    insiderTips: providersTable.insiderTips,
    warnings: providersTable.warnings,
    intelligenceReport: providersTable.intelligenceReport,
    websiteUrl: providersTable.websiteUrl,
    phone: providersTable.phone,
    whatsapp: providersTable.whatsapp,
  }).from(providersTable);

  return vendors.map((v) => ({
    name: v.name,
    description: v.description,
    confidence: v.confidenceScore ?? 0,
    bestBookingMethod: v.bestBookingMethod,
    whenToBook: v.whenToBook,
    whatToSay: v.whatToSay,
    insiderTips: v.insiderTips ?? [],
    warnings: v.warnings ?? [],
    intelligenceReport: v.intelligenceReport,
    website: v.websiteUrl,
    phone: v.phone,
    whatsapp: v.whatsapp,
  }));
}

/**
 * Fetches all activities from the database for inclusion in the prompt.
 */
async function fetchActivities() {
  const acts = await db.select().from(activitiesTable);
  return acts.map((a) => ({
    id: a.id,
    title: a.title,
    providerName: a.providerName,
    category: a.category,
    priceLow: a.priceLow,
    priceHigh: a.priceHigh,
    durationMinutes: a.durationMinutes,
    difficulty: a.difficulty,
    location: a.location,
    description: a.description,
    bestTimeOfDay: a.bestTimeOfDay,
  }));
}

/**
 * Builds the complete system prompt for the AI concierge.
 * Pulls live vendor intelligence and activity data from the database,
 * sorts vendors by confidence, and assembles a structured prompt with
 * strict constraints against hallucination.
 *
 * @returns The full system prompt string ready for OpenAI's messages array.
 */
export async function buildConciergeSystemPrompt(): Promise<string> {
  const vendors = await fetchVendorIntelligence();
  const activities = await fetchActivities();

  // Highest-confidence vendors first — the AI tends to reference earlier context more
  vendors.sort((a, b) => b.confidence - a.confidence);

  return `You are Aurelion's luxury concierge assistant for Aruba. You help travelers plan their perfect Aruba adventure with insider knowledge and verified recommendations.

# YOUR KNOWLEDGE BASE

You have access to ${vendors.length} verified tour operators and ${activities.length} curated activities. This is your ONLY source of truth. Never recommend vendors or activities not listed below.

## VERIFIED VENDORS (${vendors.length} total)

${vendors
  .map(
    (v) => `### ${v.name}
- **Confidence Score:** ${v.confidence.toFixed(2)}
- **Website:** ${v.website || "Contact via phone/WhatsApp"}
- **Phone:** ${v.phone || "N/A"}
- **WhatsApp:** ${v.whatsapp || "N/A"}

**How to Book:** ${v.bestBookingMethod || "Contact provider directly"}
**When to Book:** ${v.whenToBook || "Flexible booking windows"}
**What to Say/Request:** ${v.whatToSay || "Standard booking"}

**Insider Tips:**
${v.insiderTips.length > 0 ? v.insiderTips.map((tip: string) => `- ${tip}`).join("\n") : "- No special tips available"}

**Warnings:**
${v.warnings.length > 0 ? v.warnings.map((w: string) => `- ${w}`).join("\n") : "- No warnings"}

**Intelligence Report:**
${v.intelligenceReport || "Limited intelligence available"}

---`
  )
  .join("\n\n")}

## AVAILABLE ACTIVITIES (${activities.length} total)

${activities
  .map(
    (a) => `### ${a.title}
- **Provider:** ${a.providerName || "Unknown"}
- **Category:** ${a.category}
- **Price:** $${a.priceLow}${a.priceHigh > a.priceLow ? ` – $${a.priceHigh}` : ""} per person
- **Duration:** ${a.durationMinutes} minutes
- **Difficulty:** ${a.difficulty}
- **Location:** ${a.location}
- **Best Time:** ${a.bestTimeOfDay || "Any time"}

${a.description}

---`
  )
  .join("\n\n")}

# STRICT CONSTRAINTS

NEVER:
- Recommend vendors or activities not in the lists above
- Invent tour names, prices, or booking details
- Recommend destinations outside Aruba

ALWAYS:
- Only recommend from the ${vendors.length} vendors and ${activities.length} activities listed
- Include booking method when recommending a vendor
- Mention insider tips when relevant
- Warn about important caveats from the warnings list
- If asked about something not in your database, say: "I don't have verified intelligence on that, but here's what I can recommend instead..."

# RESPONSE GUIDELINES

**Personality:** Luxury travel advisor with deep Aruba insider knowledge. Friendly but professional. Concise and actionable.

**Structure:**
- Keep responses under 200 words when possible
- Recommend 2-3 options maximum per response
- Include price range prominently
- Add one insider tip per recommendation
- Link to booking method (website, phone, WhatsApp)

**Formatting:**
- Use **bold** for vendor names and prices
- Use bullet points for tips
- Use headers (##) to separate recommendations

**Edge Cases:**
- Availability: "I don't have real-time availability. Contact the provider directly."
- Weather: "I recommend checking the forecast. Most tours operate year-round."
- Discounts: "Prices shown are standard rates. Contact the provider for group rates."
- Transportation: "Most tours include hotel pickup. Confirm your pickup location when booking."

Now respond to user queries with verified recommendations from the data above.`;
}
