'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

const IPL_TEAMS = ['RCB', 'CSK', 'MI', 'KKR', 'SRH', 'RR', 'PBKS', 'DC', 'GT', 'LSG'];

const TOP_BATTERS = [
  'V Kohli', 'RG Sharma', 'Shubman Gill', 'YBK Jaiswal', 'KL Rahul',
  'SA Yadav', 'B Sai Sudharsan', 'SS Iyer', 'MR Marsh', 'JC Buttler',
  'N Pooran', 'Prabhsimran Singh', 'DP Conway', 'RD Gaikwad',
];

const TOP_BOWLERS = [
  'JJ Bumrah', 'M Prasidh Krishna', 'Arshdeep Singh', 'Kuldeep Yadav',
  'JR Hazlewood', 'R Sai Kishore', 'Noor Ahmad', 'TA Boult',
  'Mohammed Siraj', 'CV Varun', 'KH Pandya', 'B Kumar',
  'HH Pandya', 'YS Chahal',
];

function PlayerSelect({ label, value, onChange, options }: any) {
  return (
    <div>
      <label className="block text-xs text-gray-500 mb-1">{label}</label>
      <select
        value={value || ''}
        onChange={e => onChange(e.target.value)}
        className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-yellow-400"
      >
        <option value="">-- Select Player --</option>
        {options.map((p: string) => <option key={p} value={p}>{p}</option>)}
      </select>
    </div>
  );
}

function TeamSelect({ label, value, onChange, exclude }: any) {
  return (
    <div>
      <label className="block text-xs text-gray-500 mb-1">{label}</label>
      <select
        value={value || ''}
        onChange={e => onChange(e.target.value)}
        className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-yellow-400"
      >
        <option value="">-- Select Team --</option>
        {IPL_TEAMS.filter(t => !exclude.includes(t) || t === value).map((t: string) => (
          <option key={t} value={t}>{t}</option>
        ))}
      </select>
    </div>
  );
}

export default function PredictionsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [locked, setLocked] = useState(false);
  const [picks, setPicks] = useState({
    orange_cap_1: '', orange_cap_2: '', orange_cap_3: '',
    purple_cap_1: '', purple_cap_2: '', purple_cap_3: '',
    top4_team_1: '', top4_team_2: '', top4_team_3: '', top4_team_4: '',
    ipl_winner: '',
  });

  useEffect(() => {
    fetch('/api/me').then(r => r.json()).then(d => {
      if (!d.user) router.push('/login');
    });
    fetch('/api/predictions').then(r => r.json()).then(d => {
      if (d.predictions) {
        setPicks(d.predictions);
        setLocked(d.predictions.locked);
      }
      setLoading(false);
    });
  }, []);

  function set(key: string, val: string) {
    setPicks(p => ({ ...p, [key]: val }));
    setSaved(false);
  }

  async function handleSave() {
    setSaving(true);
    const res = await fetch('/api/predictions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(picks),
    });
    setSaving(false);
    if (res.ok) setSaved(true);
  }

  const top4Selected = [picks.top4_team_1, picks.top4_team_2, picks.top4_team_3, picks.top4_team_4].filter(Boolean);

  if (loading) return <div className="text-center py-20 text-gray-500">Loading...</div>;

  return (
    <div className="max-w-2xl mx-auto">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-yellow-400">🏏 Your Predictions</h1>
        <p className="text-gray-400 mt-2">Make your picks for IPL 2026</p>
        {locked && <p className="mt-2 text-red-400 text-sm font-semibold">🔒 Predictions are locked for the season</p>}
      </div>

      <div className="space-y-6">

        {/* Orange Cap */}
        <div className="bg-gray-900 rounded-2xl p-5 border border-orange-500/30">
          <h2 className="font-bold text-orange-400 mb-4">🟠 Orange Cap — Pick 3 Batters</h2>
          <div className="grid grid-cols-1 gap-3">
            <PlayerSelect label="1st Pick (7 pts if #1, 3 pts if Top 3, 1 pt if Top 10)" value={picks.orange_cap_1} onChange={(v: string) => set('orange_cap_1', v)} options={TOP_BATTERS} />
            <PlayerSelect label="2nd Pick" value={picks.orange_cap_2} onChange={(v: string) => set('orange_cap_2', v)} options={TOP_BATTERS} />
            <PlayerSelect label="3rd Pick" value={picks.orange_cap_3} onChange={(v: string) => set('orange_cap_3', v)} options={TOP_BATTERS} />
          </div>
        </div>

        {/* Purple Cap */}
        <div className="bg-gray-900 rounded-2xl p-5 border border-purple-500/30">
          <h2 className="font-bold text-purple-400 mb-4">🟣 Purple Cap — Pick 3 Bowlers</h2>
          <div className="grid grid-cols-1 gap-3">
            <PlayerSelect label="1st Pick (7 pts if #1, 3 pts if Top 3, 1 pt if Top 10)" value={picks.purple_cap_1} onChange={(v: string) => set('purple_cap_1', v)} options={TOP_BOWLERS} />
            <PlayerSelect label="2nd Pick" value={picks.purple_cap_2} onChange={(v: string) => set('purple_cap_2', v)} options={TOP_BOWLERS} />
            <PlayerSelect label="3rd Pick" value={picks.purple_cap_3} onChange={(v: string) => set('purple_cap_3', v)} options={TOP_BOWLERS} />
          </div>
        </div>

        {/* Top 4 */}
        <div className="bg-gray-900 rounded-2xl p-5 border border-blue-500/30">
          <h2 className="font-bold text-blue-400 mb-4">🏅 Top 4 Teams — Pick 4 Teams (3 pts each)</h2>
          <div className="grid grid-cols-2 gap-3">
            <TeamSelect label="Team 1" value={picks.top4_team_1} onChange={(v: string) => set('top4_team_1', v)} exclude={top4Selected.filter(t => t !== picks.top4_team_1)} />
            <TeamSelect label="Team 2" value={picks.top4_team_2} onChange={(v: string) => set('top4_team_2', v)} exclude={top4Selected.filter(t => t !== picks.top4_team_2)} />
            <TeamSelect label="Team 3" value={picks.top4_team_3} onChange={(v: string) => set('top4_team_3', v)} exclude={top4Selected.filter(t => t !== picks.top4_team_3)} />
            <TeamSelect label="Team 4" value={picks.top4_team_4} onChange={(v: string) => set('top4_team_4', v)} exclude={top4Selected.filter(t => t !== picks.top4_team_4)} />
          </div>
        </div>

        {/* IPL Winner */}
        <div className="bg-gray-900 rounded-2xl p-5 border border-yellow-500/30">
          <h2 className="font-bold text-yellow-400 mb-4">🏆 IPL Winner — 10 pts</h2>
          <TeamSelect label="Pick the champion" value={picks.ipl_winner} onChange={(v: string) => set('ipl_winner', v)} exclude={[]} />
        </div>

        {!locked && (
          <button
            onClick={handleSave} disabled={saving}
            className="w-full bg-yellow-400 text-gray-900 font-bold py-4 rounded-xl hover:bg-yellow-300 disabled:opacity-50 transition text-lg"
          >
            {saving ? 'Saving...' : saved ? '✅ Saved!' : 'Save Predictions'}
          </button>
        )}
      </div>
    </div>
  );
}
