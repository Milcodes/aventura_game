import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import './Auth.css'

export default function Register() {
  const [email, setEmail] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { register } = useAuth()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await register(email, username, password)
    } catch (err: any) {
      setError(err.response?.data?.message || 'Sikertelen regisztráció. Próbáld újra.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h1 className="auth-title">🎮 Regisztráció</h1>
        <form onSubmit={handleSubmit} className="auth-form">
          {error && <div className="auth-error">{error}</div>}

          <div className="form-group">
            <label className="form-label">Email:</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="form-input"
              placeholder="pelda@email.com"
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Felhasználónév:</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              minLength={3}
              maxLength={20}
              className="form-input"
              placeholder="3-20 karakter"
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Jelszó:</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="form-input"
              placeholder="Min. 6 karakter"
              disabled={loading}
            />
          </div>

          <button type="submit" className="submit-button" disabled={loading}>
            {loading ? 'Regisztráció...' : 'Regisztráció'}
          </button>
        </form>

        <p className="auth-footer">
          Van már fiókod? <Link to="/login">Jelentkezz be</Link>
        </p>
      </div>
    </div>
  )
}
