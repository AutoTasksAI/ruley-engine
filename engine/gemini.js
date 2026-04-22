const { GoogleGenerativeAI } = require('@google/generative-ai');

let client;

function getClient() {
  if (!client) {
    if (!process.env.GEMINI_API_KEY) throw new Error('GEMINI_API_KEY not set');
    client = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  }
  return client;
}

const MODELS = ['gemini-3-flash-preview', 'gemini-2.5-flash', 'gemini-2.0-flash'];

function extractJson(text) {
  const start = text.indexOf('{');
  if (start === -1) throw new Error(`No JSON found in response: ${text.slice(0, 200)}`);
  let depth = 0;
  for (let i = start; i < text.length; i++) {
    if (text[i] === '{') depth++;
    else if (text[i] === '}') {
      depth--;
      if (depth === 0) return JSON.parse(text.slice(start, i + 1));
    }
  }
  throw new Error(`Unclosed JSON in response: ${text.slice(0, 200)}`);
}

async function queryGemini(systemPrompt, question) {
  const genAI = getClient();
  let lastErr;

  for (const modelId of MODELS) {
    try {
      const model = genAI.getGenerativeModel({
        model: modelId,
        systemInstruction: systemPrompt,
        generationConfig: {
          responseMimeType: 'application/json',
          temperature: 0.1,
          maxOutputTokens: 2048,
        },
      });

      const result = await model.generateContent(question);
      const text = result.response.text();

      const parsed = extractJson(text);
      parsed._gemini_model = modelId;
      return parsed;
    } catch (err) {
      console.warn(`Gemini model ${modelId} failed: ${err.message}`);
      lastErr = err;
    }
  }

  throw lastErr;
}

module.exports = { queryGemini };
