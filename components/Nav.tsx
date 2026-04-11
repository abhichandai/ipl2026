'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';

export default function Nav() {
  const pathname = usePathname();
  const [user, setUser] = useState<{ display_name: string; is_admin: boolean } | null>(null);

  useEffect(() => {
    fetch('/api/me').then(r => r.ok ? r.json() : null).then(d => setUser(d?.user || null));
  }, [pathname]);

  async function logout() {
    await fetch('/api/logout', { method: 'POST' });
    window.location.href = '/';
  }

  return (
    <>
      <style>{`
        @media (max-width: 500px) {
          .nav-name { display: none !important; }
          .nav-sep { display: none !important; }
        }
      `}</style>
      <nav style={{
        background: 'white',
        borderBottom: '1px solid var(--border)',
        position: 'sticky', top: 0, zIndex: 50,
      }}>
        <div style={{
          maxWidth: 860, margin: '0 auto', padding: '0 16px',
          height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <Link href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 20 }}>🏏</span>
            <span style={{ fontFamily: 'Bricolage Grotesque, sans-serif', fontWeight: 800, fontSize: 17, color: 'var(--text)' }}>
              IPL <span style={{ color: 'var(--accent)' }}>2026</span>
            </span>
          </Link>

          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <NavLink href="/" active={pathname === '/'}>Leaderboard</NavLink>
            {user ? (
              <>
                <NavLink href="/predictions" active={pathname === '/predictions'}>My Picks</NavLink>
                {user.is_admin && <NavLink href="/admin" active={pathname === '/admin'}>Admin</NavLink>}
                <span className="nav-sep" style={{ color: 'var(--border)', margin: '0 2px' }}>|</span>
                <span className="nav-name" style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 500, maxWidth: 80, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {user.display_name}
                </span>
                <button onClick={logout} style={{ fontSize: 12, color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', padding: '4px 6px' }}>
                  Logout
                </button>
              </>
            ) : (
              <>
                <NavLink href="/login" active={pathname === '/login'}>Login</NavLink>
                <Link href="/signup" style={{
                  background: 'var(--accent)', color: 'white', textDecoration: 'none',
                  fontSize: 13, fontWeight: 700, padding: '7px 14px', borderRadius: 8,
                  fontFamily: 'Bricolage Grotesque, sans-serif', whiteSpace: 'nowrap',
                }}>Sign Up</Link>
              </>
            )}
          </div>
        </div>
      </nav>
    </>
  );
}

function NavLink({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link href={href} style={{
      textDecoration: 'none', fontSize: 13, fontWeight: 500,
      color: active ? 'var(--accent)' : 'var(--text-muted)',
      padding: '6px 8px', borderRadius: 8,
      background: active ? 'var(--accent-light)' : 'transparent',
      whiteSpace: 'nowrap',
    }}>{children}</Link>
  );
}
