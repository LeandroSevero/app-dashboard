import { MongoClient } from "mongodb";

const uri = process.env.app_MONGODB_URI;

let client;
let clientPromise;

if (!uri) {
  throw new Error("app_MONGODB_URI não definida");
}

if (process.env.NODE_ENV === "development") {
  if (!global._mongoClientPromise) {
    client = new MongoClient(uri);
    global._mongoClientPromise = client.connect();
  }
  clientPromise = global._mongoClientPromise;
} else {
  client = new MongoClient(uri);
  clientPromise = client.connect();
}

export async function getDb() {
  const c = await clientPromise;
  return c.db("app-dashboard");
}
