'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

const TEAMS = ['RCB', 'CSK', 'MI', 'KKR', 'SRH', 'RR', 'PBKS', 'DC', 'GT', 'LSG'];

export default function AdminPage() {
  const router = useRouter();
  const [tab, setTab] = useState<'live' | 'games' | 'stats'>('live');
  const [loading, setLoading] = useState(true);

  // Live data state
  const [orangeCap, setOrangeCap] = useState<string[]>(Array(10).fill(''));
  const [purpleCap, setPurpleCap] = useState<string[]>(Array(10).fill(''));
  const [top4, setTop4] = useState<string[]>(['', '', '', '']);
  const [winner, setWinner] = useState('');
  const [liveSaving, setLiveSaving] = useState(false);
  const [liveSaved, setLiveSaved] = useState(false);

  // Games state
  const [games, setGames] = useState<any[]>([]);
  const [newGame, setNewGame] = useState({ match_date: '', team1: '', team2: '', is_playoff: false });

  useEffect(() => {
    fetch('/api/me').then(r => r.json()).then(d => {
      if (!d.user?.is_admin) router.push('/');
    });
    fetch('/api/admin/live').then(r => r.json()).then(d => {
      if (d.data) {
        setOrangeCap(d.data.orange_cap_rankings?.length ? [...d.data.orange_cap_rankings, ...Array(10).fill('')].slice(0, 10) : Array(10).fill(''));
        setPurpleCap(d.data.purple_cap_rankings?.length ? [...d.data.purple_cap_rankings, ...Array(10).fill('')].slice(0, 10) : Array(10).fill(''));
        setTop4(d.data.top4_teams?.length ? [...d.data.top4_teams, ...Array(4).fill('')].slice(0, 4) : ['', '', '', '']);
        setWinner(d.data.tournament_winner || '');
      }
      setLoading(false);
    });
    loadGames();
  }, []);

  function loadGames() {
    fetch('/api/admin/games').then(r => r.json()).then(d => setGames(d.games || []));
  }

  async function saveLiveData() {
    setLiveSaving(true);
    await fetch('/api/admin/live', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        orange_cap_rankings: orangeCap.filter(Boolean),
        purple_cap_rankings: purpleCap.filter(Boolean),
        top4_teams: top4.filter(Boolean),
        tournament_winner: winner || null,
      }),
    });
    setLiveSaving(false);
    setLiveSaved(true);
    setTimeout(() => setLiveSaved(false), 2000);
  }

  async function setGameResult(game_id: number, actual_winner: string) {
    await fetch('/api/admin/games', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'result', game_id, actual_winner }),
    });
    loadGames();
  }

  async function addGame() {
    await fetch('/api/admin/games', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'add', ...newGame }),
    });
    setNewGame({ match_date: '', team1: '', team2: '', is_playoff: false });
    loadGames();
  }

  async function deleteGame(game_id: number) {
    await fetch('/api/admin/games', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'delete', game_id }),
    });
    loadGames();
  }

  const [refreshing, setRefreshing] = useState(false);
  const [refreshMsg, setRefreshMsg] = useState('');

  async function refreshStats() {
    setRefreshing(true);
    setRefreshMsg('⏳ Scraping ESPNcricinfo… this takes ~30 seconds');
    try {
      const res = await fetch('/api/cricket?refresh=1&key=ipl2026');
      const d = await res.json();
      if (d.error || !d.success) {
        setRefreshMsg('❌ ' + (d.error || 'Refresh failed'));
        setTimeout(() => setRefreshMsg(''), 6000);
      } else {
        setRefreshMsg(`✅ Done! Got ${d.orangeCapCount} batters, ${d.purpleCapCount} bowlers, ${d.pointsTableCount} teams. Reload the leaderboard.`);
        setTimeout(() => setRefreshMsg(''), 10000);
      }
    } catch (e: any) {
      setRefreshMsg('❌ Network error: ' + e.message);
      setTimeout(() => setRefreshMsg(''), 6000);
    }
    setRefreshing(false);
  }

  if (loading) return <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-muted)' }}>Loading...</div>;

  return (
    <div>
      <h1 className="text-3xl font-bold text-yellow-400 mb-6">⚙️ Admin Panel</h1>

      <div className="flex gap-2 mb-6">
        {(['live', 'games', 'stats'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-lg font-semibold text-sm ${tab === t ? 'bg-yellow-400 text-gray-900' : 'bg-gray-800 text-gray-400 hover:text-white'}`}>
            {t === 'live' ? '📊 Live Standings' : t === 'games' ? '🎮 Games' : '🏏 Tournament Stats'}
          </button>
        ))}
      </div>

      {tab === 'live' && (
        <div className="space-y-6">
          {/* Orange Cap */}
          <div className="bg-gray-900 rounded-2xl p-5 border border-orange-500/30">
            <h2 className="font-bold text-orange-400 mb-4">🟠 Orange Cap Rankings (Top 10)</h2>
            <div className="grid grid-cols-2 gap-2">
              {orangeCap.map((p, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="text-gray-500 text-sm w-4">{i + 1}.</span>
                  <input value={p} onChange={e => { const a = [...orangeCap]; a[i] = e.target.value; setOrangeCap(a); }}
                    placeholder={`Rank ${i + 1}`}
                    className="flex-1 bg-gray-800 border border-gray-700 rounded px-3 py-1.5 text-sm text-white focus:outline-none focus:border-orange-400" />
                </div>
              ))}
            </div>
          </div>

          {/* Purple Cap */}
          <div className="bg-gray-900 rounded-2xl p-5 border border-purple-500/30">
            <h2 className="font-bold text-purple-400 mb-4">🟣 Purple Cap Rankings (Top 10)</h2>
            <div className="grid grid-cols-2 gap-2">
              {purpleCap.map((p, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="text-gray-500 text-sm w-4">{i + 1}.</span>
                  <input value={p} onChange={e => { const a = [...purpleCap]; a[i] = e.target.value; setPurpleCap(a); }}
                    placeholder={`Rank ${i + 1}`}
                    className="flex-1 bg-gray-800 border border-gray-700 rounded px-3 py-1.5 text-sm text-white focus:outline-none focus:border-purple-400" />
                </div>
              ))}
            </div>
          </div>

          {/* Top 4 */}
          <div className="bg-gray-900 rounded-2xl p-5 border border-blue-500/30">
            <h2 className="font-bold text-blue-400 mb-4">🏅 Current Top 4 Teams</h2>
            <div className="grid grid-cols-2 gap-2">
              {top4.map((t, i) => (
                <select key={i} value={t} onChange={e => { const a = [...top4]; a[i] = e.target.value; setTop4(a); }}
                  className="bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-400">
                  <option value="">-- Team {i + 1} --</option>
                  {TEAMS.map(tm => <option key={tm} value={tm}>{tm}</option>)}
                </select>
              ))}
            </div>
          </div>

          {/* Tournament Winner */}
          <div className="bg-gray-900 rounded-2xl p-5 border border-yellow-500/30">
            <h2 className="font-bold text-yellow-400 mb-4">🏆 Tournament Winner (set at end)</h2>
            <select value={winner} onChange={e => setWinner(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-yellow-400">
              <option value="">-- Not decided yet --</option>
              {TEAMS.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          <button onClick={saveLiveData} disabled={liveSaving}
            className="w-full bg-yellow-400 text-gray-900 font-bold py-3 rounded-xl hover:bg-yellow-300 disabled:opacity-50 transition">
            {liveSaving ? 'Saving...' : liveSaved ? '✅ Saved!' : 'Update Live Standings'}
          </button>
        </div>
      )}

      {tab === 'stats' && (
        <div className="card" style={{ padding: '24px' }}>
          <h2 style={{ fontFamily: 'Bricolage Grotesque, sans-serif', fontWeight: 700, fontSize: 18, margin: '0 0 8px' }}>
            🏏 Live Tournament Stats
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: 13, margin: '0 0 20px' }}>
            Pulls Points Table, Orange Cap & Purple Cap from ESPNcricinfo via AI scraping.
            Cached for 3 hours. Use manual refresh to update immediately.
          </p>
          <button
            onClick={refreshStats}
            disabled={refreshing}
            className="btn-primary"
            style={{ fontSize: 14, padding: '10px 20px' }}
          >
            {refreshing ? '⏳ Scraping ESPNcricinfo...' : '🔄 Refresh Stats Now'}
          </button>
          {refreshMsg && (
            <p style={{ marginTop: 12, fontSize: 13, fontWeight: 600, color: refreshMsg.startsWith('✅') ? 'var(--green)' : '#DC2626' }}>
              {refreshMsg}
            </p>
          )}

        </div>
      )}

      {tab === 'games' && (
        <div className="space-y-4">
          {/* Add game */}
          <div className="bg-gray-900 rounded-2xl p-5 border border-gray-700">
            <h2 className="font-bold text-gray-300 mb-4">Add Game</h2>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <input type="date" value={newGame.match_date} onChange={e => setNewGame(g => ({ ...g, match_date: e.target.value }))}
                className="bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white text-sm" />
              <label className="flex items-center gap-2 text-sm text-gray-400">
                <input type="checkbox" checked={newGame.is_playoff} onChange={e => setNewGame(g => ({ ...g, is_playoff: e.target.checked }))} />
                Playoff game
              </label>
              <select value={newGame.team1} onChange={e => setNewGame(g => ({ ...g, team1: e.target.value }))}
                className="bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white text-sm">
                <option value="">Team 1</option>
                {TEAMS.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
              <select value={newGame.team2} onChange={e => setNewGame(g => ({ ...g, team2: e.target.value }))}
                className="bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white text-sm">
                <option value="">Team 2</option>
                {TEAMS.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <button onClick={addGame} className="bg-yellow-400 text-gray-900 font-bold px-4 py-2 rounded-lg hover:bg-yellow-300">
              + Add Game
            </button>
          </div>

          {/* Games list */}
          {games.map(g => (
            <div key={g.id} className="bg-gray-900 rounded-xl p-4 border border-gray-800 flex items-center justify-between gap-4">
              <div>
                <p className="font-semibold">{g.team1} vs {g.team2}</p>
                <p className="text-xs text-gray-500">{new Date(g.match_date).toDateString()}{g.is_playoff ? ' · Playoff' : ''}</p>
                {g.actual_winner && <p className="text-xs text-green-400">✅ {g.actual_winner} won</p>}
              </div>
              <div className="flex items-center gap-2">
                {!g.actual_winner && (
                  <select onChange={e => e.target.value && setGameResult(g.id, e.target.value)} defaultValue=""
                    className="bg-gray-800 border border-gray-700 rounded px-2 py-1 text-sm text-white">
                    <option value="">Set winner</option>
                    <option value={g.team1}>{g.team1}</option>
                    <option value={g.team2}>{g.team2}</option>
                  </select>
                )}
                <button onClick={() => deleteGame(g.id)} className="text-red-500 hover:text-red-400 text-xs">Delete</button>
              </div>
            </div>
          ))}
          {games.length === 0 && <p className="text-gray-500 text-center py-8">No games added yet.</p>}
        </div>
      )}
    </div>
  );
}
// Appended refresh export - handled inline in the component above
