'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function LoginPage() {
  const router = useRouter();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError('');
    const res = await fetch('/api/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
    const data = await res.json();
    if (!res.ok) { setError(data.error); setLoading(false); return; }
    router.push('/');
  }

  return (
    <div style={{ maxWidth: 420, margin: '0 auto', paddingTop: 20 }}>
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>👋</div>
        <h1 style={{ fontSize: 30, fontWeight: 800, margin: '0 0 8px' }}>Welcome back</h1>
        <p style={{ color: 'var(--text-muted)', margin: 0 }}>Login to check your standings</p>
      </div>
      <form onSubmit={handleSubmit} className="card" style={{ padding: 28 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={{ display: 'block', fontWeight: 600, fontSize: 13, marginBottom: 5 }}>Email</label>
            <input className="input" type="email" required value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
          </div>
          <div>
            <label style={{ display: 'block', fontWeight: 600, fontSize: 13, marginBottom: 5 }}>Password</label>
            <input className="input" type="password" required value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} />
          </div>
          {error && <p style={{ color: '#DC2626', fontSize: 13, margin: 0 }}>{error}</p>}
          <button type="submit" className="btn-primary" disabled={loading} style={{ width: '100%', fontSize: 15, padding: '13px 20px' }}>
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </div>
      </form>
      <p style={{ textAlign: 'center', fontSize: 13, color: 'var(--text-muted)', marginTop: 16 }}>
        No account?{' '}
        <Link href="/signup" style={{ color: 'var(--accent)', fontWeight: 600, textDecoration: 'none' }}>Sign Up</Link>
      </p>
    </div>
  );
}
