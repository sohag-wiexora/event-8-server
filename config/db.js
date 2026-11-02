
import { MongoClient, ServerApiVersion } from 'mongodb';
import 'dotenv/config';

// MongoDB connection string.

const uri = process.env.MONGODB_URI;

// MongoDB Client Make Korci.

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

// Database connect korar function Ata.

export async function connectDB() {
  try {
    await client.connect();

    // Database select Korci. Database name: 'event8DB'

    const db = client.db('event8DB');

    await db.collection('events').createIndex({ eventDate: 1 });

      await db.collection('joinedEvents').createIndex(
       { eventId: 1, userEmail: 1 },
       { unique: true }
       );

    // Connection test Korci.

    await db.command({ ping: 1 });

    console.log('MongoDB Connected Successfully!');

    return db;
  } catch (error) {
    console.error('MongoDB Connection Failed:', error);
    throw error;
  }
}
