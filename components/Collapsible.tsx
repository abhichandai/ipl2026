'use client';
import { useState } from 'react';

export default function Collapsible({
  title,
  children,
  defaultOpen = false,
}: {
  title: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="card" style={{ overflow: 'hidden' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '16px 20px', background: 'none', border: 'none', cursor: 'pointer',
          fontFamily: 'Bricolage Grotesque, sans-serif', fontWeight: 700, fontSize: 14,
          color: 'var(--text)', textAlign: 'left',
        }}
      >
        <span>{title}</span>
        <span style={{
          fontSize: 12, color: 'var(--text-muted)', transition: 'transform 0.2s',
          transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
          display: 'inline-block',
        }}>▼</span>
      </button>
      {open && (
        <div style={{ padding: '0 20px 20px', overflow: 'hidden' }}>
          {children}
        </div>
      )}
    </div>
  );
}
