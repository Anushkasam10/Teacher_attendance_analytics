import { MongoClient } from 'mongodb';

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Only POST allowed" });
  }

  try {
    const { message, stats = {}, externalApi = {} } = req.body;

    let externalData = {};

    //  FETCH FROM MONGODB
    if (externalApi.useOfficialApi) {
      const uri = process.env.MONGODB_URI;
      if (!uri) {
        externalData = { error: "Database configuration missing (MONGODB_URI)" };
      } else {
        const client = new MongoClient(uri);
        try {
          await client.connect();
          const database = client.db('edutrack');
          const collection = database.collection('attendance_records');
          
          // Fetch the most recently ingested record
          const latestRecord = await collection.findOne({}, { sort: { timestamp: -1 } });
          
          if (latestRecord && latestRecord.payload) {
             externalData = latestRecord.payload;
          } else {
             externalData = { info: "No data available in the database yet." };
          }
        } catch (err) {
          externalData = { error: "Database fetch failed", details: err.message };
        } finally {
          await client.close();
        }
      }
    }

    //  AI PROMPT
    const systemPrompt = `
You are an AI assistant for Teacher Attendance Analytics.

You have:
1. Uploaded dataset: ${JSON.stringify(stats)}
2. Official attendance data: ${JSON.stringify(externalData)}

Tasks:
- Analyze attendance
- Find trends
- Compare data
- Give insights clearly
`;

    // GROQ AI CALL
    const aiResponse = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "llama-3.1-8b-instant",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: message }
        ]
      })
    });

    const data = await aiResponse.json();

    return res.status(200).json({
      reply: data.choices?.[0]?.message?.content || "No response",
      externalData // optional (for debugging)
    });

  } catch (error) {
    return res.status(500).json({
      error: "Backend error",
      details: error.message
    });
  }
}