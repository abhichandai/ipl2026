// Scrapes ESPNcricinfo via ScraperAPI, extracts structured data via Claude

const SCRAPER_URL = 'https://api.scraperapi.com';
const CRICINFO_SERIES = 'https://www.espncricinfo.com/series/ipl-2026-1510719';

const URLS = {
  pointsTable: `${CRICINFO_SERIES}/points-table-standings`,
  orangeCap:   `${CRICINFO_SERIES}/batting-bowling-most-runs-1`,
  purpleCap:   `${CRICINFO_SERIES}/batting-bowling-most-wickets-2`,
};

async function fetchPage(url: string): Promise<string> {
  const scraperKey = process.env.SCRAPER_API_KEY!;
  const endpoint = `${SCRAPER_URL}?api_key=${scraperKey}&url=${encodeURIComponent(url)}&render=false`;
  const res = await fetch(endpoint, { signal: AbortSignal.timeout(20000) });
  if (!res.ok) throw new Error(`ScraperAPI returned ${res.status} for ${url}`);
  return res.text();
}

async function extractWithClaude(html: string, prompt: string): Promise<any> {
  // Trim HTML — Claude only needs the body text, not full markup
  // Strip scripts, styles, and collapse whitespace to save tokens
  const stripped = html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .slice(0, 12000); // Cap at ~3k tokens

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      messages: [{
        role: 'user',
        content: `${prompt}\n\nRespond ONLY with valid JSON, no markdown, no explanation.\n\nPage text:\n${stripped}`
      }]
    })
  });

  if (!res.ok) throw new Error(`Claude API returned ${res.status}`);
  const data = await res.json();
  const text = data.content?.[0]?.text || '';
  return JSON.parse(text.replace(/```json|```/g, '').trim());
}

export async function scrapeIPLStats() {
  const [ptHtml, ocHtml, pcHtml] = await Promise.all([
    fetchPage(URLS.pointsTable),
    fetchPage(URLS.orangeCap),
    fetchPage(URLS.purpleCap),
  ]);

  const [pointsTable, orangeCap, purpleCap] = await Promise.all([
    extractWithClaude(ptHtml, `Extract the IPL 2026 points table. Return JSON array:
[{"team":"RCB","played":5,"won":3,"lost":2,"points":6,"nrr":"+0.452"}]
Include all 10 teams. Use short team names (RCB, CSK, MI etc).`),

    extractWithClaude(ocHtml, `Extract the top 10 IPL 2026 Orange Cap (most runs) standings. Return JSON array:
[{"rank":1,"player":"V Kohli","team":"RCB","runs":320}]`),

    extractWithClaude(pcHtml, `Extract the top 10 IPL 2026 Purple Cap (most wickets) standings. Return JSON array:
[{"rank":1,"player":"JJ Bumrah","team":"MI","wickets":12}]`),
  ]);

  return {
    pointsTable,
    orangeCap,
    purpleCap,
    updatedAt: new Date().toISOString(),
  };
}
