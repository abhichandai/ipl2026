// Fetch IPL 2026 stats using Claude's built-in web_search tool
export async function scrapeIPLStats() {
  const apiKey = process.env.ANTHROPIC_API_KEY!;

  const messages: any[] = [{
    role: 'user',
    content: `Search the web for CURRENT IPL 2026 cricket standings right now. Search for:
- "IPL 2026 points table"
- "IPL 2026 orange cap top batters"
- "IPL 2026 purple cap top bowlers"

After searching, return ONLY this JSON object — no markdown fences, no explanation, just raw JSON:
{"pointsTable":[{"team":"PBKS","played":7,"won":5,"lost":2,"points":10,"nrr":"+0.50"},...],"orangeCap":[{"rank":1,"player":"V Kohli","team":"RCB","runs":320},...],"purpleCap":[{"rank":1,"player":"A Kamboj","team":"PBKS","wickets":14},...]}

Include all 10 teams in pointsTable ordered by points. Include top 10 in orangeCap and purpleCap. Use short codes: RCB CSK MI KKR SRH RR PBKS DC GT LSG. runs and wickets must be integers.`
  }];

  for (let turn = 0; turn < 10; turn++) {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      signal: AbortSignal.timeout(45000),
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
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
    console.log(`[scrape] turn ${turn} stop_reason=${data.stop_reason} blocks=${data.content?.length}`);

    if (data.stop_reason === 'end_turn') {
      const text = data.content?.find((b: any) => b.type === 'text')?.text || '';
      const clean = text.replace(/```json|```/g, '').trim();
      try {
        const parsed = JSON.parse(clean);
        return {
          pointsTable: parsed.pointsTable || null,
          orangeCap:   parsed.orangeCap   || null,
          purpleCap:   parsed.purpleCap   || null,
          updatedAt:   new Date().toISOString(),
          partial:     !parsed.pointsTable || !parsed.orangeCap || !parsed.purpleCap,
        };
      } catch (e) {
        throw new Error(`JSON parse failed. Model said: ${text.slice(0, 200)}`);
      }
    }

    if (data.stop_reason === 'tool_use') {
      // Add assistant turn (includes tool_use blocks and any tool_result blocks Anthropic injects)
      messages.push({ role: 'assistant', content: data.content });

      // Build tool_result blocks for any tool_use blocks that don't already have results
      const toolUseIds = new Set(
        data.content.filter((b: any) => b.type === 'tool_use').map((b: any) => b.id)
      );
      const resolvedIds = new Set(
        data.content.filter((b: any) => b.type === 'tool_result').map((b: any) => b.tool_use_id)
      );
      const unresolvedToolUses = data.content.filter(
        (b: any) => b.type === 'tool_use' && !resolvedIds.has(b.id)
      );

      if (unresolvedToolUses.length > 0) {
        messages.push({
          role: 'user',
          content: unresolvedToolUses.map((b: any) => ({
            type: 'tool_result',
            tool_use_id: b.id,
            content: `Search query executed: ${b.input?.query || ''}`,
          })),
        });
      }
    }
  }

  throw new Error('Web search exceeded max turns without a final answer');
}
