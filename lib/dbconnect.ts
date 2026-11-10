import mongoose from "mongoose";

interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

const globalForMongoose = globalThis as unknown as {
  _mongooseCache?: MongooseCache;
};

const cached: MongooseCache = globalForMongoose._mongooseCache ?? {
  conn: null,
  promise: null,
};

if (!globalForMongoose._mongooseCache) {
  globalForMongoose._mongooseCache = cached;
}

const dbconnect = async (): Promise<typeof mongoose> => {
  if (cached.conn && mongoose.connection.readyState === 1) {
    return cached.conn;
  }

  if (!cached.promise) {
    const uri = process.env.MONGODB_URI;
    if (!uri) {
      throw new Error("MONGODB_URI environment variable is not defined");
    }

    const opts: mongoose.ConnectOptions = {
      bufferCommands: false,
      maxPoolSize: 15,
      minPoolSize: 2,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    };

    cached.promise = mongoose.connect(uri, opts);
  }

  try {
    cached.conn = await cached.promise;
  } catch (error) {
    cached.promise = null;
    console.error("Database Connection Failed", error);
    throw error;
  }

  return cached.conn;
};

export default dbconnect;
