# AURELION Data Gaps — April 2026 QA

This document records missing data, stale prices, and incomplete vendor intelligence found during the April 2026 catalog QA and expansion. Categorized by priority.

---

## High — Blocks or Degrades Launch Quality

### 1. Huliba Cave ("Tunnel of Love") — Access Status Unconfirmed
- **Activity:** Huliba Cave — Tunnel of Love (seeded)
- **Issue:** The cave was temporarily closed. Reopening date as of April 2026 is unconfirmed. The activity has been seeded with a warning, but it should NOT be featured or prominently recommended until ACF confirms it is open.
- **Action required:** Email reservations@acf.aw or call ACF to confirm current access status. Update `warnings` field and `isFeatured` flag once confirmed.

### 2. Jolly Pirates Afternoon Snorkel — Youth Pricing Status
- **Activity:** Jolly Pirates Afternoon Snorkel Sail
- **Issue:** Youth pricing ($54 for under-10) was previously listed on jolly-pirates.com but is no longer visible as of April 2026 QA. It may have been removed, consolidated into the adult rate, or simply not shown on the current site design.
- **Action required:** Confirm with Jolly Pirates (+297 586-8107 or WhatsApp +297 592-6777) whether youth pricing still exists. If yes, update `priceLow` back to 54 and restore the youth pricing note in `basicBookingGuide`.

### 3. Arikok National Park Guided Hike Booking Availability
- **Activity:** Arikok Ranger-Guided Nature Hike
- **Issue:** Guided hikes require email booking via reservations@acf.aw, but the ACF website does not show a live availability calendar. It is unclear how far in advance hikes are available and what the actual booking response time is.
- **Action required:** Test the booking flow by emailing reservations@acf.aw and confirm response time before this activity goes live. Update `whenToBook` guidance based on real experience.

---

## Medium — Known Gaps That Should Be Filled Pre-Launch

### 4. Around Aruba Tours — Explicit Pricing Not Available
- **Affected activities:** Around Aruba ATV/UTV Guided Tour
- **Issue:** Around Aruba Tours does not list tour pricing on their main website. All pricing is through the Trytn booking system. Without a confirmed price range, the activity shows `priceLow: 0` which displays as "Contact for pricing" in the UI.
- **Action required:** Call +297 593-5363 or visit the Trytn booking widget to capture current pricing. Update `priceLow` and `priceHigh` to reflect actual ranges.

### 5. Fofoti Tours — Explicit Pricing Not Available
- **Affected activities:** Fofoti Island Jeep & UTV Adventure
- **Issue:** Same as Around Aruba — pricing not prominently displayed on the main website. FareHarbor booking page should have current rates.
- **Action required:** Check FareHarbor widget at fofoti.com or contact via WhatsApp +297 594-6112 to confirm pricing. Update seed entries.

### 6. Octopus Aruba — No Public Pricing
- **Affected activities:** Octopus Aruba Sunset Cruise, Octopus VIP Morning Snorkel Adventure
- **Issue:** Octopus Aruba does not list prices on their website — all pricing is through the Bokun booking widget. Both activities currently show `priceLow: 0`.
- **Action required:** Navigate the Bokun booking widget at octopusaruba.com or contact via WhatsApp +297 560-6565 to get current pricing. Based on market positioning (550+ reviews, premium feel), estimate $75–$120 for sunset cruise and $90–$130 for VIP morning.

### 7. Aruba Active Vacations — Windsurfing and Wingfoiling Pricing
- **Issue:** Pricing for windsurfing and wingfoiling lessons is not captured. Kitesurfing pricing is now confirmed ($130 group / $190 private, 2 hrs), but the other wind sports are not yet seeded as activities.
- **Action required:** Add windsurfing and wingfoiling lesson activities if pricing is available. Check aruba-active-vacations.com/practice/ for current lesson offerings.

### 8. Aruba Active Vacations — Blokarting Activity Missing
- **Issue:** AAV offers blokarting (land sailing) — described as unique to Aruba. No pricing or activity entry exists in the catalog.
- **Action required:** Obtain blokarting pricing and add as a distinct activity in the "Water & Wind Sports" or new "Land Sports" category.

### 9. Pelican Adventures — Exclusive Dinner Cruise Not Seeded
- **Issue:** Pelican offers an Exclusive Dinner Cruise ($178, 3 hours, 4-course with live music) that is not yet seeded. The Luxury Lagoon Cruise ($155) has been added in AUR-5.
- **Action required:** Add the Exclusive Dinner Cruise ($178). Price confirmed from intelligence report.

### 10. De Palm Tours — Full Activity Catalog Incomplete
- **Issue:** De Palm offers SNUBA (hybrid snorkel/scuba, $55 add-on), island jeep/UTV tours, and potentially other activities not currently seeded. Only their catamaran, glass-bottom boat, and sunset sail are in the catalog.
- **Action required:** Review depalm.com for additional seeded activity candidates. SNUBA is a significant differentiator and should appear as a note on the catamaran entry or as a standalone add-on activity.

---

## Low — Nice to Have, Non-Blocking

### 11. Rockabeach Tours — UTV & ATV Natural Pool Adventure Missing
- **Issue:** Rockabeach offers a "UTV & ATV Natural Pool Adventure" at approximately $160 for 4 hours. Only their Safari Jeep Adventures ($97) is currently seeded.
- **Action required:** Add the Rockabeach UTV/ATV Natural Pool activity when catalog expansion continues beyond 43 activities.

### 12. Rockabeach Tours — Half Island Bus Tour Missing
- **Issue:** Rockabeach offers a Half Island Bus Tour at $65, 5-7 hours. Good budget sightseeing option not in catalog.
- **Action required:** Add when capacity allows.

### 13. Delphi Watersports — Private Boat Ride Pricing Needs Verification
- **Issue:** Delphi's Private Boat Ride (from $195 for 7 hours) sounds exceptional but what is included (number of guests, snorkel gear, drinks) is unclear from the website.
- **Action required:** Clarify via FareHarbor before adding this activity — a vague listing could mislead guests.

### 14. Delphi Watersports — Deep Sea Fishing Charter
- **Issue:** Deep Sea Fishing Charter (from $450, 4 hours) is not seeded. Fishing is a distinct category that may attract a different guest segment.
- **Action required:** Add when a fishing-category is created. Research additional fishing charter operators for comparison.

### 15. Around Aruba Tours — Boat & Catamaran Tours Not Specifically Listed
- **Issue:** The vendor intelligence report mentions Around Aruba Tours offers catamaran and private boat tours, but no specific activity has been seeded for their water offerings (only their ATV/UTV land tour).
- **Action required:** Identify specific boat/catamaran tour offerings via their Trytn booking system and add once pricing is confirmed.

### 16. Natural Pool Access — Operator Comparison Table
- **Issue:** The Natural Pool is now accessible via 5+ different operators in the catalog (ABC Tours $130, Pelican $99, Delphi $89, self-guided Arikok hike $22, and ABC's UTV tour $310). Guests may be confused about which option to choose.
- **Action required:** Add a comparison guide to the UI or as part of the activity descriptions to help guests navigate the Natural Pool options.

---

## Data Quality Notes

| Vendor | Confidence Score | Key Uncertainty |
|--------|-----------------|-----------------|
| Aruba Conservation Foundation | 0.90 | Huliba Cave access; guided hike booking lead time |
| Around Aruba Tours | 0.82 | No public pricing — all via Trytn widget |
| Fofoti Tours | 0.78 | Limited online presence; no public pricing |
| Octopus Aruba | 0.83 | No public pricing — all via Bokun widget |
| Aruba Active Vacations | 0.87 | Kitesurfing pricing now confirmed; windsurfing/wingfoiling still unknown |
| All other vendors | 0.90–0.98 | All prices confirmed against live websites |

---

## Catalog Count as of April 2026 QA

| Metric | Count |
|--------|-------|
| Total activities in seed script | 43 |
| Wild Terrain & Natural Wonders activities | 8 |
| Activities with confirmed pricing | 39 |
| Activities with "contact for pricing" | 4 |
| Vendors in catalog | 12 |

---

*Last updated: April 2026 by Vendor Relations Agent (AUR-5)*
