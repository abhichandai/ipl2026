const SCRAPER_URL = 'https://api.scraperapi.com';
const CRICINFO_SERIES = 'https://www.espncricinfo.com/series/ipl-2026-1510719';

const URLS = {
  pointsTable: `${CRICINFO_SERIES}/points-table-standings`,
  orangeCap:   `${CRICINFO_SERIES}/batting-bowling-most-runs-1`,
  purpleCap:   `${CRICINFO_SERIES}/batting-bowling-most-wickets-2`,
};

async function fetchPage(url: string): Promise<string> {
  const key = process.env.SCRAPER_API_KEY!;
  const endpoint = `${SCRAPER_URL}?api_key=${key}&url=${encodeURIComponent(url)}&render=false`;
  const res = await fetch(endpoint, { signal: AbortSignal.timeout(25000) });
  if (!res.ok) throw new Error(`ScraperAPI ${res.status} for ${url}`);
  return res.text();
}

function stripHTML(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .slice(0, 14000);
}

async function extractWithClaude(text: string, prompt: string): Promise<any> {
  const apiKey = process.env.ANTHROPIC_API_KEY!;
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1000,
      messages: [{
        role: 'user',
        content: `${prompt}\n\nRespond ONLY with a valid JSON array. No markdown, no explanation, no extra text.\n\nPage content:\n${text}`
      }]
    })
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Claude API ${res.status}: ${err.slice(0, 200)}`);
  }

  const data = await res.json();
  const raw = data.content?.[0]?.text || '';
  // Strip any accidental markdown fences
  const clean = raw.replace(/```json|```/g, '').trim();
  return JSON.parse(clean);
}

export async function scrapeIPLStats() {
  // Fetch all 3 pages in parallel
  const [ptHtml, ocHtml, pcHtml] = await Promise.all([
    fetchPage(URLS.pointsTable),
    fetchPage(URLS.orangeCap),
    fetchPage(URLS.purpleCap),
  ]);

  // Extract with Claude in parallel
  const [pointsTable, orangeCap, purpleCap] = await Promise.all([
    extractWithClaude(
      stripHTML(ptHtml),
      `Extract the IPL 2026 points table from this page. Return a JSON array of all 10 teams:
[{"team":"RCB","played":5,"won":3,"lost":2,"points":6,"nrr":"+0.452"}]
Use short team codes (RCB, CSK, MI, KKR, SRH, RR, PBKS, DC, GT, LSG). Order by points descending.`
    ),
    extractWithClaude(
      stripHTML(ocHtml),
      `Extract the IPL 2026 Orange Cap (most runs) top 10 batting standings. Return JSON array:
[{"rank":1,"player":"V Kohli","team":"RCB","runs":320}]`
    ),
    extractWithClaude(
      stripHTML(pcHtml),
      `Extract the IPL 2026 Purple Cap (most wickets) top 10 bowling standings. Return JSON array:
[{"rank":1,"player":"JJ Bumrah","team":"MI","wickets":12}]`
    ),
  ]);

  return { pointsTable, orangeCap, purpleCap, updatedAt: new Date().toISOString() };
}
