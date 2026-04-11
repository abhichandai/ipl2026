import { getDB } from '@/lib/db';
import { calculateScore } from '@/lib/scoring';

export const revalidate = 60;

export default async function Leaderboard() {
  let entries: any[] = [];
  let live: any = { orange_cap_rankings: [], purple_cap_rankings: [], top4_teams: [], tournament_winner: null };

  try {
    const db = getDB();
    const liveRows = await db`SELECT * FROM live_data LIMIT 1`;
    if (liveRows[0]) live = liveRows[0];

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
      return { name: u.display_name, total: score.total, breakdown: score, hasPicks: true };
    }).sort((a: any, b: any) => b.total - a.total);
  } catch (e) {}

  const rankStyle = [
    { bg: '#FFF8E6', border: '#F0C040', badge: '#D4A017', emoji: '🥇' },
    { bg: '#F5F5F5', border: '#C0C0C0', badge: '#888', emoji: '🥈' },
    { bg: '#FFF0EA', border: '#E8500A', badge: '#E8500A', emoji: '🥉' },
  ];

  return (
    <div>
      {/* Hero */}
      <div style={{ marginBottom: 40 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
          <span style={{ fontSize: 40 }}>🏆</span>
          <h1 style={{ fontSize: 38, fontWeight: 800, margin: 0, lineHeight: 1.1 }}>
            IPL 2026<br />
            <span style={{ color: 'var(--accent)' }}>Predictor</span>
          </h1>
        </div>
        <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: 15 }}>
          Live leaderboard — scores update as the season unfolds
        </p>
      </div>

      {entries.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '60px 20px' }}>
          <div style={{ fontSize: 56, marginBottom: 16 }}>🏏</div>
          <h2 style={{ margin: '0 0 8px', fontSize: 22 }}>No predictions yet</h2>
          <p style={{ color: 'var(--text-muted)', marginBottom: 24 }}>Be the first to make your picks!</p>
          <a href="/signup" className="btn-primary" style={{ textDecoration: 'none', display: 'inline-block' }}>
            Sign Up & Make Your Picks →
          </a>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 32 }}>
          {entries.map((e: any, i: number) => {
            const style = rankStyle[i] || { bg: 'white', border: 'var(--border)', badge: 'var(--text-muted)', emoji: `#${i+1}` };
            return (
              <div key={e.name} style={{
                background: style.bg, border: `1.5px solid ${style.border}`,
                borderRadius: 16, padding: '20px 24px',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    <span style={{ fontSize: 28 }}>{style.emoji}</span>
                    <div>
                      <p style={{ margin: 0, fontFamily: 'Bricolage Grotesque, sans-serif', fontWeight: 700, fontSize: 18 }}>{e.name}</p>
                      {!e.hasPicks && <p style={{ margin: 0, fontSize: 12, color: 'var(--text-muted)' }}>No picks submitted yet</p>}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <p style={{ margin: 0, fontFamily: 'Bricolage Grotesque, sans-serif', fontWeight: 800, fontSize: 32, color: style.badge, lineHeight: 1 }}>{e.total}</p>
                    <p style={{ margin: 0, fontSize: 11, color: 'var(--text-muted)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em' }}>pts</p>
                  </div>
                </div>
                {e.breakdown && (
                  <div style={{ marginTop: 14, paddingTop: 14, borderTop: `1px solid ${style.border}`, display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                    {[
                      { label: '🏆 Winner', pts: e.breakdown.winnerPts },
                      { label: '🏅 Top 4', pts: e.breakdown.top4Pts },
                      { label: '🟠 Orange', pts: e.breakdown.orangeCapPts },
                      { label: '🟣 Purple', pts: e.breakdown.purpleCapPts },
                    ].map(s => (
                      <div key={s.label} style={{ textAlign: 'center', background: 'rgba(255,255,255,0.6)', borderRadius: 10, padding: '8px 4px' }}>
                        <p style={{ margin: 0, fontSize: 11, color: 'var(--text-muted)' }}>{s.label}</p>
                        <p style={{ margin: 0, fontWeight: 700, fontSize: 15 }}>{s.pts} <span style={{ fontWeight: 400, fontSize: 11 }}>pts</span></p>
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
      <div className="card" style={{ padding: '20px 24px' }}>
        <p style={{ margin: '0 0 14px', fontFamily: 'Bricolage Grotesque, sans-serif', fontWeight: 700, fontSize: 13, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          Scoring Rules
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 24px' }}>
          {[
            ['🏆', 'Correct IPL Winner', '10 pts'],
            ['🏅', 'Each correct Top 4 team', '3 pts'],
            ['🟠🟣', 'Cap holder #1', '7 pts'],
            ['🟠🟣', 'Cap holder Top 3', '3 pts'],
            ['🟠🟣', 'Cap holder Top 10', '1 pt'],
            ['🎮', 'Each correct game pick', '1 pt'],
          ].map(([icon, label, pts]) => (
            <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13 }}>
              <span style={{ color: 'var(--text-muted)' }}>{icon} {label}</span>
              <span style={{ fontWeight: 700, color: 'var(--accent)' }}>{pts}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
