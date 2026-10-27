cat << 'INNER_EOF' >> transcribe_route.ts
  app.post("/api/gemini/transcribe", requireAuth, async (req: AuthRequest, res: any) => {
    try {
      const { audio } = req.body; // base64 string
      const mimeMatch = audio.match(/^data:(.*);base64,/);
      const mimeType = mimeMatch ? mimeMatch[1] : "audio/webm";
      const base64Data = audio.replace(/^data:.*;base64,/, "");

      const response = await generateContentWithRetry({
        model: "gemini-3.5-flash",
        contents: [
          { role: "user", parts: [
            { text: "Transcribe the following audio accurately. Just output the transcript." },
            { inlineData: { data: base64Data, mimeType: mimeType } }
          ]}
        ]
      });
      
      res.json({ text: response.text });
    } catch (error: any) {
      console.error("Transcribe Error:", error);
      res.status(500).json({ error: "Failed to transcribe audio" });
    }
  });

INNER_EOF
sed -i '/\/\/ --- Vite Middleware/r transcribe_route.ts' server.ts
