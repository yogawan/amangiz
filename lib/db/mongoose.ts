import mongoose from "mongoose";
// Side-effect import: registers every schema so `populate()` never hits
// MissingSchemaError regardless of which models a given route imports.
import "@/models";

const MONGODB_URI = process.env.MONGODB_URI;

interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

declare global {
  // Cached across hot reloads / lambda invocations so we don't open a new
  // connection pool per request.
  var _amangizMongoose: MongooseCache | undefined;
}

const cached: MongooseCache = globalThis._amangizMongoose ?? {
  conn: null,
  promise: null,
};
globalThis._amangizMongoose = cached;

export async function connectDB(): Promise<typeof mongoose> {
  if (cached.conn) return cached.conn;

  if (!MONGODB_URI) {
    throw new Error("MONGODB_URI environment variable is not set");
  }

  if (!cached.promise) {
    cached.promise = mongoose.connect(MONGODB_URI, {
      // Fail fast instead of silently queueing operations when disconnected.
      bufferCommands: false,
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (error) {
    // Reset so the next request retries rather than awaiting a rejected promise.
    cached.promise = null;
    throw error;
  }

  return cached.conn;
}
