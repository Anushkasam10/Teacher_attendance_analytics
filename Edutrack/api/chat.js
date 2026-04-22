export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Only POST allowed" });
  }

  try {
    const { message, stats = {} } = req.body;

    //  AI PROMPT
    const systemPrompt = `
You are an AI assistant for Teacher Attendance Analytics.

You have the following dataset context:
${JSON.stringify(stats)}

Tasks:
- Analyze attendance
- Find trends
- Compare data
- Give insights clearly
- Answer STRICTLY based on the provided dataset context.
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
      reply: data.choices?.[0]?.message?.content || "No response"
    });

  } catch (error) {
    return res.status(500).json({
      error: "Backend error",
      details: error.message
    });
  }
}