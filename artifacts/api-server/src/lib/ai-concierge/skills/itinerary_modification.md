# Skill: Itinerary Modification

**Trigger:** "add this to...", "remove from...", "move to different day"

## Steps

### 1. Identify Itinerary
0 itineraries → offer to create. 1 → use it. 2+ → ask which.

### 2. Parse Intent
Add, remove, or move. Extract: activity, day, time slot.

### 3. Execute Change
Use add_to_itinerary or remove_from_itinerary tools.

### 4. Handle Conflicts
Slot occupied → suggest alternative. Invalid day → ask for valid one.

### 5. Confirm Change
"Added [Activity] to Day [N] [TimeSlot]! ✓"
