import { getDB } from '@/lib/db';
import { calculateScore } from '@/lib/scoring';
import LiveStats from '@/components/LiveStats';
import PicksTable from '@/components/PicksTable';
import Collapsible from '@/components/Collapsible';

export const revalidate = 0;

export default async function Leaderboard() {
  let entries: any[] = [];
  let live: any = { orange_cap_rankings: [], purple_cap_rankings: [], top4_teams: [], tournament_winner: null };

  try {
    const db = getDB();
    const [liveRows, cacheRows] = await Promise.all([
      db`SELECT * FROM live_data LIMIT 1`,
      db`SELECT data FROM cricket_cache LIMIT 1`.catch(() => []),
    ]);
    if (liveRows[0]) live = liveRows[0];

    // If live_data rankings are empty, pull from cricket_cache
    const cached = (cacheRows as any[])[0]?.data;
    if (cached) {
      if (!live.orange_cap_rankings?.length && cached.orangeCap?.length) {
        // Sort by rank field — Haiku may not return array in rank order
        live.orange_cap_rankings = [...cached.orangeCap]
          .sort((a: any, b: any) => (a.rank ?? 999) - (b.rank ?? 999))
          .map((r: any) => r.player);
      }
      if (!live.purple_cap_rankings?.length && cached.purpleCap?.length) {
        live.purple_cap_rankings = [...cached.purpleCap]
          .sort((a: any, b: any) => (a.rank ?? 999) - (b.rank ?? 999))
          .map((r: any) => r.player);
      }
      if (!live.top4_teams?.length && cached.pointsTable?.length) {
        // Sort by points desc so top 4 are actually the top 4
        live.top4_teams = [...cached.pointsTable]
          .sort((a: any, b: any) => (b.points ?? 0) - (a.points ?? 0))
          .slice(0, 4)
          .map((r: any) => r.shortname || r.team);
      }
    }

    const users = await db`
      SELECT u.id, u.display_name, p.*,
        (SELECT COUNT(*) FROM game_predictions gp
          JOIN games g ON gp.game_id = g.id
          WHERE gp.user_id = u.id AND gp.predicted_winner = g.actual_winner AND g.actual_winner IS NOT NULL
        ) as game_wins
      FROM users u
      LEFT JOIN predictions p ON p.user_id = u.id
      ORDER BY u.display_name
    `;

    entries = users.map((u: any) => {
      if (!u.orange_cap_1) return { name: u.display_name, total: 0, breakdown: null, hasPicks: false };
      const score = calculateScore(u, live, Number(u.game_wins || 0));
      return {
        name: u.display_name, total: score.total, breakdown: score, hasPicks: true,
        orange_cap_1: u.orange_cap_1, orange_cap_2: u.orange_cap_2, orange_cap_3: u.orange_cap_3,
        purple_cap_1: u.purple_cap_1, purple_cap_2: u.purple_cap_2, purple_cap_3: u.purple_cap_3,
        top4_team_1: u.top4_team_1, top4_team_2: u.top4_team_2, top4_team_3: u.top4_team_3, top4_team_4: u.top4_team_4,
        ipl_winner: u.ipl_winner,
      };
    }).sort((a: any, b: any) => b.total - a.total);
  } catch (e) {}

  const rankStyle = [
    { bg: '#FFF8E6', border: '#F0C040', badge: '#D4A017', emoji: '🥇' },
    { bg: '#F5F5F5', border: '#C8C8C8', badge: '#888', emoji: '🥈' },
    { bg: '#FFF0EA', border: '#E8C0A8', badge: '#C06030', emoji: '🥉' },
  ];

  return (
    <div className="leaderboard-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 28, alignItems: 'start' }}>
      {/* LEFT: Leaderboard */}
      <div>
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontSize: 34, fontWeight: 800, margin: '0 0 6px', lineHeight: 1.1 }}>
            🏆 IPL 2026 <span style={{ color: 'var(--accent)' }}>Predictor</span>
          </h1>
          <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: 14 }}>
            Live leaderboard · scores update as the season unfolds
          </p>
        </div>

        {entries.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '48px 20px' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>🏏</div>
            <h2 style={{ margin: '0 0 8px', fontSize: 20 }}>No predictions yet</h2>
            <p style={{ color: 'var(--text-muted)', marginBottom: 20, fontSize: 14 }}>Be the first!</p>
            <a href="/signup" className="btn-primary" style={{ textDecoration: 'none', display: 'inline-block', fontSize: 14 }}>
              Sign Up & Make Picks →
            </a>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
            {entries.map((e: any, i: number) => {
              const s = rankStyle[i] || { bg: 'white', border: 'var(--border)', badge: 'var(--text-muted)', emoji: `#${i+1}` };
              return (
                <div key={e.name} style={{ background: s.bg, border: `1.5px solid ${s.border}`, borderRadius: 14, padding: '16px 20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <span style={{ fontSize: 24 }}>{s.emoji}</span>
                      <div>
                        <p style={{ margin: 0, fontFamily: 'Bricolage Grotesque, sans-serif', fontWeight: 700, fontSize: 17 }}>{e.name}</p>
                        {!e.hasPicks && <p style={{ margin: 0, fontSize: 11, color: 'var(--text-muted)' }}>No picks yet</p>}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <p style={{ margin: 0, fontFamily: 'Bricolage Grotesque, sans-serif', fontWeight: 800, fontSize: 30, color: s.badge, lineHeight: 1 }}>{e.total}</p>
                      <p style={{ margin: 0, fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>pts</p>
                    </div>
                  </div>
                  {e.breakdown && (
                    <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${s.border}`, display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 6 }}>
                      {[
                        ['🏆', 'Winner', e.breakdown.winnerPts],
                        ['🏅', 'Top 4', e.breakdown.top4Pts],
                        ['🟠', 'Orange', e.breakdown.orangeCapPts],
                        ['🟣', 'Purple', e.breakdown.purpleCapPts],
                      ].map(([icon, label, pts]) => (
                        <div key={String(label)} style={{ textAlign: 'center', background: 'rgba(255,255,255,0.6)', borderRadius: 8, padding: '6px 4px' }}>
                          <p style={{ margin: 0, fontSize: 10, color: 'var(--text-muted)' }}>{icon} {label}</p>
                          <p style={{ margin: 0, fontWeight: 700, fontSize: 14 }}>{pts}<span style={{ fontWeight: 400, fontSize: 10 }}> pts</span></p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Scoring rules */}
        <Collapsible title="📋 Scoring Rules">
          <div style={{ padding: '0 20px' }}>
          <div className="scoring-rules-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 20px' }}>
            {[
              ['🏆', 'Correct IPL Winner', '10 pts'],
              ['🏅', 'Each correct Top 4', '3 pts'],
              ['🟠🟣', 'Cap holder #1', '7 pts'],
              ['🟠🟣', 'Cap Top 3', '3 pts'],
              ['🟠🟣', 'Cap Top 10', '1 pt'],
            ].map(([icon, label, pts]) => (
              <div key={String(label)} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                <span style={{ color: 'var(--text-muted)' }}>{icon} {label}</span>
                <span style={{ fontWeight: 700, color: 'var(--accent)' }}>{pts}</span>
              </div>
            ))}
          </div>
          </div>
        </Collapsible>
        <div style={{ marginTop: 10 }} />
        <Collapsible title="🧑‍🤝‍🧑 Everyone's Picks">
          <PicksTable entries={entries} />
        </Collapsible>
      </div>

      {/* RIGHT: Live Tournament Stats */}
      <LiveStats />
    </div>
  );
}
