
import { MongoClient, ServerApiVersion } from 'mongodb';
import 'dotenv/config';

// MongoDB connection string
const uri = process.env.MONGODB_URI;

// Check MongoDB connection string
if (!uri) {
  throw new Error('MONGODB_URI is missing from environment variables.');
}

// MongoDB Client
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

// Connect to MongoDB
export async function connectDB() {
  try {
    // Connect MongoDB client
    await client.connect();

    // Select database
    const db = client.db('event8DB');

    // Events collection
    const eventsCollection = db.collection('events');

    // Create Events indexes
    await eventsCollection.createIndexes([
      {
        key: { creatorId: 1, createdAt: -1 },
        name: 'creator_events',
      },
      {
        key: { eventDate: 1, _id: 1 },
        name: 'upcoming_events',
      },
    ]);

    // Event joins collection
    const joinsCollection = db.collection('eventJoins');

    // Create Event joins indexes
    await joinsCollection.createIndexes([
      {
        key: { eventId: 1, userEmail: 1 },
        name: 'unique_event_user_join',
        unique: true,
      },
      {
        key: { userEmail: 1, joinedAt: -1 },
        name: 'user_joined_events',
      },
    ]);

    // Test database connection
    await db.command({ ping: 1 });

    console.log('MongoDB Connected Successfully!');
    console.log('MongoDB Indexes Created Successfully!');

    return db;
  } catch (error) {
    console.error('MongoDB Connection Failed:', error);
    throw error;
  }
}
