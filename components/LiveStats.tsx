'use client';
import { useEffect, useState } from 'react';

interface PointsRow { team: string; shortname: string; played: number; won: number; lost: number; points: number; nrr: string; }
interface CapRow { rank: number; player: string; team: string; runs?: number; wickets?: number; value?: number; }

const TEAM_COLORS: Record<string, string> = {
  RCB: '#E8500A', CSK: '#F5A623', MI: '#005FA8', KKR: '#3D1C6E',
  SRH: '#FF6B00', RR: '#EA1A7F', PBKS: '#C8102E', DC: '#004C97',
  GT: '#1C4670', LSG: '#00AAE8',
};

function TeamBadge({ name }: { name: string }) {
  const color = TEAM_COLORS[name] || '#888';
  return (
    <span style={{ background: color, color: 'white', fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 4, whiteSpace: 'nowrap' }}>
      {name}
    </span>
  );
}

function StatCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="card" style={{ padding: '16px 18px', marginBottom: 12 }}>
      <p style={{ margin: '0 0 10px', fontWeight: 700, fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{title}</p>
      {children}
    </div>
  );
}

export default function LiveStats() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/cricket').then(r => r.json()).then(d => { setData(d); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  const updatedAt = data?.updatedAt
    ? new Date(data.updatedAt).toLocaleString('en-CA', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
    : '';

  if (loading) return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {[180, 280, 280].map((h, i) => (
        <div key={i} className="card" style={{ padding: 16, height: h, opacity: 0.4, background: 'var(--surface2)' }} />
      ))}
    </div>
  );

  if (!data || data.error) return (
    <div className="card" style={{ padding: 20, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
      <p style={{ margin: 0 }}>⚠️ Live stats unavailable</p>
      <p style={{ margin: '4px 0 0', fontSize: 11 }}>Check back soon</p>
    </div>
  );

  return (
    <div className="live-stats-sticky" style={{ position: 'sticky', top: 76 }}>

      {/* Points Table — all 10 teams */}
      {data.pointsTable?.length > 0 && (
        <StatCard title="🏅 Points Table">
          {data.pointsTable.slice(0, 10).map((row: PointsRow, i: number) => (
            <div key={row.team || i} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '4px 6px', borderRadius: 7, marginBottom: 3,
              background: i < 4 ? 'var(--accent-light)' : 'transparent',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 10, color: 'var(--text-muted)', width: 14, textAlign: 'right' }}>{i + 1}</span>
                <TeamBadge name={row.shortname || row.team} />
              </div>
              <div style={{ display: 'flex', gap: 10, fontSize: 11 }}>
                <span style={{ color: 'var(--text-muted)' }}>{row.played}M</span>
                <span style={{ fontWeight: 700, minWidth: 36, textAlign: 'right' }}>{row.points} pts</span>
              </div>
            </div>
          ))}
          <p style={{ margin: '6px 0 0', fontSize: 10, color: 'var(--text-muted)' }}>🟠 Top 4 = Playoff zone</p>
        </StatCard>
      )}

      {/* Orange & Purple Cap side by side */}
      {(data.orangeCap?.length > 0 || data.purpleCap?.length > 0) && (
        <div className="cap-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>

          {/* Orange Cap */}
          <div className="card" style={{ padding: '14px 14px' }}>
            <p style={{ margin: '0 0 10px', fontWeight: 700, fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>🟠 Orange Cap</p>
            {data.orangeCap.slice(0, 10).map((row: CapRow, i: number) => (
              <div key={row.player || i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5, gap: 4 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, minWidth: 0 }}>
                  <span style={{ fontSize: 10, color: 'var(--text-muted)', width: 12, flexShrink: 0 }}>{row.rank ?? i + 1}</span>
                  <span style={{ fontSize: 11, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.player}</span>
                </div>
                <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent)', flexShrink: 0, marginLeft: 4 }}>
                  {row.runs ?? row.value ?? '—'}
                </span>
              </div>
            ))}
          </div>

          {/* Purple Cap */}
          <div className="card" style={{ padding: '14px 14px' }}>
            <p style={{ margin: '0 0 10px', fontWeight: 700, fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>🟣 Purple Cap</p>
            {data.purpleCap.slice(0, 10).map((row: CapRow, i: number) => (
              <div key={row.player || i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5, gap: 4 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, minWidth: 0 }}>
                  <span style={{ fontSize: 10, color: 'var(--text-muted)', width: 12, flexShrink: 0 }}>{row.rank ?? i + 1}</span>
                  <span style={{ fontSize: 11, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.player}</span>
                </div>
                <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--purple)', flexShrink: 0, marginLeft: 4 }}>
                  {row.wickets ?? row.value ?? '—'}
                </span>
              </div>
            ))}
          </div>

        </div>
      )}

      {updatedAt && (
        <p style={{ fontSize: 10, color: 'var(--text-muted)', textAlign: 'center', margin: 0 }}>
          {data.stale ? '⚠️ Stale · ' : '✓ Updated '}{updatedAt}
        </p>
      )}
    </div>
  );
}
