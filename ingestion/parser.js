const pdfParse = require('pdf-parse');

async function parsePdf(buffer) {
  const data = await pdfParse(buffer);
  return cleanText(data.text);
}

function cleanText(raw) {
  return raw
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
}

module.exports = { parsePdf, cleanText };
