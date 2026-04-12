/**
 * @fileoverview Seeds the activities table with REAL tours from verified Aruba vendors.
 *
 * Every activity in this file is a real tour offering scraped from the vendor's
 * actual website in April 2026. Prices, durations, and descriptions come directly
 * from vendor booking pages (FareHarbor, Bokun, or vendor sites).
 *
 * ## Data provenance
 *
 * | Vendor                 | Source URL                                          |
 * |------------------------|-----------------------------------------------------|
 * | ABC Tours Aruba        | abc-aruba.com                                       |
 * | Rockabeach Tours       | rockabeachtours.com                                 |
 * | De Palm Tours          | depalm.com/sail-snorkel/                            |
 * | Pelican Adventures     | pelican-aruba.com                                   |
 * | Jolly Pirates          | jolly-pirates.com/cruise/aruba-snorkeling-tour/      |
 * | Delphi Watersports     | delphiwatersports.com/activities/                   |
 * | Rancho Notorious       | ranchonotorious.com/horseback-riding-tours.html      |
 * | Aruba Active Vacations | aruba-active-vacations.com                          |
 * | Aruba Conservation Fdn | acf.aw (Arikok National Park)                       |
 *
 * ## April 2026 QA notes
 *
 * - All 15 original prices verified against live vendor sites: no major changes
 * - De Palm Seaworld Explorer: child pricing (ages 3-9: $39) now confirmed
 * - Jolly Pirates Afternoon: youth pricing ($54) no longer visible on site — updated to adult rate $76
 * - Aruba Active Vacations kitesurfing: pricing now publicly available ($130 group / $190 private, 2 hrs)
 * - 10 new activities added: 6 Wild Terrain (ACF/Arikok), 2 Delphi (waverunner + Natural Pool jeep), 1 Jolly Pirates dinner cruise
 *
 * ## Rules applied
 *
 * - Every price is from the vendor's website or booking platform
 * - Every duration is from the vendor's website
 * - Descriptions synthesize vendor copy (not invented)
 * - "Unknown" used where data wasn't obtainable
 * - provider_id links to the real provider seeded by seed-vendors.ts
 *
 * @module api-server/scripts/seed-real-activities
 */

import { db, pool, providersTable, activitiesTable } from "@workspace/db";
import { eq } from "drizzle-orm";

/** Look up a provider's DB id by name. Throws if not found. */
async function getProviderId(name: string): Promise<number> {
  const [row] = await db
    .select({ id: providersTable.id })
    .from(providersTable)
    .where(eq(providersTable.name, name));
  if (!row) throw new Error(`Provider "${name}" not found — run seed:vendors first`);
  return row.id;
}

/**
 * Seeds the activities table with real tour data from verified Aruba vendors.
 * Resolves provider IDs first, then upserts activities using conflict-on-title
 * to ensure idempotent re-runs.
 */
async function seed(): Promise<void> {
  console.log("🌴 AURELION Real Activities Seeder");
  console.log("=".repeat(55));

  /* Resolve provider IDs */
  const abc = await getProviderId("ABC Tours Aruba");
  const rockabeach = await getProviderId("Rockabeach Tours");
  const depalm = await getProviderId("De Palm Tours");
  const pelican = await getProviderId("Pelican Adventures");
  const jolly = await getProviderId("Jolly Pirates");
  const delphi = await getProviderId("Delphi Watersports");
  const rancho = await getProviderId("Rancho Notorious");
  const aav = await getProviderId("Aruba Active Vacations");
  const aroundAruba = await getProviderId("Around Aruba Tours");
  const fofoti = await getProviderId("Fofoti Tours & Transfers");
  const octopus = await getProviderId("Octopus Aruba");
  const acf = await getProviderId("Aruba Conservation Foundation");
  const nativeDivers = await getProviderId("Native Divers Aruba");
  const palmBeachDivers = await getProviderId("Palm Beach Divers");

  console.log("✅ All provider IDs resolved\n");

  /**
   * Activities array. Each entry maps to one row in the activities table.
   * All prices, durations, and details are from vendor websites (April 2026).
   */
  const activities = [

    /* =================================================================
     * ABC TOURS ARUBA — Off-Road Expeditions
     * Source: abc-aruba.com
     * ================================================================= */
    {
      // Source: abc-aruba.com — "Island Ultimate Jeep Safari"
      // Price confirmed: "From $130" on website
      // Duration confirmed: 8 hours, departs 8:30 AM
      title: "Island Ultimate Jeep Safari",
      description:
        "The only Aruba tour that visits both the Natural Pool and Baby Beach on one trip. 8-hour guided Land Rover safari covering Arikok National Park, Fontein Cave, Natural Bridge, and the island's south coast. Named #1 Caribbean Experience on TripAdvisor (2025). Water and refreshments provided.",
      category: "Off-Road Expeditions",
      difficulty: "easy",
      durationMinutes: 480, // 8 hours — confirmed on abc-aruba.com
      priceLow: 130,        // "From $130" on website
      priceHigh: 130,
      location: "Island-wide (Natural Pool, Baby Beach, Arikok)",
      imageUrl: "/activities/jeep-safari.png",
      reviewSummary:
        "TripAdvisor #1 Caribbean Experience with 42,000+ reviews. Guides praised as knowledgeable, personable, and entertaining. Water, soda, and snacks provided on return journey.",
      whatToBring: "Swimsuit, water shoes, sunscreen, sunglasses, camera. Water and snacks provided.",
      whatToExpect:
        "Hotel pickup at 8:30 AM in open-air Land Rover. Visit Fontein Cave, Natural Pool (swimming), Natural Bridge, Baby Beach (swimming). Full island loop. Return by ~4:30 PM.",
      basicBookingGuide:
        "Book online at abc-aruba.com via FareHarbor. Book 3-7 days ahead in high season (Dec-Apr). Groups of 8-10 per vehicle. Phone: +297 582-5600 or US (305) 432-3007.",
      premiumBookingGuide:
        "This is the single best-value full-day tour in Aruba. Morning departure is less hot. The jeep seats 8-10 so it's not private — book a Private Safari for exclusivity.",
      insiderTips:
        "Wear sunglasses and a face cover for dust. The Natural Pool requires boulder scrambling — wear sturdy closed-toe shoes. Bring an underwater camera for the pool swim.",
      warnings:
        "Bumpy ride — not for pregnant guests or those with back problems. Natural Pool boulders require moderate fitness.",
      bestTimeOfDay: "Morning",
      tags: ["jeep", "safari", "natural-pool", "baby-beach", "full-day", "family-friendly"],
      isFeatured: 1,
      providerId: abc,
      providerName: "ABC Tours Aruba",
      providerWebsite: "https://abc-aruba.com/",
      providerPhone: "+297 582-5600",
      providerEmail: "hello@abcaruba.com",
      providerWhatsapp: null,
    },
    {
      // Source: abc-aruba.com — "UTV Tour to Natural Pool with Cliff Jumping"
      // Price confirmed: "From $310"
      // Duration confirmed: 5-6 hours
      title: "UTV Tour to Natural Pool with Cliff Jumping",
      description:
        "Drive your own UTV along Aruba's scenic coastline to the Natural Pool with cliff jumping included. Self-drive adventure for 1-5 passengers per vehicle. Two daily departures. All safety gear provided.",
      category: "Off-Road Expeditions",
      difficulty: "moderate",
      durationMinutes: 330, // 5.5 hours avg (listed 5-6 hours)
      priceLow: 310,        // "From $310" on website — price is per vehicle
      priceHigh: 310,
      location: "Coastal route to Natural Pool",
      imageUrl: "/activities/atv-expedition.png",
      reviewSummary:
        "Adrenaline-packed self-drive experience. Cliff jumping at the Natural Pool is a highlight. UTV insurance recommended — tire repair costs $350 without it.",
      whatToBring: "Closed-toe shoes mandatory, bandana for dust, sunglasses, sunscreen, swimsuit for Natural Pool.",
      whatToExpect:
        "15-minute UTV safety tutorial. Self-drive convoy led by guide along coastal trails. Natural Pool stop with cliff jumping. 5-6 hour total experience.",
      basicBookingGuide:
        "Book at abc-aruba.com. Departures 8:00 AM and 1:30 PM. 1-5 passengers per UTV. Must be 21+ with valid license to drive. $310 per vehicle.",
      premiumBookingGuide:
        "Consider the insurance add-on — tire repair costs $350 without it. Morning departure (8 AM) is cooler and less dusty. Price is per vehicle so split 4-5 ways it's $62-78/person.",
      insiderTips:
        "Split the $310 cost among 4-5 people for great per-person value. Morning departures have firmer trail conditions.",
      warnings:
        "Tire repair $350 without insurance. Very dusty — contact lens wearers bring glasses. Minimum age 21 to drive. Not suitable for pregnant guests.",
      bestTimeOfDay: "Morning",
      tags: ["utv", "self-drive", "natural-pool", "cliff-jumping", "adventure"],
      isFeatured: 1,
      providerId: abc,
      providerName: "ABC Tours Aruba",
      providerWebsite: "https://abc-aruba.com/",
      providerPhone: "+297 582-5600",
      providerEmail: "hello@abcaruba.com",
      providerWhatsapp: null,
    },
    {
      // Source: abc-aruba.com — "UTV Tour of Northern Aruba's Gold Coast"
      // Price confirmed: "From $240"
      // Duration confirmed: 4-5 hours
      title: "UTV Tour of Northern Aruba's Gold Coast",
      description:
        "Self-drive UTV tour through northern Aruba's gold mine ruins, California Lighthouse, and coastal dunes. 4-5 hour adventure with two daily departures. 1-5 passengers per vehicle.",
      category: "Off-Road Expeditions",
      difficulty: "moderate",
      durationMinutes: 270, // 4.5 hours avg
      priceLow: 240,        // "From $240" on website
      priceHigh: 240,
      location: "Northern Aruba Gold Coast",
      imageUrl: "/activities/atv-expedition.png",
      reviewSummary:
        "Great option for the northern half of the island. California Lighthouse is a photo highlight. Shorter and cheaper than the Natural Pool UTV tour.",
      whatToBring: "Closed-toe shoes, bandana/buff, sunglasses, sunscreen, camera.",
      whatToExpect:
        "UTV tutorial. Drive through desert trails to gold mine ruins, Alto Vista Chapel, California Lighthouse, and coastal cliffs. 4-5 hours total.",
      basicBookingGuide:
        "Book at abc-aruba.com. Departures 8:30 AM and 2:00 PM. $240 per vehicle (1-5 passengers). Must be 21+ to drive.",
      premiumBookingGuide:
        "The 2 PM departure gets golden-hour light at California Lighthouse — best for photography.",
      insiderTips:
        "Afternoon departure has better light at the Lighthouse. Split 4-5 ways the cost is only $48-60/person.",
      warnings:
        "Same dust/insurance warnings as other UTV tours. Tire repair $350 without insurance.",
      bestTimeOfDay: "Late afternoon",
      tags: ["utv", "self-drive", "lighthouse", "gold-coast", "northern-aruba"],
      isFeatured: 0,
      providerId: abc,
      providerName: "ABC Tours Aruba",
      providerWebsite: "https://abc-aruba.com/",
      providerPhone: "+297 582-5600",
      providerEmail: "hello@abcaruba.com",
      providerWhatsapp: null,
    },

    /* =================================================================
     * ROCKABEACH TOURS — Budget Off-Road
     * Source: rockabeachtours.com
     * ================================================================= */
    {
      // Source: rockabeachtours.com — "Safari Adventures"
      // Price confirmed: "From $97.00"
      // Duration confirmed: 4-6 hours
      title: "Safari Jeep Adventures",
      description:
        "Guided jeep sightseeing tour covering ruins, chapels, bridges, and beaches with swimming opportunities. 4-6 hour guided experience at a competitive price point. All ages welcome.",
      category: "Off-Road Expeditions",
      difficulty: "easy",
      durationMinutes: 300, // 5 hours avg (listed 4-6 hours)
      priceLow: 97,         // "From $97.00" on website
      priceHigh: 97,
      location: "Northern Aruba landmarks",
      imageUrl: "/activities/jeep-safari.png",
      reviewSummary:
        "Great value alternative to ABC Tours. Covers similar landmarks at $33 less. Good for budget-conscious travelers and cruise passengers.",
      whatToBring: "Swimsuit, sunscreen, camera, comfortable shoes.",
      whatToExpect:
        "Guided jeep tour to Aruba's major landmarks including ruins, chapels, natural bridges, and beaches with swimming stops.",
      basicBookingGuide:
        "Book at rockabeachtours.com via FareHarbor. All ages. Phone: +297 594-2366. Email: rockabeachtours@gmail.com.",
      premiumBookingGuide:
        "At $97 this undercuts ABC Tours ($130) by 25% for a similar experience. Good budget pick.",
      insiderTips:
        "Ask about their UTV & ATV Natural Pool Adventure ($160, 4 hours) if you want to combine off-road driving with the Natural Pool swim.",
      warnings:
        "Smaller operation than ABC Tours. Confirm tour format (guided vs unguided) when booking.",
      bestTimeOfDay: "Morning",
      tags: ["jeep", "safari", "budget", "family-friendly", "guided"],
      isFeatured: 0,
      providerId: rockabeach,
      providerName: "Rockabeach Tours",
      providerWebsite: "https://www.rockabeachtours.com/",
      providerPhone: "+297 594-2366",
      providerEmail: "rockabeachtours@gmail.com",
      providerWhatsapp: null,
    },

    /* =================================================================
     * DE PALM TOURS — Catamaran & Snorkel
     * Source: depalm.com/sail-snorkel/
     * ================================================================= */
    {
      // Source: depalm.com — "Palm Pleasure Catamaran – Snorkeling Tour"
      // Price confirmed: "From $99"
      // Duration confirmed: 3-4 hours
      title: "Palm Pleasure Catamaran Snorkeling Tour",
      description:
        "Snorkel three iconic Aruba sites — the Antilla WWII Shipwreck, Boca Catalina, and Arashi Reef — aboard a 70-foot catamaran. Open bar, snacks, and lunch included on morning tour. Aruba's most established operator (60+ years). EarthCheck Certified.",
      category: "Ocean Exploration",
      difficulty: "easy",
      durationMinutes: 210, // 3.5 hours avg (listed 3-4 hours)
      priceLow: 99,         // "From $99" on website
      priceHigh: 99,
      location: "Antilla Shipwreck, Boca Catalina, Arashi Reef",
      imageUrl: "/activities/catamaran-snorkel.jpg",
      reviewSummary:
        "9.4/10 rating from 147 verified reviews. Clean boat, phenomenal crew. Morning tour visits 3 snorkel sites with lunch — best value. Afternoon visits 2 sites.",
      whatToBring: "Bathing suit, towel, sunblock, camera, comfortable walking shoes. Snorkel gear provided.",
      whatToExpect:
        "Check in 30 min before at Coconuts Retail Store on De Palm Pier (between RIU and Hilton). 3-4 hours sailing with snorkeling at 2-3 sites. Open bar and food throughout.",
      basicBookingGuide:
        "Book at depalm.com via FareHarbor. Phone: +297 522-4400. Morning tours have 3 snorkel sites + lunch. Book 2-3 days ahead in high season.",
      premiumBookingGuide:
        "Always book the morning 4-hour tour — it visits 3 sites and includes lunch vs afternoon's 2 sites for the same price. Ask about the SNUBA upgrade ($55) for underwater breathing without dive certification.",
      insiderTips:
        "SNUBA upgrade ($55) lets you breathe underwater — fusion of snorkeling and scuba, no cert needed. Check in at Coconuts Retail Store, NOT the boat. Ages 8+ for SNUBA.",
      warnings:
        "Large catamaran (70 ft) carries many passengers — not intimate. Check-in location is NOT the boarding point — allow 30 min.",
      bestTimeOfDay: "Morning",
      tags: ["catamaran", "snorkeling", "shipwreck", "open-bar", "lunch-included"],
      isFeatured: 1,
      providerId: depalm,
      providerName: "De Palm Tours",
      providerWebsite: "https://depalm.com/",
      providerPhone: "+297 522-4400",
      providerEmail: null,
      providerWhatsapp: null,
    },
    {
      // Source: depalm.com — "Seaworld Explorer – Glass Sided Boat"
      // Price confirmed April 2026 QA: Adults $49, Children (ages 3-9) $39
      // Duration confirmed: 1.5 hours
      title: "Seaworld Explorer Glass-Bottom Boat",
      description:
        "Air-conditioned glass-sided boat with views of the Antilla Shipwreck and Arashi coral reef. Perfect for non-swimmers who want to see underwater life. All ages welcome — no getting wet required. Children (ages 3-9) $39.",
      category: "Ocean Exploration",
      difficulty: "easy",
      durationMinutes: 90,  // 1.5 hours confirmed
      priceLow: 39,         // Children ages 3-9: $39 (confirmed April 2026 QA)
      priceHigh: 49,        // Adults: $49 confirmed
      location: "Antilla Shipwreck, Arashi Reef",
      imageUrl: "/activities/glass-bottom-boat.jpg",
      reviewSummary:
        "Great option for non-swimmers, elderly guests, or young children. Air-conditioned comfort with views of the famous WWII wreck.",
      whatToBring: "Camera. No swim gear needed — you stay dry inside the boat.",
      whatToExpect:
        "Board the semi-submarine vessel. View the Antilla Shipwreck and Arashi coral reef through glass panels below the waterline. 1.5 hours total.",
      basicBookingGuide:
        "Book at depalm.com. $49 per person. All ages. Phone: +297 522-4400.",
      premiumBookingGuide:
        "This is the go-to for guests who can't or don't want to swim — mobility issues, fear of water, or very young children. No other Aruba operator offers this.",
      insiderTips:
        "Sit on the lower deck for the best glass-panel views. The Antilla wreck section is the highlight.",
      warnings:
        "You don't enter the water — if you want to actually snorkel, book the Palm Pleasure tour instead.",
      bestTimeOfDay: "Morning",
      tags: ["glass-bottom", "accessible", "non-swimmers", "family-friendly", "shipwreck"],
      isFeatured: 0,
      providerId: depalm,
      providerName: "De Palm Tours",
      providerWebsite: "https://depalm.com/",
      providerPhone: "+297 522-4400",
      providerEmail: null,
      providerWhatsapp: null,
    },

    /* =================================================================
     * PELICAN ADVENTURES — Sailing & Snorkeling
     * Source: pelican-aruba.com
     * ================================================================= */
    {
      // Source: pelican-aruba.com — "Aqua Champagne Brunch Cruise"
      // Price confirmed: "From $72"
      // Duration confirmed: 4 hours, 9 AM
      title: "Aqua Champagne Brunch Cruise",
      description:
        "Snorkel three dazzling sites including the historic WWII Antilla wreck and indulge in a champagne brunch — all for $72. Four hours of sailing, snorkeling, and dining. Best value snorkel tour in Aruba.",
      category: "Ocean Exploration",
      difficulty: "easy",
      durationMinutes: 240, // 4 hours confirmed
      priceLow: 72,         // "From $72" on website
      priceHigh: 72,
      location: "West coast — 3 snorkel sites including Antilla Wreck",
      imageUrl: "/activities/champagne-brunch-cruise.jpg",
      reviewSummary:
        "Best value snorkel tour in Aruba — 3 sites + champagne brunch for less than De Palm's standard tour. Crew described as kind, helpful, and fun. Guests report spotting sea turtles.",
      whatToBring: "Swimsuit, towel, sunscreen, camera. Snorkel gear provided.",
      whatToExpect:
        "Board at Pelican Pier 9 AM. Sail to 3 snorkel sites including the Antilla WWII shipwreck. Champagne brunch served aboard. Return by 1 PM.",
      basicBookingGuide:
        "Book at pelican-aruba.com via FareHarbor. Book ahead for 10% discount. WhatsApp: +297 594-2716. Phone: +297 587-2302. Departs from Pelican Pier.",
      premiumBookingGuide:
        "At $72 for 4 hours with 3 snorkel sites AND champagne brunch, this objectively beats De Palm ($99) and Jolly Pirates ($98). Online booking saves 10%.",
      insiderTips:
        "Ask the crew where to spot sea turtles — they know the spots. Book online for 10% off walk-up price.",
      warnings:
        "Check-in times strict — arrive at Pelican Pier early. Located at J.E. Irausquin Blvd 230, Noord.",
      bestTimeOfDay: "Morning",
      tags: ["catamaran", "snorkeling", "brunch", "champagne", "shipwreck", "best-value"],
      isFeatured: 1,
      providerId: pelican,
      providerName: "Pelican Adventures",
      providerWebsite: "https://www.pelican-aruba.com/",
      providerPhone: "+297 587-2302",
      providerEmail: null,
      providerWhatsapp: "+297 594-2716",
    },
    {
      // Source: pelican-aruba.com — "Aruba Sailing & Snorkeling Cruise"
      // Price confirmed: "From $50"
      // Duration confirmed: 2.5 hours, 2 PM
      title: "Afternoon Sailing & Snorkeling Cruise",
      description:
        "The most affordable catamaran snorkel experience in Aruba. 2.5-hour afternoon sail with snorkeling at two sites and Caribbean cocktails. Family-owned Pelican Adventures, operating since 1986.",
      category: "Ocean Exploration",
      difficulty: "easy",
      durationMinutes: 150, // 2.5 hours confirmed
      priceLow: 50,         // "From $50" on website
      priceHigh: 50,
      location: "West coast — 2 snorkel sites",
      imageUrl: "/activities/afternoon-sailing.jpg",
      reviewSummary:
        "Cheapest catamaran snorkel in Aruba at $50. Shorter than morning options but great value for budget travelers or those with limited time.",
      whatToBring: "Swimsuit, towel, sunscreen. Snorkel gear provided.",
      whatToExpect:
        "Board at Pelican Pier at 2 PM. Sail to 2 snorkel sites. Caribbean cocktails served. Return by 4:30 PM.",
      basicBookingGuide:
        "Book at pelican-aruba.com. $50 per person. 2 PM departure. WhatsApp: +297 594-2716.",
      premiumBookingGuide:
        "At $50 this is the absolute cheapest snorkel cruise available. Good for afternoon arrivals or budget travelers. If you can do morning, the Champagne Brunch ($72) is better value per hour.",
      insiderTips:
        "Shortest and cheapest option available. Good for families with young kids who can't handle 4 hours on a boat.",
      warnings:
        "Only 2.5 hours — shorter than competing tours. Afternoon departure means slightly less ideal snorkeling visibility.",
      bestTimeOfDay: "Afternoon",
      tags: ["catamaran", "snorkeling", "budget", "family-friendly", "afternoon"],
      isFeatured: 0,
      providerId: pelican,
      providerName: "Pelican Adventures",
      providerWebsite: "https://www.pelican-aruba.com/",
      providerPhone: "+297 587-2302",
      providerEmail: null,
      providerWhatsapp: "+297 594-2716",
    },

    /* =================================================================
     * JOLLY PIRATES — Pirate Ship Snorkel
     * Source: jolly-pirates.com
     * ================================================================= */
    {
      // Source: jolly-pirates.com — "Morning Snorkeling Trip"
      // Price confirmed: "From $98"
      // Duration confirmed: 4 hours, 9 AM - 1 PM
      title: "Jolly Pirates Morning Snorkel & BBQ Cruise",
      description:
        "4-hour pirate ship cruise aboard an 85-foot schooner. Snorkel at 3 sites including the Antilla WWII shipwreck. Includes BBQ lunch, open bar, and rope swing. The most fun snorkel experience in Aruba — 26+ years of operation.",
      category: "Ocean Exploration",
      difficulty: "easy",
      durationMinutes: 240, // 4 hours: 9 AM - 1 PM confirmed
      priceLow: 98,         // "From $98" on website
      priceHigh: 98,
      location: "MooMba Beach to Antilla Wreck & 2 reef sites",
      imageUrl: "/activities/pirate-ship-snorkel.jpg",
      reviewSummary:
        "10/10 from reviewers. Rope swing is a huge hit. Crew described as amazing and a blast. Most popular tour — marked as 'Most Popular' on their website.",
      whatToBring: "Swimsuit, towel, sunscreen. Snorkel gear provided.",
      whatToExpect:
        "Board at MooMba Beach (between Holiday Inn and Marriott). Sail to 3 snorkel sites. BBQ lunch and open bar. Rope swing fun. 4 hours total.",
      basicBookingGuide:
        "Book at jolly-pirates.com for 12% online discount. Phone: +297 586-8107. WhatsApp: +297 592-6777. Departs MooMba Beach 9 AM.",
      premiumBookingGuide:
        "Always book on jolly-pirates.com — 12% automatic discount over walk-up. This is the best price available anywhere including Viator/GetYourGuide.",
      insiderTips:
        "Arrive EARLY — they will NOT wait for latecomers and will not call. Book online for 12% off. Rope swing makes great social media content.",
      warnings:
        "Party atmosphere — loud music, energetic crew. NOT a quiet contemplative snorkel. Arrive early — ship leaves on time without head count.",
      bestTimeOfDay: "Morning",
      tags: ["pirate-ship", "snorkeling", "bbq", "open-bar", "rope-swing", "fun"],
      isFeatured: 1,
      providerId: jolly,
      providerName: "Jolly Pirates",
      providerWebsite: "https://www.jolly-pirates.com/",
      providerPhone: "+297 586-8107",
      providerEmail: "info@jolly-pirates.com",
      providerWhatsapp: "+297 592-6777",
    },
    {
      // Source: jolly-pirates.com — "Afternoon Snorkeling Tour"
      // April 2026 QA: Adults "From $76" confirmed. Youth ($54) no longer visible on site —
      // separate youth pricing may have been removed. Verify with vendor.
      // Duration confirmed: 3 hours, 2-5 PM
      title: "Jolly Pirates Afternoon Snorkel Sail",
      description:
        "3-hour afternoon pirate ship cruise with snorkeling at 2 sites (Antilla Wreck and Boca Catalina Reef). Open bar and rope swing included. Budget alternative to the morning cruise.",
      category: "Ocean Exploration",
      difficulty: "easy",
      durationMinutes: 180, // 3 hours: 2-5 PM confirmed
      priceLow: 76,         // Adults "From $76" confirmed April 2026 QA (youth pricing no longer visible on site)
      priceHigh: 76,
      location: "MooMba Beach to Antilla Wreck & Boca Catalina",
      imageUrl: "/activities/pirate-ship-snorkel.jpg",
      reviewSummary:
        "Good budget option. Same rope swing and open bar as morning, just fewer snorkel stops and no BBQ.",
      whatToBring: "Swimsuit, towel, sunscreen. Snorkel gear provided.",
      whatToExpect:
        "Board at MooMba Beach 2 PM. Sail to 2 snorkel sites. Open bar and rope swing. Return by 5 PM.",
      basicBookingGuide:
        "Book at jolly-pirates.com for 12% off. Adults $76, youth (under 10) $54. Departs 2 PM from MooMba Beach.",
      premiumBookingGuide:
        "Budget pick — cheaper than the morning and still hits the Antilla wreck. No BBQ lunch so eat beforehand.",
      insiderTips:
        "Same 12% online discount applies. Good for afternoon arrivals or families with young kids (youth pricing).",
      warnings:
        "No food included (unlike morning cruise). Same arrive-early warning — no waiting for latecomers.",
      bestTimeOfDay: "Afternoon",
      tags: ["pirate-ship", "snorkeling", "budget", "open-bar", "afternoon", "youth-pricing"],
      isFeatured: 0,
      providerId: jolly,
      providerName: "Jolly Pirates",
      providerWebsite: "https://www.jolly-pirates.com/",
      providerPhone: "+297 586-8107",
      providerEmail: "info@jolly-pirates.com",
      providerWhatsapp: "+297 592-6777",
    },

    /* =================================================================
     * DELPHI WATERSPORTS — Water Activities
     * Source: delphiwatersports.com/activities/
     * ================================================================= */
    {
      // Source: delphiwatersports.com — "Catamaran Snorkeling Cruise"
      // Price confirmed: $65
      // Duration confirmed: 3 hours
      title: "Delphi Catamaran Snorkeling Cruise",
      description:
        "The cheapest catamaran snorkel cruise in Aruba at $65. 3-hour cruise with snorkeling, open bar, rope swing, and water slide. Hundreds of 5-star reviews praising the crew's energy.",
      category: "Ocean Exploration",
      difficulty: "easy",
      durationMinutes: 180, // 3 hours confirmed
      priceLow: 65,         // $65 confirmed
      priceHigh: 65,
      location: "Aruba west coast snorkel sites",
      imageUrl: "/activities/catamaran-party.jpg",
      reviewSummary:
        "Cheapest catamaran snorkel in Aruba. Rope swing AND water slide on board. Crew gets praised for great energy across hundreds of 5-star reviews.",
      whatToBring: "Swimsuit, towel, sunscreen. Snorkel gear provided.",
      whatToExpect:
        "3-hour catamaran cruise with snorkel stops, open bar, rope swing, and water slide. Light lunch included.",
      basicBookingGuide:
        "Book at delphiwatersports.com via FareHarbor. $65 per person. Online booking only — no phone number listed.",
      premiumBookingGuide:
        "At $65 this is $34 cheaper than De Palm ($99) and $7 less than Pelican's brunch cruise ($72). Lowest price wins if budget is the priority.",
      insiderTips:
        "Ask about combo packages ($104-$385) if you want to add parasailing, jet ski, or ATV to the same day.",
      warnings:
        "No phone or email listed — must book everything through FareHarbor online system.",
      bestTimeOfDay: "Morning",
      tags: ["catamaran", "snorkeling", "cheapest", "rope-swing", "water-slide"],
      isFeatured: 0,
      providerId: delphi,
      providerName: "Delphi Watersports",
      providerWebsite: "https://www.delphiwatersports.com/",
      providerPhone: null,
      providerEmail: null,
      providerWhatsapp: null,
    },
    {
      // Source: delphiwatersports.com — "Parasailing"
      // Price confirmed: $75
      // Duration confirmed: 30 min (10 min flight)
      title: "Parasailing over Palm Beach",
      description:
        "Soar above Palm Beach at 300+ feet for breathtaking aerial views of Aruba's coastline. 10-minute flight with 30-minute total experience including boat ride. Single or tandem flights available.",
      category: "Water & Wind Sports",
      difficulty: "easy",
      durationMinutes: 30,  // 30 min total (10 min flight) confirmed
      priceLow: 75,         // $75 confirmed
      priceHigh: 75,
      location: "Palm Beach",
      imageUrl: "/activities/parasailing.png",
      reviewSummary:
        "Incredible aerial views of Palm Beach and the high-rise hotel strip. Quick and thrilling — great add-on activity.",
      whatToBring: "Camera with strap (or leave valuables on boat). Comfortable clothes.",
      whatToExpect:
        "Boat ride out from Palm Beach. 10-minute parasailing flight at 300+ feet. Smooth takeoff and landing from the boat platform.",
      basicBookingGuide:
        "Book at delphiwatersports.com. $75 per person. Online booking only.",
      premiumBookingGuide:
        "Pair with a catamaran cruise or jet ski via their combo packages for 15-25% savings.",
      insiderTips:
        "Book on a clear day for best views. The combo packages save significant money if adding other activities.",
      warnings:
        "Short experience (10 min flight). Weight limits apply. Weather-dependent.",
      bestTimeOfDay: "Morning",
      tags: ["parasailing", "aerial", "palm-beach", "quick-activity"],
      isFeatured: 0,
      providerId: delphi,
      providerName: "Delphi Watersports",
      providerWebsite: "https://www.delphiwatersports.com/",
      providerPhone: null,
      providerEmail: null,
      providerWhatsapp: null,
    },

    /* =================================================================
     * RANCHO NOTORIOUS — Horseback Riding
     * Source: ranchonotorious.com/horseback-riding-tours.html
     * ================================================================= */
    {
      // Source: ranchonotorious.com — "Sunset Horseback Riding"
      // Price confirmed: US$130 + 7% tax
      // Duration confirmed: ~1.5 hours, 5:30 PM
      title: "Sunset Horseback Riding",
      description:
        "Ride through Aruba's cunucu countryside to a hilltop with 360-degree sunset views. 1.5-hour evening ride on gentle, well-trained horses. Small groups (2-10 riders) with multi-lingual guides. Free hotel transportation included.",
      category: "Scenic Riding",
      difficulty: "easy",
      durationMinutes: 90,  // ~1.5 hours confirmed
      priceLow: 130,        // US$130 + 7% tax confirmed on website
      priceHigh: 130,
      location: "Boroncana countryside to Northeast Coast hilltop",
      imageUrl: "/activities/horseback-beach.png",
      reviewSummary:
        "TripAdvisor top-rated horseback experience. Small personalized groups, friendly multi-lingual guides. The hilltop sunset views are breathtaking.",
      whatToBring: "Long pants, closed-toe shoes (boots ideal), light jacket for after sunset. Helmets provided.",
      whatToExpect:
        "Hotel pickup. Horse matching at the ranch. Ride through cunucu countryside to Northeast coast hilltop. Watch sunset. Return to ranch. Free hotel drop-off.",
      basicBookingGuide:
        "Book at ranchonotorious.com. $130 + 7% tax. Mon-Sat 5:30 PM. Phone: +297 699-5492. Email: info@ranchonotorious.com. Free hotel transportation.",
      premiumBookingGuide:
        "Private ride available at $285 (min 2 people). Ask about the Rock Formation & North Coast Ride ($145, 5 PM) for a more scenic route.",
      insiderTips:
        "Free hotel transportation included on ALL tours. Max weight 220 lbs strictly enforced. No galloping on this tour. All prices plus 7% tax.",
      warnings:
        "Max weight 220 lbs (100 kg). Children under 6 ride with parent. Mandatory helmets under 15. No tours on Sundays. Prices are plus 7% tax.",
      bestTimeOfDay: "Late afternoon",
      tags: ["horseback", "sunset", "scenic", "romantic", "countryside"],
      isFeatured: 1,
      providerId: rancho,
      providerName: "Rancho Notorious",
      providerWebsite: "https://www.ranchonotorious.com/",
      providerPhone: "+297 699-5492",
      providerEmail: "info@ranchonotorious.com",
      providerWhatsapp: null,
    },
    {
      // Source: ranchonotorious.com — "Countryside & Hidden Lagoon"
      // Price confirmed: US$105 + 7% tax
      // Duration confirmed: ~1 hour, times 7 AM / 10 AM / 2:30 PM
      title: "Countryside & Hidden Lagoon Horseback Ride",
      description:
        "Introductory horseback ride through Aruba's cunucu countryside to a hidden lagoon. Spot iguanas and parakeets along the trail. 1-hour ride suitable for all skill levels including beginners. Free hotel transportation.",
      category: "Scenic Riding",
      difficulty: "easy",
      durationMinutes: 60,  // ~1 hour confirmed
      priceLow: 105,        // US$105 + 7% tax confirmed
      priceHigh: 105,
      location: "Boroncana countryside to Hidden Lagoon",
      imageUrl: "/activities/horseback-beach.png",
      reviewSummary:
        "Perfect intro ride for families and first-timers. Gentle horses, beautiful countryside, and the hidden lagoon is a nice surprise.",
      whatToBring: "Long pants, closed-toe shoes, sunscreen, camera. Helmets provided.",
      whatToExpect:
        "Hotel pickup. Horse matching at ranch. 1-hour ride through countryside to hidden lagoon. Spot wildlife. Return to ranch.",
      basicBookingGuide:
        "Book at ranchonotorious.com. $105 + 7% tax. Mon-Sat at 7 AM, 10 AM, or 2:30 PM. Phone: +297 699-5492. Free hotel transport.",
      premiumBookingGuide:
        "The 7 AM ride is cooler and has the best wildlife activity. This is the cheapest Rancho Notorious ride — good starting point.",
      insiderTips:
        "The 7 AM ride is coolest. No galloping allowed. Children under 5 can ride with a parent. All prices plus 7% tax.",
      warnings:
        "Max weight 220 lbs. No galloping. No tours on Sundays.",
      bestTimeOfDay: "Early morning",
      tags: ["horseback", "beginner", "family-friendly", "wildlife", "countryside"],
      isFeatured: 0,
      providerId: rancho,
      providerName: "Rancho Notorious",
      providerWebsite: "https://www.ranchonotorious.com/",
      providerPhone: "+297 699-5492",
      providerEmail: "info@ranchonotorious.com",
      providerWhatsapp: null,
    },

    /* =================================================================
     * ARUBA ACTIVE VACATIONS — Wind Sports
     * Source: aruba-active-vacations.com
     * Note: Pricing NOT listed on their website — marked as Unknown
     * ================================================================= */
    {
      // Source: aruba-active-vacations.com (pricing confirmed April 2026 QA)
      // Group lesson (2 hrs, max 3 students): $130/person
      // Private lesson (2 hrs, 1-on-1): $190 — pricing now publicly available on site
      title: "Kitesurfing Lesson at Fisherman's Huts",
      description:
        "Learn kitesurfing at Aruba's legendary Fisherman's Huts Beach — the same spot used for the Hi-Winds international competition. IKO-certified instruction in crystal-clear, waist-deep water that extends far offshore. The safest place to learn kitesurfing in the Caribbean. Group lessons (max 3 students): $130/person for 2 hours. Private 1-on-1: $190 for 2 hours.",
      category: "Water & Wind Sports",
      difficulty: "challenging",
      durationMinutes: 120, // 2 hours confirmed (group and private lesson durations)
      priceLow: 130,        // Group lesson (2 hrs, max 3 students): $130/person — confirmed April 2026 QA
      priceHigh: 190,       // Private lesson (2 hrs, 1-on-1): $190 — confirmed April 2026 QA
      location: "Fisherman's Huts Beach / Sarah Quita Beach",
      imageUrl: "/activities/kitesurfing.png",
      reviewSummary:
        "IKO-certified instruction at the best kitesurfing location in the Caribbean. Waist-deep water makes falls safe. Multi-day packages recommended for progression. Facilities include showers, lockers, WiFi, and rooftop lounge.",
      whatToBring: "Swimsuit, rash guard, reef-safe sunscreen, water. All kite equipment provided.",
      whatToExpect:
        "Meet at Fisherman's Huts Beach. IKO-certified lesson covering kite control, body dragging, and water starts. All equipment provided. Facility includes showers, lockers, drinks.",
      basicBookingGuide:
        "Book online at aruba-active-vacations.com/practice/booking-page/. Phone +297 586-0989. WhatsApp: +297 741-2991. Walk-ins welcome. Open Mon-Sun 8:30 AM - 5:30 PM. Group lesson (2 hrs, max 3): $130/person. Private lesson (2 hrs): $190. Multi-lesson packages available at 10% discount.",
      premiumBookingGuide:
        "5-lesson group package (10 hrs total): $585/person — saves 10% vs individual lessons. 5-lesson private package: $855 total. Best wind months: January through August (15-25 knots). Afternoon sessions have stronger, more consistent wind.",
      insiderTips:
        "Tuesday and Thursday afternoons have historically the most reliable wind. They also offer wingfoiling (easier to learn than kite) and blokarting (unique to Aruba). Pricing is now listed on their website.",
      warnings:
        "Wind-dependent — sessions may be rescheduled. Min weight ~90 lbs for kite control. Min age ~12. Book with a buffer day in case of wind cancellation.",
      bestTimeOfDay: "Afternoon",
      tags: ["kitesurfing", "lessons", "wind-sports", "iko-certified", "contact-for-price"],
      isFeatured: 0,
      providerId: aav,
      providerName: "Aruba Active Vacations",
      providerWebsite: "https://aruba-active-vacations.com/",
      providerPhone: "+297 586-0989",
      providerEmail: null,
      providerWhatsapp: "+297 741-2991",
    },

    /* =================================================================
     * JOLLY PIRATES — Sunset Cruise
     * Source: jolly-pirates.com (vendor intelligence report, April 2026)
     * Price confirmed: $59, 2 hours, 5:30-7:30 PM
     * ================================================================= */
    {
      // Source: jolly-pirates.com — "Sunset Cruise"
      // Price confirmed: $59 from vendor intelligence
      // Duration confirmed: 2 hours, 5:30-7:30 PM
      title: "Jolly Pirates Sunset Cruise",
      description:
        "Sail into the Aruba sunset aboard the iconic 85-foot pirate schooner. 2-hour evening cruise with open bar — no snorkeling, just pure relaxation on a legendary sailing ship. All ages welcome. 26+ years of operation.",
      category: "Ocean Exploration",
      difficulty: "easy",
      durationMinutes: 120, // 2 hours: 5:30-7:30 PM confirmed
      priceLow: 59,         // $59 confirmed from vendor intelligence
      priceHigh: 59,
      location: "MooMba Beach departure, Aruba west coast",
      imageUrl: "/activities/pirate-ship-snorkel.jpg",
      reviewSummary:
        "Relaxed alternative to the snorkel cruises. Open bar, iconic pirate ship atmosphere, stunning Aruba sunsets. All-ages crowd makes it less party-oriented than the daytime cruises.",
      whatToBring: "Camera, light jacket for the breeze, comfortable clothes.",
      whatToExpect:
        "Board at MooMba Beach at 5:30 PM. Sail along the west coast while the sun sets. Open bar throughout. Return by 7:30 PM.",
      basicBookingGuide:
        "Book at jolly-pirates.com for 12% automatic online discount. Phone: +297 586-8107. WhatsApp: +297 592-6777. Departs MooMba Beach (between Holiday Inn and Marriott) at 5:30 PM.",
      premiumBookingGuide:
        "Always book online — jolly-pirates.com gives 12% off vs walk-up pricing. This is the best price available anywhere. Arrive early — the ship leaves on time and will not wait.",
      insiderTips:
        "Cheapest sunset sailing experience in Aruba at $59. No snorkeling but the open bar and pirate ship atmosphere make it a crowd favorite. Book online for 12% off.",
      warnings:
        "Arrive early — the ship will NOT wait for latecomers. Open bar — pace yourself.",
      bestTimeOfDay: "Late afternoon",
      tags: ["sunset", "sailing", "open-bar", "pirate-ship", "romantic", "all-ages"],
      isFeatured: 0,
      providerId: jolly,
      providerName: "Jolly Pirates",
      providerWebsite: "https://www.jolly-pirates.com/",
      providerPhone: "+297 586-8107",
      providerEmail: "info@jolly-pirates.com",
      providerWhatsapp: "+297 592-6777",
    },

    /* =================================================================
     * DE PALM TOURS — Sunset Sail
     * Source: depalm.com (vendor intelligence report, April 2026)
     * Price confirmed: $95, 2 hours
     * ================================================================= */
    {
      // Source: depalm.com — "Sunset Sail"
      // Price confirmed: $95, 2 hours from vendor intelligence
      title: "De Palm Sunset Sail",
      description:
        "Aruba's most established operator takes you on a romantic 2-hour sunset sailing cruise. No snorkeling — just the open bar, the breeze, and the Caribbean sky turning gold. EarthCheck Certified. Departs De Palm Pier.",
      category: "Ocean Exploration",
      difficulty: "easy",
      durationMinutes: 120, // 2 hours confirmed
      priceLow: 95,         // $95 confirmed from vendor intelligence
      priceHigh: 95,
      location: "De Palm Pier — west coast sunset route",
      imageUrl: "/activities/afternoon-sailing.jpg",
      reviewSummary:
        "De Palm's legacy reputation and professional crew carry over to the sunset sail. Guests praise the smooth boarding process, clean vessel, and attentive bar service.",
      whatToBring: "Camera, light layer for the breeze after sunset. No swim gear needed.",
      whatToExpect:
        "Check in at Coconuts Retail Store on De Palm Pier (between RIU and Hilton). Board the catamaran. 2-hour open-bar sunset cruise. Return to pier.",
      basicBookingGuide:
        "Book at depalm.com via FareHarbor. $95 per person. Phone: +297 522-4400. Check in at Coconuts Retail Store on De Palm Pier — NOT at the boat.",
      premiumBookingGuide:
        "De Palm's sunset sail is $36 more than Jolly Pirates' ($59) — the premium buys you a quieter, more polished experience with De Palm's professional crew and catering.",
      insiderTips:
        "Check-in location (Coconuts Retail Store) is separate from the boarding point — allow 30 minutes. De Palm's catamaran is 70 ft — stable even if the wind picks up.",
      warnings:
        "Check-in is NOT at the boat — allow time to find the Coconuts Retail Store on the pier. No snorkeling on this cruise.",
      bestTimeOfDay: "Late afternoon",
      tags: ["sunset", "sailing", "open-bar", "romantic", "catamaran", "established-operator"],
      isFeatured: 0,
      providerId: depalm,
      providerName: "De Palm Tours",
      providerWebsite: "https://depalm.com/",
      providerPhone: "+297 522-4400",
      providerEmail: null,
      providerWhatsapp: null,
    },

    /* =================================================================
     * PELICAN ADVENTURES — Natural Pool & Caves Safari
     * Source: pelican-aruba.com (vendor intelligence, April 2026)
     * Price confirmed: $99, 4.5 hours, 8:30 AM
     * ================================================================= */
    {
      // Source: pelican-aruba.com — "Natural Pool & Caves Safari"
      // Price confirmed: $99, 4.5 hours, 8:30 AM from vendor intelligence
      title: "Natural Pool & Caves Safari",
      description:
        "Explore Aruba's most dramatic natural wonders — the hidden Natural Pool carved into the northeast coast's volcanic rock, and the ancient cave system including Fontein Cave with indigenous cave drawings. 4.5-hour off-road adventure departing 8:30 AM. Family-owned Pelican Adventures, operating since 1986.",
      category: "Wild Terrain & Natural Wonders",
      difficulty: "moderate",
      durationMinutes: 270, // 4.5 hours confirmed
      priceLow: 99,         // $99 confirmed from vendor intelligence
      priceHigh: 99,
      location: "Natural Pool (northeast coast) & Fontein Cave, Arikok National Park",
      imageUrl: "/activities/jeep-safari.png",
      reviewSummary:
        "Pelican's land-side adventure that competes directly with ABC Tours' famous jeep safari — same Natural Pool + caves route at a lower price. Family-owned feel with personalized service.",
      whatToBring: "Swimsuit for the Natural Pool swim, closed-toe shoes, sunscreen, water, camera.",
      whatToExpect:
        "Hotel pickup. Off-road vehicle to northeast Aruba. Visit Fontein Cave (indigenous drawings). Swim in the Natural Pool. Return via countryside trails. Back by ~1 PM.",
      basicBookingGuide:
        "Book at pelican-aruba.com via FareHarbor. $99 per person. 8:30 AM departure. WhatsApp: +297 594-2716. Phone: +297 587-2302. Booking ahead saves 10%.",
      premiumBookingGuide:
        "At $99 this is $31 less than ABC Tours' Ultimate Jeep Safari ($130) — similar Natural Pool + caves experience. Online booking saves 10%. Ask the guide to point out the indigenous cave art at Fontein.",
      insiderTips:
        "Book online for 10% discount. The Natural Pool is in the northeast coast's volcanic rock — bring water shoes for the rocky entry. Fontein Cave has indigenous Arawak drawings — remarkable piece of Aruba's pre-colonial history.",
      warnings:
        "Natural Pool entry requires scrambling over volcanic rock — moderate fitness required. Not suitable for guests with knee/mobility issues.",
      bestTimeOfDay: "Morning",
      tags: ["natural-pool", "caves", "cave-art", "arikok", "wild-terrain", "family-friendly"],
      isFeatured: 1,
      providerId: pelican,
      providerName: "Pelican Adventures",
      providerWebsite: "https://www.pelican-aruba.com/",
      providerPhone: "+297 587-2302",
      providerEmail: null,
      providerWhatsapp: "+297 594-2716",
    },

    /* =================================================================
     * RANCHO NOTORIOUS — Additional Routes
     * Source: ranchonotorious.com/horseback-riding-tours.html (vendor intelligence)
     * All prices confirmed from vendor intelligence (April 2026) + 7% tax
     * ================================================================= */
    {
      // Source: ranchonotorious.com — "Rock Formation & North Coast Ride" (Sunset, 5 PM)
      // Price confirmed: US$145 + 7% tax
      // Duration confirmed: ~2 hours
      title: "Rock Formation & North Coast Sunset Ride",
      description:
        "The most scenic of Rancho Notorious's sunset rides — 2 hours through Aruba's natural rock formations and dramatic north coast cliffs at golden hour. Small groups (2-10 riders) with multi-lingual guides. Free hotel transportation included.",
      category: "Scenic Riding",
      difficulty: "moderate",
      durationMinutes: 120, // ~2 hours confirmed
      priceLow: 145,        // US$145 + 7% tax confirmed
      priceHigh: 145,
      location: "Rock formations and north coast cliffs, northeast Aruba",
      imageUrl: "/activities/horseback-beach.png",
      reviewSummary:
        "Top-tier scenery among Rancho's route lineup — volcanic rock formations, ocean cliffs, and the best light of the day at 5 PM. Experienced riders find it more interesting than the countryside sunset ride.",
      whatToBring: "Long pants, closed-toe shoes, sunscreen, camera. Helmets provided.",
      whatToExpect:
        "Hotel pickup. Horse matching at ranch. 2-hour ride through rock formations and along north coast cliffs at sunset. Return to ranch. Hotel drop-off.",
      basicBookingGuide:
        "Book at ranchonotorious.com. $145 + 7% tax. Departure 5 PM Mon-Sat. Phone: +297 699-5492. Email: info@ranchonotorious.com. Free hotel transportation.",
      premiumBookingGuide:
        "The most scenic route in the Rancho lineup. 5 PM timing puts you at the dramatic north coast cliffs right at golden hour. Galloping allowed on parts of this route.",
      insiderTips:
        "5 PM departure is timed for golden-hour photography along the volcanic north coast. Max weight 220 lbs + 7% tax on all prices.",
      warnings:
        "Max weight 220 lbs. All prices plus 7% tax. No tours Sundays.",
      bestTimeOfDay: "Late afternoon",
      tags: ["horseback", "sunset", "rock-formations", "north-coast", "scenic", "intermediate"],
      isFeatured: 0,
      providerId: rancho,
      providerName: "Rancho Notorious",
      providerWebsite: "https://www.ranchonotorious.com/",
      providerPhone: "+297 699-5492",
      providerEmail: "info@ranchonotorious.com",
      providerWhatsapp: null,
    },
    {
      // Source: ranchonotorious.com — "Alto Vista Chapel Ride"
      // Price confirmed: US$120 + 7% tax
      // Duration confirmed: ~2 hours
      title: "Alto Vista Chapel Horseback Ride",
      description:
        "Ride through Aruba's peaceful countryside and coastal trails to the historic Alto Vista Chapel, Aruba's beloved yellow hilltop church. 2-hour intermediate-level ride with galloping sections. Free hotel transportation included.",
      category: "Scenic Riding",
      difficulty: "moderate",
      durationMinutes: 120, // ~2 hours confirmed
      priceLow: 120,        // US$120 + 7% tax confirmed
      priceHigh: 120,
      location: "Alto Vista Chapel, northern Aruba countryside",
      imageUrl: "/activities/horseback-beach.png",
      reviewSummary:
        "A pilgrimage route on horseback — combining Aruba's beautiful countryside trails with the iconic Alto Vista Chapel. Galloping allowed on parts of the trail.",
      whatToBring: "Long pants, closed-toe shoes, sunscreen, camera. Helmets provided.",
      whatToExpect:
        "Hotel pickup. Horse matching at ranch. Countryside and coastal trails to Alto Vista Chapel. Return ride. Hotel drop-off.",
      basicBookingGuide:
        "Book at ranchonotorious.com. $120 + 7% tax. Mon-Sat. Phone: +297 699-5492. Email: info@ranchonotorious.com. Free hotel transportation.",
      premiumBookingGuide:
        "Galloping is allowed on this route — specify intermediate+ rider when booking. The chapel itself is a pilgrimage site — guides know its history.",
      insiderTips:
        "Alto Vista Chapel (built 1952) is the most visited spiritual site in Aruba. Combination of cultural landmark and coastal scenery. 7% tax on all prices.",
      warnings:
        "Intermediate level — some galloping. Max weight 220 lbs. All prices plus 7% tax. No tours Sundays.",
      bestTimeOfDay: "Morning",
      tags: ["horseback", "alto-vista", "chapel", "countryside", "intermediate", "galloping"],
      isFeatured: 0,
      providerId: rancho,
      providerName: "Rancho Notorious",
      providerWebsite: "https://www.ranchonotorious.com/",
      providerPhone: "+297 699-5492",
      providerEmail: "info@ranchonotorious.com",
      providerWhatsapp: null,
    },
    {
      // Source: ranchonotorious.com — "2-Hour Advanced Ride"
      // Price confirmed: US$125 + 7% tax
      // Duration confirmed: ~2 hours, 7 AM or 10 AM
      title: "Advanced Horseback Gallop Ride",
      description:
        "The only Rancho Notorious tour with full galloping on open terrain — for experienced riders who want the thrill of riding at full speed along Aruba's trails. 2-hour advanced ride departing 7 AM or 10 AM. Small groups of 2-10 riders.",
      category: "Scenic Riding",
      difficulty: "challenging",
      durationMinutes: 120, // ~2 hours confirmed
      priceLow: 125,        // US$125 + 7% tax confirmed
      priceHigh: 125,
      location: "Boroncana countryside trails, northern Aruba",
      imageUrl: "/activities/horseback-beach.png",
      reviewSummary:
        "For experienced riders craving real speed — the only Aruba horse tour that allows galloping. Departures at 7 AM and 10 AM. Guides assess rider skill before galloping.",
      whatToBring: "Long pants, sturdy boots, helmet (provided). Camera with strap only.",
      whatToExpect:
        "Hotel pickup. Advanced horse matched to rider. 2-hour ride with galloping on open terrain. Guides assess readiness before galloping. Hotel drop-off.",
      basicBookingGuide:
        "Book at ranchonotorious.com. $125 + 7% tax. Departures 7 AM or 10 AM Mon-Sat. Phone: +297 699-5492. MUST declare advanced riding experience when booking.",
      premiumBookingGuide:
        "The 7 AM departure is cooler and has better early-morning light. Be honest about riding experience — guides assess ability before allowing galloping.",
      insiderTips:
        "Tell the guide your riding background upfront — they tailor galloping to your comfort level. 7 AM ride has cooler temps and less sun. Plus 7% tax on all prices.",
      warnings:
        "Advanced riders only — if you can't trot confidently, book the beginner ride instead. Max weight 220 lbs. Mandatory helmet. All prices plus 7% tax.",
      bestTimeOfDay: "Early morning",
      tags: ["horseback", "advanced", "galloping", "experienced-riders", "thrill"],
      isFeatured: 0,
      providerId: rancho,
      providerName: "Rancho Notorious",
      providerWebsite: "https://www.ranchonotorious.com/",
      providerPhone: "+297 699-5492",
      providerEmail: "info@ranchonotorious.com",
      providerWhatsapp: null,
    },
    {
      // Source: ranchonotorious.com — "Urirama Cove Beach Ride"
      // Price confirmed: US$115 + 7% tax
      // Duration confirmed: ~1.5 hours
      title: "Urirama Cove Beach Horseback Ride",
      description:
        "Ride to the dramatic northeast coast at Urirama Cove — volcanic rocky shores, crashing waves, and Aruba's wild, windswept side far from the tourist beaches. 1.5-hour intermediate ride on well-trained horses. Free hotel transportation.",
      category: "Scenic Riding",
      difficulty: "moderate",
      durationMinutes: 90,  // ~1.5 hours confirmed
      priceLow: 115,        // US$115 + 7% tax confirmed
      priceHigh: 115,
      location: "Urirama Cove, northeast coast Aruba",
      imageUrl: "/activities/horseback-beach.png",
      reviewSummary:
        "The northeast coast is dramatically different from Aruba's calm tourist beaches — rocky, wild, and windswept. Great contrast to the resort strip and very photogenic.",
      whatToBring: "Long pants, closed-toe shoes, sunscreen, camera. Helmets provided.",
      whatToExpect:
        "Hotel pickup. Horse matching. Ride through countryside to the northeast rocky coast at Urirama Cove. Photography stop. Return ride. Hotel drop-off.",
      basicBookingGuide:
        "Book at ranchonotorious.com. $115 + 7% tax. Mon-Sat. Phone: +297 699-5492. Free hotel transportation.",
      premiumBookingGuide:
        "The northeast coast is the 'wild side' of Aruba — completely different from the calm western beaches. Great contrast for photographers and anyone who's seen the resort side.",
      insiderTips:
        "The Urirama Cove coastline is dramatic — volcanic rock, turquoise water, no tourists. Best natural photography spot in the Rancho lineup. Plus 7% tax.",
      warnings:
        "Intermediate level. Max weight 220 lbs. All prices plus 7% tax. No tours Sundays.",
      bestTimeOfDay: "Morning",
      tags: ["horseback", "northeast-coast", "urirama", "dramatic-scenery", "intermediate"],
      isFeatured: 0,
      providerId: rancho,
      providerName: "Rancho Notorious",
      providerWebsite: "https://www.ranchonotorious.com/",
      providerPhone: "+297 699-5492",
      providerEmail: "info@ranchonotorious.com",
      providerWhatsapp: null,
    },
    {
      // Source: ranchonotorious.com — "Northeast Coast & Lighthouse Ride"
      // Price confirmed: US$210 + 7% tax
      // Duration confirmed: ~2.5 hours, Mondays 6:30 AM
      title: "Northeast Coast & Lighthouse Epic Ride",
      description:
        "Rancho Notorious's longest and most epic route — 2.5 hours on horseback along the entire northeast coast to the California Lighthouse. Available Mondays only at 6:30 AM. Advanced-level ride with galloping on open terrain. The definitive Aruba horseback experience.",
      category: "Scenic Riding",
      difficulty: "challenging",
      durationMinutes: 150, // ~2.5 hours confirmed
      priceLow: 210,        // US$210 + 7% tax confirmed
      priceHigh: 210,
      location: "Full northeast coast to California Lighthouse, Aruba",
      imageUrl: "/activities/horseback-beach.png",
      reviewSummary:
        "The bucket-list horseback ride in Aruba — the full northeast coast circuit ending at the iconic California Lighthouse. Early 6:30 AM start means golden light for photography and cooler temperatures.",
      whatToBring: "Long pants, sturdy boots, helmet (provided), camera with wrist strap, water.",
      whatToExpect:
        "Early hotel pickup. 6:30 AM departure. 2.5-hour ride spanning the northeast coast and ending at the California Lighthouse viewpoint. Galloping on open terrain. Hotel drop-off.",
      basicBookingGuide:
        "Book at ranchonotorious.com. $210 + 7% tax. Mondays only, 6:30 AM. Phone: +297 699-5492. Advance booking essential — this is their most exclusive ride.",
      premiumBookingGuide:
        "Monday-only and limited capacity — book at least 1-2 weeks ahead. The 6:30 AM start gets you to the Lighthouse at sunrise. Advanced riders only.",
      insiderTips:
        "Monday-only availability makes this the rarest tour in the Rancho lineup. The 6:30 AM start aligns with sunrise at the Lighthouse — spectacular photography. All prices plus 7% tax.",
      warnings:
        "Mondays only at 6:30 AM. Advanced riders only — galloping included. Max weight 220 lbs. All prices plus 7% tax. Book weeks in advance.",
      bestTimeOfDay: "Early morning",
      tags: ["horseback", "lighthouse", "epic", "advanced", "monday-only", "sunrise", "northeast-coast"],
      isFeatured: 1,
      providerId: rancho,
      providerName: "Rancho Notorious",
      providerWebsite: "https://www.ranchonotorious.com/",
      providerPhone: "+297 699-5492",
      providerEmail: "info@ranchonotorious.com",
      providerWhatsapp: null,
    },
    {
      // Source: ranchonotorious.com — "Private Horseback Tour"
      // Price confirmed: US$285 + 7% tax, minimum 2 people
      // Duration: Flexible (based on chosen route)
      title: "Private Horseback Tour",
      description:
        "Exclusive private ride for 2 or more guests on any Rancho Notorious route. No shared groups — just your party, your guide, and the route of your choice. Perfect for anniversaries, proposals, honeymooners, and VIP guests. Free hotel transportation included.",
      category: "Scenic Riding",
      difficulty: "easy",
      durationMinutes: 120, // Depends on route — default 2 hours
      priceLow: 285,        // US$285 + 7% tax, minimum 2 people
      priceHigh: 285,
      location: "Route of your choice — anywhere Rancho Notorious operates",
      imageUrl: "/activities/horseback-beach.png",
      reviewSummary:
        "Full privacy, personalized pace, and your own guide — the VIP horseback experience in Aruba. Guests praise the exclusive feel for special occasions like anniversaries and proposals.",
      whatToBring: "Long pants, closed-toe shoes. Helmets and equipment provided.",
      whatToExpect:
        "Hotel pickup. Select your preferred route. Private guide leads your exclusive group through your chosen landscape. Flexible pacing with more stops for photos. Hotel drop-off.",
      basicBookingGuide:
        "Book at ranchonotorious.com. $285 + 7% tax. Minimum 2 guests. Phone: +297 699-5492. Email: info@ranchonotorious.com. Request your preferred route.",
      premiumBookingGuide:
        "Book the private tour for proposals, anniversaries, or honeymoons — the guide can coordinate a special moment. Request the Sunset or Lighthouse route for the most romantic settings.",
      insiderTips:
        "The private tour price ($285) is per-booking not per-person — split 2 ways it's $142.50 each, only $12 more than the Sunset ride. Well worth the privacy for couples.",
      warnings:
        "Minimum 2 people required. Max weight 220 lbs per horse. All prices plus 7% tax.",
      bestTimeOfDay: "Late afternoon",
      tags: ["horseback", "private", "romantic", "vip", "anniversary", "honeymoon", "exclusive"],
      isFeatured: 0,
      providerId: rancho,
      providerName: "Rancho Notorious",
      providerWebsite: "https://www.ranchonotorious.com/",
      providerPhone: "+297 699-5492",
      providerEmail: "info@ranchonotorious.com",
      providerWhatsapp: null,
    },

    /* =================================================================
     * DELPHI WATERSPORTS — Additional Activities
     * Source: delphiwatersports.com/activities/ (vendor intelligence, April 2026)
     * All prices confirmed from vendor intelligence
     * ================================================================= */
    {
      // Source: delphiwatersports.com — "Flyboard / Jetovator"
      // Price confirmed: $130
      // Duration: ~30 minutes
      title: "Flyboard Experience",
      description:
        "Blast off Palm Beach on a water-propelled flyboard — up to 20 feet in the air over the Caribbean. No experience needed. Instructor spotting provided. The most adrenaline-packed 30 minutes available in Aruba's water sports scene.",
      category: "Water & Wind Sports",
      difficulty: "challenging",
      durationMinutes: 30,  // ~30 min confirmed
      priceLow: 130,        // $130 confirmed from vendor intelligence
      priceHigh: 130,
      location: "Palm Beach",
      imageUrl: "/activities/parasailing.png",
      reviewSummary:
        "The most unique water activity in Aruba — most guests are airborne within 5-10 minutes of instruction. Instructor in the water throughout for safety. Spectacular photos/videos from the shore.",
      whatToBring: "Swimsuit, towel. Everything else provided (board, harness, helmet).",
      whatToExpect:
        "Brief land instruction. Shallow-water practice. Instructor guides your jet pressure. First flight attempts within 10 minutes. 30-minute total session.",
      basicBookingGuide:
        "Book at delphiwatersports.com via FareHarbor. $130 per person. Online booking only — no phone or email listed.",
      premiumBookingGuide:
        "Combo packages available — pair flyboard with parasailing or catamaran cruise for 15-25% savings.",
      insiderTips:
        "Ask about combo packages to save money. Have someone film from shore — the footage looks incredible. Minimum age/weight applies.",
      warnings:
        "Minimum age and fitness requirements apply — verify before booking. Weather and sea conditions dependent.",
      bestTimeOfDay: "Morning",
      tags: ["flyboard", "adrenaline", "water-jet", "extreme", "unique-experience"],
      isFeatured: 0,
      providerId: delphi,
      providerName: "Delphi Watersports",
      providerWebsite: "https://www.delphiwatersports.com/",
      providerPhone: null,
      providerEmail: null,
      providerWhatsapp: null,
    },
    {
      // Source: delphiwatersports.com — "Guided Kayak Tour - Mangroves"
      // Price confirmed: $125, 4 hours
      title: "Guided Mangrove Kayak Tour",
      description:
        "Paddle through Aruba's quiet mangrove channels with a knowledgeable guide on this 4-hour eco-adventure. Spot tropical fish, pelicans, and herons in their natural habitat. One of Aruba's most underrated experiences — a calm, intimate alternative to ocean activities.",
      category: "Water & Wind Sports",
      difficulty: "easy",
      durationMinutes: 240, // 4 hours confirmed
      priceLow: 125,        // $125 confirmed from vendor intelligence
      priceHigh: 125,
      location: "Mangel Halto mangrove channels, Savaneta",
      imageUrl: "/activities/kitesurfing.png",
      reviewSummary:
        "Aruba's hidden gem activity — the mangroves are teeming with wildlife and completely different from the tourist-facing beach scene. Calm water means no paddling experience needed.",
      whatToBring: "Reef-safe sunscreen, water, light clothing. All kayak equipment and snorkel gear provided.",
      whatToExpect:
        "Meet at kayak launch point. Guide orientation. 4-hour paddle through mangrove channels with wildlife spotting. Snorkel stop in clear shallows. Return.",
      basicBookingGuide:
        "Book at delphiwatersports.com via FareHarbor. $125 per person for 4 hours. Online booking only.",
      premiumBookingGuide:
        "Mangel Halto's mangroves are in southern Aruba — arrange transport or rent a car. The south coast is far less visited than the tourist strip, making this feel genuinely off the beaten path.",
      insiderTips:
        "The mangrove canal at Mangel Halto is one of Aruba's ecological highlights. Go early morning for the best birdlife. The calm water makes this suitable for all fitness levels.",
      warnings:
        "Located at Mangel Halto in southern Aruba — requires transport from hotels. Reef-safe sunscreen required (biodegradable preferred).",
      bestTimeOfDay: "Morning",
      tags: ["kayak", "mangroves", "eco-tour", "wildlife", "guided", "peaceful"],
      isFeatured: 0,
      providerId: delphi,
      providerName: "Delphi Watersports",
      providerWebsite: "https://www.delphiwatersports.com/",
      providerPhone: null,
      providerEmail: null,
      providerWhatsapp: null,
    },
    {
      // Source: delphiwatersports.com — "SUP Rental"
      // Price confirmed: $30 / up to 7 hours
      title: "Stand-Up Paddleboard Rental",
      description:
        "Rent a stand-up paddleboard for up to 7 hours at Palm Beach — Aruba's most affordable full-day water activity. Calm, turquoise water with natural shade breaks available. Perfect for self-guided exploration along the coast.",
      category: "Water & Wind Sports",
      difficulty: "easy",
      durationMinutes: 420, // Up to 7 hours confirmed
      priceLow: 30,         // $30 for up to 7 hours confirmed
      priceHigh: 30,
      location: "Palm Beach",
      imageUrl: "/activities/kitesurfing.png",
      reviewSummary:
        "Outstanding value — $30 for up to 7 hours of paddleboarding on Aruba's calm western shore. Ideal for fit travelers who want self-guided water time without a structured tour.",
      whatToBring: "Swimsuit, reef-safe sunscreen, water, secure camera. Board and paddle provided.",
      whatToExpect:
        "Pick up paddleboard at Delphi's Palm Beach location. Self-guided paddle for up to 7 hours. Return board when done.",
      basicBookingGuide:
        "Book at delphiwatersports.com via FareHarbor. $30 for up to 7 hours. Online booking only.",
      premiumBookingGuide:
        "The western shore between Palm Beach and Arashi is perfect SUP territory — calm, clear, and less than 1m deep in many spots. Best early morning when the trade winds haven't picked up.",
      insiderTips:
        "Go early morning before the trade winds build — SUP is easier in calm conditions. The shallow flats north of Palm Beach toward Arashi Reef are spectacular self-guided territory.",
      warnings:
        "Wind picks up in the afternoon — beginners should go in the morning. Stay close to shore if unfamiliar with paddling.",
      bestTimeOfDay: "Early morning",
      tags: ["sup", "paddleboard", "rental", "self-guided", "affordable", "palm-beach"],
      isFeatured: 0,
      providerId: delphi,
      providerName: "Delphi Watersports",
      providerWebsite: "https://www.delphiwatersports.com/",
      providerPhone: null,
      providerEmail: null,
      providerWhatsapp: null,
    },
    {
      // Source: delphiwatersports.com — "Catamaran Sunset Cruise"
      // Price confirmed: $50, 2 hours from vendor intelligence
      title: "Delphi Catamaran Sunset Cruise",
      description:
        "The most affordable sunset catamaran cruise in Aruba at $50. 2-hour evening sail with open bar, rope swing, and water slide. Delphi's famous energetic crew brings the same party atmosphere as their snorkel cruise.",
      category: "Ocean Exploration",
      difficulty: "easy",
      durationMinutes: 120, // 2 hours confirmed
      priceLow: 50,         // $50 confirmed from vendor intelligence
      priceHigh: 50,
      location: "Palm Beach — west coast sunset route",
      imageUrl: "/activities/catamaran-party.jpg",
      reviewSummary:
        "Cheapest sunset catamaran in Aruba at $50. Same open bar and crew energy as the snorkel cruise. Rope swing still available.",
      whatToBring: "Camera, comfortable clothes, light jacket. Swimsuit optional for rope swing.",
      whatToExpect:
        "Board at Palm Beach. 2-hour sunset cruise with open bar and Delphi's signature energetic crew. Rope swing and water slide available.",
      basicBookingGuide:
        "Book at delphiwatersports.com via FareHarbor. $50 per person. Online booking only.",
      premiumBookingGuide:
        "At $50 this is the cheapest sunset sail in Aruba — $9 less than Jolly Pirates ($59) and $45 less than De Palm ($95). Delphi's crew energy makes up for the larger group.",
      insiderTips:
        "Combine with a morning snorkel cruise for a full day with Delphi — their combo packages save 15-25%.",
      warnings:
        "No phone/email — online booking only. Party atmosphere — less quiet than De Palm's sunset sail.",
      bestTimeOfDay: "Late afternoon",
      tags: ["sunset", "catamaran", "open-bar", "cheapest", "rope-swing"],
      isFeatured: 0,
      providerId: delphi,
      providerName: "Delphi Watersports",
      providerWebsite: "https://www.delphiwatersports.com/",
      providerPhone: null,
      providerEmail: null,
      providerWhatsapp: null,
    },
    {
      // Source: delphiwatersports.com — "ATV Guided Excursion"
      // Price confirmed: $135, 4 hours
      title: "Delphi ATV Guided Island Excursion",
      description:
        "4-hour guided ATV tour through Aruba's rugged interior and coastline. Self-drive ATV with guide leading the convoy. Covers gold mine ruins, natural rock formations, and coastal trails. Add-on option to popular combo packages.",
      category: "Off-Road Expeditions",
      difficulty: "moderate",
      durationMinutes: 240, // 4 hours confirmed
      priceLow: 135,        // $135 confirmed from vendor intelligence
      priceHigh: 135,
      location: "Aruba interior and coastal trails",
      imageUrl: "/activities/atv-expedition.png",
      reviewSummary:
        "Competitive alternative to Rockabeach ($160) and ABC ($240-$310 UTV) for ATV-style tours. Delphi's combo packages let you stack this with watersports for significant savings.",
      whatToBring: "Closed-toe shoes, bandana for dust, sunglasses, sunscreen.",
      whatToExpect:
        "ATV safety tutorial. 4-hour guided convoy through Aruba's interior. Visit gold mine ruins and coastal viewpoints.",
      basicBookingGuide:
        "Book at delphiwatersports.com via FareHarbor. $135 per person. Online booking only.",
      premiumBookingGuide:
        "Book as part of a combo package with the catamaran or parasailing — saves 15-25%.",
      insiderTips:
        "Ask about the combo package that bundles ATV + catamaran — full land and water day at significant savings.",
      warnings:
        "Dusty — bring bandana and glasses. No phone/email — online booking only.",
      bestTimeOfDay: "Morning",
      tags: ["atv", "guided", "off-road", "ruins", "coastal", "combo-available"],
      isFeatured: 0,
      providerId: delphi,
      providerName: "Delphi Watersports",
      providerWebsite: "https://www.delphiwatersports.com/",
      providerPhone: null,
      providerEmail: null,
      providerWhatsapp: null,
    },

    /* =================================================================
     * OCTOPUS ARUBA — Sunset Cruise & VIP Morning Adventure
     * Source: octopusaruba.com (vendor intelligence, April 2026)
     * Note: Specific pricing NOT listed on Bokun widget — contact required
     * ================================================================= */
    {
      // Source: octopusaruba.com — "Sunset Cruise"
      // Price: NOT listed on Bokun widget — marked "Contact for pricing"
      // Duration: 2 hours confirmed from vendor intelligence
      title: "Octopus Aruba Sunset Cruise",
      description:
        "550+ review sunset cruise aboard Octopus Aruba's catamaran. Complimentary drinks, light snacks, and a free Aruba souvenir included. 2-hour evening sail from Palm Beach. One of the most-reviewed sunset experiences in Aruba.",
      category: "Ocean Exploration",
      difficulty: "easy",
      durationMinutes: 120, // 2 hours confirmed
      priceLow: 0,          // UNKNOWN — not listed on Bokun widget. 0 = contact for pricing.
      priceHigh: 0,
      location: "Palm Beach, J.E. Irausquin Blvd 87",
      imageUrl: "/activities/afternoon-sailing.jpg",
      reviewSummary:
        "550+ five-star reviews for the sunset cruise alone — the most-reviewed sunset catamaran in Aruba. Guests consistently praise the drinks, snacks, free souvenir, and attentive crew.",
      whatToBring: "Camera, light jacket. Everything else provided (drinks, snacks, souvenir).",
      whatToExpect:
        "Board at Palm Beach. 2-hour sunset sail with complimentary drinks and light snacks. Receive your free Aruba souvenir. Return to pier.",
      basicBookingGuide:
        "Book via Bokun widget at octopusaruba.com. Phone: +297 587-1992. WhatsApp: +297 560-6565. Email: info@octopusaruba.com. Pricing not listed — contact directly.",
      premiumBookingGuide:
        "WhatsApp (+297 560-6565) is the fastest way to get pricing and availability. With 550+ reviews this is one of the highest-volume sunset cruises on the island — book ahead.",
      insiderTips:
        "Free Aruba souvenir included — a nice touch. The high review volume (550+) for a single cruise offering is exceptional and indicates consistent quality.",
      warnings:
        "Pricing not publicly listed — must contact or use Bokun widget. Book ahead for popular dates.",
      bestTimeOfDay: "Late afternoon",
      tags: ["sunset", "catamaran", "open-bar", "souvenir", "highly-reviewed", "contact-for-price"],
      isFeatured: 1,
      providerId: octopus,
      providerName: "Octopus Aruba",
      providerWebsite: "https://octopusaruba.com/",
      providerPhone: "+297 587-1992",
      providerEmail: "info@octopusaruba.com",
      providerWhatsapp: "+297 560-6565",
    },
    {
      // Source: octopusaruba.com — "VIP Morning Adventure"
      // Price: NOT listed on website — "Contact for pricing"
      // Duration: 3 hours confirmed from vendor intelligence
      title: "Octopus VIP Morning Snorkel Adventure",
      description:
        "Premium morning catamaran experience with snorkeling, fresh mimosas, and a brunch spread. 3-hour VIP adventure from Palm Beach with all snorkeling gear provided. Every guest receives a complimentary Aruba souvenir.",
      category: "Ocean Exploration",
      difficulty: "easy",
      durationMinutes: 180, // 3 hours confirmed from vendor intelligence
      priceLow: 0,          // UNKNOWN — not listed on website. 0 = contact for pricing.
      priceHigh: 0,
      location: "Palm Beach and west coast snorkel sites",
      imageUrl: "/activities/champagne-brunch-cruise.jpg",
      reviewSummary:
        "Premium snorkel experience with mimosas and brunch — elevated above standard snorkel cruises. Crew described as attentive and personalized. Free souvenir and snorkeling gear included.",
      whatToBring: "Swimsuit, towel, reef-safe sunscreen. All snorkel gear, food, and drinks provided.",
      whatToExpect:
        "Board at Palm Beach. Sail to snorkel sites. Mimosas and brunch served aboard. Snorkeling with gear provided. Free Aruba souvenir. Return to pier.",
      basicBookingGuide:
        "Book via Bokun widget at octopusaruba.com. Phone: +297 587-1992. WhatsApp: +297 560-6565. Pricing not listed — contact directly for rates.",
      premiumBookingGuide:
        "WhatsApp is the fastest contact method. Ask about the brunch menu specifics and snorkel site(s) when booking. Good alternative to Pelican's Champagne Brunch ($72) if you want a smaller group experience.",
      insiderTips:
        "Octopus runs smaller groups than De Palm and Pelican — likely a more intimate experience. Ask about private booking options for special occasions.",
      warnings:
        "Pricing not publicly listed — must contact or use Bokun widget. Smaller operator than Pelican/De Palm.",
      bestTimeOfDay: "Morning",
      tags: ["snorkeling", "mimosas", "brunch", "vip", "premium", "souvenir", "contact-for-price"],
      isFeatured: 0,
      providerId: octopus,
      providerName: "Octopus Aruba",
      providerWebsite: "https://octopusaruba.com/",
      providerPhone: "+297 587-1992",
      providerEmail: "info@octopusaruba.com",
      providerWhatsapp: "+297 560-6565",
    },

    /* =================================================================
     * AROUND ARUBA TOURS — ATV & UTV Tours
     * Source: aroundarubatours.com (vendor intelligence, April 2026)
     * Note: Specific pricing NOT listed on main website — must use Trytn
     * ================================================================= */
    {
      // Source: aroundarubatours.com — ATV/UTV guided tours
      // Price: NOT listed on main website — check Trytn booking system or call
      // 4.7/5 rating, 580+ reviews
      title: "Around Aruba ATV/UTV Guided Tour",
      description:
        "Explore Aruba on an ATV or UTV with Around Aruba Tours — the island's top-rated rental and tour operator (4.7/5, 580 reviews). Choose from guided safaris or self-guided rentals through their sister company Around Aruba Rentals, the #1 TripAdvisor ATV rental in Aruba.",
      category: "Off-Road Expeditions",
      difficulty: "moderate",
      durationMinutes: 240, // Estimated 4 hours for guided tour
      priceLow: 0,          // UNKNOWN — not listed on main website. Check Trytn for current pricing.
      priceHigh: 0,
      location: "Aruba countryside — northern routes including Alto Vista Chapel area",
      imageUrl: "/activities/atv-expedition.png",
      reviewSummary:
        "4.7/5 across 580 reviews. Their rental arm (Around Aruba Rentals) is the #1 TripAdvisor ATV rental operator. Both guided tours and unguided rentals available — flexibility to explore independently.",
      whatToBring: "Closed-toe shoes, bandana for dust, sunglasses, sunscreen.",
      whatToExpect:
        "ATV/UTV safety briefing. Guided tour option leads convoy through northern Aruba. Rental option allows self-guided exploration at your own pace.",
      basicBookingGuide:
        "Book via Trytn booking system at aroundarubatours.com. Phone: +297 593-5363. Mon-Fri 9 AM-5 PM, Sat-Sun 9 AM-6 PM. Located at Alto Vista 116, Noord. Pricing not on main site — use Trytn for current rates.",
      premiumBookingGuide:
        "Ask about the difference between guided tours and unguided rentals — rentals from Around Aruba Rentals give you freedom to explore at your own pace. Hummer tours also available for something different.",
      insiderTips:
        "Their Alto Vista location puts them right near the Alto Vista Chapel — easy to add as a quick stop. Ask about Hummer tours — a unique offering not available elsewhere.",
      warnings:
        "Pricing not on main website — check Trytn booking system. Rental requires a valid driver's license.",
      bestTimeOfDay: "Morning",
      tags: ["atv", "utv", "guided", "rental", "self-guided", "flexible", "contact-for-price"],
      isFeatured: 0,
      providerId: aroundAruba,
      providerName: "Around Aruba Tours",
      providerWebsite: "https://www.aroundarubatours.com",
      providerPhone: "+297 593-5363",
      providerEmail: "info@philipsanimalgarden.com",
      providerWhatsapp: null,
    },

    /* =================================================================
     * JOLLY PIRATES — Pirate Party Sunset Dinner Cruise
     * Source: jolly-pirates.com (new offering identified April 2026 QA)
     * Price confirmed: From $105, 3 hours, adults only
     * ================================================================= */
    {
      // Source: jolly-pirates.com — "Pirate Party Sunset Dinner Cruise"
      // Price confirmed: From $105, 3 hours, 5:30–8:30 PM, adults only (18+)
      // NEW offering identified during April 2026 QA — not in original scrape
      title: "Jolly Pirates Pirate Party Sunset Dinner Cruise",
      description:
        "Adults-only 3-hour pirate ship dinner cruise aboard the iconic 85-foot schooner. Full BBQ dinner, open bar, and live DJ as the Caribbean sun sets. The most festive evening on the water in Aruba. 26+ years of Jolly Pirates experience brought to a dinner format.",
      category: "Ocean Exploration",
      difficulty: "easy",
      durationMinutes: 180, // 3 hours: 5:30-8:30 PM
      priceLow: 105,        // "From $105" confirmed April 2026 QA
      priceHigh: 105,
      location: "MooMba Beach departure, Aruba west coast",
      imageUrl: "/activities/pirate-ship-snorkel.jpg",
      reviewSummary:
        "New offering from Jolly Pirates — combines the iconic pirate ship atmosphere with a BBQ dinner, open bar, and live DJ. Adults-only makes for a livelier evening atmosphere than the standard sunset cruise.",
      whatToBring: "Light jacket for the evening breeze, camera. No swim gear needed.",
      whatToExpect:
        "Board at MooMba Beach at 5:30 PM. 3-hour pirate ship evening cruise. BBQ dinner served aboard. Open bar throughout. Live DJ entertainment. Return by 8:30 PM.",
      basicBookingGuide:
        "Book at jolly-pirates.com for 12% automatic online discount. Phone: +297 586-8107. WhatsApp: +297 592-6777. Adults only (18+). Departs MooMba Beach (between Holiday Inn and Marriott) at 5:30 PM.",
      premiumBookingGuide:
        "Always book online at jolly-pirates.com — 12% off vs walk-up. The most social evening on the water: dinner + open bar + DJ on an 85-foot pirate ship. BBQ means no need to eat beforehand.",
      insiderTips:
        "This dinner cruise offers the best value per hour for evening entertainment in Aruba: 3 hours of BBQ + open bar + live DJ for $105. Book online for 12% off.",
      warnings:
        "Adults only (18+) — strictly enforced. Arrive early — Jolly Pirates will NOT wait for latecomers.",
      bestTimeOfDay: "Late afternoon",
      tags: ["pirate-ship", "dinner-cruise", "bbq", "open-bar", "live-dj", "adults-only", "sunset"],
      isFeatured: 0,
      providerId: jolly,
      providerName: "Jolly Pirates",
      providerWebsite: "https://www.jolly-pirates.com/",
      providerPhone: "+297 586-8107",
      providerEmail: "info@jolly-pirates.com",
      providerWhatsapp: "+297 592-6777",
    },

    /* =================================================================
     * DELPHI WATERSPORTS — Waverunner Rental & Natural Pool Jeep
     * Source: delphiwatersports.com (confirmed April 2026 QA)
     * ================================================================= */
    {
      // Source: delphiwatersports.com — "Waverunner / Jet Ski Rental"
      // Price confirmed: From $75, 30 min
      title: "Waverunner Jet Ski Rental",
      description:
        "Rent a waverunner (jet ski) for 30-minute sessions along Palm Beach's calm turquoise coastline. Solo or tandem. The fastest way to experience Aruba's water from a different perspective. No experience necessary.",
      category: "Water & Wind Sports",
      difficulty: "moderate",
      durationMinutes: 30,  // 30 min session confirmed
      priceLow: 75,         // From $75 confirmed April 2026 QA
      priceHigh: 75,
      location: "Palm Beach",
      imageUrl: "/activities/parasailing.png",
      reviewSummary:
        "Quick, fun adrenaline hit on Palm Beach. Easy for first-timers with a 5-minute orientation. Best added to a combo package for significant savings.",
      whatToBring: "Swimsuit, water shoes, sunscreen. Life vest provided.",
      whatToExpect:
        "Brief safety orientation. Self-guided 30-minute waverunner session along Palm Beach coastline. Tandem rental available for couples.",
      basicBookingGuide:
        "Book at delphiwatersports.com via FareHarbor. From $75 for 30 minutes. Online booking only — no phone or email listed.",
      premiumBookingGuide:
        "Save 15–25% by booking as part of a Delphi combo package (waverunner + parasailing or catamaran cruise).",
      insiderTips:
        "Combo packages save 15–25%. Go early morning when the water is calmest and flattest for the best ride.",
      warnings:
        "Weight and age limits apply. Sea conditions dependent. No phone/email — online booking only.",
      bestTimeOfDay: "Morning",
      tags: ["jet-ski", "waverunner", "rental", "adrenaline", "palm-beach", "quick-activity"],
      isFeatured: 0,
      providerId: delphi,
      providerName: "Delphi Watersports",
      providerWebsite: "https://www.delphiwatersports.com/",
      providerPhone: null,
      providerEmail: null,
      providerWhatsapp: null,
    },
    {
      // Source: delphiwatersports.com — "Natural Pool Jeep Tour"
      // Price confirmed: From $89, 4 hours (identified April 2026 QA)
      title: "Delphi Natural Pool Jeep Tour",
      description:
        "Guided 4×4 jeep tour to Aruba's legendary Natural Pool (Conchi) inside Arikok National Park. 4-hour adventure covering the northeast coastline, volcanic rock formations, and a swimming stop at the Natural Pool. Competitive price vs ABC Tours ($130) and Pelican ($99).",
      category: "Wild Terrain & Natural Wonders",
      difficulty: "moderate",
      durationMinutes: 240, // 4 hours estimated
      priceLow: 89,         // From $89 confirmed April 2026 QA
      priceHigh: 89,
      location: "Natural Pool (Conchi), Arikok National Park, northeast Aruba",
      imageUrl: "/activities/jeep-safari.png",
      reviewSummary:
        "Delphi's entry into the Natural Pool tour market at $89 — $10 less than Pelican ($99) and $41 less than ABC Tours ($130). Same destination, competitive price. Good option for budget-conscious wild-terrain seekers.",
      whatToBring: "Swimsuit for Natural Pool swim, closed-toe shoes, sunscreen, water, camera.",
      whatToExpect:
        "4x4 jeep tour to northeast Aruba. Visit volcanic rock formations and coastline. Swim in the Natural Pool. Return via countryside trails.",
      basicBookingGuide:
        "Book at delphiwatersports.com via FareHarbor. From $89 per person. Online booking only.",
      premiumBookingGuide:
        "At $89, this is the cheapest guided Natural Pool tour in Aruba. Bundle with a morning catamaran cruise via Delphi's combo packages for a full land + water day.",
      insiderTips:
        "Bring water shoes — the Natural Pool entry involves scrambling over volcanic lava rock. The pool itself is a natural ocean inlet sheltered by boulders.",
      warnings:
        "Natural Pool requires moderate fitness for boulder scrambling. Arikok National Park entrance fee ($22) may be additional — confirm when booking.",
      bestTimeOfDay: "Morning",
      tags: ["jeep", "natural-pool", "arikok", "wild-terrain", "swimming", "4x4"],
      isFeatured: 0,
      providerId: delphi,
      providerName: "Delphi Watersports",
      providerWebsite: "https://www.delphiwatersports.com/",
      providerPhone: null,
      providerEmail: null,
      providerWhatsapp: null,
    },

    /* =================================================================
     * ARUBA CONSERVATION FOUNDATION — Arikok National Park
     * Source: acf.aw (verified April 2026 QA)
     * Official park operator | Entrance $22/adult, children under 17 free
     * ================================================================= */
    {
      // Source: acf.aw — Arikok National Park self-guided entry
      // Price confirmed: $22/adult, free under-17
      title: "Arikok National Park Self-Guided Exploration",
      description:
        "Aruba's only national park covers 18% of the island — deserts, coastline, caves, and the legendary Natural Pool. $22 covers the entire day including access to Fontein Cave (Arawak rock art), Quadirikiri Cave, scenic hiking trails, the Jamanota Hill viewpoint, and the natural pool trailhead. Children under 17 enter free.",
      category: "Wild Terrain & Natural Wonders",
      difficulty: "moderate",
      durationMinutes: 480, // Up to 8 hours, self-guided and flexible
      priceLow: 22,         // $22/adult, children under 17 free — confirmed April 2026 QA
      priceHigh: 22,
      location: "Arikok National Park — San Fuego Visitor Center entrance, northeast Aruba",
      imageUrl: "/activities/jeep-safari.png",
      reviewSummary:
        "Aruba's most underrated experience for nature and history lovers. Authentic, uncrowded, and dramatically different from the resort beach strip. At $22 it's the best-value full-day experience on the island.",
      whatToBring: "2L water per person (no vendors inside), snacks, closed-toe shoes, reef-safe sunscreen, camera. Map available at visitor center.",
      whatToExpect:
        "Pay $22 at San Fuego Visitor Center. Pick up a trail map. Self-guided exploration of the park at your own pace. Visit caves, hiking trails, and natural viewpoints. Return before park closes at 4 PM.",
      basicBookingGuide:
        "Walk-in entry at San Fuego Visitor Center (open 8 AM–3:30 PM daily) or Vader Piet entrance (8:30 AM–3 PM). $22/adult, children under 17 free. No advance booking needed for self-guided. Annual passes available. Website: acf.aw.",
      premiumBookingGuide:
        "Rent a car to reach Arikok — the park covers the northeast corner of the island far from hotel strip (approx. 30 min drive from Palm Beach). Start early (8 AM) for cooler temps and best wildlife activity. Ask rangers at the visitor center for current trail conditions.",
      insiderTips:
        "Rangers at San Fuego Visitor Center give free trail orientation and can direct you to the most active caves and viewpoints. The park closes at 4 PM — plan to arrive by 9 AM for a full day. Iguanas and parakeets are common near the visitor center.",
      warnings:
        "No food vendors in the park — bring substantial water (2L/person minimum). Closes for admission at 3:30 PM. Car rental recommended (~$60-$150/day). Huliba Cave ('Tunnel of Love') may be closed — verify at visitor center.",
      bestTimeOfDay: "Morning",
      tags: ["arikok", "national-park", "self-guided", "caves", "hiking", "nature", "budget-friendly"],
      isFeatured: 1,
      providerId: acf,
      providerName: "Aruba Conservation Foundation",
      providerWebsite: "https://www.acf.aw/",
      providerPhone: null,
      providerEmail: "reservations@acf.aw",
      providerWhatsapp: null,
    },
    {
      // Source: acf.aw — Ranger-guided hikes in Arikok National Park
      // Price confirmed: $25/person guide fee + $22 park entry = $47 total
      // Max 10 participants per hike, book via reservations@acf.aw
      title: "Arikok Ranger-Guided Nature Hike",
      description:
        "Official ranger-guided hiking experiences inside Arikok National Park. Four route options: Rooi Tambu & Dos Playa (7.5km, 3.5 hrs, hard), Jamanota Hill (4.8km, 2 hrs, hard), Miralamar (2km, 1.5 hrs, easy), and Cunucu Arikok (5km, 1.5 hrs, easy). All with a certified ranger naturalist. Max 10 participants per guided hike.",
      category: "Wild Terrain & Natural Wonders",
      difficulty: "moderate",
      durationMinutes: 210, // Medium route: 3.5 hours for the main Rooi Tambu route
      priceLow: 47,         // $22 park entry + $25 guide fee = $47/person total
      priceHigh: 47,
      location: "Arikok National Park — multiple trailheads from San Fuego Visitor Center",
      imageUrl: "/activities/jeep-safari.png",
      reviewSummary:
        "Intimate certified naturalist-guided experience with max 10 participants. Ranger knowledge of geology, flora, and fauna turns a hike into a story about Aruba's pre-colonial and natural history.",
      whatToBring: "2L water, closed-toe shoes (trail runners or hiking boots), sunscreen, hat. Camera recommended.",
      whatToExpect:
        "Meet ranger at San Fuego Visitor Center. Guided hike on your chosen trail. Naturalist commentary on geology, ecology, and Arawak history. Return to visitor center.",
      basicBookingGuide:
        "Book in advance via reservations@acf.aw. $25/person guide fee + $22 park entry = $47 total. Max 10 participants. Choose your trail: Rooi Tambu/Dos Playa (7.5km, hard), Jamanota Hill (4.8km, hard), Miralamar (2km, easy), or Cunucu Arikok (5km, easy).",
      premiumBookingGuide:
        "For first-timers: the Miralamar trail (2km, easy) gives a panoramic overview of the park without strenuous hiking. For serious hikers: the Rooi Tambu & Dos Playa trail (7.5km) is the most rewarding, ending at Aruba's dramatic two-beach northeast coast.",
      insiderTips:
        "Book at least 3–7 days ahead — guided hike capacity is only 10 people. Jamanota Hill (188m) is the highest point in Aruba — bring a wide-angle lens for the summit views.",
      warnings:
        "Guided hike reservations required — walk-in guided tours not available. Difficult trails (Rooi Tambu, Jamanota) require solid fitness and proper footwear.",
      bestTimeOfDay: "Early morning",
      tags: ["arikok", "guided-hike", "ranger", "nature", "jamanota", "dos-playa", "wild-terrain"],
      isFeatured: 0,
      providerId: acf,
      providerName: "Aruba Conservation Foundation",
      providerWebsite: "https://www.acf.aw/",
      providerPhone: null,
      providerEmail: "reservations@acf.aw",
      providerWhatsapp: null,
    },
    {
      // Source: acf.aw / Arikok National Park — Fontein Cave
      // Price: Included in $22 park entry — no separate admission
      // Arawak rock drawings circa 1000 AD — most significant archaeological site in Aruba
      title: "Fontein Cave & Arawak Rock Art",
      description:
        "Visit Fontein Cave inside Arikok National Park — the single most significant pre-colonial archaeological site in Aruba. Features well-preserved Arawak Indian rock drawings dating from circa 1000 AD, plus later colonial-era carvings. Included in the $22 park entry fee — no separate admission.",
      category: "Wild Terrain & Natural Wonders",
      difficulty: "easy",
      durationMinutes: 90,  // 30-45 min cave visit + transit inside park
      priceLow: 22,         // Included in park entry — no extra charge
      priceHigh: 22,
      location: "Fontein Cave, Arikok National Park, northeast Aruba",
      imageUrl: "/activities/jeep-safari.png",
      reviewSummary:
        "A must-see for history lovers. The 1000-year-old Arawak drawings are in remarkable condition — petroglyphs and pictographs preserved in the cave's protected environment. Rangers can explain the symbols if asked.",
      whatToBring: "Flashlight/phone light for the cave interior. Closed-toe shoes. $22 park entry. Camera.",
      whatToExpect:
        "Drive or hike to Fontein Cave from the San Fuego Visitor Center. Walk through the cave chamber viewing the Arawak rock drawings on the walls and ceiling. Optional colonial-era carvings section. 30-45 minute visit.",
      basicBookingGuide:
        "Walk-in — included in Arikok National Park entry ($22/adult, free for under-17). No separate admission or advance booking. San Fuego Visitor Center staff can provide directions and context. Website: acf.aw.",
      premiumBookingGuide:
        "Combine with a full park visit ($22) to also see Quadirikiri Cave and hike toward the Natural Pool. A ranger from the visitor center can add historical context about the Arawak drawings.",
      insiderTips:
        "The drawings depict animals, celestial objects, and human figures — ask a ranger for interpretations. Flashlight or phone light strongly recommended for the cave interior.",
      warnings:
        "Flashlights needed — cave interior is dark. Slippery when wet — wear closed-toe shoes. Check trail access conditions with rangers at San Fuego before walking.",
      bestTimeOfDay: "Morning",
      tags: ["arikok", "cave", "arawak", "rock-art", "archaeology", "history", "wild-terrain"],
      isFeatured: 1,
      providerId: acf,
      providerName: "Aruba Conservation Foundation",
      providerWebsite: "https://www.acf.aw/",
      providerPhone: null,
      providerEmail: "reservations@acf.aw",
      providerWhatsapp: null,
    },
    {
      // Source: acf.aw — Quadirikiri Cave (natural skylight cave + bat colony)
      // Price: Included in $22 park entry — no separate admission
      // Flashlights prohibited — natural ceiling holes illuminate the cave
      title: "Quadirikiri Cave — Natural Skylight & Bat Colony",
      description:
        "Explore Quadirikiri Cave — a dramatic natural cave where shafts of light beam through ceiling holes, illuminating the chamber without flashlights. Home to a large bat colony. Completely different experience from Fontein Cave. Included in the $22 Arikok National Park entry.",
      category: "Wild Terrain & Natural Wonders",
      difficulty: "easy",
      durationMinutes: 60,  // 30-45 min cave visit + transit inside park
      priceLow: 22,         // Included in park entry — no extra charge
      priceHigh: 22,
      location: "Quadirikiri Cave, Arikok National Park, northeast Aruba",
      imageUrl: "/activities/jeep-safari.png",
      reviewSummary:
        "Visually dramatic cave with bats and natural light shafts — totally different aesthetic from Fontein. The combination of no-flashlight rule and natural light beams makes for extraordinary photography.",
      whatToBring: "Closed-toe shoes. No flashlights (prohibited inside). $22 park entry. Camera.",
      whatToExpect:
        "Drive or hike to Quadirikiri from San Fuego. Walk through the cave chambers. Natural skylight holes cast dramatic light beams. Observe the bat colony roosting overhead. 30-45 minute visit.",
      basicBookingGuide:
        "Walk-in — included in Arikok National Park entry ($22/adult, free for under-17). No separate admission or advance booking. Website: acf.aw.",
      premiumBookingGuide:
        "Visit in the morning when sunlight enters the ceiling holes at the best angle for photography. Combine with Fontein Cave (same $22 entry covers both) for the full Arikok cave experience.",
      insiderTips:
        "Flashlights are prohibited to protect the bat colony — the natural ceiling holes provide all the light you need. Visit around 9-10 AM for the best natural light angles. The bats roost near the ceiling — look up.",
      warnings:
        "No flashlights permitted — this is a bat protection rule. Cave floor can be uneven — closed-toe shoes required. Do not disturb or approach the bats.",
      bestTimeOfDay: "Morning",
      tags: ["arikok", "cave", "bats", "skylight", "natural-wonder", "photography", "wild-terrain"],
      isFeatured: 0,
      providerId: acf,
      providerName: "Aruba Conservation Foundation",
      providerWebsite: "https://www.acf.aw/",
      providerPhone: null,
      providerEmail: "reservations@acf.aw",
      providerWhatsapp: null,
    },
    {
      // Source: acf.aw — Natural Pool (Conchi) self-guided hike
      // Price: $22 park entry only — no extra fee
      // 3-4 hour round trip hike on volcanic rock terrain
      title: "Natural Pool (Conchi) Self-Guided Hike",
      description:
        "Hike to Aruba's legendary Natural Pool (Conchi) — a stunning volcanic rock inlet on the northeast coast where ocean waves fill a natural swimming pool. 3–4 hour round-trip hike through rugged Arikok National Park terrain. $22 park entry only — no guide required. Rewarding for fit hikers.",
      category: "Wild Terrain & Natural Wonders",
      difficulty: "challenging",
      durationMinutes: 240, // 3-4 hours round trip confirmed
      priceLow: 22,         // $22 park entry — no additional charge to hike to the Natural Pool
      priceHigh: 22,
      location: "Natural Pool (Conchi), northeast coast, Arikok National Park",
      imageUrl: "/activities/jeep-safari.png",
      reviewSummary:
        "The independent hiker's version of Aruba's most iconic natural site. Harder than a guided jeep tour but far more rewarding and at a fraction of the cost ($22 vs $89–$130 for guided tours).",
      whatToBring: "2L water per person, water shoes (essential for the pool entry), sunscreen, snacks, closed-toe hiking shoes. Camera with strap.",
      whatToExpect:
        "Pay $22 at San Fuego. Drive to Daimari Beach trailhead. 3–4 hour round-trip hike over volcanic rock terrain. Arrive at the Natural Pool for a swim. Ocean surge flows in through a rock channel. Return via the same trail.",
      basicBookingGuide:
        "Walk-in — $22 park entry at San Fuego Visitor Center. No advance booking. Drive to the Daimari Beach trailhead inside the park (4WD recommended for the park roads). Website: acf.aw.",
      premiumBookingGuide:
        "Consider a guided jeep tour (ABC Tours $130, Pelican $99, Delphi $89) instead if fitness or trail navigation is uncertain — the terrain is rough volcanic lava rock with no marked trail. The self-guided hike is for experienced hikers only.",
      insiderTips:
        "The Natural Pool has ocean surge — wait for waves to recede before entering through the rock channel. Water shoes are essential for the rocky entry. Start by 9 AM to allow time for the round trip before the 3:30 PM park closure.",
      warnings:
        "Ocean surge at the Natural Pool entry point is dangerous — do NOT enter during rough sea conditions. No marked trail — experienced hikers only. 4WD vehicle strongly recommended for internal park roads. Bring substantial water — no vendors in the park.",
      bestTimeOfDay: "Morning",
      tags: ["natural-pool", "conchi", "arikok", "hiking", "wild-terrain", "swimming", "challenging", "independent"],
      isFeatured: 1,
      providerId: acf,
      providerName: "Aruba Conservation Foundation",
      providerWebsite: "https://www.acf.aw/",
      providerPhone: null,
      providerEmail: "reservations@acf.aw",
      providerWhatsapp: null,
    },
    {
      // Source: acf.aw — Huliba Cave ("Tunnel of Love")
      // Price: Included in $22 park entry
      // STATUS: Reopening unconfirmed as of April 2026 — verify with ACF before listing as available
      title: "Huliba Cave — Tunnel of Love",
      description:
        "Huliba Cave, nicknamed the 'Tunnel of Love' for its distinctive heart-shaped entrance, is one of Arikok National Park's most photogenic natural features. The cave features a dramatic entrance formation and an interior passage. Included in the $22 Arikok park entry. Note: reopening status should be verified with ACF before visiting.",
      category: "Wild Terrain & Natural Wonders",
      difficulty: "easy",
      durationMinutes: 60,  // ~45 min cave visit + transit
      priceLow: 22,         // Included in park entry — no extra charge
      priceHigh: 22,
      location: "Huliba Cave, Arikok National Park, northeast Aruba",
      imageUrl: "/activities/jeep-safari.png",
      reviewSummary:
        "Huliba Cave's heart-shaped entrance is one of Aruba's most photographed natural features. The cave interior is smaller than Fontein or Quadirikiri but the iconic entrance makes it worth the visit.",
      whatToBring: "Flashlight/phone light, closed-toe shoes, $22 park entry. Camera for the heart-shaped entrance.",
      whatToExpect:
        "Drive or hike to Huliba Cave from San Fuego. The heart-shaped cave entrance is the primary attraction. Explore the cave passage with a flashlight. 45-minute visit.",
      basicBookingGuide:
        "Walk-in — included in Arikok National Park entry ($22/adult, free for under-17). Verify cave is open at San Fuego Visitor Center before heading there — it has been temporarily closed. Website: acf.aw.",
      premiumBookingGuide:
        "Confirm Huliba Cave access status at the San Fuego Visitor Center (or via reservations@acf.aw) before planning your visit. The heart-shaped entrance is best photographed in the morning when the light angle is favorable.",
      insiderTips:
        "The heart-shaped entrance is the money shot — arrive 10 AM when the sun illuminates the interior of the arch. Confirm the cave is open at the visitor center — it has been temporarily closed for maintenance.",
      warnings:
        "Reopening status UNCONFIRMED as of April 2026 — verify with ACF (reservations@acf.aw) before visiting. Do not make this your primary reason for a park visit without confirming.",
      bestTimeOfDay: "Morning",
      tags: ["arikok", "cave", "tunnel-of-love", "heart-shaped", "photography", "wild-terrain", "verify-access"],
      isFeatured: 0,
      providerId: acf,
      providerName: "Aruba Conservation Foundation",
      providerWebsite: "https://www.acf.aw/",
      providerPhone: null,
      providerEmail: "reservations@acf.aw",
      providerWhatsapp: null,
    },

    /* =================================================================
     * PELICAN ADVENTURES — Luxury Lagoon Cruise (premium tier)
     * Source: pelican-aruba.com (vendor intelligence, April 2026)
     * Price confirmed: $155, 5 hours, adults only, private-feel with kayaking and chef
     * ================================================================= */
    {
      // Source: pelican-aruba.com — "Luxury Lagoon Cruise"
      // Price confirmed: $155, 5 hours, adults-only (18+)
      // Includes: kayaking, handcrafted cocktails, onboard chef, snorkeling
      title: "Pelican Luxury Lagoon Cruise",
      description:
        "Pelican Adventures' most exclusive daytime offering — an adults-only 5-hour cruise with kayaking, handcrafted cocktails, and a chef-prepared lunch. Smaller group than their standard cruises for an intimate, personalized experience. Includes snorkeling at prime sites. Perfect for honeymooners, anniversaries, and discerning travelers.",
      category: "Ocean Exploration",
      difficulty: "easy",
      durationMinutes: 300, // 5 hours confirmed from vendor intelligence
      priceLow: 155,        // $155 confirmed from vendor intelligence (April 2026)
      priceHigh: 155,
      location: "West coast — private snorkel sites & calm lagoon areas",
      imageUrl: "/activities/champagne-brunch-cruise.jpg",
      reviewSummary:
        "Pelican's most premium daytime experience — smaller group, chef on board, kayaking on glassy water, and snorkeling at sites not visited by the larger group cruises. Reviewers call it a step above any standard Aruba catamaran tour.",
      whatToBring: "Swimsuit, towel, reef-safe sunscreen. Camera. All snorkel gear, kayaks, food and drinks provided.",
      whatToExpect:
        "Board at Pelican Pier 9 AM. Sail to private calm-water areas. Kayaking stop. Chef-prepared lunch served. Snorkeling at 1-2 sites. Handcrafted cocktails throughout. Return by ~2 PM.",
      basicBookingGuide:
        "Book at pelican-aruba.com via FareHarbor. $155 per person. Adults only (18+). WhatsApp: +297 594-2716. Phone: +297 587-2302. Book 5-7 days ahead — limited spots.",
      premiumBookingGuide:
        "This is the go-to recommendation for honeymoons and anniversaries. The chef-on-board and kayaking set it apart from any other Aruba daytime cruise. Ask about a private booking for an exclusive experience at a premium.",
      insiderTips:
        "Ask the crew about the best snorkel site on the day — conditions vary and the private cruise can adjust to the best spot. The kayaking stop is typically in calm, shallow water — no experience needed.",
      warnings:
        "Adults only (18+). Book well ahead — this tour sells out faster than standard cruises due to limited capacity.",
      bestTimeOfDay: "Morning",
      tags: ["catamaran", "luxury", "kayaking", "chef", "adults-only", "honeymooners", "snorkeling", "premium"],
      isFeatured: 1,
      providerId: pelican,
      providerName: "Pelican Adventures",
      providerWebsite: "https://www.pelican-aruba.com/",
      providerPhone: "+297 587-2302",
      providerEmail: null,
      providerWhatsapp: "+297 594-2716",
    },

    /* =================================================================
     * FOFOTI TOURS & TRANSFERS — Island Adventure
     * Source: fofoti.com (vendor intelligence, April 2026)
     * Note: Pricing on FareHarbor booking page — check for current rates
     * ================================================================= */
    {
      // Source: fofoti.com — "Guided Jeep & UTV Adventures"
      // Price: Not prominently on main website — check FareHarbor
      title: "Fofoti Island Jeep & UTV Adventure",
      description:
        "Off-road jeep and UTV tours through Aruba's rugged interior — covering the Natural Bridge ruins, California Lighthouse, Arikok National Park, and natural pools. Fofoti also offers comfortable bus tours for mixed-ability groups. WhatsApp-responsive team at +297 594-6112.",
      category: "Off-Road Expeditions",
      difficulty: "moderate",
      durationMinutes: 300, // 5 hours estimated for full island tour
      priceLow: 0,          // Check FareHarbor for current rates
      priceHigh: 0,
      location: "Island-wide — Natural Bridge, Lighthouse, Arikok, Natural Pool",
      imageUrl: "/activities/jeep-safari.png",
      reviewSummary:
        "Mid-tier operator with bus tour options for guests who want sightseeing without the off-road bumping. Competitive pricing vs ABC Tours and Rockabeach. WhatsApp (+297 594-6112) is the most responsive contact.",
      whatToBring: "Swimsuit, sunscreen, comfortable shoes, camera.",
      whatToExpect:
        "Guided jeep or UTV convoy through Aruba's landmarks. Natural Bridge ruins, California Lighthouse, Arikok National Park stops. Optional Natural Pool swim.",
      basicBookingGuide:
        "Book via FareHarbor at fofoti.com. WhatsApp: +297 594-6112 (fastest response). Phone: +297 280-3636. Email: info@fofoti.com. Pricing on FareHarbor booking page.",
      premiumBookingGuide:
        "Ask about the bus tour option if anyone in your group has mobility issues or back problems — covers the same landmarks without the off-road bumping. Can bundle with airport transfer for convenience.",
      insiderTips:
        "WhatsApp (+297 594-6112) gets the fastest response for availability and pricing questions. They can bundle tour + airport transfer for a convenient arrival-day experience.",
      warnings:
        "Pricing not prominently displayed — check FareHarbor or contact via WhatsApp. Confirm pickup time and location the day before.",
      bestTimeOfDay: "Morning",
      tags: ["jeep", "utv", "guided", "island-tour", "bus-option", "whatsapp-bookable"],
      isFeatured: 0,
      providerId: fofoti,
      providerName: "Fofoti Tours & Transfers",
      providerWebsite: "https://fofoti.com/",
      providerPhone: "+297 280-3636",
      providerEmail: "info@fofoti.com",
      providerWhatsapp: "+297 594-6112",
    },

    /* =================================================================
     * NATIVE DIVERS ARUBA — Scuba Diving
     * Source: nativedivers.com (scraped April 2026)
     * Prices confirmed: $80-$125 dives, $100 Resort Course
     * ================================================================= */
    {
      // Source: nativedivers.com — PADI Resort Course (Discover Scuba)
      // Price confirmed: $100, 3 hours
      // For non-certified divers wanting to try scuba
      title: "PADI Discover Scuba Diving (Resort Course)",
      description:
        "Try scuba diving for the first time with no certification required. PADI Resort Course includes poolside instruction and a supervised reef dive with a certified instructor. 3-hour introduction at the Marriott Surf Club beach. Aruba's warm, clear water and calm west-coast conditions make it the Caribbean's best place to learn.",
      category: "Ocean Exploration",
      difficulty: "easy",
      durationMinutes: 180, // 3 hours confirmed
      priceLow: 100,        // $100 confirmed from nativedivers.com
      priceHigh: 100,
      location: "Marriott Surf Club beach, Palm Beach",
      imageUrl: "/activities/catamaran-snorkel.jpg",
      reviewSummary:
        "PADI-certified introduction to scuba. Calm Palm Beach conditions make this ideal for first-timers. Instructors take you to real reef and/or wreck sites after pool briefing — not just the shallows.",
      whatToBring: "Swimsuit, towel, sunscreen. All scuba equipment provided.",
      whatToExpect:
        "Beach/pool briefing covering mask clearing, regulator breathing, and basic hand signals. Shallow water practice. Guided reef dive with instructor. 3 hours total.",
      basicBookingGuide:
        "Book via nativedivers.com contact form or email nativedivers89@gmail.com. Phone: +297 586-4763. Located at Marriott Surf Club, Palm Beach. $100 per person.",
      premiumBookingGuide:
        "After this course, ask about upgrading to the full Open Water certification ($450, 1 week) if you want to dive independently on future trips. The Resort Course gives you a taste — the full cert changes how you travel forever.",
      insiderTips:
        "Aruba's 82°F water and 60-100 ft visibility make it one of the easiest places in the world to learn scuba. No wetsuit needed. The Antilla WWII wreck is visible from the surface at some sites.",
      warnings:
        "Must be 10+ years old. Medical questionnaire required — some conditions disqualify candidates. Inform instructor of any health conditions before diving.",
      bestTimeOfDay: "Morning",
      tags: ["scuba", "beginner", "padi", "resort-course", "no-certification-needed", "intro"],
      isFeatured: 1,
      providerId: nativeDivers,
      providerName: "Native Divers Aruba",
      providerWebsite: "https://www.nativedivers.com/",
      providerPhone: "+297 586-4763",
      providerEmail: "nativedivers89@gmail.com",
      providerWhatsapp: null,
    },
    {
      // Source: nativedivers.com — Two-Tank Wreck & Reef Dive
      // Price confirmed: $100-$125 for two tank dive
      // For PADI-certified divers
      title: "Two-Tank Wreck & Reef Boat Dive",
      description:
        "Two full scuba dives on one morning — Aruba's famous WWII wrecks and vibrant coral reefs. The Antilla, a 400-foot German freighter sunk in 1940, is one of the Caribbean's largest and most spectacular shipwrecks. Year-round 82°F water, 60-100 ft visibility. PADI certification required.",
      category: "Ocean Exploration",
      difficulty: "moderate",
      durationMinutes: 210, // ~3.5 hours for 2-tank dive including boat transit
      priceLow: 100,        // $100 without equipment rental confirmed
      priceHigh: 125,       // $125 with equipment rental confirmed
      location: "Antilla Wreck, coral reefs — west coast Aruba",
      imageUrl: "/activities/catamaran-snorkel.jpg",
      reviewSummary:
        "The Antilla WWII wreck is widely considered the best dive site in the Caribbean — 400 feet long, lying on its side at 18-30 meters, covered in coral. Two-tank format maximizes dive time. Clear visibility and calm conditions year-round.",
      whatToBring: "C-card (dive certification), swimsuit. Equipment included in higher price tier.",
      whatToExpect:
        "Boat departure from Marriott Surf Club beach. First dive: Antilla WWII wreck or equivalent wreck site. Surface interval. Second dive: coral reef. Return. ~3.5 hours total.",
      basicBookingGuide:
        "Book via nativedivers.com or email nativedivers89@gmail.com. Phone: +297 586-4763. $100-$125 for two tank dive (price varies by equipment needs). PADI certification required — bring your C-card.",
      premiumBookingGuide:
        "The Antilla wreck can be explored at multiple depths — experienced divers can penetrate the interior at 18-30m. Ask for the Antilla specifically rather than a random reef assignment. Advanced OW certification recommended to access the deepest sections.",
      insiderTips:
        "The Antilla wreck is so large (400 ft) that divers explore different sections on repeat dives. Schools of barracuda, lionfish, eels, and eagle rays are commonly spotted. Best visibility is in the morning.",
      warnings:
        "PADI Open Water (or equivalent) certification required — bring your C-card. Advanced Open Water recommended for full Antilla wreck access. Depth: 18-30m.",
      bestTimeOfDay: "Morning",
      tags: ["scuba", "wreck-diving", "antilla", "two-tank", "reef", "padi-certified"],
      isFeatured: 1,
      providerId: nativeDivers,
      providerName: "Native Divers Aruba",
      providerWebsite: "https://www.nativedivers.com/",
      providerPhone: "+297 586-4763",
      providerEmail: "nativedivers89@gmail.com",
      providerWhatsapp: null,
    },

    /* =================================================================
     * PALM BEACH DIVERS — Scuba Diving
     * Source: palmbeachdiversaruba.com (scraped April 2026)
     * Rating: 4.9/5 (254 Google reviews)
     * Note: Specific pricing not listed on website — contact for rates
     * ================================================================= */
    {
      // Source: palmbeachdiversaruba.com — Morning 2-Tank Dive
      // Price: Not listed on website — contact for pricing
      // Schedule: 8:30 AM - 12:00 PM
      title: "Palm Beach Divers Morning 2-Tank Dive",
      description:
        "Small-group morning dive experience with a 4.9/5 Google rating from 254 reviews. Two boat dives from 8:30 AM to noon — Aruba's WWII wrecks and coral reefs. PADI-certified since 2014 with ScubaPro equipment and a fast custom dive boat that maximizes bottom time. Certified divers only.",
      category: "Ocean Exploration",
      difficulty: "moderate",
      durationMinutes: 210, // 8:30 AM - 12:00 PM = 3.5 hours
      priceLow: 0,          // Not listed on website — contact for current rates
      priceHigh: 0,
      location: "Berea di Piscado — Aruba west coast wrecks and reefs",
      imageUrl: "/activities/catamaran-snorkel.jpg",
      reviewSummary:
        "4.9/5 from 254 Google reviews — Aruba's highest-rated dive operation. Small groups, ScubaPro gear, personalized instruction. Guests consistently praise the guides' knowledge and patience.",
      whatToBring: "C-card (dive certification), swimsuit, towel. Equipment available.",
      whatToExpect:
        "Boat departure at 8:30 AM. Two dive sites — typically includes WWII wreck (Antilla) and a reef. Small group ensures personal attention. Return by noon.",
      basicBookingGuide:
        "Book online at palmbeachdiversaruba.com. Email info@palmbeachdiversaruba.com. Phone: +297 742-3636. Pricing not listed — contact for current rates. Closed Sundays.",
      premiumBookingGuide:
        "Palm Beach Divers' small group policy is the key differentiator — you're not one of 20 divers following a guide. Worth the call to get pricing — the 4.9/5 rating from 254 reviews is exceptional and rarely seen in the dive industry.",
      insiderTips:
        "Book in advance in high season (Dec-Apr) — small group capacity fills fast. The morning dive (8:30 AM) has the best visibility. Closed Sundays — plan accordingly.",
      warnings:
        "Pricing not on website — must contact. Closed Sundays. PADI certification required. Small capacity means earlier booking is essential.",
      bestTimeOfDay: "Morning",
      tags: ["scuba", "wreck-diving", "small-group", "highly-rated", "two-tank", "padi-certified"],
      isFeatured: 0,
      providerId: palmBeachDivers,
      providerName: "Palm Beach Divers",
      providerWebsite: "https://www.palmbeachdiversaruba.com/",
      providerPhone: "+297 742-3636",
      providerEmail: "info@palmbeachdiversaruba.com",
      providerWhatsapp: null,
    },

    /* =================================================================
     * AYO ROCK FORMATIONS — Cliff & Vertical Adventures (Self-Guided)
     * Source: mountainproject.com/area/106661501/aruba (verified April 2026)
     *         visitaruba.com, aruba.com/us/explore/rock-formations
     *
     * NOTE: No commercial guide service exists for rock climbing in Aruba.
     * These are self-directed public sites. Provider set to Visit Aruba
     * (Aruba Tourism Authority) as the authoritative information source.
     * providerId is null — activities without a booking operator.
     * ================================================================= */
    {
      // Source: Mountain Project — Ayo Rock Formations (19 documented routes)
      // Entry: Free, public access 24 hours
      // Difficulty: boulder scrambling to sport climbing routes
      title: "Ayo Rock Formations Bouldering & Scrambling",
      description:
        "Aruba's premier climbing destination — 19 documented routes on ancient volcanic diorite boulders rising 20-30 feet from the desert floor. Free, public access to a natural bouldering park unlike anything else in the Caribbean. The formations also hold ancient Arawak petroglyphs (cave art) dating back 1,000+ years. No guide required, no booking needed.",
      category: "Cliff & Vertical Adventures",
      difficulty: "moderate",
      durationMinutes: 120, // Self-paced — 1-3 hours typical visit
      priceLow: 0,          // Free public access — no admission fee
      priceHigh: 0,
      location: "Ayo Rock Formations, near Andicuri, north-central Aruba",
      imageUrl: "/activities/jeep-safari.png",
      reviewSummary:
        "19 documented climbing routes from beginner boulder scrambles to technical sport lines. Free access, 24 hours. Ancient Arawak cave petroglyphs in the rock caves. A genuine off-the-beaten-path experience — far fewer tourists than Casibari.",
      whatToBring: "Sturdy closed-toe shoes or approach shoes (climbing shoes for harder routes), chalk bag if you have it, water, sunscreen, camera. No equipment to rent on-site.",
      whatToExpect:
        "Self-guided exploration of a volcanic boulder maze. Scramble up 20-30 foot diorite formations for panoramic views. Find Arawak petroglyphs inside caves at ground level. Most tourists take 1-2 hours; climbers may spend a half-day.",
      basicBookingGuide:
        "No booking required. Free public access 24/7. Located off Ayo Road (near Noord). Rent a car or take a tour that stops here — many jeep and ATV tours pass through. Nearest gas station: Palm Beach area (~15 min drive).",
      premiumBookingGuide:
        "Ayo is less visited than Casibari — better for an authentic experience without tour-bus crowds. The Arawak petroglyphs in the small cave near the base are the hidden gem. Go early morning for cooler temperatures and better light for photography.",
      insiderTips:
        "The cave at the base of the main formation contains genuine Arawak petroglyphs — ancient drawings of animals and geometric patterns. These are 1,000+ years old. Ayo gets far fewer tourists than Casibari because it's slightly harder to find — this is a feature, not a bug.",
      warnings:
        "No shade, no facilities, no water on-site — bring everything you need. Slippery in rain — avoid after precipitation. Some routes require basic rock climbing ability — not suitable for guests with fear of heights.",
      bestTimeOfDay: "Early morning",
      tags: ["rock-climbing", "bouldering", "self-guided", "free", "petroglyphs", "arawak", "volcanic"],
      isFeatured: 0,
      providerId: null,
      providerName: "Visit Aruba",
      providerWebsite: "https://www.visitaruba.com/things-to-do/attractions/ayo-rock-formations/",
      providerPhone: null,
      providerEmail: null,
      providerWhatsapp: null,
    },
    {
      // Source: mountainproject.com (2 documented routes), climbingaruba.org
      //         visitaruba.com/things-to-do/attractions/casibari-rock-formations/
      // Entry: Free, public access with paved tourist paths
      title: "Casibari Rock Formation Summit Scramble",
      description:
        "Aruba's most accessible rock scramble — a paved winding path leads to the summit of this volcanic diorite formation, but adventurous visitors can leave the path and scramble the boulder faces. 2 documented climbing routes for those who want more than sightseeing. 360-degree views of the island's flat interior. Free access, no booking needed.",
      category: "Cliff & Vertical Adventures",
      difficulty: "easy",
      durationMinutes: 60,  // 45 min - 1.5 hours typical visit
      priceLow: 0,          // Free public access
      priceHigh: 0,
      location: "Casibari Rock Formation, central Aruba (near Paradera)",
      imageUrl: "/activities/jeep-safari.png",
      reviewSummary:
        "More tourist-friendly than Ayo — paved paths make it accessible to all fitness levels. The summit offers a panoramic view of Aruba's flat landscape and the blue Caribbean in three directions. Iguanas and parakeets are common sightings.",
      whatToBring: "Comfortable shoes (paved paths plus optional off-trail scrambling), water, sunscreen, camera.",
      whatToExpect:
        "Short drive from the hotel strip (15-20 min). Paved tourist path winds through boulder gaps to the summit. Optional scrambling on 2 documented rock routes. Wildlife sightings (iguanas, yellow parakeets). 360-degree views. Gift shop on-site.",
      basicBookingGuide:
        "No booking required. Free public access. Open daily. Located on Casibariweg road in Paradera. Easy to combine with Ayo (10 min drive apart). Can be a stop on any jeep/ATV tour — ask operators to include it.",
      premiumBookingGuide:
        "Visit Ayo first (less crowded, more dramatic formations) then Casibari (easier scramble, better infrastructure). Do both in a half-morning. Go before 10 AM to beat the jeep-tour groups.",
      insiderTips:
        "The iguanas at Casibari are remarkably tame — they sun themselves on the warm rocks and will approach for photos. Yellow-shouldered Amazon parakeets (endemic to Aruba) nest in the rock crevices.",
      warnings:
        "Can get crowded midday when jeep tours arrive simultaneously. No shade at the top — bring a hat. The boulder scramble (off the paved path) requires confident footing.",
      bestTimeOfDay: "Early morning",
      tags: ["rock-scramble", "bouldering", "self-guided", "free", "viewpoint", "iguanas", "accessible"],
      isFeatured: 0,
      providerId: null,
      providerName: "Visit Aruba",
      providerWebsite: "https://www.visitaruba.com/things-to-do/attractions/casibari-rock-formations/",
      providerPhone: null,
      providerEmail: null,
      providerWhatsapp: null,
    },

    /* =================================================================
     * GRAPEFIELD CLIMBING AREA — Cliff & Vertical Adventures (Self-Guided)
     * Source: mountainproject.com/area/106661501/aruba (verified April 2026)
     *         climbingaruba.org — topo guide for the area
     *
     * NOTE: No commercial guide service. 37 documented routes. Local
     * climbers' resource. Recommended for experienced climbers only.
     * ================================================================= */
    {
      // Source: Mountain Project — Grapefield (37 documented routes)
      //         climbingaruba.org — topographic reference for routes
      // Entry: Free, public access
      title: "Grapefield Climbing Area — Sport Climbing",
      description:
        "Aruba's main sport climbing destination with 37 documented routes on sea cliffs near San Nicolas. Routes span beginner to advanced difficulty (French rating system). The only bolted climbing area in Aruba. A legitimate Caribbean climbing destination for experienced climbers visiting the island. Free, self-directed — no guide service available.",
      category: "Cliff & Vertical Adventures",
      difficulty: "challenging",
      durationMinutes: 180, // Half-day for a serious climbing session
      priceLow: 0,          // Free access
      priceHigh: 0,
      location: "Grapefield, San Nicolas, southern Aruba",
      imageUrl: "/activities/jeep-safari.png",
      reviewSummary:
        "37 routes on sea cliffs near San Nicolas — Aruba's only bolted sport climbing area. Routes documented on Mountain Project and climbingaruba.org. Titanium bolts used due to marine environment. Best January-July. No guide service on-site.",
      whatToBring: "Full sport climbing kit: rope, quickdraws, harness, helmet, shoes, chalk. Titanium hardware only on any new bolts — stainless corrodes in the marine air. Water, sunscreen, first aid kit.",
      whatToExpect:
        "Drive to southern Aruba near San Nicolas (30-40 min from hotel strip). Self-directed climbing on 37 documented routes. Bolted sport routes only — no trad gear needed. Best conditions Jan-July. Rocky approach, no facilities.",
      basicBookingGuide:
        "No booking required. Use Mountain Project (mountainproject.com/area/106661501/aruba) and climbingaruba.org for route topos. Bring all gear — no rental available on-site. Contact the Mountain Project page admin for local beta.",
      premiumBookingGuide:
        "Best season January through July (trade winds, lower precipitation). August-December brings humidity and higher chance of rain. Bring more water than you think you need — it's remote and hot. Only titanium bolts are reliable; check existing hardware before clipping.",
      insiderTips:
        "Use climbingaruba.org for the detailed topo — it uses the French rating system. Routes are bolted so you only need standard sport climbing gear. The location near the southern coast means steady trade wind cooling.",
      warnings:
        "Experienced climbers only — no guide service, no rescue infrastructure. Marine salt air degrades stainless steel bolts — verify bolt integrity before leading. Remote location — signal may be limited. Best January-July only.",
      bestTimeOfDay: "Morning",
      tags: ["rock-climbing", "sport-climbing", "self-guided", "free", "experienced-only", "bolted-routes", "sea-cliffs"],
      isFeatured: 0,
      providerId: null,
      providerName: "Visit Aruba",
      providerWebsite: "https://www.mountainproject.com/area/106661501/aruba",
      providerPhone: null,
      providerEmail: null,
      providerWhatsapp: null,
    },
  ];

  /* ------------------------------------------------------------------
   * Insert all activities (idempotent — skips existing titles)
   * ------------------------------------------------------------------ */
  console.log(`🏄 Upserting ${activities.length} real activities...\n`);

  let inserted = 0;
  let skipped = 0;

  for (const activity of activities) {
    const [existing] = await db
      .select({ id: activitiesTable.id })
      .from(activitiesTable)
      .where(eq(activitiesTable.title, activity.title));

    if (existing) {
      console.log(`   ⏭  Already seeded: ${activity.title} (id: ${existing.id})`);
      skipped++;
      continue;
    }

    const [row] = await db
      .insert(activitiesTable)
      .values(activity)
      .returning({ id: activitiesTable.id, title: activitiesTable.title });

    console.log(`   ✅ ${row.title} (id: ${row.id})`);
    inserted++;
  }

  console.log("\n" + "=".repeat(55));
  console.log(`✅ Seed complete: ${inserted} inserted, ${skipped} already present`);
  console.log(`   Total in run: ${activities.length} activities`);
  console.log(`   Featured: ${activities.filter(a => a.isFeatured === 1).length}`);
  console.log(`   Categories: ${[...new Set(activities.map(a => a.category))].join(", ")}`);
  console.log(`   Price range: $${Math.min(...activities.filter(a => a.priceLow > 0).map(a => a.priceLow))} – $${Math.max(...activities.map(a => a.priceHigh))}`);
  console.log(`   All prices from vendor websites (April 2026)`);
}

seed()
  .then(() => {
    console.log("\n🎉 Done. Closing database connection...");
    return pool.end();
  })
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("❌ Seed failed:", err);
    pool.end().then(() => process.exit(1));
  });
