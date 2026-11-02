
import 'dotenv/config';
import { connectDB } from '../config/db.js';

const sampleEvents = [
  {
    title: 'Winter Clothes Distribution',
    description: 'Join our community to distribute warm clothes to underprivileged families during winter.',
    eventType: 'Donation',
    thumbnail: 'https://images.unsplash.com/photo-1483664852095-d6cc6870702d?w=800',
    location: 'Mirpur 10, Dhaka',
    eventDate: '2026-12-15',
    creatorEmail: 'demo@event8.local',
    createdAt: new Date()
  },
  {
    title: 'Community Tree Plantation',
    description: 'Help us create a greener environment by planting trees in our local community.',
    eventType: 'Plantation',
    thumbnail: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=800',
    location: 'Dhanmondi, Dhaka',
    eventDate: '2026-12-20',
    creatorEmail: 'demo@event8.local',
    createdAt: new Date()
  },
  {
    title: 'Clean City Campaign',
    description: 'Work together to clean public spaces and promote environmental awareness.',
    eventType: 'Cleanup',
    thumbnail: 'https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?w=800',
    location: 'Uttara, Dhaka',
    eventDate: '2026-12-25',
    creatorEmail: 'demo@event8.local',
    createdAt: new Date()
  },
  {
    title: 'Community Blood Donation Camp',
    description: 'Participate in a voluntary blood donation campaign to help save lives.',
    eventType: 'Blood Donation',
    thumbnail: 'https://images.unsplash.com/photo-1615461066841-6116e61058f4?w=800',
    location: 'Mohammadpur, Dhaka',
    eventDate: '2027-01-05',
    creatorEmail: 'demo@event8.local',
    createdAt: new Date()
  },
  {
    title: 'Food Distribution Program',
    description: 'Distribute nutritious meals among people who need community support.',
    eventType: 'Donation',
    thumbnail: 'https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?w=800',
    location: 'Farmgate, Dhaka',
    eventDate: '2027-01-12',
    creatorEmail: 'demo@event8.local',
    createdAt: new Date()
  },
  {
    title: 'School Supplies for Children',
    description: 'Support children with essential school supplies and educational materials.',
    eventType: 'Education',
    thumbnail: 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=800',
    location: 'Jatrabari, Dhaka',
    eventDate: '2027-01-20',
    creatorEmail: 'demo@event8.local',
    createdAt: new Date()
  }
];

async function seedEvents() {
  let db;

  try {
    db = await connectDB();

    const eventsCollection = db.collection('events');

    // Remove only our previous demo records

    await eventsCollection.deleteMany({
      creatorEmail: 'demo@event8.local'
    });

    // Insert sample events
    
    const result = await eventsCollection.insertMany(sampleEvents);

    console.log(`${result.insertedCount} sample events inserted successfully!`);

  } catch (error) {
    console.error('Seeding failed:', error.message);
    process.exitCode = 1;

  } finally {
    if (db) {
      await db.client.close();
      console.log('MongoDB connection closed.');
    }
  }
}

seedEvents();
