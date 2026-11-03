
import { MongoClient, ServerApiVersion } from 'mongodb';
import 'dotenv/config';

const uri = process.env.MONGODB_URI;

if (!uri) {
  throw new Error('MONGODB_URI is missing from environment variables.');
}

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

export async function connectDB() {
  try {
    await client.connect();

    const db = client.db('event8DB');

    // =====================================
    // EVENTS COLLECTION INDEXES
    // =====================================
    const eventsCollection = db.collection('events');

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

    // =====================================
    // EVENT JOINS COLLECTION INDEXES
    // =====================================
    const joinsCollection = db.collection('eventJoins');

    // Read existing indexes
    const existingIndexes = await joinsCollection.indexes();

    // Remove old unique join index if it uses userEmail
    const oldUniqueIndex = existingIndexes.find(
      (index) => index.name === 'unique_event_user_join'
    );

    if (
      oldUniqueIndex &&
      oldUniqueIndex.key.eventId === 1 &&
      oldUniqueIndex.key.userEmail === 1
    ) {
      await joinsCollection.dropIndex('unique_event_user_join');
      console.log('Old unique join index removed.');
    }

    // Remove old user joined events index if it uses userEmail
    const oldUserIndex = existingIndexes.find(
      (index) => index.name === 'user_joined_events'
    );

    if (
      oldUserIndex &&
      oldUserIndex.key.userEmail === 1 &&
      oldUserIndex.key.joinedAt === -1
    ) {
      await joinsCollection.dropIndex('user_joined_events');
      console.log('Old user joined index removed.');
    }

    // Create updated indexes
    await joinsCollection.createIndexes([
      {
        key: { eventId: 1, userId: 1 },
        name: 'unique_event_user_join',
        unique: true,
      },
      {
        key: { userId: 1, joinedAt: -1 },
        name: 'user_joined_events',
      },
    ]);

    // =====================================
    // TEST DATABASE CONNECTION
    // =====================================
    await db.command({ ping: 1 });

    console.log('MongoDB Connected Successfully!');
    console.log('MongoDB Indexes Created Successfully!');

    return db;
  } catch (error) {
    console.error('MongoDB Connection Failed:', error);
    throw error;
  }
}
