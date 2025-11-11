import './OngoingGameCard.css'

interface OngoingGameCardProps {
  title: string
  lastSaved: string
  coverImage?: string
  onContinue: () => void
}

export default function OngoingGameCard({ title, lastSaved, coverImage, onContinue }: OngoingGameCardProps) {
  return (
    <div className="ongoing-game-card">
      <div
        className="ongoing-game-cover"
        style={{ backgroundImage: coverImage ? `url(${coverImage})` : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}
      >
        {!coverImage && <div className="ongoing-game-placeholder">📖</div>}
      </div>
      <div className="ongoing-game-info">
        <h4 className="ongoing-game-title">{title}</h4>
        <p className="ongoing-game-time">
          <span className="time-icon">🕐</span>
          {lastSaved}
        </p>
        <button className="continue-button" onClick={onContinue}>
          ▶️ Folytatás
        </button>
      </div>
    </div>
  )
}
