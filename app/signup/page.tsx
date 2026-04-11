'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function SignupPage() {
  const router = useRouter();
  const [form, setForm] = useState({ email: '', displayName: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError('');
    const res = await fetch('/api/signup', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
    const data = await res.json();
    if (!res.ok) { setError(data.error); setLoading(false); return; }
    router.push('/predictions');
  }

  return (
    <div style={{ maxWidth: 420, margin: '0 auto', paddingTop: 20 }}>
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>🏏</div>
        <h1 style={{ fontSize: 30, fontWeight: 800, margin: '0 0 8px' }}>Join IPL 2026</h1>
        <p style={{ color: 'var(--text-muted)', margin: 0 }}>Pick your winners and compete with friends</p>
      </div>

      <form onSubmit={handleSubmit} className="card" style={{ padding: 28 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Field label="Display Name" hint="This is how your friends will see you">
            <input className="input" type="text" required placeholder="e.g. Gulgul"
              value={form.displayName} onChange={e => setForm(f => ({ ...f, displayName: e.target.value }))} />
          </Field>
          <Field label="Email">
            <input className="input" type="email" required placeholder="you@example.com"
              value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
          </Field>
          <Field label="Password">
            <input className="input" type="password" required placeholder="Min 6 characters"
              value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} />
          </Field>
          {error && <p style={{ color: '#DC2626', fontSize: 13, margin: 0 }}>{error}</p>}
          <button type="submit" className="btn-primary" disabled={loading} style={{ width: '100%', fontSize: 15, padding: '13px 20px' }}>
            {loading ? 'Creating account...' : 'Sign Up & Make Picks →'}
          </button>
        </div>
      </form>

      <p style={{ textAlign: 'center', fontSize: 13, color: 'var(--text-muted)', marginTop: 16 }}>
        Already have an account?{' '}
        <Link href="/login" style={{ color: 'var(--accent)', fontWeight: 600, textDecoration: 'none' }}>Login</Link>
      </p>
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ display: 'block', fontWeight: 600, fontSize: 13, marginBottom: 5, color: 'var(--text)' }}>{label}</label>
      {hint && <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: '0 0 5px' }}>{hint}</p>}
      {children}
    </div>
  );
}
