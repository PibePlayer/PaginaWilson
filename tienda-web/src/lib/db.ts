import type { Db } from "mongodb";
import {
  createMongoClient,
  getMongoConnectionMode,
} from "./mongodb";

const DB_NAME = "wilson";

let pooledClientPromise: Promise<ReturnType<typeof createMongoClient>> | null =
  null;

async function getPooledClient() {
  if (!pooledClientPromise) {
    const client = createMongoClient();
    pooledClientPromise = client.connect().then(() => client);
  }

  try {
    return await pooledClientPromise;
  } catch (error) {
    pooledClientPromise = null;
    throw error;
  }
}

export async function withDatabase<T>(
  operation: (db: Db) => Promise<T>
): Promise<T> {
  if (getMongoConnectionMode() === "pooled") {
    const client = await getPooledClient();
    return operation(client.db(DB_NAME));
  }

  const client = createMongoClient();

  try {
    await client.connect();
    return await operation(client.db(DB_NAME));
  } finally {
    // En Workers el socket pertenece a esta solicitud y no puede reutilizarse.
    await client.close(true);
  }
}
