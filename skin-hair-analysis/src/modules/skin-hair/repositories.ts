import { ObjectId } from "mongodb";
import { getDatabase } from "@/lib/mongodb";
import type {
  HairLog,
  LovedProduct,
  ProductRecommendation,
  SkinHairProfile,
  SkinLog,
  WellnessInsight,
} from "./types";

const COLLECTIONS = {
  profiles: "skin_hair_profiles",
  skinLogs: "skin_logs",
  hairLogs: "hair_logs",
  lovedProducts: "loved_products",
  recommendations: "product_recommendations",
  wellnessInsights: "skin_hair_pattern",
};

function serializeId<T extends { _id?: unknown }>(doc: T | null): (T & { _id?: string }) | null {
  if (!doc) {
    return null;
  }
  return {
    ...doc,
    _id: doc._id ? String(doc._id) : undefined,
  };
}

function serializeMany<T extends { _id?: unknown }>(docs: T[]): Array<T & { _id?: string }> {
  return docs.map((doc) => ({
    ...doc,
    _id: doc._id ? String(doc._id) : undefined,
  }));
}

export async function getSkinHairProfile(userId: string) {
  const db = await getDatabase();
  const profile = await db.collection<SkinHairProfile>(COLLECTIONS.profiles).findOne({ user_id: userId });
  return serializeId(profile);
}

export async function upsertSkinHairProfile(
  userId: string,
  profile: Omit<SkinHairProfile, "_id" | "user_id" | "created_at" | "updated_at">,
) {
  const db = await getDatabase();
  const now = new Date();

  await db.collection<SkinHairProfile>(COLLECTIONS.profiles).updateOne(
    { user_id: userId },
    {
      $set: {
        ...profile,
        user_id: userId,
        updated_at: now,
      },
      $setOnInsert: {
        created_at: now,
      },
    },
    { upsert: true },
  );

  return getSkinHairProfile(userId);
}

export async function createSkinLog(log: Omit<SkinLog, "_id">) {
  const db = await getDatabase();
  const result = await db.collection<SkinLog>(COLLECTIONS.skinLogs).insertOne(log);
  return { ...log, _id: String(result.insertedId) };
}

export async function createHairLog(log: Omit<HairLog, "_id">) {
  const db = await getDatabase();
  const result = await db.collection<HairLog>(COLLECTIONS.hairLogs).insertOne(log);
  return { ...log, _id: String(result.insertedId) };
}

export async function getLatestSkinLog(userId: string) {
  const db = await getDatabase();
  const log = await db
    .collection<SkinLog>(COLLECTIONS.skinLogs)
    .find({ user_id: userId })
    .sort({ date: -1 })
    .limit(1)
    .next();

  return serializeId(log);
}

export async function getLatestHairLog(userId: string) {
  const db = await getDatabase();
  const log = await db
    .collection<HairLog>(COLLECTIONS.hairLogs)
    .find({ user_id: userId })
    .sort({ date: -1 })
    .limit(1)
    .next();

  return serializeId(log);
}

export async function listSkinLogs(userId: string, limit = 30) {
  const db = await getDatabase();
  const logs = await db
    .collection<SkinLog>(COLLECTIONS.skinLogs)
    .find({ user_id: userId })
    .sort({ date: -1 })
    .limit(limit)
    .toArray();

  return serializeMany(logs);
}

export async function listHairLogs(userId: string, limit = 30) {
  const db = await getDatabase();
  const logs = await db
    .collection<HairLog>(COLLECTIONS.hairLogs)
    .find({ user_id: userId })
    .sort({ date: -1 })
    .limit(limit)
    .toArray();

  return serializeMany(logs);
}

export async function addLovedProduct(
  userId: string,
  product: Omit<LovedProduct, "_id" | "user_id" | "created_at" | "updated_at">,
) {
  const db = await getDatabase();
  const now = new Date();

  const payload: Omit<LovedProduct, "_id"> = {
    ...product,
    user_id: userId,
    created_at: now,
    updated_at: now,
  };

  const result = await db.collection<LovedProduct>(COLLECTIONS.lovedProducts).insertOne(payload);
  return { ...payload, _id: String(result.insertedId) };
}

export async function updateLovedProduct(
  userId: string,
  productId: string,
  patch: Partial<
    Pick<
      LovedProduct,
      | "product_name"
      | "brand"
      | "category"
      | "ingredients"
      | "notes"
      | "ingredient_lookup_source"
      | "ingredient_lookup_match"
      | "ingredient_lookup_grounding_line"
    >
  >,
) {
  const db = await getDatabase();
  const collection = db.collection(COLLECTIONS.lovedProducts);

  await collection.updateOne(
    {
      _id: new ObjectId(productId),
      user_id: userId,
    },
    {
      $set: {
        ...patch,
        updated_at: new Date(),
      },
    },
  );

  const updated = await collection.findOne({
    _id: new ObjectId(productId),
    user_id: userId,
  });

  return serializeId(updated);
}

export async function deleteLovedProduct(userId: string, productId: string) {
  const db = await getDatabase();
  await db.collection(COLLECTIONS.lovedProducts).deleteOne({
    _id: new ObjectId(productId),
    user_id: userId,
  });
}

export async function listLovedProducts(userId: string) {
  const db = await getDatabase();
  const products = await db
    .collection<LovedProduct>(COLLECTIONS.lovedProducts)
    .find({ user_id: userId })
    .sort({ created_at: -1 })
    .toArray();

  return serializeMany(products);
}

export async function replaceRecommendations(userId: string, recommendations: Omit<ProductRecommendation, "_id" | "user_id">[]) {
  const db = await getDatabase();
  await db.collection<ProductRecommendation>(COLLECTIONS.recommendations).deleteMany({ user_id: userId });

  if (recommendations.length === 0) {
    return [];
  }

  const payload: Omit<ProductRecommendation, "_id">[] = recommendations.map((recommendation) => ({
    ...recommendation,
    user_id: userId,
  }));

  const result = await db.collection<ProductRecommendation>(COLLECTIONS.recommendations).insertMany(payload);

  return payload.map((item, idx) => ({
    ...item,
    _id: String(result.insertedIds[idx]),
  }));
}

export async function listRecommendations(userId: string) {
  const db = await getDatabase();
  const recommendations = await db
    .collection<ProductRecommendation>(COLLECTIONS.recommendations)
    .find({ user_id: userId })
    .sort({ match_score: -1, generated_at: -1 })
    .toArray();

  return serializeMany(recommendations);
}

export async function replaceWellnessInsights(userId: string, insights: Omit<WellnessInsight, "_id" | "user_id">[]) {
  const db = await getDatabase();
  await db.collection<WellnessInsight>(COLLECTIONS.wellnessInsights).deleteMany({ user_id: userId });

  if (insights.length === 0) {
    return [];
  }

  const payload: Omit<WellnessInsight, "_id">[] = insights.map((insight) => ({
    ...insight,
    user_id: userId,
  }));

  const result = await db.collection<WellnessInsight>(COLLECTIONS.wellnessInsights).insertMany(payload);

  return payload.map((item, idx) => ({
    ...item,
    _id: String(result.insertedIds[idx]),
  }));
}

export async function listWellnessInsights(userId: string) {
  const db = await getDatabase();
  const insights = await db
    .collection<WellnessInsight>(COLLECTIONS.wellnessInsights)
    .find({ user_id: userId })
    .sort({ date: -1 })
    .toArray();

  return serializeMany(insights);
}
