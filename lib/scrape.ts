// Fetch IPL 2026 stats using Claude's web_search tool — no ScraperAPI needed
export async function scrapeIPLStats() {
  const apiKey = process.env.ANTHROPIC_API_KEY!;

  const userPrompt = `Search the web for current IPL 2026 standings and return ONLY a valid JSON object — no markdown, no explanation, nothing else.

Required format:
{
  "pointsTable": [{"team":"PBKS","played":7,"won":5,"lost":2,"points":10,"nrr":"+0.50"},...all 10 teams ordered by points descending],
  "orangeCap": [{"rank":1,"player":"V Kohli","team":"RCB","runs":320},...top 10 batters],
  "purpleCap": [{"rank":1,"player":"A Kamboj","team":"PBKS","wickets":14},...top 10 bowlers]
}

Use short team codes: RCB, CSK, MI, KKR, SRH, RR, PBKS, DC, GT, LSG.
runs and wickets must be integers. Return ONLY the JSON, nothing else.`;

  const messages: any[] = [{ role: 'user', content: userPrompt }];

  // Agentic loop — run until end_turn (web_search may take 2–3 turns)
  for (let turn = 0; turn < 8; turn++) {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      signal: AbortSignal.timeout(45000),
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 2000,
        tools: [{ type: 'web_search_20250305', name: 'web_search' }],
        messages,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Claude API ${res.status}: ${err.slice(0, 300)}`);
    }

    const data = await res.json();

    if (data.stop_reason === 'end_turn') {
      const text = data.content?.find((b: any) => b.type === 'text')?.text || '';
      const clean = text.replace(/```json|```/g, '').trim();
      const parsed = JSON.parse(clean);
      return {
        pointsTable: parsed.pointsTable || null,
        orangeCap:   parsed.orangeCap   || null,
        purpleCap:   parsed.purpleCap   || null,
        updatedAt:   new Date().toISOString(),
        partial:     !parsed.pointsTable || !parsed.orangeCap || !parsed.purpleCap,
      };
    }

    if (data.stop_reason === 'tool_use') {
      // Add assistant's tool_use blocks to history
      messages.push({ role: 'assistant', content: data.content });
      // Return tool results for each tool_use block
      const toolResults = data.content
        .filter((b: any) => b.type === 'tool_use')
        .map((b: any) => ({
          type: 'tool_result',
          tool_use_id: b.id,
          content: b.content || '',
        }));
      if (toolResults.length > 0) {
        messages.push({ role: 'user', content: toolResults });
      }
    }
  }

  throw new Error('Web search exceeded max turns');
}
