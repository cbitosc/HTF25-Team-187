import axios from 'axios';

export async function getToxicityScore(text) {
  try {
    const response = await axios.post(
      'https://commentanalyzer.googleapis.com/v1/comments:analyze',
      {
        comment: { text },
        requestedAttributes: { TOXICITY: {} }
      },
      {
        params: {
          key: process.env.PERSPECTIVE_API_KEY
        }
      }
    );
    return response.data.attributeScores.TOXICITY.summaryScore.value;
  } catch (error) {
    console.error('Perspective API error:', error.response?.data || error.message);
    return 0;
  }
}
