import { NextRequest, NextResponse } from 'next/server';
import { getDB } from '@/lib/db';

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const body = await req.json();
  if (body.key !== process.env.ADMIN_PASSWORD) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const images: string[] = body.images || [];
  if (images.length === 0) return NextResponse.json({ error: 'No images provided' }, { status: 400 });

  // Build image content blocks for Claude
  const imageBlocks = images.map((dataUrl: string) => {
    const [meta, data] = dataUrl.split(',');
    const mediaType = meta.match(/data:(image\/\w+);/)?.[1] || 'image/png';
    return { type: 'image', source: { type: 'base64', media_type: mediaType, data } };
  });

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    signal: AbortSignal.timeout(45000),
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY!,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 2000,
      messages: [{
        role: 'user',
        content: [
          ...imageBlocks,
          {
            type: 'text',
            text: `Extract cricket data from these screenshots and return ONLY a valid JSON object, nothing else:
{"pointsTable":[{"team":"PBKS","played":7,"won":6,"lost":0,"points":13,"nrr":"+1.333"},...all teams you can see],"orangeCap":[{"rank":1,"player":"Abhishek Sharma","team":"SRH","runs":380},...top players you can see],"purpleCap":[{"rank":1,"player":"A Kamboj","team":"CSK","wickets":14},...top players you can see]}
Use short codes: RCB CSK MI KKR SRH RR PBKS DC GT LSG. runs and wickets must be integers. If a section isn't in the screenshots, use null for that key.

CRITICAL: Player names MUST exactly match one of these canonical names (snap to closest match):
Batters: H Klaasen, Ishan Kishan, V Sooryavanshi, RM Patidar, YBK Jaiswal, V Kohli, DC Jurel, JC Buttler, Sameer Rizvi, Shubman Gill, A Raghuvanshi, SS Iyer, SV Samson, RG Sharma, RD Rickelton, TH David, A Mhatre, PD Salt, Prabhsimran Singh, Abhishek Sharma, P Nissanka, D Padikkal, K Nitish Kumar Reddy, AM Rahane, TM Head, CPL Connolly, B Sai Sudharsan, KL Rahul, T Stubbs, AK Markram
Bowlers: M Prasidh Krishna, Ravi Bishnoi, A Kamboj, JC Archer, Prince Yadav, JA Duffy, Rashid Khan, L Ngidi, HS Dubey, N Burger, KH Pandya, J Overton, E Malinga, V Vyshak, Sandeep Sharma, VG Arora, SN Thakur, Sakib Hussain, Mohammed Shami, PP Hinge, Suyash Sharma, Shivang Kumar, B Kumar, T Natarajan, Mukesh Kumar, XC Bartlett, Ashok Sharma, B Muzarabani, K Rabada, JD Unadkat
If a player isn't in these lists, use the closest name from the list above. Return ONLY the JSON.`
          }
        ]
      }]
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Claude API ${res.status}: ${err.slice(0, 200)}`);
  }

  const aiData = await res.json();
  const text = aiData.content?.find((b: any) => b.type === 'text')?.text || '';
  const clean = text.replace(/```json|```/g, '').trim();
  const stats = JSON.parse(clean);

  const db = getDB();

  // Update cricket_cache (sidebar)
  const cacheData = { ...stats, updatedAt: new Date().toISOString() };
  const existing = await db`SELECT id FROM cricket_cache LIMIT 1`;
  if (existing.length > 0) {
    await db`UPDATE cricket_cache SET data = ${JSON.stringify(cacheData)}, updated_at = NOW() WHERE id = ${existing[0].id}`;
  } else {
    await db`INSERT INTO cricket_cache (data) VALUES (${JSON.stringify(cacheData)})`;
  }

  // Update live_data (scoring) — only non-null sections
  const liveRows = await db`SELECT id FROM live_data LIMIT 1`;
  if (liveRows.length > 0) {
    if (stats.orangeCap) {
      const r = stats.orangeCap.sort((a: any, b: any) => a.rank - b.rank).map((r: any) => r.player);
      await db`UPDATE live_data SET orange_cap_rankings = ${JSON.stringify(r)}, updated_at = NOW() WHERE id = ${liveRows[0].id}`;
    }
    if (stats.purpleCap) {
      const r = stats.purpleCap.sort((a: any, b: any) => a.rank - b.rank).map((r: any) => r.player);
      await db`UPDATE live_data SET purple_cap_rankings = ${JSON.stringify(r)}, updated_at = NOW() WHERE id = ${liveRows[0].id}`;
    }
    if (stats.pointsTable) {
      const top4 = stats.pointsTable.sort((a: any, b: any) => b.points - a.points).slice(0, 4).map((r: any) => r.team);
      await db`UPDATE live_data SET top4_teams = ${JSON.stringify(top4)}, updated_at = NOW() WHERE id = ${liveRows[0].id}`;
    }
  }

  return NextResponse.json({
    success: true,
    batters: stats.orangeCap?.length ?? 0,
    bowlers: stats.purpleCap?.length ?? 0,
    teams: stats.pointsTable?.length ?? 0,
  });
}
