import axios from "axios";

export async function getToxicityScore(text) {
  try {
    const response = await axios.post(
      "https://commentanalyzer.googleapis.com/v1alpha1/comments:analyze",
      {
        comment: { text },
        languages: ["en"],
        requestedAttributes: { TOXICITY: {} },
      },
      {
        params: { key: process.env.PERSPECTIVE_API_KEY },
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
