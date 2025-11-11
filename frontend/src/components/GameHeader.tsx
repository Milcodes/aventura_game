import './GameHeader.css'

interface GameHeaderProps {
  storyTitle: string
  onExit: () => void
}

export default function GameHeader({ storyTitle, onExit }: GameHeaderProps) {
  return (
    <header className="game-header">
      <div className="game-header-container">
        <button className="back-button" onClick={onExit}>
          ← Kilépés
        </button>
        <h1 className="game-title">{storyTitle}</h1>
        <div className="game-header-spacer"></div>
      </div>
    </header>
  )
}
