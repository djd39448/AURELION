# Skill: Activity Recommendation

**Trigger:** "what should I do", "best tours", "recommendations"

## Steps

### 1. Understand Context
Check user memories for preferences and concerns.
Infer from question: category, budget, group type.

### 2. Search Activities
Use search_activities with inferred filters.

### 3. Get Details for Top Matches
For 2-3 best: get_activity_details + get_vendor_details.

### 4. Present Recommendations
Format per activity:
🌊 **[Activity Name]**
**[Provider]** • $[Price]/person • [Duration]
[What makes it special]
**Insider tip:** [One actionable tip]
**Book:** [Method from vendor details]

### 5. Offer Next Steps
"Add to itinerary?" / "More details?" / "Something different?"
