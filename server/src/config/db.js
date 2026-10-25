import mongoose from 'mongoose';

export async function connectDB(uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/matter') {
  try {
    const conn = await mongoose.connect(uri);
    console.log(`Connected to MongoDB at ${uri}`);
    return conn;
  } catch (error) {
    console.error('Failed to connect to MongoDB:', error.message);
    throw error;
  }
}

export async function disconnectDB() {
  await mongoose.disconnect();
}
