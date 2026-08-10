import { FormEvent, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { configured, supabase } from '../lib/supabase'

export default function AuthPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [signedIn, setSignedIn] = useState(false)

  if (signedIn) return <Navigate to="/" replace />

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (!configured) return setMessage('Add your Supabase environment variables first.')
    setLoading(true)
    setMessage('')
    try {
      if (mode === 'signup') {
        const { data, error } = await supabase.auth.signUp({ email, password })
        if (error) throw error
        if (data.session) setSignedIn(true)
        else setMessage('Account created. Check your email to confirm your address, then sign in.')
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
        setSignedIn(true)
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Authentication failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page">
      <section className="auth-copy">
        <div className="brand-mark">A</div>
        <p className="eyebrow">VISUAL DATABASE WORKSPACE</p>
        <h1>Your data should not decide what your world looks like.</h1>
        <p>Build databases for anything, then turn the same structured information into pages that actually feel like yours.</p>
        <div className="feature-pills"><span>Custom fields</span><span>Flexible records</span><span>Visual layouts</span><span>Supabase powered</span></div>
      </section>
      <section className="auth-panel">
        <form className="auth-card" onSubmit={submit}>
          <h2>{mode === 'login' ? 'Welcome back' : 'Create your workspace'}</h2>
          <p>{mode === 'login' ? 'Sign in to open Atlas Studio.' : 'Start with a blank workspace and build what you need.'}</p>
          <label>Email<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></label>
          <label>Password<input type="password" minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} required /></label>
          {message && <div className="form-message">{message}</div>}
          <button className="primary-button" disabled={loading}>{loading ? 'Working…' : mode === 'login' ? 'Sign in' : 'Create account'}</button>
          <button type="button" className="link-button" onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setMessage('') }}>
            {mode === 'login' ? 'Need an account? Sign up' : 'Already have an account? Sign in'}
          </button>
        </form>
      </section>
    </div>
  )
}
