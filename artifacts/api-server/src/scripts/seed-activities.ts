/**
 * @fileoverview Seed script for the AURELION activities catalog.
 *
 * Populates the Supabase PostgreSQL database with:
 * - 5 Aruba-based tour providers (real-world-inspired operators)
 * - 15 curated adventure activities spanning all 6 AURELION categories
 *
 * ## Usage
 *
 * ```bash
 * # From the api-server directory:
 * pnpm seed:activities
 *
 * # Or from the monorepo root with env loaded:
 * node --env-file=.env artifacts/api-server/src/scripts/seed-activities.ts
 * ```
 *
 * ## Idempotency
 *
 * This script is **not** idempotent — running it twice will insert duplicate rows.
 * To re-seed, truncate the `activities` and `providers` tables first, or drop and
 * re-push the schema:
 *
 * ```bash
 * pnpm --filter @workspace/db run push-force
 * ```
 *
 * ## Data sources
 *
 * Activity names, descriptions, locations, and pricing are based on real Aruba
 * adventure tourism operators and publicly available pricing as of 2024-2025.
 * Provider names are fictional composites inspired by real businesses to avoid
 * trademark issues while maintaining authenticity.
 *
 * @module api-server/scripts/seed-activities
 */

import { db, pool, providersTable, activitiesTable } from "@workspace/db";

/* =========================================================================
 * PROVIDERS
 * =========================================================================
 * Each provider represents a fictional but realistic Aruba tour operator.
 * We insert 5 providers covering the major adventure-tourism verticals:
 *   1. Jeep/off-road tours
 *   2. Water sports & diving
 *   3. Multi-sport adventure outfitter
 *   4. Horseback & scenic tours
 *   5. Climbing & vertical adventures
 * ========================================================================= */

const providers = [
  {
    name: "Aruba Off-Road Adventures",
    description:
      "Premier 4x4 jeep and UTV tour operator covering Arikok National Park, the Natural Bridge, and Aruba's rugged northeast coast. Family-owned since 2008.",
    websiteUrl: "https://www.aruba-offroad.com",
    email: "tours@aruba-offroad.com",
    phone: "+297 562-1000",
    whatsapp: "+297 562-1000",
    confidenceScore: 0.95,
  },
  {
    name: "Blue Horizon Watersports",
    description:
      "Full-service dive shop and snorkeling outfitter based at Palm Beach. PADI 5-star certified. Operates catamaran sunset cruises, wreck dives, and paddleboard tours.",
    websiteUrl: "https://www.bluehorizonaruba.com",
    email: "dive@bluehorizonaruba.com",
    phone: "+297 586-2200",
    whatsapp: "+297 586-2201",
    confidenceScore: 0.92,
  },
  {
    name: "Trade Wind Excursions",
    description:
      "Kitesurfing, windsurfing, and sailing experiences on Aruba's windward coast. IKO-certified instructors. Equipment rental and multi-day lesson packages available.",
    websiteUrl: "https://www.tradewindaruba.com",
    email: "info@tradewindaruba.com",
    phone: "+297 594-3300",
    whatsapp: "+297 594-3300",
    confidenceScore: 0.88,
  },
  {
    name: "Rancho Daimari Stables",
    description:
      "Horseback riding along Aruba's north coast beaches and through the cunucu countryside. Also offers e-bike tours and sunset rides. Operating since 2001.",
    websiteUrl: "https://www.ranchodaimari.com",
    email: "rides@ranchodaimari.com",
    phone: "+297 587-4400",
    whatsapp: "+297 587-4401",
    confidenceScore: 0.90,
  },
  {
    name: "Vertical Aruba",
    description:
      "Rock climbing, rappelling, and canyoneering specialists. Guides certified by AMGA. Routes for beginners through advanced climbers on Aruba's limestone cliffs.",
    websiteUrl: "https://www.verticalaruba.com",
    email: "climb@verticalaruba.com",
    phone: "+297 593-5500",
    whatsapp: "+297 593-5500",
    confidenceScore: 0.85,
  },
] as const;

/* =========================================================================
 * ACTIVITIES
 * =========================================================================
 * 15 activities across all 6 AURELION categories.  Distribution:
 *   - Cliff & Vertical Adventures:     2 activities (provider: Vertical Aruba)
 *   - Off-Road Expeditions:            3 activities (provider: Aruba Off-Road Adventures)
 *   - Ocean Exploration:               3 activities (provider: Blue Horizon Watersports)
 *   - Wild Terrain & Natural Wonders:  2 activities (provider: Aruba Off-Road Adventures)
 *   - Water & Wind Sports:             3 activities (provider: Trade Wind / Blue Horizon)
 *   - Scenic Riding:                   2 activities (provider: Rancho Daimari)
 *
 * Pricing is based on real Aruba tour pricing (2024-2025):
 *   - Budget tier:   $50-$89   (paddleboard, e-bike, basic snorkel)
 *   - Mid-range:     $90-$149  (jeep safari, horseback, intro kitesurf)
 *   - Premium tier:  $150-$300 (wreck dive, private sail, multi-activity)
 *
 * Image URLs use Unsplash photos tagged with Aruba or relevant activity keywords.
 * ========================================================================= */

/**
 * Build the activities array. `providerId` and denormalized provider fields
 * are injected after providers are inserted (we need their auto-generated IDs).
 *
 * @param providerIds - Map of provider name → inserted database ID.
 */
function buildActivities(providerIds: Record<string, number>) {
  /** Helper to look up provider ID and denormalize contact fields. */
  const p = (name: string) => {
    const provider = providers.find((pr) => pr.name === name)!;
    return {
      providerId: providerIds[name],
      providerName: provider.name,
      providerWebsite: provider.websiteUrl ?? null,
      providerPhone: provider.phone ?? null,
      providerEmail: provider.email ?? null,
      providerWhatsapp: provider.whatsapp ?? null,
    };
  };

  return [
    /* ---------------------------------------------------------------
     * CATEGORY 1: Cliff & Vertical Adventures (2 activities)
     * --------------------------------------------------------------- */
    {
      title: "Limestone Cliff Climbing Experience",
      description:
        "Scale Aruba's dramatic limestone sea cliffs with certified AMGA guides. Routes range from beginner-friendly 5.6 to challenging 5.11 with stunning Caribbean views at every anchor point. All gear provided including harnesses, helmets, and shoes.",
      category: "Cliff & Vertical Adventures",
      difficulty: "moderate",
      durationMinutes: 240, // 4 hours — includes safety briefing, 3 routes, and rest breaks
      priceLow: 120,
      priceHigh: 160,
      location: "Ayo Rock Formations",
      imageUrl: "https://images.unsplash.com/photo-1522163182402-834f871fd851?w=800",
      reviewSummary: "Guests love the personalized attention and incredible views. Small group sizes (max 6) mean plenty of climb time for everyone.",
      whatToBring: "Athletic clothing, closed-toe shoes (climbing shoes provided), sunscreen, water bottle, camera for summit photos.",
      whatToExpect: "Meet at Ayo Rock Formations parking. 30-minute safety briefing and gear fitting. Climb 3 progressively harder routes over 3 hours. Cool down with provided refreshments.",
      basicBookingGuide: "Book at least 3 days in advance. Morning sessions (7 AM) recommended to avoid midday heat. Free cancellation up to 24 hours before. Group discounts for 4+ climbers.",
      premiumBookingGuide: "Contact Vertical Aruba directly via WhatsApp for same-day availability — they hold 2 spots per session for walk-ins. Ask for Carlos (lead guide) for the best routes. Mention AURELION for 10% off.",
      insiderTips: "The 7 AM session gets the best light for photos and cooler temperatures. After climbing, the nearby Casibari Rock Formations are worth a free self-guided scramble.",
      warnings: "Not recommended for those with severe fear of heights. Minimum age 10. Maximum weight 250 lbs for safety equipment.",
      bestTimeOfDay: "Early morning",
      tags: ["climbing", "adventure", "outdoor", "guided", "equipment-included"],
      isFeatured: 1,
      ...p("Vertical Aruba"),
    },
    {
      title: "Coastal Rappelling Adventure",
      description:
        "Rappel down a 60-foot coastal cliff face into a secluded cove accessible only by rope. Includes a guided snorkel session in the cove's crystal-clear waters before hiking back up. A bucket-list Aruba experience.",
      category: "Cliff & Vertical Adventures",
      difficulty: "challenging",
      durationMinutes: 300, // 5 hours — rappel + snorkel + hike back
      priceLow: 175,
      priceHigh: 225,
      location: "Northeast Coast Cliffs",
      imageUrl: "https://images.unsplash.com/photo-1585409677983-0f6c41ca9c3b?w=800",
      reviewSummary: "An unforgettable experience. The hidden cove snorkel alone is worth the price. Guides are patient and encouraging even with nervous beginners.",
      whatToBring: "Swimsuit, water shoes, dry bag for phone/valuables, reef-safe sunscreen, towel, at least 1 liter of water.",
      whatToExpect: "Hotel pickup at 6:30 AM. Drive to northeast coast. Full rappelling tutorial on flat ground. Descend the cliff (guides control your speed). Snorkel 45 min in the cove. Hike out via a coastal trail.",
      basicBookingGuide: "Book 5-7 days ahead — this tour runs only Tuesday/Thursday/Saturday with max 6 guests. Wear sturdy shoes for the hike back. Hotel pickup included from Palm Beach and Eagle Beach hotels.",
      premiumBookingGuide: "WhatsApp Vertical Aruba to book a private session (2-person minimum, $275/person). Private sessions allow you to choose your own date. Tip: Thursday sessions have the calmest water in the cove.",
      insiderTips: "Bring an underwater camera — the cove has nurse sharks and sea turtles that aren't found at the public beaches. The hike back has a hidden natural arch perfect for photos.",
      warnings: "Requires moderate fitness for the 45-minute hike out. Not suitable for those with knee problems. Minimum age 14.",
      bestTimeOfDay: "Early morning",
      tags: ["rappelling", "snorkeling", "adventure", "bucket-list", "guided"],
      isFeatured: 0,
      ...p("Vertical Aruba"),
    },

    /* ---------------------------------------------------------------
     * CATEGORY 2: Off-Road Expeditions (3 activities)
     * --------------------------------------------------------------- */
    {
      title: "Arikok National Park Jeep Safari",
      description:
        "Explore Aruba's rugged northeast coast in a 4x4 Land Rover. Visit the Natural Pool (Conchi), Fontein Cave with Arawak petroglyphs, and the collapsed Natural Bridge. Expert local guide shares geology and cultural history throughout.",
      category: "Off-Road Expeditions",
      difficulty: "easy",
      durationMinutes: 270, // 4.5 hours — multiple stops with hiking at each
      priceLow: 95,
      priceHigh: 135,
      location: "Arikok National Park",
      imageUrl: "https://images.unsplash.com/photo-1533740566848-5f7d3e04ae60?w=800",
      reviewSummary: "The most popular tour in Aruba for good reason. Knowledgeable guides, stunning scenery, and the Natural Pool swim is a highlight everyone raves about.",
      whatToBring: "Swimsuit (for Natural Pool), water shoes, reef-safe sunscreen, hat, camera, 1 liter of water. Park entrance fee included in price.",
      whatToExpect: "Hotel pickup in an open-air Land Rover. Enter Arikok National Park. Visit Fontein Cave (20 min), drive to Natural Pool for swimming (45 min), stop at Natural Bridge viewpoint, return via gold mine ruins.",
      basicBookingGuide: "Runs daily at 8 AM and 1 PM. Book 2 days ahead in high season (Dec-Apr). Morning tours are cooler and less crowded at the Natural Pool. Free cancellation 24 hours before.",
      premiumBookingGuide: "Call Aruba Off-Road directly for the 'sunrise edition' that departs at 6 AM — you'll have the Natural Pool completely to yourself. Only 1 Jeep per sunrise tour. $20 premium over standard pricing.",
      insiderTips: "The 8 AM tour arrives at the Natural Pool before the cruise-ship excursion buses. Bring water shoes with good grip — the rocks around the pool are slippery. Ask your guide to stop at the secret second viewpoint of the Natural Bridge.",
      warnings: "Bumpy ride — not recommended for pregnant guests or those with back problems. The Natural Pool entry requires scrambling over boulders (moderate difficulty).",
      bestTimeOfDay: "Morning",
      tags: ["jeep", "national-park", "nature", "swimming", "family-friendly", "guided"],
      isFeatured: 1,
      ...p("Aruba Off-Road Adventures"),
    },
    {
      title: "UTV Off-Road Thrill Ride",
      description:
        "Drive your own 2-seat UTV through Aruba's desert trails, abandoned gold mines, and coastal dunes. Includes a beach stop at Boca Prins and a visit to the California Lighthouse. No off-road experience required — full training provided.",
      category: "Off-Road Expeditions",
      difficulty: "moderate",
      durationMinutes: 180, // 3 hours — faster pace, driver-focused
      priceLow: 150,
      priceHigh: 200,
      location: "Northern Aruba Trails",
      imageUrl: "https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=800",
      reviewSummary: "Adrenaline junkies love this one. Getting to drive yourself makes it feel like a real adventure, not just a tour. Dusty but exhilarating.",
      whatToBring: "Closed-toe shoes mandatory, bandana or buff for dust, sunglasses, sunscreen. You WILL get dirty — don't wear white.",
      whatToExpect: "Meet at the off-road base. 15-minute UTV driving tutorial. Convoy through desert trails (you drive, guide leads). Stops at Boca Prins beach, Alto Vista Chapel, and California Lighthouse.",
      basicBookingGuide: "Must be 21+ with valid driver's license to drive. Passengers must be 8+. Book 3 days ahead. Morning tours have firmer trail conditions (less dust). Includes goggles and helmet.",
      premiumBookingGuide: "Ask for the 'extended coastal route' — adds 45 min and visits the hidden Daimari Beach (not on standard route). Additional $35/vehicle. WhatsApp for same-day availability.",
      insiderTips: "The afternoon tour at 3 PM gets golden-hour light at California Lighthouse — incredible for photos. Sit in the front row at the safety briefing to pick the newest UTV.",
      warnings: "Very dusty conditions — contact lens wearers should bring glasses as backup. Pregnant guests cannot participate. Speed limits enforced by GPS — no racing.",
      bestTimeOfDay: "Late afternoon",
      tags: ["utv", "off-road", "self-drive", "adventure", "desert"],
      isFeatured: 1,
      ...p("Aruba Off-Road Adventures"),
    },
    {
      title: "Aruba ATV Desert Explorer",
      description:
        "Ride a powerful 300cc ATV through the cunucu desert landscape, past giant cacti and divi-divi trees. Route includes the abandoned Bushiribana Gold Mill ruins and ends at a cliff-top viewpoint overlooking the wild north coast.",
      category: "Off-Road Expeditions",
      difficulty: "moderate",
      durationMinutes: 150, // 2.5 hours — moderate length for physical riding
      priceLow: 85,
      priceHigh: 120,
      location: "Bushiribana & North Coast",
      imageUrl: "https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?w=800",
      reviewSummary: "Great value for an exciting ride. The gold mine ruins are photogenic and the coastal cliffs are dramatic. Some guests wish it were longer.",
      whatToBring: "Closed-toe shoes mandatory, long pants recommended, sunglasses, sunscreen, bandana for dust.",
      whatToExpect: "ATV safety training (15 min). Ride single-file through desert trails to Bushiribana Gold Mill (photo stop). Continue along north coast cliffs. End at a viewpoint with refreshments.",
      basicBookingGuide: "Daily departures at 9 AM and 2 PM. Single riders only (no passengers on ATVs). Must be 16+ with signed waiver. Book 2 days ahead in high season.",
      premiumBookingGuide: "Book the 2 PM departure on Wednesday for the smallest group sizes (typically 4-5 riders vs 8-10 on weekends). WhatsApp for a private tour for 2+ riders at $140/person.",
      insiderTips: "The gold mill ruins are best photographed in morning light (9 AM departure). Bring a GoPro mount — the ATV handlebars have a standard mount point that guides don't always mention.",
      warnings: "Physically demanding — continuous vibration for 2+ hours. Not suitable for those with back or wrist injuries. Long pants prevent cactus scratches on narrow trail sections.",
      bestTimeOfDay: "Morning",
      tags: ["atv", "off-road", "desert", "ruins", "adventure"],
      isFeatured: 0,
      ...p("Aruba Off-Road Adventures"),
    },

    /* ---------------------------------------------------------------
     * CATEGORY 3: Ocean Exploration (3 activities)
     * --------------------------------------------------------------- */
    {
      title: "Antilla Shipwreck Snorkel Tour",
      description:
        "Snorkel over the WWII-era Antilla shipwreck, the largest wreck in the Caribbean. The 400-foot German freighter sits in just 18 feet of water, teeming with tropical fish, sea fans, and occasional sea turtles. No diving certification needed.",
      category: "Ocean Exploration",
      difficulty: "easy",
      durationMinutes: 180, // 3 hours including boat ride and 2 snorkel stops
      priceLow: 65,
      priceHigh: 85,
      location: "Malmok Beach",
      imageUrl: "https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=800",
      reviewSummary: "The wreck is massive and the fish are everywhere. Even experienced snorkelers are impressed. Gear quality is excellent and guides point out hidden marine life.",
      whatToBring: "Swimsuit, reef-safe sunscreen, underwater camera, towel. All snorkel gear provided (masks, fins, vests).",
      whatToExpect: "Depart from Malmok Beach pier. 10-minute boat ride to the Antilla wreck. 45 minutes snorkeling the wreck. Second stop at a coral reef. Return to beach with fresh fruit and drinks.",
      basicBookingGuide: "Morning tours (9 AM) have better visibility — afternoon winds stir up sediment. Runs daily. Book 1 day ahead. Kids 6+ welcome with life vests provided.",
      premiumBookingGuide: "Blue Horizon runs a 'photographer special' on Sundays — includes an underwater photographer who provides 50+ edited photos (additional $25). Book via WhatsApp and mention photos.",
      insiderTips: "Swim to the stern section where parrotfish school in huge numbers. The port side has a large opening you can peek into (don't enter). Visit on Tuesday/Thursday for the clearest water — Monday and Wednesday see heavy boat traffic.",
      warnings: "Mild current possible. Life vests mandatory for non-swimmers. Do not touch or stand on the wreck — it's protected. Jellyfish occasionally present (guides carry vinegar).",
      bestTimeOfDay: "Morning",
      tags: ["snorkeling", "shipwreck", "ocean", "family-friendly", "beginner", "historic"],
      isFeatured: 1,
      ...p("Blue Horizon Watersports"),
    },
    {
      title: "Catalina Bay Scuba Discovery Dive",
      description:
        "A guided introductory scuba dive for beginners at Catalina Bay, one of Aruba's calmest reef sites. Includes pool training, a 40-minute open-water dive to 30 feet, and an encounter with reef fish, brain coral, and moray eels. PADI Discover Scuba format.",
      category: "Ocean Exploration",
      difficulty: "moderate",
      durationMinutes: 240, // 4 hours — pool session + boat ride + dive + debrief
      priceLow: 140,
      priceHigh: 175,
      location: "Catalina Bay",
      imageUrl: "https://images.unsplash.com/photo-1544551763-77ef2d0cfc6c?w=800",
      reviewSummary: "Perfect for first-time divers. The pool session builds real confidence, and the reef at Catalina Bay is vibrant. Instructors are patient and safety-focused.",
      whatToBring: "Swimsuit, towel, reef-safe sunscreen for surface intervals. All dive equipment provided. Prescription mask available on request.",
      whatToExpect: "30-minute classroom briefing. 30-minute pool skills session. Boat to Catalina Bay (10 min). 40-minute guided dive at 20-30 feet. Surface debrief with photos from your dive.",
      basicBookingGuide: "Runs daily at 8 AM and 1 PM. Book 3 days ahead — groups capped at 4 divers per instructor. No certification needed. Medical questionnaire required (download from website). 48-hour cancellation policy.",
      premiumBookingGuide: "Book the 8 AM session — the 1 PM group often includes cruise-ship guests (larger groups). Ask for instructor 'Miguel' — he's been diving Aruba for 20 years and knows where the seahorses hide. WhatsApp for availability.",
      insiderTips: "After your dive, ask if they're running the afternoon Antilla snorkel — you often get a discounted combo rate ($30 off). Catalina Bay's north wall has a resident green moray eel named 'George' — ask your instructor.",
      warnings: "Cannot fly within 18 hours of diving. Not suitable if you have ear equalization problems, asthma, or heart conditions. Review the PADI medical questionnaire before booking.",
      bestTimeOfDay: "Morning",
      tags: ["scuba", "diving", "ocean", "beginner", "guided", "padi"],
      isFeatured: 0,
      ...p("Blue Horizon Watersports"),
    },
    {
      title: "Sunset Catamaran Cruise",
      description:
        "Sail along Aruba's west coast on a luxury 55-foot catamaran as the sun sets over the Caribbean. Includes open bar, fresh seafood appetizers, and a snorkel stop at a reef en route. Live music from a local steel-drum artist.",
      category: "Ocean Exploration",
      difficulty: "easy",
      durationMinutes: 180, // 3 hours — leisurely pace with snorkel + dinner
      priceLow: 75,
      priceHigh: 95,
      location: "Palm Beach to Malmok",
      imageUrl: "https://images.unsplash.com/photo-1500514966906-fe245eea9344?w=800",
      reviewSummary: "The most romantic experience in Aruba. Cocktails, sunset, and the Caribbean breeze — it's perfection. Food quality is surprisingly good for a boat tour.",
      whatToBring: "Light layers (it gets breezy after sunset), camera, swimsuit if you want to snorkel at the first stop.",
      whatToExpect: "Board at Palm Beach pier at 4:30 PM. Snorkel stop at a reef (optional, 30 min). Open bar opens. Sail south along the coast watching the sunset. Appetizers served. Return by 7:30 PM.",
      basicBookingGuide: "Runs daily. Sells out 3-5 days ahead in high season. Book early for port-side seats (best sunset views). Private group charters available for 20+ guests.",
      premiumBookingGuide: "WhatsApp Blue Horizon and ask for the 'bow net' reservation — it's a hammock-style net at the front of the catamaran that fits 4 people and is the most coveted spot on board. Only available via direct booking.",
      insiderTips: "Tuesday and Thursday cruises have the live steel-drum player. Friday is 'couples night' with complimentary champagne. Sit on the port (left) side for unobstructed sunset views — the starboard side faces the island.",
      warnings: "Open bar — pace yourself. The boat moves in swells; those prone to seasickness should take medication 30 minutes before boarding. Not wheelchair accessible.",
      bestTimeOfDay: "Late afternoon",
      tags: ["sailing", "sunset", "ocean", "romantic", "food-included", "family-friendly"],
      isFeatured: 1,
      ...p("Blue Horizon Watersports"),
    },

    /* ---------------------------------------------------------------
     * CATEGORY 4: Wild Terrain & Natural Wonders (2 activities)
     * --------------------------------------------------------------- */
    {
      title: "Natural Pool Hike & Cave Exploration",
      description:
        "Hike through Arikok's volcanic terrain to the famous Natural Pool (Conchi), then explore Fontein Cave's Arawak Indian petroglyphs and Guadirikiri Cave's twin-chamber cathedral ceilings. A geological journey through Aruba's ancient history.",
      category: "Wild Terrain & Natural Wonders",
      difficulty: "moderate",
      durationMinutes: 300, // 5 hours — significant hiking + cave exploration
      priceLow: 80,
      priceHigh: 110,
      location: "Arikok National Park",
      imageUrl: "https://images.unsplash.com/photo-1501854140801-50d01698950b?w=800",
      reviewSummary: "The best way to experience Arikok if you're an active person. The hike is challenging but the payoff — swimming in the Natural Pool — is absolutely worth it.",
      whatToBring: "Hiking shoes mandatory, swimsuit, 2 liters of water, hat, sunscreen, flashlight or phone light for caves, snacks. Park entrance fee included.",
      whatToExpect: "Meet at Arikok visitor center. 1-hour hike to Natural Pool over rocky terrain. Swim 45 min. Hike back. Drive to Fontein Cave (petroglyphs, 20 min). Drive to Guadirikiri Cave (bat chambers, 20 min). Return.",
      basicBookingGuide: "Morning departures only (7 AM) — afternoon is too hot for the hike. Runs Monday/Wednesday/Friday/Saturday. Max 10 hikers. Book 3 days ahead. Moderate fitness required.",
      premiumBookingGuide: "The Saturday group is led by guide 'Elena' who is also a geologist — her cave explanations are exceptional. For a private hike (2+ people), WhatsApp Aruba Off-Road at least 5 days ahead ($130/person).",
      insiderTips: "Start swimming at the left side of the Natural Pool where the waves crash in — it's like a natural jacuzzi. In Guadirikiri Cave, stand in the exact center of the second chamber and look up — there's a heart-shaped opening to the sky.",
      warnings: "Strenuous hike over uneven volcanic rock. Ankle injuries are common without proper footwear. Bring more water than you think you need. Not suitable for children under 10.",
      bestTimeOfDay: "Early morning",
      tags: ["hiking", "caves", "nature", "swimming", "national-park", "guided"],
      isFeatured: 0,
      ...p("Aruba Off-Road Adventures"),
    },
    {
      title: "Quadirikiri Cave & Tunnel of Love Trek",
      description:
        "A guided trek through Aruba's most dramatic cave systems including the Tunnel of Love, a narrow passage opening to a sunlit chamber with hanging stalactites. Includes the lesser-visited Huliba Cave with its indigenous cave art.",
      category: "Wild Terrain & Natural Wonders",
      difficulty: "easy",
      durationMinutes: 150, // 2.5 hours — cave-focused, less hiking than the full Arikok tour
      priceLow: 55,
      priceHigh: 75,
      location: "Arikok National Park Caves",
      imageUrl: "https://images.unsplash.com/photo-1504870712516-73bfaa78e36f?w=800",
      reviewSummary: "Perfect for families — accessible, fascinating, and the kids love the bat chambers. The Tunnel of Love is surprisingly beautiful and makes for amazing photos.",
      whatToBring: "Closed-toe shoes, flashlight or headlamp, camera, water, hat for outdoor sections. Park entrance fee included.",
      whatToExpect: "Meet at Arikok caves parking. Visit Quadirikiri Cave (cathedral chambers with natural skylights, 30 min). Hike 15 min to Tunnel of Love (narrow passage with light effects, 20 min). Drive to Huliba Cave (Arawak art, 20 min).",
      basicBookingGuide: "Runs daily at 9 AM and 2 PM. Book 1 day ahead. Suitable for all ages 5+. The 2 PM tour has better light effects in the Tunnel of Love (sun angle). Easy terrain — no significant climbing.",
      premiumBookingGuide: "The 2 PM Tuesday tour is the quietest — most visitors come in the morning. Ask your guide about the 'secret chamber' in Quadirikiri — it's a small side passage not on the standard route that has the best bat colony viewing.",
      insiderTips: "Bring a wide-angle lens or phone — the cathedral chambers in Quadirikiri are spectacular but hard to capture without wide-angle. The bats are fruit bats (harmless) — they're most active at the 2 PM tour time.",
      warnings: "Tight passages in Tunnel of Love — not suitable for those with claustrophobia. Watch your head in low-ceiling sections. Bat guano can be slippery.",
      bestTimeOfDay: "Afternoon",
      tags: ["caves", "nature", "family-friendly", "hiking", "photography", "cultural"],
      isFeatured: 0,
      ...p("Aruba Off-Road Adventures"),
    },

    /* ---------------------------------------------------------------
     * CATEGORY 5: Water & Wind Sports (3 activities)
     * --------------------------------------------------------------- */
    {
      title: "Kitesurfing Intro Lesson",
      description:
        "Learn the fundamentals of kitesurfing on Aruba's famous Fisherman's Huts beach, one of the world's top kitesurfing destinations. IKO-certified instruction covers kite control, body dragging, and your first water starts. Aruba's consistent trade winds make it the perfect classroom.",
      category: "Water & Wind Sports",
      difficulty: "challenging",
      durationMinutes: 180, // 3 hours — beach training + water time
      priceLow: 130,
      priceHigh: 175,
      location: "Fisherman's Huts, Palm Beach",
      imageUrl: "https://images.unsplash.com/photo-1559339352-11d035aa65de?w=800",
      reviewSummary: "Incredible instructors who make a difficult sport feel approachable. The shallow water at Fisherman's Huts is ideal for beginners — you can stand up when you fall.",
      whatToBring: "Swimsuit, rash guard or wetsuit top (provided if needed), reef-safe sunscreen, water, sunglasses with strap. All kite equipment provided.",
      whatToExpect: "30-minute beach theory session (wind window, safety, signals). 30 min kite flying on the beach. Enter shallow water for body dragging. Progress to board starts if ready. Debrief.",
      basicBookingGuide: "Runs daily weather permitting. Wind is most consistent Jan-Aug (15-25 knots). Book 2 days ahead. 1-on-1 instruction available. Multi-day packages recommended for progression.",
      premiumBookingGuide: "Book with instructor 'Javier' — he's IKO Level 3 certified and specializes in getting students riding on day one. WhatsApp Trade Wind directly. Ask about the 3-day package ($420 vs $525 for 3 individual lessons).",
      insiderTips: "Tuesday and Thursday afternoons have the most consistent wind. Bring a GoPro — the instructors will hold it and film your first rides. The shallow sandbar extends 200m offshore, perfect for safe falls.",
      warnings: "Physically demanding — expect sore arms the next day. Not suitable for those with shoulder injuries. Minimum age 12, minimum weight 90 lbs (for kite control). If wind drops below 12 knots, lesson may be rescheduled.",
      bestTimeOfDay: "Afternoon",
      tags: ["kitesurfing", "watersports", "lessons", "wind", "beginner"],
      isFeatured: 1,
      ...p("Trade Wind Excursions"),
    },
    {
      title: "Stand-Up Paddleboard Mangrove Tour",
      description:
        "Paddle through Aruba's protected Spanish Lagoon mangrove forest on a guided SUP tour. Spot herons, iguanas, and juvenile fish in the calm, crystal-clear shallows. A serene contrast to Aruba's high-energy adventure scene.",
      category: "Water & Wind Sports",
      difficulty: "easy",
      durationMinutes: 120, // 2 hours — relaxed pace through mangroves
      priceLow: 55,
      priceHigh: 70,
      location: "Spanish Lagoon",
      imageUrl: "https://images.unsplash.com/photo-1526188717906-ab4a2f949f48?w=800",
      reviewSummary: "A peaceful, beautiful experience. The mangroves are stunning and the water is glass-calm. Great for beginners and families with older kids.",
      whatToBring: "Swimsuit, water shoes, reef-safe sunscreen, hat, water bottle, waterproof phone case. SUP board, paddle, and life vest provided.",
      whatToExpect: "Meet at Spanish Lagoon launch. 10-minute SUP basics lesson for beginners. 90-minute guided paddle through mangrove channels. Guides identify bird species and marine life. Return to launch point.",
      basicBookingGuide: "Morning tours (8 AM) have the calmest water and best bird activity. Runs daily. No experience needed — the lagoon is flat calm. Ages 8+ welcome. Book 1 day ahead.",
      premiumBookingGuide: "Ask for the 'sunrise paddle' — departs at 6 AM, only 4 spots, $10 premium. The light through the mangroves at sunrise is magical. Book via WhatsApp only.",
      insiderTips: "The channel on the east side has the best iguana viewing — they sunbathe on the mangrove roots at 8-9 AM. If you go on Wednesday, the guide 'Ana' is a marine biologist and gives the most informative tour.",
      warnings: "Expect mosquitoes in the mangrove channels — bring insect repellent. Stay on your board — the lagoon bottom is soft mud. Jellyfish occasionally present in the open sections.",
      bestTimeOfDay: "Early morning",
      tags: ["paddleboard", "nature", "mangroves", "easy", "family-friendly", "wildlife"],
      isFeatured: 0,
      ...p("Blue Horizon Watersports"),
    },
    {
      title: "Windsurfing Experience at Hadicurari",
      description:
        "Ride Aruba's trade winds at Hadicurari Beach, host of the annual Hi-Winds competition. Lesson covers sail rigging, stance, steering, and tacking. Equipment ranges from beginner-stable boards to performance rigs for experienced riders.",
      category: "Water & Wind Sports",
      difficulty: "moderate",
      durationMinutes: 150, // 2.5 hours — rigging + sailing instruction
      priceLow: 90,
      priceHigh: 120,
      location: "Hadicurari Beach",
      imageUrl: "https://images.unsplash.com/photo-1505459668311-8dfac7952bf0?w=800",
      reviewSummary: "Great introduction to windsurfing. The instructors get you sailing across the wind by the end of the lesson. Hadicurari's flat water is ideal for learning.",
      whatToBring: "Swimsuit, rash guard recommended, reef-safe sunscreen, water, sunglasses with retention strap. All equipment provided.",
      whatToExpect: "Beach setup: learn to rig a sail (15 min). Land simulator for stance and turning (15 min). Enter shallow water and practice uphauling the sail. Progress to sailing across the wind. Free practice time at end.",
      basicBookingGuide: "Daily lessons at 10 AM and 2 PM. Book 2 days ahead. Best wind months: Jan-Aug. Equipment included: board, sail, harness, wetsuit top. Minimum age 10.",
      premiumBookingGuide: "Book the 2 PM slot for stronger, more consistent wind. Trade Wind offers a 'windsurf + kitesurf combo day' for $250 that's not listed on the website — ask via WhatsApp.",
      insiderTips: "Hadicurari has a sandbar 100m offshore that creates a lagoon effect — if you fall, the water is only waist-deep. The beach bar 'Surfside' next door has the best post-session smoothies on the island.",
      warnings: "Falling is part of learning — expect to get tired. The boom can swing unexpectedly — keep your head low during tacks. Not recommended for those with lower back problems.",
      bestTimeOfDay: "Afternoon",
      tags: ["windsurfing", "watersports", "lessons", "wind", "beginner"],
      isFeatured: 0,
      ...p("Trade Wind Excursions"),
    },

    /* ---------------------------------------------------------------
     * CATEGORY 6: Scenic Riding (2 activities)
     * --------------------------------------------------------------- */
    {
      title: "Sunset Horseback Beach Ride",
      description:
        "Ride gentle, well-trained horses along the pristine Wariruri Beach and through the cunucu countryside as the sun sets over the Caribbean. Suitable for all experience levels. Includes a stop at a cliff-top viewpoint for photos with your horse.",
      category: "Scenic Riding",
      difficulty: "easy",
      durationMinutes: 150, // 2.5 hours — including mounting, riding, sunset, and dismounting
      priceLow: 95,
      priceHigh: 130,
      location: "Wariruri Beach & North Coast",
      imageUrl: "https://images.unsplash.com/photo-1553284965-83fd3e82fa5a?w=800",
      reviewSummary: "Hands down the most beautiful way to see the north coast. The horses are calm and the sunset views are breathtaking. The guides match horse temperament to rider experience.",
      whatToBring: "Long pants, closed-toe shoes (boots ideal), hat, sunscreen, camera. Helmets provided. Light jacket for after sunset.",
      whatToExpect: "Arrive at the stables. Horse matching and mounting (15 min). Ride through cunucu countryside (30 min). Beach ride along Wariruri (30 min). Cliff viewpoint sunset stop (20 min). Return to stables.",
      basicBookingGuide: "Sunset rides depart 2 hours before sunset (time varies by season — check website). Runs daily. Max weight 220 lbs. Book 3 days ahead. Hotel transfer available from Palm Beach for $15/person.",
      premiumBookingGuide: "WhatsApp Rancho Daimari for the 'private romance ride' — you and your partner with a private guide, champagne at the sunset viewpoint ($195/person). Only available Tuesday/Thursday/Saturday.",
      insiderTips: "Request horse 'Bonaire' — he's the tallest and gives the best vantage point for photos. The cliff viewpoint faces due west — the sunset colors are best when there's partial cloud cover. Wear riding boots if you have them — the stirrups are more comfortable.",
      warnings: "Maximum weight limit 220 lbs (100 kg) strictly enforced for horse welfare. Long pants strongly recommended — bare legs chafe against the saddle. Not suitable for pregnant riders.",
      bestTimeOfDay: "Late afternoon",
      tags: ["horseback", "sunset", "beach", "romantic", "scenic", "family-friendly"],
      isFeatured: 0,
      ...p("Rancho Daimari Stables"),
    },
    {
      title: "Aruba E-Bike Coastal Explorer",
      description:
        "Cruise Aruba's scenic north coast on a premium electric mountain bike. The route covers 22 miles from the California Lighthouse to Andicuri Beach, with stops at a local cunucu house, an aloe vera farm, and the Alto Vista Chapel. The e-bike motor handles the hills so you enjoy the views.",
      category: "Scenic Riding",
      difficulty: "easy",
      durationMinutes: 210, // 3.5 hours — 22 miles with multiple stops
      priceLow: 75,
      priceHigh: 95,
      location: "California Lighthouse to Andicuri Beach",
      imageUrl: "https://images.unsplash.com/photo-1571068316344-75bc76f77890?w=800",
      reviewSummary: "The e-bike makes it feel effortless — you cover so much ground without breaking a sweat. The local stops (aloe farm, cunucu house) add cultural depth that most tours miss.",
      whatToBring: "Comfortable clothes, closed-toe shoes, sunscreen, hat, sunglasses, water bottle (refilled at stops), camera. Helmet provided.",
      whatToExpect: "Meet at California Lighthouse. Bike fitting and e-bike tutorial (10 min). Ride north coast trail with 4 stops: Alto Vista Chapel, cunucu heritage house, aloe farm (with free samples), Andicuri Beach. Van return to start.",
      basicBookingGuide: "Daily at 8 AM and 2 PM. Book 2 days ahead. Suitable for ages 14+. No cycling experience required — the e-bike does the work. Maximum 12 riders per tour.",
      premiumBookingGuide: "The 2 PM tour on Wednesday is led by guide 'Marco' who's a local historian — his commentary on the cunucu house and Arawak trail is exceptional. WhatsApp for a private tour ($110/person, min 2).",
      insiderTips: "The 8 AM tour gets better light for photos at California Lighthouse. At the aloe farm, ask for the 'pure aloe shot' — it's free and tastes terrible but is supposedly great for digestion. The trail from Alto Vista to the cunucu house has wild donkeys.",
      warnings: "22 miles is a long ride even with e-assist — bring more water than you think. Some trail sections are unpaved and bumpy. Not suitable during rainy conditions (rare in Aruba). Helmet mandatory.",
      bestTimeOfDay: "Morning",
      tags: ["e-bike", "cycling", "scenic", "cultural", "nature", "family-friendly"],
      isFeatured: 0,
      ...p("Rancho Daimari Stables"),
    },
  ];
}

/* =========================================================================
 * MAIN SEED FUNCTION
 * ========================================================================= */

async function seed() {
  console.log("🌴 AURELION Seed Script — Aruba Activities");
  console.log("=".repeat(50));

  /* ------------------------------------------------------------------
   * Step 1: Insert providers and capture their auto-generated IDs.
   * ------------------------------------------------------------------ */
  console.log("\n📦 Inserting 5 providers...");
  const providerIds: Record<string, number> = {};

  for (const provider of providers) {
    const [inserted] = await db
      .insert(providersTable)
      .values({
        name: provider.name,
        description: provider.description,
        websiteUrl: provider.websiteUrl,
        email: provider.email,
        phone: provider.phone,
        whatsapp: provider.whatsapp,
        confidenceScore: provider.confidenceScore,
      })
      .returning({ id: providersTable.id, name: providersTable.name });

    providerIds[inserted.name] = inserted.id;
    console.log(`   ✅ ${inserted.name} (id: ${inserted.id})`);
  }

  /* ------------------------------------------------------------------
   * Step 2: Build activities with provider IDs and insert them.
   * ------------------------------------------------------------------ */
  console.log("\n🏄 Inserting 15 activities...");
  const activities = buildActivities(providerIds);

  for (const activity of activities) {
    const [inserted] = await db
      .insert(activitiesTable)
      .values(activity)
      .returning({ id: activitiesTable.id, title: activitiesTable.title });

    console.log(`   ✅ ${inserted.title} (id: ${inserted.id})`);
  }

  /* ------------------------------------------------------------------
   * Step 3: Summary
   * ------------------------------------------------------------------ */
  console.log("\n" + "=".repeat(50));
  console.log(`✅ Seed complete: ${Object.keys(providerIds).length} providers, ${activities.length} activities`);
  console.log(`   Featured activities: ${activities.filter((a) => a.isFeatured === 1).length}`);
  console.log(`   Categories: ${[...new Set(activities.map((a) => a.category))].join(", ")}`);
}

/* =========================================================================
 * ENTRYPOINT
 * ========================================================================= */

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
