'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

export default function SignupPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: name },
      },
    })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    setSuccess(true)
    setLoading(false)
  }

  if (success) {
    return (
      <main
        className="min-h-screen flex flex-col items-center justify-center px-4"
        style={{
          background: 'linear-gradient(180deg, #F6F7F9 0%, #ECEEF2 100%)',
        }}
      >
        <div className="flex items-center gap-2 mb-10">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
            <rect x="1" y="1" width="10" height="20" rx="2" fill="#0052CC" />
            <rect x="13" y="1" width="10" height="12" rx="2" fill="#0052CC" />
          </svg>
          <span className="text-3xl font-bold tracking-tight" style={{ color: '#172B4D' }}>
            ArtBoard
          </span>
        </div>
        <div
          className="w-full max-w-[400px] rounded-lg p-8 text-center"
          style={{
            background: '#FFFFFF',
            boxShadow: '0 0 10px rgba(0, 0, 0, 0.1)',
          }}
        >
          <h1 className="text-xl font-bold mb-4" style={{ color: '#172B4D' }}>
            Verifique seu email
          </h1>
          <p className="text-sm" style={{ color: '#5E6C84' }}>
            Enviamos um link de confirmacao para <strong style={{ color: '#172B4D' }}>{email}</strong>
          </p>
        </div>
      </main>
    )
  }

  return (
    <main
      className="min-h-screen flex flex-col items-center justify-center px-4"
      style={{
        background: 'linear-gradient(180deg, #F6F7F9 0%, #ECEEF2 100%)',
      }}
    >
      {/* Logo */}
      <div className="flex items-center gap-2 mb-10">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
          <rect x="1" y="1" width="10" height="20" rx="2" fill="#0052CC" />
          <rect x="13" y="1" width="10" height="12" rx="2" fill="#0052CC" />
        </svg>
        <span className="text-3xl font-bold tracking-tight" style={{ color: '#172B4D' }}>
          ArtBoard
        </span>
      </div>

      {/* Card */}
      <div
        className="w-full max-w-[400px] rounded-lg p-8"
        style={{
          background: '#FFFFFF',
          boxShadow: '0 0 10px rgba(0, 0, 0, 0.1)',
        }}
      >
        <h1
          className="text-base font-bold text-center mb-6"
          style={{ color: '#5E6C84' }}
        >
          Criar sua conta
        </h1>

        <form onSubmit={handleSignup} className="space-y-4">
          <div>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full px-3 py-2.5 text-sm rounded transition-colors"
              placeholder="Insira seu nome completo"
              style={{
                background: '#FAFBFC',
                border: '2px solid #DFE1E6',
                color: '#172B4D',
              }}
              onFocus={(e) => (e.currentTarget.style.borderColor = '#4C9AFF')}
              onBlur={(e) => (e.currentTarget.style.borderColor = '#DFE1E6')}
            />
          </div>

          <div>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-3 py-2.5 text-sm rounded transition-colors"
              placeholder="Insira seu email"
              style={{
                background: '#FAFBFC',
                border: '2px solid #DFE1E6',
                color: '#172B4D',
              }}
              onFocus={(e) => (e.currentTarget.style.borderColor = '#4C9AFF')}
              onBlur={(e) => (e.currentTarget.style.borderColor = '#DFE1E6')}
            />
          </div>

          <div>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="w-full px-3 py-2.5 text-sm rounded transition-colors"
              placeholder="Crie uma senha"
              style={{
                background: '#FAFBFC',
                border: '2px solid #DFE1E6',
                color: '#172B4D',
              }}
              onFocus={(e) => (e.currentTarget.style.borderColor = '#4C9AFF')}
              onBlur={(e) => (e.currentTarget.style.borderColor = '#DFE1E6')}
            />
          </div>

          {error && (
            <p className="text-sm" style={{ color: '#EB5A46' }}>{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 px-4 text-sm font-bold rounded transition-colors disabled:opacity-50"
            style={{
              background: '#5AAC44',
              color: '#FFFFFF',
            }}
            onMouseEnter={(e) => {
              if (!loading) e.currentTarget.style.background = '#519839'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = '#5AAC44'
            }}
          >
            {loading ? 'Criando conta...' : 'Criar conta'}
          </button>
        </form>

        {/* Divisor */}
        <div className="flex items-center gap-3 my-6">
          <div className="flex-1 h-px" style={{ background: '#DFE1E6' }} />
          <span className="text-xs font-medium" style={{ color: '#5E6C84' }}>OU</span>
          <div className="flex-1 h-px" style={{ background: '#DFE1E6' }} />
        </div>

        <p className="text-center text-sm" style={{ color: '#5E6C84' }}>
          Ja tem uma conta?{' '}
          <Link
            href="/auth/login"
            className="font-medium hover:underline"
            style={{ color: '#0052CC' }}
          >
            Fazer login
          </Link>
        </p>
      </div>
    </main>
  )
}
