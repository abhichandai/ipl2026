'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

const IPL_TEAMS = ['RCB', 'CSK', 'MI', 'KKR', 'SRH', 'RR', 'PBKS', 'DC', 'GT', 'LSG'];

// Fallback static lists if API is unavailable
// Orange Cap top 10 as of Apr 11 2026, then other key picks
const FALLBACK_BATTERS = [
  'V Sooryavanshi','YBK Jaiswal','H Klaasen','DC Jurel','Sameer Rizvi',
  'V Kohli','RG Sharma','Shubman Gill','KL Rahul','SA Yadav',
  'B Sai Sudharsan','SS Iyer','MR Marsh','JC Buttler','N Pooran',
  'Prabhsimran Singh','RD Gaikwad','Riyan Parag','Devdutt Padikkal','Ryan Rickelton',
];
// Purple Cap top 10 as of Apr 11 2026, then other key picks
const FALLBACK_BOWLERS = [
  'Ravi Bishnoi','M Prasidh Krishna','Rashid Khan','L Ngidi','Anshul Kamboj',
  'Jacob Duffy','Vijaykumar Vyshak','Nandre Burger','Jofra Archer','T Natarajan',
  'JJ Bumrah','Arshdeep Singh','Kuldeep Yadav','JR Hazlewood','Mohammed Siraj',
  'TA Boult','YS Chahal','CV Varun','B Kumar','HH Pandya',
];

function Select({ label, hint, value, onChange, options }: any) {
  return (
    <div>
      <label style={{ display: 'block', fontWeight: 600, fontSize: 12, marginBottom: 4, color: 'var(--text)' }}>{label}</label>
      {hint && <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: '0 0 4px' }}>{hint}</p>}
      <select className="input" value={value || ''} onChange={e => onChange(e.target.value)}>
        <option value="">— Select —</option>
        {options.map((o: string) => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
}

function Section({ color, title, children }: { color: string; title: string; children: React.ReactNode }) {
  return (
    <div className="card" style={{ padding: '22px 24px', borderLeft: `4px solid ${color}` }}>
      <h2 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 700, color }}>{title}</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>{children}</div>
    </div>
  );
}

export default function PredictionsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [locked, setLocked] = useState(false);
  const [batters, setBatters] = useState<string[]>(FALLBACK_BATTERS);
  const [bowlers, setBowlers] = useState<string[]>(FALLBACK_BOWLERS);
  const [playerListSource, setPlayerListSource] = useState<'live' | 'fallback'>('fallback');
  const [picks, setPicks] = useState({
    orange_cap_1:'', orange_cap_2:'', orange_cap_3:'',
    purple_cap_1:'', purple_cap_2:'', purple_cap_3:'',
    top4_team_1:'', top4_team_2:'', top4_team_3:'', top4_team_4:'',
    ipl_winner:'',
  });

  useEffect(() => {
    fetch('/api/me').then(r => r.json()).then(d => { if (!d.user) router.push('/login'); });

    // Load existing predictions
    fetch('/api/predictions').then(r => r.json()).then(d => {
      if (d.predictions) { setPicks(d.predictions); setLocked(d.predictions.locked); }
      setLoading(false);
    });

    // Load live player lists from CricAPI (cached)
    fetch('/api/players').then(r => r.json()).then(d => {
      if (d.batters?.length > 5) {
        setBatters(d.batters.sort());
        setPlayerListSource('live');
      }
      if (d.bowlers?.length > 5) {
        setBowlers(d.bowlers.sort());
      }
    }).catch(() => {}); // silently fall back
  }, []);

  function set(key: string, val: string) { setPicks(p => ({ ...p, [key]: val })); setSaved(false); }

  async function handleSave() {
    setSaving(true);
    const res = await fetch('/api/predictions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(picks) });
    setSaving(false);
    if (res.ok) setSaved(true);
  }

  const top4Selected = [picks.top4_team_1, picks.top4_team_2, picks.top4_team_3, picks.top4_team_4].filter(Boolean);
  const teamOptions = (current: string) => IPL_TEAMS.filter(t => !top4Selected.includes(t) || t === current);

  if (loading) return <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-muted)' }}>Loading...</div>;

  return (
    <div>
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 32, fontWeight: 800, margin: '0 0 6px' }}>Your Predictions</h1>
        <p style={{ color: 'var(--text-muted)', margin: '0 0 4px' }}>Make your picks for IPL 2026</p>
        {playerListSource === 'live' && (
          <p style={{ fontSize: 11, color: 'var(--green)', margin: 0 }}>
            ✓ Player lists loaded live from IPL 2026 squads
          </p>
        )}
        {locked && (
          <div style={{ marginTop: 12, background: '#FFF0EA', border: '1px solid var(--accent)', borderRadius: 10, padding: '10px 14px', fontSize: 13, color: 'var(--accent)', fontWeight: 600 }}>
            🔒 Predictions are locked for the season
          </div>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <Section color="var(--accent)" title="🟠 Orange Cap — Pick 3 Batters">
          <Select label="1st Pick" hint="7 pts if #1 · 3 pts if Top 3 · 1 pt if Top 10" value={picks.orange_cap_1} onChange={(v: string) => set('orange_cap_1', v)} options={batters} />
          <Select label="2nd Pick" value={picks.orange_cap_2} onChange={(v: string) => set('orange_cap_2', v)} options={batters} />
          <Select label="3rd Pick 🎲 Dark Horse" value={picks.orange_cap_3} onChange={(v: string) => set('orange_cap_3', v)} options={batters} />
        </Section>

        <Section color="var(--purple)" title="🟣 Purple Cap — Pick 3 Bowlers">
          <Select label="1st Pick" hint="7 pts if #1 · 3 pts if Top 3 · 1 pt if Top 10" value={picks.purple_cap_1} onChange={(v: string) => set('purple_cap_1', v)} options={bowlers} />
          <Select label="2nd Pick" value={picks.purple_cap_2} onChange={(v: string) => set('purple_cap_2', v)} options={bowlers} />
          <Select label="3rd Pick 🎲 Dark Horse" value={picks.purple_cap_3} onChange={(v: string) => set('purple_cap_3', v)} options={bowlers} />
        </Section>

        <Section color="var(--accent2)" title="🏅 Top 4 Teams — 3 pts each correct pick">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {(['top4_team_1','top4_team_2','top4_team_3','top4_team_4'] as const).map((key, i) => (
              <Select key={key} label={`Team ${i+1}`} value={picks[key]} onChange={(v: string) => set(key, v)} options={teamOptions(picks[key])} />
            ))}
          </div>
        </Section>

        <Section color="var(--gold)" title="🏆 IPL Winner — 10 pts">
          <Select label="Pick the champion" value={picks.ipl_winner} onChange={(v: string) => set('ipl_winner', v)} options={IPL_TEAMS} />
        </Section>

        {!locked && (
          <button onClick={handleSave} disabled={saving} className="btn-primary" style={{ fontSize: 16, padding: '15px 20px' }}>
            {saving ? 'Saving...' : saved ? '✅ Predictions Saved!' : 'Save Predictions'}
          </button>
        )}
      </div>
    </div>
  );
}
