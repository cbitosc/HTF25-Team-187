console.log(
  "Perspective API Key:",
  import.meta.env.VITE_PERSPECTIVE_API_KEY ? "Loaded" : "Missing"
);

import axios from "axios";
export async function getToxicityScore(text) {
  try {
    console.log(
      "Perspective API Key loaded:",
      !!import.meta.env.VITE_PERSPECTIVE_API_KEY
    ); // ✅ Add this line

    const response = await axios.post(
      "https://commentanalyzer.googleapis.com/v1alpha1/comments:analyze",
      {
        comment: { text },
        languages: ["en"],
        requestedAttributes: { TOXICITY: {} },
      },
      {
        params: { key: import.meta.env.VITE_PERSPECTIVE_API_KEY }, // ✅ uses Vite key
      }
    );

    const score =
      response.data.attributeScores.TOXICITY.summaryScore.value || 0;
    return score;
  } catch (error) {
    console.error(
      "Perspective API error:",
      error.response?.data || error.message
    );
    return 0;
  }
}
