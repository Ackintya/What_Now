import { MongoClient, Db } from 'mongodb';

if (!process.env.MONGODB_URI) {
  throw new Error('Please add your MongoDB URI to .env.local');
}

const uri = process.env.MONGODB_URI;
const options = { tlsInsecure: true };

let client: MongoClient;
let clientPromise: Promise<MongoClient>;

if (process.env.NODE_ENV === 'development') {
  // In development mode, use a global variable to preserve the value
  // across module reloads caused by HMR (Hot Module Replacement).
  let globalWithMongo = global as typeof globalThis & {
    _mongoClientPromise?: Promise<MongoClient>;
  };

  if (!globalWithMongo._mongoClientPromise) {
    client = new MongoClient(uri, options);
    globalWithMongo._mongoClientPromise = client.connect();
  }
  clientPromise = globalWithMongo._mongoClientPromise;
} else {
  // In production mode, create a new client for each request
  client = new MongoClient(uri, options);
  clientPromise = client.connect();
}

export default clientPromise;

export async function getDatabase(): Promise<Db> {
  const client = await clientPromise;
  return client.db(process.env.MONGODB_DB || 'wellbeing_app');
}

// Helper functions for exercise sessions
export interface ExerciseSession {
  _id?: string;
  userId?: string;
  exercise: string;
  date: Date;
  reps: number;
  duration: number;
  formScore: number;
  postureScore: number;
  armPositionScore: number;
  visibilityScore: number;
  avgElbowAngle: number;
  notes?: string;
}

export async function saveExerciseSession(session: ExerciseSession) {
  const db = await getDatabase();
  const { _id, ...sessionData } = session;
  const result = await db.collection('sessions').insertOne({
    ...sessionData,
    date: new Date(),
  });
  return result;
}

export async function getUserSessions(userId: string, limit: number = 10) {
  const db = await getDatabase();
  const sessions = await db
    .collection('sessions')
    .find({ userId })
    .sort({ date: -1 })
    .limit(limit)
    .toArray();
  return sessions;
}

export async function getSessionStats(userId: string) {
  const db = await getDatabase();
  const stats = await db
    .collection('sessions')
    .aggregate([
      { $match: { userId } },
      {
        $group: {
          _id: '$exercise',
          totalReps: { $sum: '$reps' },
          totalSessions: { $sum: 1 },
          avgFormScore: { $avg: '$formScore' },
          avgPostureScore: { $avg: '$postureScore' },
          bestFormScore: { $max: '$formScore' },
        },
      },
    ])
    .toArray();
  return stats;
}
