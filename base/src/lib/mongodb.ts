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

interface ExerciseSessionDocument {
  _id?: string;
  user_id?: string;
  exercise: string;
  date: Date;
  reps: number;
  duration: number;
  form_score: number;
  posture_score: number;
  arm_position_score: number;
  visibility_score: number;
  avg_elbow_angle: number;
  notes?: string;
}

function serializeSession(doc: ExerciseSessionDocument & { _id?: unknown }): ExerciseSession {
  return {
    _id: doc._id ? String(doc._id) : undefined,
    userId: doc.user_id,
    exercise: doc.exercise,
    date: doc.date,
    reps: doc.reps,
    duration: doc.duration,
    formScore: doc.form_score,
    postureScore: doc.posture_score,
    armPositionScore: doc.arm_position_score,
    visibilityScore: doc.visibility_score,
    avgElbowAngle: doc.avg_elbow_angle,
    notes: doc.notes,
  };
}

export async function saveExerciseSession(session: ExerciseSession) {
  const db = await getDatabase();
  const { _id, ...sessionData } = session;
  const payload: ExerciseSessionDocument = {
    user_id: sessionData.userId,
    exercise: sessionData.exercise,
    date: new Date(),
    reps: sessionData.reps,
    duration: sessionData.duration,
    form_score: sessionData.formScore,
    posture_score: sessionData.postureScore,
    arm_position_score: sessionData.armPositionScore,
    visibility_score: sessionData.visibilityScore,
    avg_elbow_angle: sessionData.avgElbowAngle,
    notes: sessionData.notes,
  };
  const result = await db.collection<ExerciseSessionDocument>('sessions').insertOne(payload);
  return result;
}

export async function getUserSessions(userId: string, limit: number = 10) {
  const db = await getDatabase();
  const sessions = await db
    .collection<ExerciseSessionDocument>('sessions')
    .find({ user_id: userId })
    .sort({ date: -1 })
    .limit(limit)
    .toArray();
  return sessions.map(serializeSession);
}

export async function getSessionStats(userId: string) {
  const db = await getDatabase();
  const stats = await db
    .collection<ExerciseSessionDocument>('sessions')
    .aggregate([
      { $match: { user_id: userId } },
      {
        $group: {
          _id: '$exercise',
          totalReps: { $sum: '$reps' },
          totalSessions: { $sum: 1 },
          avgFormScore: { $avg: '$form_score' },
          avgPostureScore: { $avg: '$posture_score' },
          bestFormScore: { $max: '$form_score' },
        },
      },
    ])
    .toArray();
  return stats;
}
