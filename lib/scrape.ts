const SCRAPER_URL = 'https://api.scraperapi.com';
// IPL 2026 series ID on ESPNcricinfo is 17740
const URLS = {
  pointsTable: 'https://www.espncricinfo.com/series/ipl-2026-1510719/points-table-standings',
  orangeCap:   'https://www.espncricinfo.com/series/ipl-2026-1510719/orange-cap',
  purpleCap:   'https://www.espncricinfo.com/series/ipl-2026-1510719/purple-cap',
};

async function fetchPage(url: string): Promise<string> {
  const key = process.env.SCRAPER_API_KEY!;
  const endpoint = `${SCRAPER_URL}?api_key=${key}&url=${encodeURIComponent(url)}&render=false`;
  const res = await fetch(endpoint, { signal: AbortSignal.timeout(30000) });
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
    signal: AbortSignal.timeout(18000),
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
  const clean = raw.replace(/```json|```/g, '').trim();
  return JSON.parse(clean);
}

export async function scrapeIPLStats() {
  // allSettled so one slow/failing page doesn't abort the whole refresh
  const [ptResult, ocResult, pcResult] = await Promise.allSettled([
    fetchPage(URLS.pointsTable),
    fetchPage(URLS.orangeCap),
    fetchPage(URLS.purpleCap),
  ]);

  const ptHtml = ptResult.status === 'fulfilled' ? ptResult.value : null;
  const ocHtml = ocResult.status === 'fulfilled' ? ocResult.value : null;
  const pcHtml = pcResult.status === 'fulfilled' ? pcResult.value : null;

  if (!ptHtml && !ocHtml && !pcHtml) {
    throw new Error('All 3 ScraperAPI fetches failed');
  }
  if (!ptHtml) console.error('[scrape] Points table failed:', (ptResult as PromiseRejectedResult).reason?.message);
  if (!ocHtml) console.error('[scrape] Orange cap failed:', (ocResult as PromiseRejectedResult).reason?.message);
  if (!pcHtml) console.error('[scrape] Purple cap failed:', (pcResult as PromiseRejectedResult).reason?.message);

  // Extract only the pages we successfully fetched, in parallel
  const [ptExtract, ocExtract, pcExtract] = await Promise.allSettled([
    ptHtml ? extractWithClaude(stripHTML(ptHtml), `Extract the IPL 2026 points table from this page. Return a JSON array of all 10 teams:
[{"team":"RCB","played":5,"won":3,"lost":2,"points":6,"nrr":"+0.452"}]
Use short team codes (RCB, CSK, MI, KKR, SRH, RR, PBKS, DC, GT, LSG). Order by points descending.`) : Promise.reject('skipped'),
    ocHtml ? extractWithClaude(stripHTML(ocHtml), `Extract the IPL 2026 Orange Cap top 10 batting standings from this page. The "runs" field must be an INTEGER (e.g. 320), not a string. Return JSON array exactly like this:
[{"rank":1,"player":"V Sooryavanshi","team":"RR","runs":215},{"rank":2,"player":"H Klaasen","team":"SRH","runs":198},...]
Only include the top 10 players with actual run totals.`) : Promise.reject('skipped'),
    pcHtml ? extractWithClaude(stripHTML(pcHtml), `Extract the IPL 2026 Purple Cap top 10 bowling standings from this page. The "wickets" field must be an INTEGER (e.g. 9), not a string. Return JSON array exactly like this:
[{"rank":1,"player":"Ravi Bishnoi","team":"RR","wickets":9},{"rank":2,"player":"M Prasidh Krishna","team":"GT","wickets":7},...]
Only include the top 10 players with actual wicket totals.`) : Promise.reject('skipped'),
  ]);

  const pointsTable = ptExtract.status === 'fulfilled' ? ptExtract.value : null;
  const orangeCap   = ocExtract.status === 'fulfilled' ? ocExtract.value : null;
  const purpleCap   = pcExtract.status === 'fulfilled' ? pcExtract.value : null;

  const partial = !pointsTable || !orangeCap || !purpleCap;
  if (partial) console.warn('[scrape] Partial result — some pages failed');

  return { pointsTable, orangeCap, purpleCap, updatedAt: new Date().toISOString(), partial };
}
