'use client';

interface Picks {
  name: string;
  orange_cap_1: string; orange_cap_2: string; orange_cap_3: string;
  purple_cap_1: string; purple_cap_2: string; purple_cap_3: string;
  top4_team_1: string; top4_team_2: string; top4_team_3: string; top4_team_4: string;
  ipl_winner: string;
}

const TEAM_COLORS: Record<string, string> = {
  RCB: '#E8500A', CSK: '#F5A623', MI: '#005FA8', KKR: '#3D1C6E',
  SRH: '#FF6B00', RR: '#EA1A7F', PBKS: '#C8102E', DC: '#004C97',
  GT: '#1C4670', LSG: '#00AAE8',
};

function TeamBadge({ name }: { name: string }) {
  if (!name) return <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>—</span>;
  const color = TEAM_COLORS[name] || '#888';
  return <span style={{ background: color, color: 'white', fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 4 }}>{name}</span>;
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
      <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, minWidth: 80, paddingTop: 2 }}>{label}</span>
      <div style={{ flex: 1 }}>{children}</div>
    </div>
  );
}

function PlayerPick({ name }: { name: string }) {
  if (!name) return <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>—</span>;
  return <span style={{ fontSize: 12, fontWeight: 500 }}>{name}</span>;
}

export default function PicksTable({ entries }: { entries: Picks[] }) {
  const withPicks = entries.filter(e => e.orange_cap_1);
  if (withPicks.length === 0) return null;

  return (
    <div style={{ marginTop: 24 }}>
      <h3 style={{ fontFamily: 'Bricolage Grotesque, sans-serif', fontWeight: 700, fontSize: 16, margin: '0 0 12px' }}>
        📋 Everyone's Picks
      </h3>
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${withPicks.length}, 1fr)`, gap: 10 }}>
        {withPicks.map(e => (
          <div key={e.name} className="card" style={{ padding: '14px 16px', minWidth: 0 }}>
            <p style={{ fontFamily: 'Bricolage Grotesque, sans-serif', fontWeight: 700, fontSize: 15, margin: '0 0 10px', color: 'var(--accent)' }}>
              {e.name}
            </p>

            <Row label="🏆 Winner">
              <TeamBadge name={e.ipl_winner} />
            </Row>

            <Row label="🏅 Top 4">
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {[e.top4_team_1, e.top4_team_2, e.top4_team_3, e.top4_team_4].map((t, i) => (
                  <TeamBadge key={i} name={t} />
                ))}
              </div>
            </Row>

            <Row label="🟠 Orange">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                <PlayerPick name={e.orange_cap_1} />
                <PlayerPick name={e.orange_cap_2} />
                <span style={{ fontSize: 10, color: 'var(--accent)', fontStyle: 'italic' }}>🎲 {e.orange_cap_3 || '—'}</span>
              </div>
            </Row>

            <Row label="🟣 Purple">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                <PlayerPick name={e.purple_cap_1} />
                <PlayerPick name={e.purple_cap_2} />
                <span style={{ fontSize: 10, color: 'var(--purple)', fontStyle: 'italic' }}>🎲 {e.purple_cap_3 || '—'}</span>
              </div>
            </Row>
          </div>
        ))}
      </div>
    </div>
  );
}
