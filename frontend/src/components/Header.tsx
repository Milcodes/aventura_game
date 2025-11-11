import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import './Header.css'

export default function Header() {
  const { user, logout } = useAuth()
  const [showMenu, setShowMenu] = useState(false)

  return (
    <header className="header">
      <div className="header-container">
        <div className="header-left">
          <div className="logo">
            <span className="logo-icon">🎮</span>
            <span className="logo-text">Aventura</span>
          </div>
        </div>

        <div className="header-right">
          <div className="user-section">
            <div className="user-avatar">
              {user?.username.charAt(0).toUpperCase()}
            </div>
            <span className="user-name">{user?.username}</span>
            <button
              className="settings-icon"
              onClick={() => setShowMenu(!showMenu)}
              aria-label="Settings"
            >
              ⚙️
            </button>
          </div>

          {showMenu && (
            <div className="settings-menu">
              <div className="settings-section">
                <h4>Nyelv beállítások</h4>
                <button className="menu-item">
                  🌐 Játék nyelve
                </button>
                <button className="menu-item">
                  🗣️ Menü nyelve
                </button>
              </div>
              <div className="settings-divider"></div>
              <div className="settings-section">
                <button className="menu-item">
                  👤 Profilbeállítások
                </button>
                <button className="menu-item danger" onClick={logout}>
                  🚪 Kijelentkezés
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
