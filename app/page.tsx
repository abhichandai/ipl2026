import { getDB } from '@/lib/db';
import { calculateScore } from '@/lib/scoring';

export const revalidate = 60;

export default async function Leaderboard() {
  let entries: any[] = [];
  let live: any = { orange_cap_rankings: [], purple_cap_rankings: [], top4_teams: [], tournament_winner: null };

  try {
    const liveRows = await getDB()`SELECT * FROM live_data LIMIT 1`;
    if (liveRows[0]) live = liveRows[0];

    const users = await getDB()`
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
  } catch (e) {
    // DB not ready yet
  }

  const medals = ['🥇', '🥈', '🥉'];

  return (
    <div>
      <div className="text-center mb-10">
        <h1 className="text-4xl font-bold text-yellow-400 mb-2">🏆 IPL 2026 Predictor</h1>
        <p className="text-gray-400">Live leaderboard — updates as the season unfolds</p>
      </div>

      {entries.length === 0 ? (
        <div className="text-center py-20 text-gray-500">
          <div className="text-6xl mb-4">🏏</div>
          <p className="text-xl">No predictions yet. Be the first!</p>
          <a href="/signup" className="mt-4 inline-block bg-yellow-400 text-gray-900 px-6 py-2 rounded-lg font-bold hover:bg-yellow-300">
            Sign Up & Make Your Picks
          </a>
        </div>
      ) : (
        <div className="space-y-3">
          {entries.map((e: any, i: number) => (
            <div key={e.name} className={`rounded-xl p-4 border ${i === 0 ? 'border-yellow-500 bg-yellow-500/10' : 'border-gray-800 bg-gray-900'}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{medals[i] || `#${i + 1}`}</span>
                  <div>
                    <p className="font-bold text-lg">{e.name}</p>
                    {!e.hasPicks && <p className="text-xs text-gray-500">No picks submitted yet</p>}
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-3xl font-bold text-yellow-400">{e.total}</p>
                  <p className="text-xs text-gray-500">points</p>
                </div>
              </div>
              {e.breakdown && (
                <div className="mt-3 pt-3 border-t border-gray-800 grid grid-cols-4 gap-2 text-center text-xs">
                  <div>
                    <p className="text-gray-500">🏆 Winner</p>
                    <p className="font-semibold">{e.breakdown.winnerPts} pts</p>
                  </div>
                  <div>
                    <p className="text-gray-500">🏅 Top 4</p>
                    <p className="font-semibold">{e.breakdown.top4Pts} pts</p>
                  </div>
                  <div>
                    <p className="text-gray-500">🟠 Orange</p>
                    <p className="font-semibold">{e.breakdown.orangeCapPts} pts</p>
                  </div>
                  <div>
                    <p className="text-gray-500">🟣 Purple</p>
                    <p className="font-semibold">{e.breakdown.purpleCapPts} pts</p>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="mt-10 p-4 rounded-xl border border-gray-800 bg-gray-900">
        <h3 className="font-bold text-gray-400 mb-3 text-sm uppercase tracking-wider">Scoring Rules</h3>
        <div className="grid grid-cols-2 gap-2 text-sm text-gray-400">
          <p>🏆 Correct IPL Winner → <span className="text-white font-semibold">10 pts</span></p>
          <p>🏅 Each correct Top 4 → <span className="text-white font-semibold">3 pts</span></p>
          <p>🟠🟣 Cap #1 → <span className="text-white font-semibold">7 pts</span></p>
          <p>🟠🟣 Cap Top 3 → <span className="text-white font-semibold">3 pts</span></p>
          <p>🟠🟣 Cap Top 10 → <span className="text-white font-semibold">1 pt</span></p>
          <p>🎮 Each correct game → <span className="text-white font-semibold">1 pt</span></p>
        </div>
      </div>
    </div>
  );
}
