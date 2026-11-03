
import express from 'express';
import { ObjectId } from 'mongodb';
import { verifyToken } from '../middleware/verifyToken.js';

const router = express.Router();

// ==========================================
// POST: Create a New Event (JWT Protected)
// ==========================================
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

    const newEvent = {
      title: title.trim(),
      description: description.trim(),
      eventType: eventType.trim(),
      thumbnail: imageUrl.href,
      location: location.trim(),
      eventDate,
      creatorId: req.user.id,
      creatorEmail: req.user.email || '',
      creatorName: req.user.name || '',
      createdAt: new Date(),
    };

    const result = await req.db
      .collection('events')
      .insertOne(newEvent);

    return res.status(201).json({
      success: true,
      message: 'Event created successfully!',
      data: {
        _id: result.insertedId,
        ...newEvent,
      },
    });
  } catch (error) {
    console.error('Create Event Error:', error);

    return res.status(500).json({
      success: false,
      message: 'Failed to create event.',
    });
  }
});

// ==========================================
// GET: Upcoming Events
// Search + Category Filter + Pagination
// ==========================================
router.get('/', async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];

    const search = req.query.search?.trim() || '';
    const eventType = req.query.eventType?.trim() || '';

    const page = Math.max(
      parseInt(req.query.page, 10) || 1,
      1
    );

    const limit = Math.min(
      Math.max(parseInt(req.query.limit, 10) || 6, 1),
      100
    );

    const skip = (page - 1) * limit;

    const filter = {
      eventDate: { $gte: today },
    };

    if (search) {
      const safeSearch = search.replace(
        /[.*+?^${}()|[\]\\]/g,
        '\\$&'
      );

      filter.$or = [
        { title: { $regex: safeSearch, $options: 'i' } },
        { description: { $regex: safeSearch, $options: 'i' } },
        { location: { $regex: safeSearch, $options: 'i' } },
      ];
    }

    if (eventType && eventType.toLowerCase() !== 'all') {
      filter.eventType = eventType;
    }

    const eventsCollection = req.db.collection('events');

    const totalEvents = await eventsCollection.countDocuments(filter);

    const events = await eventsCollection
      .find(filter)
      .sort({ eventDate: 1, _id: 1 })
      .skip(skip)
      .limit(limit)
      .toArray();

    return res.status(200).json({
      success: true,
      count: events.length,
      totalEvents,
      currentPage: page,
      totalPages: Math.ceil(totalEvents / limit),
      data: events,
    });
  } catch (error) {
    console.error('Fetch Events Error:', error);

    return res.status(500).json({
      success: false,
      message: 'Failed to fetch events.',
    });
  }
});

// ==========================================
// GET: My Created Events (JWT Protected)
// ==========================================
router.get('/my-events', verifyToken, async (req, res) => {
  try {
    const events = await req.db
      .collection('events')
      .find({ creatorId: req.user.id })
      .sort({ createdAt: -1 })
      .toArray();

    return res.status(200).json({
      success: true,
      count: events.length,
      data: events,
    });
  } catch (error) {
    console.error('Get My Events Error:', error);

    return res.status(500).json({
      success: false,
      message: 'Failed to fetch your events.',
    });
  }
});

// ==========================================
// GET: Joined Events (JWT Protected)
// ==========================================
router.get('/joined-events', verifyToken, async (req, res) => {
  try {
    const joinsCollection = req.db.collection('eventJoins');
    const eventsCollection = req.db.collection('events');

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

    const eventIds = joinedRecords.map(
      (record) => new ObjectId(record.eventId)
    );

    const events = await eventsCollection
      .find({ _id: { $in: eventIds } })
      .toArray();

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

// ==========================================
// PUT: Update Event (JWT Protected + Owner Only)
// ==========================================
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

    return res.status(200).json({
      success: true,
      message: 'Event updated successfully!',
    });
  } catch (error) {
    console.error('Update Event Error:', error);

    return res.status(500).json({
      success: false,
      message: 'Failed to update event.',
    });
  }
});

// ==========================================
// DELETE: Event (JWT Protected + Owner Only)
// ==========================================
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid event ID.',
      });
    }

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

    // Remove associated join records
    await req.db.collection('eventJoins').deleteMany({
      eventId: id,
    });

    return res.status(200).json({
      success: true,
      message: 'Event deleted successfully!',
    });
  } catch (error) {
    console.error('Delete Event Error:', error);

    return res.status(500).json({
      success: false,
      message: 'Failed to delete event.',
    });
  }
});

// ==========================================
// POST: Join Event (JWT Protected)
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

    const event = await eventsCollection.findOne({
      _id: new ObjectId(id),
    });

    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found.',
      });
    }

    if (event.eventDate < new Date().toISOString().split('T')[0]) {
      return res.status(400).json({
        success: false,
        message: 'You cannot join a past event.',
      });
    }

    const joinData = {
      eventId: id,
      userId: req.user.id,
      userName: req.user.name || '',
      userEmail: req.user.email || '',
      joinedAt: new Date(),
    };

    try {
      await joinsCollection.insertOne(joinData);
    } catch (error) {
      // MongoDB duplicate key error
      if (error.code === 11000) {
        return res.status(409).json({
          success: false,
          message: 'You have already joined this event.',
        });
      }

      throw error;
    }

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
// GET: Single Event Details (Public)
// ==========================================
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

    return res.status(200).json({
      success: true,
      data: event,
    });
  } catch (error) {
    console.error('Fetch Event Details Error:', error);

    return res.status(500).json({
      success: false,
      message: 'Failed to fetch event.',
    });
  }
});

export default router;
