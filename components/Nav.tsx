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
    <nav className="border-b border-gray-800 bg-gray-900">
      <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 font-bold text-lg">
          🏏 <span className="text-yellow-400">IPL 2026</span>
        </Link>
        <div className="flex items-center gap-4 text-sm">
          <Link href="/" className={`hover:text-yellow-400 ${pathname === '/' ? 'text-yellow-400' : 'text-gray-400'}`}>
            Leaderboard
          </Link>
          {user ? (
            <>
              <Link href="/predictions" className={`hover:text-yellow-400 ${pathname === '/predictions' ? 'text-yellow-400' : 'text-gray-400'}`}>
                My Picks
              </Link>
              {user.is_admin && (
                <Link href="/admin" className={`hover:text-yellow-400 ${pathname === '/admin' ? 'text-yellow-400' : 'text-gray-400'}`}>
                  Admin
                </Link>
              )}
              <span className="text-gray-500">|</span>
              <span className="text-gray-300">{user.display_name}</span>
              <button onClick={logout} className="text-gray-500 hover:text-red-400">Logout</button>
            </>
          ) : (
            <>
              <Link href="/login" className={`hover:text-yellow-400 ${pathname === '/login' ? 'text-yellow-400' : 'text-gray-400'}`}>
                Login
              </Link>
              <Link href="/signup" className="bg-yellow-400 text-gray-900 px-3 py-1 rounded font-semibold hover:bg-yellow-300">
                Sign Up
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
