const mongoose = require("mongoose");

let memoryServer = null;

async function connectDB() {
  const uri = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/pharmacy";

  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 2000 });
    console.log("MongoDB connected:", uri);
    return mongoose.connection;
  } catch (error) {
    console.warn("Local MongoDB unavailable:", error.message);
    console.warn("Starting in-memory MongoDB replica set...");
    const { MongoMemoryReplSet } = require("mongodb-memory-server");
    memoryServer = await MongoMemoryReplSet.create({
      replSet: { count: 1, storageEngine: "wiredTiger" },
    });
    const memUri = memoryServer.getUri();
    await mongoose.connect(memUri);
    console.log("In-memory MongoDB connected");
    return mongoose.connection;
  }
}

async function disconnectDB() {
  await mongoose.disconnect();
  if (memoryServer) {
    await memoryServer.stop();
    memoryServer = null;
  }
}

module.exports = { connectDB, disconnectDB };
