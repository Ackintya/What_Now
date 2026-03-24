const fs = require("fs");
const path = require("path");
const { MongoClient } = require("mongodb");

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return {};
  }

  const env = {};
  const lines = fs.readFileSync(filePath, "utf8").split(/\r?\n/);

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex === -1) {
      continue;
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    let value = trimmed.slice(separatorIndex + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    env[key] = value;
  }

  return env;
}

function getMongoConfig() {
  const repoRoot = path.resolve(__dirname, "..", "..");
  const envFromFile = loadEnvFile(path.join(repoRoot, "base", ".env.local"));

  const uri = process.env.MONGODB_URI || envFromFile.MONGODB_URI;
  const dbName = process.env.MONGODB_DB || envFromFile.MONGODB_DB || "wellbeing_app";

  if (!uri) {
    throw new Error("MONGODB_URI is not configured");
  }

  return { uri, dbName };
}

const COLLECTION_RENAMES = [
  ["userProfiles", "user_profiles"],
  ["insights", "yelp_insight"],
  ["yelp-insights", "yelp_insight"],
  ["yelp_insights", "yelp_insight"],
  ["community-posts", "community_posts"],
  ["community-comments", "community_comments"],
  ["community-moods", "community_moods"],
  ["community-events", "community_events"],
  ["community-connections", "community_connections"],
  ["nutrition_insight", "nutrition_insight_memory"],
  ["nutrition_insight_sessions", "nutrition_sessions_summary"],
  ["wellness_insights", "skin_hair_pattern"],
  ["wellness_meal_insights", "meal_pattern"],
  ["workoutSessions", "workout_sessions"],
  ["nutritionLogs", "nutrition_logs"],
  ["skinAnalyses", "skin_analyses"],
  ["hairAnalyses", "hair_analyses"],
  ["sleepLogs", "sleep_logs"],
  ["supplementLogs", "supplement_logs"],
];

const FIELD_RENAMES = {
  users: {
    createdAt: "created_at",
    updatedAt: "updated_at",
  },
  user_profiles: {
    userId: "user_id",
    dateOfBirth: "date_of_birth",
    createdAt: "created_at",
    updatedAt: "updated_at",
  },
  sessions: {
    userId: "user_id",
    formScore: "form_score",
    postureScore: "posture_score",
    armPositionScore: "arm_position_score",
    visibilityScore: "visibility_score",
    avgElbowAngle: "avg_elbow_angle",
  },
  workout_sessions: {
    userId: "user_id",
    formScore: "form_score",
    fatigueScore: "fatigue_score",
    asymmetryScore: "asymmetry_score",
  },
  nutrition_logs: {
    userId: "user_id",
  },
  skin_analyses: {
    userId: "user_id",
  },
  hair_analyses: {
    userId: "user_id",
  },
  sleep_logs: {
    userId: "user_id",
  },
  supplement_logs: {
    userId: "user_id",
    supplementName: "supplement_name",
  },
  favorites: {
    userId: "user_id",
    restaurantId: "restaurant_id",
    restaurantName: "restaurant_name",
    restaurantData: "restaurant_data",
  },
  clicks: {
    userId: "user_id",
    restaurantId: "restaurant_id",
    restaurantName: "restaurant_name",
  },
  yelp_insight: {
    userId: "user_id",
    favoriteCount: "favorite_count",
    searchCount: "search_count",
    topCategories: "top_categories",
    searchLocations: "search_locations",
    topClicked: "top_clicked",
  },
  community_posts: {
    userId: "user_id",
    displayName: "display_name",
    upvotedBy: "upvoted_by",
    commentCount: "comment_count",
    createdAt: "created_at",
  },
  community_comments: {
    postId: "post_id",
    userId: "user_id",
    displayName: "display_name",
    createdAt: "created_at",
  },
  community_events: {
    userId: "user_id",
    displayName: "display_name",
    attendeeNames: "attendee_names",
    createdAt: "created_at",
  },
  community_moods: {
    userId: "user_id",
    createdAt: "created_at",
    updatedAt: "updated_at",
  },
  community_connections: {
    fromUserId: "from_user_id",
    toUserId: "to_user_id",
    toDisplayName: "to_display_name",
  },
  agent_chats: {
    userId: "user_id",
  },
  agent_profile_cache: {
    userId: "user_id",
    profileContext: "profile_context",
    builtAt: "built_at",
    expiresAt: "expires_at",
  },
};

async function listCollectionNames(db) {
  const collections = await db.listCollections({}, { nameOnly: true }).toArray();
  return collections.map((collection) => collection.name);
}

async function renameCollectionIfNeeded(db, fromName, toName) {
  const names = new Set(await listCollectionNames(db));

  if (!names.has(fromName)) {
    return { collection: fromName, action: "missing" };
  }

  if (!names.has(toName)) {
    await db.collection(fromName).rename(toName);
    return { collection: fromName, action: "renamed", target: toName };
  }

  const sourceDocs = await db.collection(fromName).find({}).toArray();
  let mergedCount = 0;

  if (sourceDocs.length > 0) {
    const operations = sourceDocs.map((doc) => {
      const { _id, ...rest } = doc;
      return {
        updateOne: {
          filter: { _id },
          update: { $set: rest },
          upsert: true,
        },
      };
    });

    if (operations.length > 0) {
      const result = await db.collection(toName).bulkWrite(operations, { ordered: false });
      mergedCount = (result.upsertedCount || 0) + (result.modifiedCount || 0);
    }
  }

  await db.collection(fromName).drop();
  return { collection: fromName, action: "merged_and_dropped", target: toName, mergedCount };
}

async function renameFieldIfNeeded(collection, fromField, toField) {
  const result = await collection.updateMany(
    { [fromField]: { $exists: true } },
    [
      { $set: { [toField]: `$${fromField}` } },
      { $unset: fromField },
    ],
  );

  return result.modifiedCount || 0;
}

async function applyFieldRenames(db, collectionName, renames) {
  const names = new Set(await listCollectionNames(db));
  if (!names.has(collectionName)) {
    return { collection: collectionName, action: "missing" };
  }

  const collection = db.collection(collectionName);
  const fieldActions = [];

  for (const [fromField, toField] of Object.entries(renames)) {
    if (fromField === toField) {
      continue;
    }

    const modifiedCount = await renameFieldIfNeeded(collection, fromField, toField);
    if (modifiedCount > 0) {
      fieldActions.push({ fromField, toField, modifiedCount });
    }
  }

  return { collection: collectionName, action: "fields_checked", fieldActions };
}

async function summarizeCollections(db) {
  const collectionNames = (await listCollectionNames(db)).sort();
  const summary = [];

  for (const collectionName of collectionNames) {
    const collection = db.collection(collectionName);
    const [count, docs] = await Promise.all([
      collection.countDocuments(),
      collection.find({}).limit(50).toArray(),
    ]);

    const fields = new Set();
    for (const doc of docs) {
      for (const key of Object.keys(doc)) {
        fields.add(key);
      }
    }

    summary.push({
      collection: collectionName,
      document_count: count,
      fields: Array.from(fields).sort(),
    });
  }

  return summary;
}

async function main() {
  const { uri, dbName } = getMongoConfig();
  const client = new MongoClient(uri, {
    serverSelectionTimeoutMS: 10000,
  });

  await client.connect();
  const db = client.db(dbName);

  try {
    const collectionActions = [];
    for (const [fromName, toName] of COLLECTION_RENAMES) {
      collectionActions.push(await renameCollectionIfNeeded(db, fromName, toName));
    }

    const fieldActions = [];
    for (const [collectionName, renames] of Object.entries(FIELD_RENAMES)) {
      fieldActions.push(await applyFieldRenames(db, collectionName, renames));
    }

    const summary = await summarizeCollections(db);

    console.log(
      JSON.stringify(
        {
          db_name: dbName,
          collection_actions: collectionActions,
          field_actions: fieldActions,
          collections: summary,
        },
        null,
        2,
      ),
    );
  } finally {
    await client.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
