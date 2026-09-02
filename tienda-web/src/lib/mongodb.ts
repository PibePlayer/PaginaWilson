import { MongoClient } from "mongodb";

export type MongoConnectionMode = "workers" | "pooled";

export function getMongoConnectionMode(): MongoConnectionMode {
  const mode = process.env.MONGODB_CONNECTION_MODE ?? "workers";

  if (mode === "workers" || mode === "pooled") {
    return mode;
  }

  throw new Error(
    "MONGODB_CONNECTION_MODE must be either 'workers' or 'pooled'"
  );
}

export function createMongoClient() {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    throw new Error("MONGODB_URI is not defined");
  }

  return new MongoClient(uri, {
    connectTimeoutMS: 10_000,
    serverSelectionTimeoutMS: 10_000,
    socketTimeoutMS: 15_000,
    maxPoolSize: 1,
    minPoolSize: 0,
  });
}
