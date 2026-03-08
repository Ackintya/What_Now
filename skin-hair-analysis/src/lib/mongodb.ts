import { Db, MongoClient } from "mongodb";

const dbName = process.env.MONGODB_DB || "wellbeing_app";

let clientPromise: Promise<MongoClient> | null = null;

function getClientPromise(): Promise<MongoClient> {
  if (clientPromise) {
    return clientPromise;
  }

  const uri = process.env.MONGODB_URI;

  if (!uri) {
    throw new Error("Please set MONGODB_URI in your env file");
  }

  if (process.env.NODE_ENV === "development") {
    const globalWithMongo = global as typeof globalThis & {
      _skinHairMongoClientPromise?: Promise<MongoClient>;
    };

    if (!globalWithMongo._skinHairMongoClientPromise) {
      globalWithMongo._skinHairMongoClientPromise = new MongoClient(uri).connect();
    }

    clientPromise = globalWithMongo._skinHairMongoClientPromise;
    return clientPromise;
  }

  clientPromise = new MongoClient(uri).connect();
  return clientPromise;
}

export async function getDatabase(): Promise<Db> {
  const mongoClient = await getClientPromise();
  return mongoClient.db(dbName);
}
