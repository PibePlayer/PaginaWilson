import clientPromise from "./mongodb";

const DB_NAME = "wilson";

export async function getDatabase() {
  const client = await clientPromise;
  return client.db(DB_NAME);
}