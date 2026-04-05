# Skill: Itinerary Creation

**Trigger:** "create trip", "plan itinerary", "I'm visiting Aruba..."

## Steps

### 1. Gather Trip Details
Ask if not provided: trip dates, number of travelers, trip purpose.
Don't overwhelm — ask 1-2 questions max, infer the rest.

### 2. Check User Preferences
Use search_user_memory("travel preferences interests") to personalize.

### 3. Create Itinerary
Use create_itinerary tool with title, total_days.

### 4. Suggest Activities
Search relevant activities, suggest 2-3 per day max.
Balance activity types. Consider timing (spread active days with rest).

### 5. Offer to Add
"Would you like me to add any of these to your itinerary?"
