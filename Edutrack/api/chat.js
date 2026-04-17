export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Only POST allowed" });
  }

  try {
    const { message, stats = {}, externalApi = {} } = req.body;

    let externalData = {};

    //  FETCH FROM OFFICIAL API
    if (externalApi.useOfficialApi) {
      try {
        const apiUrl = "https://bepc.entrolabs.com/admin/attendance_apis/api.php";

        const queryParams = new URLSearchParams({
          getStudentAttendance: "true",
          school_code: externalApi.school_code || "10010301101",
          date: externalApi.date || "2026-04-10"
        });

        const response = await fetch(`${apiUrl}?${queryParams}`, {
          method: "GET",
          headers: {
            "Apikey": process.env.OFFICIAL_API_KEY   
          }
        });

        externalData = await response.json();

      } catch (err) {
        externalData = { error: "Official API fetch failed", details: err.message };
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
IMPORTANT FORMATTING RULES:
- You MUST format your entire response using HTML tags because your output is injected directly into a web page.
- Do NOT use Markdown (like **bold** or * for lists). 
- Use <br><br> for paragraphs and spacing.
- Use <strong>text</strong> for bolding important numbers or names.
- Use <ul><li>...</li></ul> for bulleted lists.
- Keep your answers concise, beautifully structured, and easy to read.
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
