"use client";

import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { useState } from "react";

function LoginInner() {
  const searchParams = useSearchParams();
  const redirect = searchParams.get('redirect') || '/';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

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
        // Force a hard navigation so middleware sees newly set cookie immediately.
        // router.replace sometimes performs a client transition before cookie propagation.
        setTimeout(() => {
          window.location.href = redirect;
        }, 50);
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-white to-gray-50 flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-white border rounded-xl shadow-sm p-6 space-y-6">
        <div className="flex flex-col items-center gap-2">
          <Image src="/batchmailer.png" alt="BatchMailer" width={96} height={96} className="h-16 w-16" unoptimized />
          <h1 className="text-2xl font-semibold">BatchMail</h1>
          <p className="text-xs text-gray-600">Admin Sign In</p>
        </div>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="text-sm text-gray-700">Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full border rounded px-3 py-2 text-sm" placeholder="Username" required />
          </div>
          <div className="space-y-1">
            <label className="text-sm text-gray-700">Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="w-full border rounded px-3 py-2 text-sm" placeholder="Password" required />
          </div>
          {error && <div className="text-sm text-red-600">{error}</div>}
          <button type="submit" disabled={loading} className="w-full px-3 py-2 rounded bg-gray-900 text-white text-sm hover:bg-black disabled:opacity-50">
            {loading ? 'Signing in…' : 'Sign In'}
          </button>
        </form>
      </div>
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
