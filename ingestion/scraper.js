const cheerio = require('cheerio');
const { fetchBuffer, md5 } = require('./fetcher');
const { cleanText } = require('./parser');

const HTML_SOURCES = [
  {
    source: 'USAP New Rules Database',
    url: 'https://rules.usapickleball.org/view/rule-changes-view-all/',
    type: 'html',
    version: 'live',
    selector: 'body',
  },
  {
    source: 'SportsEdTV Ask The Refs',
    url: 'https://sportsedtv.com/blog/pickleball-rules-ask-the-refs',
    type: 'html',
    version: 'live',
    selector: 'article, .post-content, main',
  },
];

async function scrapeHtml(source) {
  console.log(`Scraping HTML: ${source.source}`);
  const buffer = await fetchBuffer(source.url);
  const html = buffer.toString('utf8');
  const $ = cheerio.load(html);

  $('script, style, nav, footer, header, .cookie-notice, .ad, .advertisement').remove();

  let text = '';
  const el = $(source.selector);
  if (el.length > 0) {
    text = el.text();
  } else {
    text = $('body').text();
  }

  const content = cleanText(text);
  const hash = md5(Buffer.from(content));

  return { ...source, content, hash };
}

module.exports = { HTML_SOURCES, scrapeHtml };
