'use client';
import { useEffect, useState } from 'react';

interface PointsRow { team: string; shortname: string; played: number; won: number; lost: number; points: number; nrr: string; }
interface CapRow { rank: number; player: string; team: string; value?: number; runs?: number; wickets?: number; }

const TEAM_COLORS: Record<string, string> = {
  RCB: '#E8500A', CSK: '#F5A623', MI: '#005FA8', KKR: '#3D1C6E',
  SRH: '#FF6B00', RR: '#EA1A7F', PBKS: '#C8102E', DC: '#004C97',
  GT: '#1C4670', LSG: '#00AAE8',
};

function StatCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="card" style={{ padding: '16px 18px', marginBottom: 12 }}>
      <p style={{ margin: '0 0 12px', fontWeight: 700, fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{title}</p>
      {children}
    </div>
  );
}

function TeamBadge({ name }: { name: string }) {
  const color = TEAM_COLORS[name] || '#888';
  return (
    <span style={{ background: color, color: 'white', fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 4 }}>
      {name}
    </span>
  );
}

export default function LiveStats() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/cricket')
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(e => { setError(e.message); setLoading(false); });
  }, []);

  const updatedAt = data?.updatedAt ? new Date(data.updatedAt).toLocaleString('en-CA', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '';

  if (loading) return (
    <div>
      {[1,2,3].map(i => (
        <div key={i} className="card" style={{ padding: '16px 18px', marginBottom: 12, opacity: 0.5 }}>
          <div style={{ height: 12, background: 'var(--border)', borderRadius: 6, width: '60%', marginBottom: 12 }} />
          {[1,2,3].map(j => <div key={j} style={{ height: 10, background: 'var(--surface2)', borderRadius: 4, marginBottom: 6 }} />)}
        </div>
      ))}
    </div>
  );

  if (error || !data || data.error) return (
    <div className="card" style={{ padding: 16, fontSize: 13, color: 'var(--text-muted)', textAlign: 'center' }}>
      <p style={{ margin: 0 }}>⚠️ Live stats unavailable</p>
      <p style={{ margin: '4px 0 0', fontSize: 11 }}>Check back soon</p>
    </div>
  );

  return (
    <div style={{ position: 'sticky', top: 76 }}>
      {/* Points Table */}
      {data.pointsTable?.length > 0 && (
        <StatCard title="🏅 Points Table">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            {data.pointsTable.slice(0, 8).map((row: PointsRow, i: number) => (
              <div key={row.team} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '5px 8px', borderRadius: 8,
                background: i < 4 ? 'var(--accent-light)' : 'transparent',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 10, color: 'var(--text-muted)', width: 14 }}>{i+1}</span>
                  <TeamBadge name={row.shortname || row.team} />
                </div>
                <div style={{ display: 'flex', gap: 10, fontSize: 11 }}>
                  <span style={{ color: 'var(--text-muted)' }}>{row.played}M</span>
                  <span style={{ fontWeight: 700 }}>{row.points}pts</span>
                </div>
              </div>
            ))}
          </div>
          <p style={{ margin: '8px 0 0', fontSize: 10, color: 'var(--text-muted)' }}>
            🟠 = Playoff zone
          </p>
        </StatCard>
      )}

      {/* Orange Cap */}
      {data.orangeCap?.length > 0 && (
        <StatCard title="🟠 Orange Cap">
          {data.orangeCap.slice(0, 5).map((row: CapRow) => (
            <div key={row.player} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 7 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 10, color: 'var(--text-muted)', width: 12 }}>{row.rank}</span>
                <span style={{ fontSize: 12, fontWeight: 500 }}>{row.player}</span>
              </div>
              <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent)' }}>{row.runs ?? row.value} runs</span>
            </div>
          ))}
        </StatCard>
      )}

      {/* Purple Cap */}
      {data.purpleCap?.length > 0 && (
        <StatCard title="🟣 Purple Cap">
          {data.purpleCap.slice(0, 5).map((row: CapRow) => (
            <div key={row.player} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 7 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 10, color: 'var(--text-muted)', width: 12 }}>{row.rank}</span>
                <span style={{ fontSize: 12, fontWeight: 500 }}>{row.player}</span>
              </div>
              <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--purple)' }}>{row.wickets ?? row.value} wkts</span>
            </div>
          ))}
        </StatCard>
      )}

      {updatedAt && (
        <p style={{ fontSize: 10, color: 'var(--text-muted)', textAlign: 'center', margin: '4px 0 0' }}>
          {data.stale ? '⚠️ Stale · ' : '✓ Updated '}
          {updatedAt}
        </p>
      )}
    </div>
  );
}
