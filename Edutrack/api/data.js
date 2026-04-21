const { MongoClient } = require('mongodb');

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed. Use GET.' });
  }

  const MONGODB_URI = process.env.MONGODB_URI;
  if (!MONGODB_URI) {
    return res.status(500).json({ error: 'MONGODB_URI environment variable is not set.' });
  }

  let client;
  try {
    client = new MongoClient(MONGODB_URI);
    await client.connect();
    
    const db = client.db('edutrack');
    const collection = db.collection('attendance_records');

    // Get the single most recent payload
    const latestRecord = await collection.find({}).sort({ timestamp: -1 }).limit(1).toArray();
    
    if (latestRecord.length === 0) {
      return res.status(404).json({ error: 'No data found in the database.' });
    }

    // Return the raw payload JSON array
    res.status(200).json({
      success: true,
      timestamp: latestRecord[0].timestamp,
      data: latestRecord[0].payload
    });
  } catch (error) {
    console.error('Data retrieval error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  } finally {
    if (client) {
      await client.close();
    }
  }
}
