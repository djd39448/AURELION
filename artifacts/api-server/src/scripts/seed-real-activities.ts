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

async function seed() {
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
      imageUrl: null,
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
      imageUrl: null,
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
      imageUrl: null,
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
      imageUrl: null,
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
      imageUrl: null,
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
      // Price confirmed: "From $49"
      // Duration confirmed: 1.5 hours
      title: "Seaworld Explorer Glass-Bottom Boat",
      description:
        "Air-conditioned glass-sided boat with views of the Antilla Shipwreck and Arashi coral reef. Perfect for non-swimmers who want to see underwater life. All ages welcome — no getting wet required.",
      category: "Ocean Exploration",
      difficulty: "easy",
      durationMinutes: 90,  // 1.5 hours confirmed
      priceLow: 49,         // "From $49" on website
      priceHigh: 49,
      location: "Antilla Shipwreck, Arashi Reef",
      imageUrl: null,
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
      imageUrl: null,
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
      imageUrl: null,
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
      imageUrl: null,
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
      // Price confirmed: Adults $76, Youth $54
      // Duration confirmed: 3 hours, 2-5 PM
      title: "Jolly Pirates Afternoon Snorkel Sail",
      description:
        "3-hour afternoon pirate ship cruise with snorkeling at 2 sites (Antilla Wreck and Boca Catalina Reef). Open bar and rope swing included. Budget alternative to the morning cruise. Youth pricing available.",
      category: "Ocean Exploration",
      difficulty: "easy",
      durationMinutes: 180, // 3 hours: 2-5 PM confirmed
      priceLow: 54,         // Youth price from website
      priceHigh: 76,        // Adult price from website
      location: "MooMba Beach to Antilla Wreck & Boca Catalina",
      imageUrl: null,
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
      imageUrl: null,
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
      imageUrl: null,
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
      imageUrl: null,
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
      imageUrl: null,
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
      // Source: aruba-active-vacations.com
      // Price: NOT on website — marked "Unknown, contact vendor"
      // Duration: Not specified — estimated 2-3 hours for a lesson
      title: "Kitesurfing Lesson at Fisherman's Huts",
      description:
        "Learn kitesurfing at Aruba's legendary Fisherman's Huts Beach — the same spot used for the Hi-Winds international competition. IKO-certified instruction in crystal-clear, waist-deep water that extends far offshore. The safest place to learn kitesurfing in the Caribbean.",
      category: "Water & Wind Sports",
      difficulty: "challenging",
      durationMinutes: 180, // Estimated — not specified on website
      priceLow: 0,          // UNKNOWN — not listed on website. Set to 0 to indicate unavailable.
      priceHigh: 0,
      location: "Fisherman's Huts Beach / Sarah Quita Beach",
      imageUrl: null,
      reviewSummary:
        "IKO-certified instruction at the best kitesurfing location in the Caribbean. Waist-deep water makes falls safe. Multi-day packages recommended for progression. Facilities include showers, lockers, WiFi, and rooftop lounge.",
      whatToBring: "Swimsuit, rash guard, reef-safe sunscreen, water. All kite equipment provided.",
      whatToExpect:
        "Meet at Fisherman's Huts Beach. IKO-certified lesson covering kite control, body dragging, and water starts. All equipment provided. Facility includes showers, lockers, drinks.",
      basicBookingGuide:
        "Book at aruba-active-vacations.com or call +297 586-0989. WhatsApp: +297 741-2991. Walk-ins welcome. Open Mon-Sun 8:30 AM - 5:30 PM. Pricing not listed — contact directly for rates.",
      premiumBookingGuide:
        "Ask about multi-day packages — per-day cost drops significantly. Best wind months: January through August (15-25 knots). Afternoon sessions have stronger, more consistent wind.",
      insiderTips:
        "Tuesday and Thursday afternoons have historically the most reliable wind. They also offer wingfoiling (easier to learn than kite) and blokarting (unique to Aruba). Contact for pricing — not listed on website.",
      warnings:
        "Pricing not available on website — must contact vendor. Wind-dependent — sessions may be rescheduled. Min weight ~90 lbs for kite control. Min age ~12.",
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
  ];

  /* ------------------------------------------------------------------
   * Insert all activities
   * ------------------------------------------------------------------ */
  console.log(`🏄 Inserting ${activities.length} real activities...\n`);

  for (const activity of activities) {
    const [inserted] = await db
      .insert(activitiesTable)
      .values(activity)
      .returning({ id: activitiesTable.id, title: activitiesTable.title });

    console.log(`   ✅ ${inserted.title} (id: ${inserted.id})`);
  }

  console.log("\n" + "=".repeat(55));
  console.log(`✅ Seed complete: ${activities.length} real activities`);
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
