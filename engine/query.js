const { buildPrompt } = require('./prompt');
const { queryGemini } = require('./gemini');
const { queryClaude } = require('./claude');
const { logQuery } = require('../ingestion/storage');

async function runQuery(question) {
  const systemPrompt = buildPrompt();

  let answer;
  let modelUsed;

  try {
    answer = await queryGemini(systemPrompt, question);
    modelUsed = 'gemini-2.5-flash';
  } catch (err) {
    console.error('Gemini failed, falling back to Claude:', err.message, err.status || '');
    answer = await queryClaude(systemPrompt, question);
    modelUsed = 'claude-sonnet-4-6';
    answer._fallback = true;
  }

  if (answer.confidence === 'LOW' && modelUsed !== 'claude-sonnet-4-6') {
    console.log('Low confidence from Gemini — running Claude verification');
    try {
      const claudeAnswer = await queryClaude(systemPrompt, question);
      if (claudeAnswer.confidence !== 'LOW') {
        answer = claudeAnswer;
        modelUsed = 'claude-sonnet-4-6';
      } else {
        answer._both_low_confidence = true;
      }
    } catch (err) {
      console.error('Claude verification failed:', err.message);
    }
  }

  answer.model_used = modelUsed;

  logQuery({
    question,
    answer,
    model_used: modelUsed,
    confidence: answer.confidence,
  });

  return answer;
}

module.exports = { runQuery };
