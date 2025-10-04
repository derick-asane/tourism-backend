const { GoogleGenerativeAI } = require("@google/generative-ai");
const googleAI = new GoogleGenerativeAI({
  apiKey: process.env.GOOGLE_AI_API_KEY, // Store in .env
});
const API_KEY = process.env.GOOGLE_AI_API_KEY;
const API_URL =
  process.env.GOOGLE_AI_API_URL ||
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent";
const genAI = new GoogleGenerativeAI(API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

exports.symptomCheck = async (req, res) => {
  const { prompt } = req.body;
  const myPrompt = `just give reponse reletate to tourism only, if the prompt is not reletate to tourism say sorry I am not able to answer your question, i only answer questions related to tourism. this is the user prompt:
  ${prompt}. And it should be precise `;
  // Basic validation to ensure a prompt was sent
  if (!myPrompt) {
    return res.status(400).json({ error: "Prompt is required." });
  }

  console.log(`Received prompt from frontend: "${myPrompt}"`);
  try {
    // Call the Gemini API
    const result = await model.generateContent(myPrompt);
    const response = await result.response;
    const text = response.text();

    console.log("Successfully generated content from Gemini." + text);
    res.json({ generatedText: text });
  } catch (error) {
    console.error("Error calling Gemini API:", error);
    res.status(500).json({ error: "Failed to generate content." });
  }
};
