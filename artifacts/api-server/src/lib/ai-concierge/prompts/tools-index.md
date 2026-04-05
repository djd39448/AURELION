# Available Tools

## Always Available (Meta-Tools)
- **search_activities(filters)** — Search activity catalog by category, price, difficulty, keywords
- **get_activity_details(id)** — Full activity info with description, provider, booking guide
- **get_vendor_details(name)** — Complete vendor intelligence (booking methods, tips, warnings)
- **search_user_memory(query)** — Find relevant memories from past interactions
- **save_user_memory(data)** — Store new memory about user (type + content)

## On-Demand Tool Categories
Load full schemas when needed with get_tool_definition(category).

### itinerary_tools
Create, view, update, delete itineraries. Add/remove activities from days/time slots.
**Use when:** User wants to build/modify their trip.

### activity_tools
Advanced filtering, personalized recommendations, activity comparisons.
**Use when:** User needs detailed comparisons or filtered recommendations.

### user_tools
Update user preferences, mark favorites, set budget constraints.
**Use when:** User shares preferences or personal information.
