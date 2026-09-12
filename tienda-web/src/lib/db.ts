import type { Db } from "mongodb";
import {
  createMongoClient,
  getMongoConnectionMode,
} from "./mongodb";

const DB_NAME = "wilson";

let pooledClientPromise:
  Promise<ReturnType<typeof createMongoClient>> | null = null;

async function getPooledClient() {
  const start = performance.now();

  if (!pooledClientPromise) {
    const client = createMongoClient();

    console.log("[DB] creando conexión pooled...");

    pooledClientPromise = client.connect().then(() => {
      console.log(
        `[DB] conexión pooled establecida en ${(
          performance.now() - start
        ).toFixed(1)} ms`
      );

      return client;
    });
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
  const totalStart = performance.now();
  const mode = getMongoConnectionMode();

  console.log(`[DB] withDatabase mode=${mode}`);

  if (mode === "pooled") {
    const connectStart = performance.now();

    const client = await getPooledClient();

    console.log(
      `[DB] obtener cliente pooled: ${(
        performance.now() - connectStart
      ).toFixed(1)} ms`
    );

    const operationStart = performance.now();

    const result = await operation(
      client.db(DB_NAME)
    );

    console.log(
      `[DB] operation: ${(
        performance.now() - operationStart
      ).toFixed(1)} ms`
    );

    console.log(
      `[DB] TOTAL withDatabase: ${(
        performance.now() - totalStart
      ).toFixed(1)} ms`
    );

    return result;
  }

  const client = createMongoClient();

  const connectStart = performance.now();

  await client.connect();

  console.log(
    `[DB] connect: ${(
      performance.now() - connectStart
    ).toFixed(1)} ms`
  );

  try {
    const operationStart = performance.now();

    const result = await operation(
      client.db(DB_NAME)
    );

    console.log(
      `[DB] operation: ${(
        performance.now() - operationStart
      ).toFixed(1)} ms`
    );

    return result;
  } finally {
    const closeStart = performance.now();

    await client.close(true);

    console.log(
      `[DB] close: ${(
        performance.now() - closeStart
      ).toFixed(1)} ms`
    );

    console.log(
      `[DB] TOTAL withDatabase: ${(
        performance.now() - totalStart
      ).toFixed(1)} ms`
    );
  }
}