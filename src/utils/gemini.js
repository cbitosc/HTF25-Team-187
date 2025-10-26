import axios from "axios";

export async function summarizeText(text) {
  try {
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY; // ✅ works with Vite
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

    const response = await axios.post(
      url,
      {
        contents: [
          {
            parts: [
              {
                text: `Summarize this discussion in 3-4 concise sentences:\n\n${text}`,
              },
            ],
          },
        ],
      },
      {
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    const summary =
      response.data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ||
      "No summary generated.";
    return summary;
  } catch (error) {
    console.error("Gemini API error:", error.response?.data || error.message);
    return null;
  }
}
