'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    router.push('/')
    router.refresh()
  }

  return (
    <main
      className="min-h-screen flex flex-col items-center justify-center px-4"
      style={{ background: '#0f1419' }}
    >
      {/* Logo */}
      <div className="flex items-center gap-2.5 mb-10">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
          <rect x="1" y="1" width="10" height="20" rx="3" fill="#4c9aff" />
          <rect x="13" y="1" width="10" height="12" rx="3" fill="#4c9aff" opacity="0.7" />
        </svg>
        <span style={{ fontSize: 24, fontWeight: 700, color: '#f0f3f6', letterSpacing: '-0.02em' }}>
          ArtBoard
        </span>
      </div>

      {/* Card */}
      <div
        className="w-full max-w-[380px]"
        style={{
          background: '#161b22',
          border: '1px solid rgba(139, 148, 158, 0.12)',
          borderRadius: 16,
          padding: 32,
        }}
      >
        <h1 style={{ fontSize: 16, fontWeight: 600, color: '#f0f3f6', textAlign: 'center', marginBottom: 24 }}>
          Entrar na sua conta
        </h1>

        <form onSubmit={handleLogin} className="space-y-3">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder="Email"
            style={{
              width: '100%', padding: '10px 14px', fontSize: 14,
              background: '#0f1419', color: '#f0f3f6',
              border: '1px solid rgba(139, 148, 158, 0.2)',
              borderRadius: 10, outline: 'none',
              transition: 'border-color 200ms',
            }}
            onFocus={(e) => (e.currentTarget.style.borderColor = '#4c9aff')}
            onBlur={(e) => (e.currentTarget.style.borderColor = 'rgba(139, 148, 158, 0.2)')}
          />

          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            placeholder="Senha"
            style={{
              width: '100%', padding: '10px 14px', fontSize: 14,
              background: '#0f1419', color: '#f0f3f6',
              border: '1px solid rgba(139, 148, 158, 0.2)',
              borderRadius: 10, outline: 'none',
              transition: 'border-color 200ms',
            }}
            onFocus={(e) => (e.currentTarget.style.borderColor = '#4c9aff')}
            onBlur={(e) => (e.currentTarget.style.borderColor = 'rgba(139, 148, 158, 0.2)')}
          />

          {error && (
            <p style={{ fontSize: 13, color: '#f85149', margin: 0 }}>{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%', padding: '10px 0', fontSize: 14, fontWeight: 600,
              background: '#4c9aff', color: '#0f1419',
              border: 'none', borderRadius: 10, cursor: 'pointer',
              opacity: loading ? 0.6 : 1,
              transition: 'opacity 200ms, background 200ms',
            }}
            onMouseEnter={(e) => { if (!loading) e.currentTarget.style.background = '#79b8ff' }}
            onMouseLeave={(e) => { e.currentTarget.style.background = '#4c9aff' }}
          >
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>

        <div className="flex items-center gap-3 my-6">
          <div className="flex-1 h-px" style={{ background: 'rgba(139, 148, 158, 0.15)' }} />
          <span style={{ fontSize: 11, fontWeight: 500, color: '#8b949e', textTransform: 'uppercase', letterSpacing: '0.05em' }}>ou</span>
          <div className="flex-1 h-px" style={{ background: 'rgba(139, 148, 158, 0.15)' }} />
        </div>

        <p style={{ textAlign: 'center', fontSize: 13, color: '#8b949e' }}>
          Não tem conta?{' '}
          <Link href="/auth/signup" style={{ color: '#4c9aff', fontWeight: 500, textDecoration: 'none' }}>
            Criar conta
          </Link>
        </p>
      </div>
    </main>
  )
}
