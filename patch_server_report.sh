cat << 'INNER_EOF' >> server.ts

  app.post("/api/gemini/analyze-report", requireAuth, async (req: AuthRequest, res: any) => {
    try {
      const { file } = req.body;
      const mimeMatch = file.match(/^data:(.*);base64,/);
      const mimeType = mimeMatch ? mimeMatch[1] : "application/pdf";
      const base64Data = file.replace(/^data:.*;base64,/, "");

      const response = await generateContentWithRetry({
        model: "gemini-3.7-flash",
        contents: [
          { role: "user", parts: [
            { text: "Analyze this medical report or prescription. Return a JSON object strictly containing: 'summary' (a brief overview string), 'care_instructions' (an array of strings on what to take care of), and 'medications' (an array of strings listing related medications)." },
            { inlineData: { data: base64Data, mimeType: mimeType } }
          ]}
        ],
        config: {
          responseMimeType: "application/json",
          temperature: 0.1,
        }
      });
      
      const analysis = JSON.parse(response.text || "{}");
      res.json({ analysis });
    } catch (error: any) {
      console.error(error);
      res.status(500).json({ error: "Failed to analyze report" });
    }
  });
INNER_EOF
