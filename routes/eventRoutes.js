
import express from 'express';
import { ObjectId } from 'mongodb';
import { verifyToken } from '../middleware/verifyToken.js';

const router = express.Router();

// POST: Create a New Event (JWT Protected)
router.post('/', verifyToken, async (req, res) => {
  try {
    const {
      title,
      description,
      eventType,
      thumbnail,
      location,
      eventDate,
    } = req.body;

    // Required field validation
    if (
      !title?.trim() ||
      !description?.trim() ||
      !eventType?.trim() ||
      !thumbnail?.trim() ||
      !location?.trim() ||
      !eventDate
    ) {
      return res.status(400).json({
        success: false,
        message: 'All event fields are required.',
      });
    }

    // Event date validation
    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(eventDate) ||
      Number.isNaN(Date.parse(`${eventDate}T00:00:00.000Z`))
    ) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid event date.',
      });
    }

    const today = new Date().toISOString().split('T')[0];

    if (eventDate < today) {
      return res.status(400).json({
        success: false,
        message: 'Event date cannot be in the past.',
      });
    }

    // Image URL validation
    let imageUrl;

    try {
      imageUrl = new URL(thumbnail.trim());

      if (!['http:', 'https:'].includes(imageUrl.protocol)) {
        throw new Error('Invalid image URL');
      }
    } catch {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid image URL.',
      });
    }

    // Event document
    const newEvent = {
      title: title.trim(),
      description: description.trim(),
      eventType: eventType.trim(),
      thumbnail: imageUrl.href,
      location: location.trim(),
      eventDate,

      // Creator information from verified JWT
      creatorId: req.user.id,
      creatorEmail: req.user.email || '',
      creatorName: req.user.name || '',

      createdAt: new Date(),
    };

    // Save event to MongoDB
    const result = await req.db
      .collection('events')
      .insertOne(newEvent);

    res.status(201).json({
      success: true,
      message: 'Event created successfully!',
      data: {
        _id: result.insertedId,
        ...newEvent,
      },
    });

  } catch (error) {
    console.error('Create Event Error:', error);

    res.status(500).json({
      success: false,
      message: 'Failed to create event.',
    });
  }
});


// GET: All Upcoming Events or Limited Events
router.get('/', async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];

    const limit = req.query.limit
      ? Math.min(Math.max(parseInt(req.query.limit, 10) || 6, 1), 100)
      : 0;

    let query = req.db
      .collection('events')
      .find({
        eventDate: { $gte: today },
      })
      .sort({ eventDate: 1 });

    if (limit > 0) {
      query = query.limit(limit);
    }

    const events = await query.toArray();

    res.status(200).json({
      success: true,
      count: events.length,
      data: events,
    });

  } catch (error) {
    console.error('Fetch Events Error:', error);

    res.status(500).json({
      success: false,
      message: 'Failed to fetch events.',
    });
  }
});


// GET: All Events Created by Logged-in User (JWT Protected)
router.get('/my-events', verifyToken, async (req, res) => {
  try {
    const events = await req.db
      .collection('events')
      .find({ creatorId: req.user.id })
      .sort({ createdAt: -1 })
      .toArray();

    res.status(200).json({
      success: true,
      count: events.length,
      data: events,
    });

  } catch (error) {
    console.error('Get My Events Error:', error);

    res.status(500).json({
      success: false,
      message: 'Failed to fetch your events.',
    });
  }
});



// PUT: Update an Event (JWT Protected + Owner Only)
router.put('/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid event ID.',
      });
    }

    const {
      title,
      description,
      eventType,
      thumbnail,
      location,
      eventDate,
    } = req.body;

    // Required field validation
    if (
      !title?.trim() ||
      !description?.trim() ||
      !eventType?.trim() ||
      !thumbnail?.trim() ||
      !location?.trim() ||
      !eventDate
    ) {
      return res.status(400).json({
        success: false,
        message: 'All event fields are required.',
      });
    }

    // Event date validation
    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(eventDate) ||
      Number.isNaN(Date.parse(`${eventDate}T00:00:00.000Z`))
    ) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid event date.',
      });
    }

    const today = new Date().toISOString().split('T')[0];

    if (eventDate < today) {
      return res.status(400).json({
        success: false,
        message: 'Event date cannot be in the past.',
      });
    }

    // Image URL validation
    let imageUrl;

    try {
      imageUrl = new URL(thumbnail.trim());

      if (!['http:', 'https:'].includes(imageUrl.protocol)) {
        throw new Error('Invalid image URL');
      }
    } catch {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid image URL.',
      });
    }

    // Update only if the event belongs to logged-in user
    const result = await req.db.collection('events').updateOne(
      {
        _id: new ObjectId(id),
        creatorId: req.user.id,
      },
      {
        $set: {
          title: title.trim(),
          description: description.trim(),
          eventType: eventType.trim(),
          thumbnail: imageUrl.href,
          location: location.trim(),
          eventDate,
          updatedAt: new Date(),
        },
      }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({
        success: false,
        message: 'Event not found or you are not authorized to update it.',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Event updated successfully!',
    });

  } catch (error) {
    console.error('Update Event Error:', error);

    res.status(500).json({
      success: false,
      message: 'Failed to update event.',
    });
  }
});



// DELETE: Delete an Event (JWT Protected + Owner Only)
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;

    // Validate Event ID
    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid event ID.',
      });
    }

    // Delete only if the event belongs to logged-in user
    const result = await req.db.collection('events').deleteOne({
      _id: new ObjectId(id),
      creatorId: req.user.id,
    });

    if (result.deletedCount === 0) {
      return res.status(404).json({
        success: false,
        message: 'Event not found or you are not authorized to delete it.',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Event deleted successfully!',
    });

  } catch (error) {
    console.error('Delete Event Error:', error);

    res.status(500).json({
      success: false,
      message: 'Failed to delete event.',
    });
  }
});


// ==========================================
// JOIN EVENT - Logged-in user joins an event
// ==========================================
router.post('/:id/join', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid event ID.',
      });
    }

    const eventsCollection = req.db.collection('events');
    const joinsCollection = req.db.collection('eventJoins');

    // Event আছে কি না check
    const event = await eventsCollection.findOne({
      _id: new ObjectId(id),
    });

    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found.',
      });
    }

    // Past event-এ Join করা যাবে না
    if (new Date(event.eventDate) <= new Date()) {
      return res.status(400).json({
        success: false,
        message: 'You cannot join a past event.',
      });
    }

    // Already joined কি না check
    const existingJoin = await joinsCollection.findOne({
      eventId: id,
      userId: req.user.id,
    });

    if (existingJoin) {
      return res.status(409).json({
        success: false,
        message: 'You have already joined this event.',
      });
    }

    // Join information save
    const joinData = {
      eventId: id,
      userId: req.user.id,
      userName: req.user.name || '',
      userEmail: req.user.email || '',
      joinedAt: new Date(),
    };

    await joinsCollection.insertOne(joinData);

    return res.status(201).json({
      success: true,
      message: 'You have successfully joined the event!',
    });
  } catch (error) {
    console.error('Join Event Error:', error);

    return res.status(500).json({
      success: false,
      message: 'Failed to join event.',
    });
  }
});


// ==========================================
// GET JOINED EVENTS - Current user's events
// ==========================================
router.get('/joined-events', verifyToken, async (req, res) => {
  try {
    const joinsCollection = req.db.collection('eventJoins');
    const eventsCollection = req.db.collection('events');

    // Current user's joined records
    const joinedRecords = await joinsCollection
      .find({ userId: req.user.id })
      .sort({ joinedAt: -1 })
      .toArray();

    if (joinedRecords.length === 0) {
      return res.status(200).json({
        success: true,
        events: [],
      });
    }

    // Joined event IDs
    const eventIds = joinedRecords.map(
      (record) => new ObjectId(record.eventId)
    );

    const events = await eventsCollection
      .find({ _id: { $in: eventIds } })
      .toArray();

    // Attach joinedAt to each event
    const joinedEvents = events.map((event) => {
      const record = joinedRecords.find(
        (item) => item.eventId === event._id.toString()
      );

      return {
        ...event,
        joinedAt: record?.joinedAt,
      };
    });

    return res.status(200).json({
      success: true,
      events: joinedEvents,
    });
  } catch (error) {
    console.error('Get Joined Events Error:', error);

    return res.status(500).json({
      success: false,
      message: 'Failed to fetch joined events.',
    });
  }
});

// GET: Single Event Details
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid event ID.',
      });
    }

    const event = await req.db
      .collection('events')
      .findOne({ _id: new ObjectId(id) });

    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found.',
      });
    }

    res.status(200).json({
      success: true,
      data: event,
    });

  } catch (error) {
    console.error('Fetch Event Details Error:', error);

    res.status(500).json({
      success: false,
      message: 'Failed to fetch event.',
    });
  }
});

export default router;
