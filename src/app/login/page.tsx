"use client";

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function LoginPage() {
  const [username, setUsername] = useState('CanDo');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const result = await signIn('credentials', {
        username,
        password,
        redirect: false
      });

      if (result?.error) {
        setError("Invalid credentials. Hint: use CanDo / password123");
      } else {
        router.push('/');
        router.refresh();
      }
    } catch (err) {
      setError("An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      minHeight: '100vh', 
      padding: '1.5rem' 
    }}>
      <div className="card-premium animate-fade-in" style={{ 
        maxWidth: '400px', 
        width: '100%', 
        padding: '2.5rem'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <h1 style={{ 
            fontSize: '2.5rem', 
            color: 'var(--sage-green)', 
            margin: '0 0 0.5rem 0',
            fontWeight: 700
          }}>Momentum</h1>
          <p style={{ color: 'hsl(200, 10%, 50%)', margin: 0, fontSize: '0.95rem', fontWeight: 500 }}>Secure Private Locker</p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem', color: 'var(--foreground)', opacity: 0.8 }}>Username</label>
            <input 
              type="text" 
              value={username} 
              onChange={e => setUsername(e.target.value)} 
              required
              className="form-input"
              style={{ width: '100%' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem', color: 'var(--foreground)', opacity: 0.8 }}>Password</label>
            <input 
              type="password" 
              value={password} 
              onChange={e => setPassword(e.target.value)} 
              placeholder="••••••••"
              required
              className="form-input"
              style={{ width: '100%' }}
            />
          </div>

          {error && (
            <div className="badge-danger" style={{ padding: '0.75rem', borderRadius: 'var(--radius-sm)', fontSize: '0.85rem', textAlign: 'center', fontWeight: 600 }}>
              ⚠️ {error}
            </div>
          )}

          <button 
            type="submit" 
            disabled={loading}
            className="btn-primary"
            style={{ 
              width: '100%', 
              padding: '0.85rem', 
              fontSize: '1rem', 
              marginTop: '0.5rem'
            }}
          >
            {loading ? 'Authenticating...' : 'Sign In'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.88rem' }}>
          <span style={{ color: 'hsl(200, 10%, 50%)' }}>Don't have an account? </span>
          <Link href="/register" style={{ color: 'var(--sage-green)', fontWeight: 600, textDecoration: 'none' }}>
            Sign Up
          </Link>
        </div>

        <div style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.8rem', color: '#999', borderTop: '1px solid #eee', paddingTop: '1rem' }}>
          Default credentials: <strong>CanDo</strong> / <strong>password123</strong>
        </div>
      </div>
    </div>
  );
}
