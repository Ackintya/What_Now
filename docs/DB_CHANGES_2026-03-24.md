# DB Changes - 2026-03-24

## Scope

- Database: MongoDB `wellbeing_app`
- Goal for today: make MongoDB naming consistent and update the code to match the live DB
- Naming rule now in force:
  - collection names use lowercase `snake_case`
  - top-level document fields use lowercase `snake_case`
  - MongoDB `_id` remains unchanged

## High-Level Summary

Today we made two DB-focused passes:

1. A normalization pass to remove camelCase and hyphenated collection/field names.
2. A follow-up rename pass for the insight-related collections so product naming is clearer.

All runtime code references were updated after the live MongoDB changes.

## Live Collection Renames Applied

### Normalization / standardization

These names were normalized to `snake_case` as part of the DB cleanup:

| Old collection name | Final collection name | Notes |
| --- | --- | --- |
| `userProfiles` | `user_profiles` | normalized |
| `community-posts` | `community_posts` | normalized |
| `community-comments` | `community_comments` | normalized |
| `community-moods` | `community_moods` | normalized |
| `community-events` | `community_events` | normalized |
| `community-connections` | `community_connections` | normalized |
| `nutrition_insight` | `nutrition_insight_memory` | normalized to the kept nutrition memory name |
| `insights` | `yelp_insight` | legacy alias; final target is singular |
| `yelp-insights` | `yelp_insight` | legacy alias; final target is singular |

### Insight collection rename pass

These were the final insight collection decisions applied today:

| Previous live name | New live name | Result |
| --- | --- | --- |
| `nutrition_insight_sessions` | `nutrition_sessions_summary` | renamed live |
| `wellness_insights` | `skin_hair_pattern` | renamed live |
| `yelp_insights` | `yelp_insight` | renamed live |
| `wellness_meal_insights` | `meal_pattern` | source collection did not exist live; created `meal_pattern` empty |

### Legacy migration aliases retained in the script

These names are still supported by the migration script if they ever appear again, but they were not present as active live collections at the end of the day:

- `workoutSessions` -> `workout_sessions`
- `nutritionLogs` -> `nutrition_logs`
- `skinAnalyses` -> `skin_analyses`
- `hairAnalyses` -> `hair_analyses`
- `sleepLogs` -> `sleep_logs`
- `supplementLogs` -> `supplement_logs`

## Top-Level Field Renames Applied

The following top-level field renames were part of the normalization pass:

| Collection | Field rename(s) |
| --- | --- |
| `users` | `createdAt` -> `created_at`, `updatedAt` -> `updated_at` |
| `user_profiles` | `userId` -> `user_id`, `dateOfBirth` -> `date_of_birth`, `createdAt` -> `created_at`, `updatedAt` -> `updated_at` |
| `sessions` | `userId` -> `user_id`, `formScore` -> `form_score`, `postureScore` -> `posture_score`, `armPositionScore` -> `arm_position_score`, `visibilityScore` -> `visibility_score`, `avgElbowAngle` -> `avg_elbow_angle` |
| `workout_sessions` | `userId` -> `user_id`, `formScore` -> `form_score`, `fatigueScore` -> `fatigue_score`, `asymmetryScore` -> `asymmetry_score` |
| `nutrition_logs` | `userId` -> `user_id` |
| `skin_analyses` | `userId` -> `user_id` |
| `hair_analyses` | `userId` -> `user_id` |
| `sleep_logs` | `userId` -> `user_id` |
| `supplement_logs` | `userId` -> `user_id`, `supplementName` -> `supplement_name` |
| `favorites` | `userId` -> `user_id`, `restaurantId` -> `restaurant_id`, `restaurantName` -> `restaurant_name`, `restaurantData` -> `restaurant_data` |
| `clicks` | `userId` -> `user_id`, `restaurantId` -> `restaurant_id`, `restaurantName` -> `restaurant_name` |
| `yelp_insight` | `userId` -> `user_id`, `favoriteCount` -> `favorite_count`, `searchCount` -> `search_count`, `topCategories` -> `top_categories`, `searchLocations` -> `search_locations`, `topClicked` -> `top_clicked` |
| `community_posts` | `userId` -> `user_id`, `displayName` -> `display_name`, `upvotedBy` -> `upvoted_by`, `commentCount` -> `comment_count`, `createdAt` -> `created_at` |
| `community_comments` | `postId` -> `post_id`, `userId` -> `user_id`, `displayName` -> `display_name`, `createdAt` -> `created_at` |
| `community_events` | `userId` -> `user_id`, `displayName` -> `display_name`, `attendeeNames` -> `attendee_names`, `createdAt` -> `created_at` |
| `community_moods` | `userId` -> `user_id`, `createdAt` -> `created_at`, `updatedAt` -> `updated_at` |
| `community_connections` | `fromUserId` -> `from_user_id`, `toUserId` -> `to_user_id`, `toDisplayName` -> `to_display_name` |
| `agent_chats` | `userId` -> `user_id` |
| `agent_profile_cache` | `userId` -> `user_id`, `profileContext` -> `profile_context`, `builtAt` -> `built_at`, `expiresAt` -> `expires_at` |

## Current Live Collections After Today

As of the end of the rename work on 2026-03-24, the live DB contains:

- `agent_chats`
- `authentic_dish_requests`
- `clicks`
- `community_comments`
- `community_connections`
- `community_events`
- `community_moods`
- `community_posts`
- `favorites`
- `generated_recipes`
- `hair_logs`
- `loved_products`
- `meal_pattern`
- `nutrition_insight_memory`
- `nutrition_profiles`
- `nutrition_sessions_summary`
- `pantry_items`
- `product_recommendations`
- `saved_recipes`
- `sessions`
- `skin_hair_pattern`
- `skin_hair_profiles`
- `skin_logs`
- `user_profiles`
- `users`
- `yelp_insight`

## Final Insight Collection State

These are the final insight-related collections after today:

| Collection | Status at end of day |
| --- | --- |
| `nutrition_insight_memory` | kept as-is |
| `nutrition_sessions_summary` | renamed from `nutrition_insight_sessions` |
| `skin_hair_pattern` | renamed from `wellness_insights` |
| `yelp_insight` | renamed from `yelp_insights` |
| `meal_pattern` | created empty because `wellness_meal_insights` was not present live |

## Code Follow-Up Completed

After the live DB changes, code references were updated in:

- `base`
- `community/backend`
- `nutrition-wellness`
- `nutrition-yelp/backend`
- `skin-hair-analysis`

This included:

- shared agent `ALLOWED_COLLECTIONS`
- agent profile DB reads
- nutrition repository collection constants
- skin/hair repository collection constants
- Yelp insight persistence routes
- README and handoff docs that referenced the old names

## Related Files

- Migration / normalization script: [normalize-mongodb-schema.js](c:/Users/arjya/NowWhat/base/scripts/normalize-mongodb-schema.js)
- DB issues handoff: [DB_ISSUES_HANDOFF.md](c:/Users/arjya/NowWhat/docs/DB_ISSUES_HANDOFF.md)

