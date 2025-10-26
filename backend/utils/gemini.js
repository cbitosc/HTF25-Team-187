import axios from 'axios';

export async function summarizeText(text) {
  try {
    const response = await axios.post(
      'https://api.gemini.com/v1/summarize', // replace with actual Gemini endpoint
      { text },
      {
        headers: {
          'Authorization': `Bearer ${process.env.GEMINI_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );
    return response.data.summary; // adjust based on Gemini response
  } catch (error) {
    console.error('Gemini API error:', error.response?.data || error.message);
    return null;
  }
}
