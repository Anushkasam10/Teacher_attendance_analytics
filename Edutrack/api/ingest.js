import { MongoClient } from 'mongodb';

export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Only POST allowed' });
  }

  // 1. Validate API Key
  const providedKey = req.headers['x-api-key'];
  const expectedKey = process.env.INGEST_API_KEY;

  if (!providedKey || providedKey !== expectedKey) {
    return res.status(401).json({ error: 'Unauthorized. Invalid API Key.' });
  }

  // 2. Extract data
  const data = req.body;
  if (!data) {
    return res.status(400).json({ error: 'No data provided in request body.' });
  }

  // 3. Connect to MongoDB
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    return res.status(500).json({ error: 'Database configuration missing.' });
  }

  const client = new MongoClient(uri);

  try {
    await client.connect();
    const database = client.db('edutrack'); // You can change the DB name if needed
    const collection = database.collection('attendance_records');

    // 4. Insert data with a timestamp to maintain history
    const documentToInsert = {
      timestamp: new Date().toISOString(),
      payload: data
    };

    const result = await collection.insertOne(documentToInsert);

    return res.status(200).json({
      success: true,
      message: 'Data successfully ingested.',
      recordId: result.insertedId
    });
  } catch (error) {
    return res.status(500).json({
      error: 'Failed to insert data into database',
      details: error.message
    });
  } finally {
    await client.close();
  }
}
