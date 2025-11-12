"use client";

import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

function LoginInner() {
  const searchParams = useSearchParams();
  const redirect = searchParams.get('redirect') || '/';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [darkMode, setDarkMode] = useState<boolean>(false);
  const [showWelcome, setShowWelcome] = useState<boolean>(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('batchmail_dark');
      if (saved) setDarkMode(saved === '1');
    } catch {}
  }, []);

  const toggleDark = () => {
    setDarkMode((d) => {
      const next = !d;
      try { localStorage.setItem('batchmail_dark', next ? '1' : '0'); } catch {}
      return next;
    });
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      // Use explicit credentials to ensure cookie always set and visible immediately.
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-cache' },
        body: JSON.stringify({ email, password }),
        credentials: 'include',
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(data.error || 'Login failed');
      } else {
        // Show welcome modal then redirect with a slight delay so user sees confirmation
        setShowWelcome(true);
        setTimeout(() => {
          window.location.href = redirect;
        }, 1000);
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className={`min-h-screen flex items-center justify-center p-6 overflow-hidden fade-in ${darkMode ? 'bg-gradient-to-br from-gray-900 to-black' : 'bg-gradient-to-br from-white to-gray-50'}`}>
      {/* Global dark/light toggle at top-right */}
      <button
        type="button"
        onClick={toggleDark}
        aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
        className={`fixed top-15 right-4 z-50 rounded-full border p-2 shadow-sm transition ${darkMode ? 'bg-gray-900 border-gray-800 hover:bg-gray-800 text-gray-100' : 'bg-white border-gray-200 hover:bg-gray-50 text-gray-800'}`}
        title={darkMode ? 'Light mode' : 'Dark mode'}
      >
        {darkMode ? (
          // Moon icon
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
            <path d="M21.752 15.002A9 9 0 0 1 9 2.248a.75.75 0 0 0-.9-.9 10.5 10.5 0 1 0 12.552 12.552.75.75 0 0 0- .9-.898Z" />
          </svg>
        ) : (
          // Sun icon
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
            <path d="M12 18a6 6 0 1 0 0-12 6 6 0 0 0 0 12Z" />
            <path d="M12 2.25a.75.75 0 0 1 .75.75v1.5a.75.75 0 0 1-1.5 0V3a.75.75 0 0 1 .75-.75Zm0 15.75a.75.75 0 0 1 .75.75v1.5a.75.75 0 0 1-1.5 0V18a.75.75 0 0 1 .75-.75Zm9-6a.75.75 0 0 1-.75.75h-1.5a.75.75 0 0 1 0-1.5H21a.75.75 0 0 1 .75.75ZM5.25 12a.75.75 0 0 1-.75.75H3a.75.75 0 0 1 0-1.5h1.5a.75.75 0 0 1 .75.75ZM18.196 5.804a.75.75 0 0 1 0 1.06l-1.06 1.061a.75.75 0 1 1-1.061-1.06l1.06-1.061a.75.75 0 0 1 1.061 0ZM7.924 16.076a.75.75 0 0 1 0 1.06l-1.06 1.061a.75.75 0 0 1-1.061-1.06l1.06-1.061a.75.75 0 0 1 1.061 0ZM5.804 5.804a.75.75 0 0 1 1.06 0l1.061 1.06A.75.75 0 0 1 6.864 7.925L5.804 6.864a.75.75 0 0 1 0-1.06Zm10.272 10.272a.75.75 0 0 1 1.06 0l1.061 1.06a.75.75 0 0 1-1.061 1.061l-1.06-1.061a.75.75 0 0 1 0-1.06Z" />
          </svg>
        )}
      </button>
      {/* floating decorative blobs */}
      <div className={`absolute -top-24 -left-24 w-72 h-72 rounded-full blur-3xl opacity-30 animate-float-slow ${darkMode ? 'bg-indigo-700/40' : 'bg-indigo-300/40'}`} />
      <div className={`absolute -bottom-24 -right-24 w-72 h-72 rounded-full blur-3xl opacity-30 animate-float ${darkMode ? 'bg-fuchsia-700/30' : 'bg-fuchsia-300/40'}`} />

      <div className={`w-full max-w-md rounded-xl shadow-xl p-6 space-y-6 border slide-up ${darkMode ? 'bg-gray-900/90 border-gray-800' : 'bg-white border-gray-200'}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Image src="/batchmailer.png" alt="BatchMailer" width={96} height={96} className="h-12 w-12 rounded-md shadow-sm animate-pop" unoptimized />
            <div>
              <h1 className={`text-2xl font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>BatchMail</h1>
              <p className={`text-xs ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>Admin Sign In</p>
            </div>
          </div>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className={`text-sm ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className={`w-full border rounded px-3 py-2 text-sm transition focus:outline-none focus:ring-2 focus:ring-indigo-500 ${darkMode ? 'bg-gray-800 border-gray-700 text-gray-100 placeholder-gray-400' : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'}`}
              placeholder="admin@example.com"
              required
            />
          </div>
          <div className="space-y-1">
            <label className={`text-sm ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className={`w-full border rounded px-3 py-2 text-sm transition focus:outline-none focus:ring-2 focus:ring-indigo-500 ${darkMode ? 'bg-gray-800 border-gray-700 text-gray-100 placeholder-gray-400' : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'}`}
              placeholder="••••••••"
              required
            />
          </div>
          {error && <div className="text-sm text-red-500 animate-in">{error}</div>}
          <button
            type="submit"
            disabled={loading}
            className={`w-full px-3 py-2 rounded text-sm transition shadow-sm hover:shadow ${darkMode ? 'bg-indigo-600 text-white hover:bg-indigo-500 disabled:opacity-50' : 'bg-gray-900 text-white hover:bg-black disabled:opacity-50'}`}
          >
            {loading ? 'Signing in…' : 'Sign In'}
          </button>
        </form>
      </div>

      {/* Welcome modal */}
      {showWelcome && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className={`rounded-lg p-6 shadow-xl scale-in ${darkMode ? 'bg-gray-900 text-gray-100' : 'bg-white text-gray-900'}`}>
            <div className="text-lg font-semibold mb-2">Welcome, Admin!</div>
            <div className="text-sm opacity-80">Redirecting to the app…</div>
          </div>
        </div>
      )}

      <style jsx>{`
        .fade-in { animation: fade-in 600ms ease both; }
        .slide-up { animation: slide-up 500ms ease both; }
        .scale-in { animation: scale-in 220ms ease-out both; }
        .animate-pop { animation: pop 600ms ease-out both; }
        .animate-float { animation: float 8s ease-in-out infinite; }
        .animate-float-slow { animation: float 12s ease-in-out infinite; }
        :global(html, body) { overflow-x: hidden; }
        @keyframes fade-in { from { opacity: 0 } to { opacity: 1 } }
        @keyframes slide-up { from { transform: translateY(12px); opacity: 0 } to { transform: translateY(0); opacity: 1 } }
        @keyframes scale-in { from { transform: scale(0.95); opacity: 0 } to { transform: scale(1); opacity: 1 } }
        @keyframes pop { 0% { transform: scale(0.9); opacity: .5 } 60% { transform: scale(1.04); opacity: 1 } 100% { transform: scale(1) } }
        @keyframes float { 0%, 100% { transform: translateY(0) } 50% { transform: translateY(10px) } }
      `}</style>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading…</div>}>
      <LoginInner />
    </Suspense>
  );
}
