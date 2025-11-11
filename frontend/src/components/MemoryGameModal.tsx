import { useState, useEffect } from 'react'
import ModalRoot from './ModalRoot'
import './MemoryGameModal.css'

interface MemoryGameModalProps {
  isOpen: boolean
  onClose: (result: MemoryGameResult | null) => void
}

export interface MemoryGameResult {
  type: 'MEMORY_GAME'
  modal_id: string
  success: boolean
  timeSpent: number
  moves: number
}

interface Card {
  id: number
  symbol: string
  isFlipped: boolean
  isMatched: boolean
}

export default function MemoryGameModal({ isOpen, onClose }: MemoryGameModalProps) {
  const [cards, setCards] = useState<Card[]>([])
  const [flippedCards, setFlippedCards] = useState<number[]>([])
  const [matchedPairs, setMatchedPairs] = useState(0)
  const [moves, setMoves] = useState(0)
  const [timeRemaining, setTimeRemaining] = useState(20)
  const [gameStarted, setGameStarted] = useState(false)
  const [gameOver, setGameOver] = useState(false)
  const [message, setMessage] = useState('5 másodperc múlva elrejtjük a kártyákat...')
  const [messageType, setMessageType] = useState<'info' | 'success' | 'failure'>('info')

  // Initialize game
  useEffect(() => {
    if (!isOpen) {
      // Reset game
      setCards([])
      setFlippedCards([])
      setMatchedPairs(0)
      setMoves(0)
      setTimeRemaining(20)
      setGameStarted(false)
      setGameOver(false)
      setMessage('5 másodperc múlva elrejtjük a kártyákat...')
      setMessageType('info')
      return
    }

    // Create shuffled cards
    const symbols = ['🎁', '🎉', '🧩', '🎈', '🎁', '🎉', '🧩', '🎈', '⭐']
    const shuffled = [...symbols].sort(() => Math.random() - 0.5)

    const newCards: Card[] = shuffled.map((symbol, index) => ({
      id: index,
      symbol,
      isFlipped: true, // Start flipped for preview
      isMatched: false
    }))

    setCards(newCards)

    // Hide cards after 5 seconds
    const previewTimer = setTimeout(() => {
      setCards((prev) => prev.map((card) => ({ ...card, isFlipped: false })))
      setGameStarted(true)
      setMessage('Találd meg a párokat!')

      // Start countdown
      const countdownInterval = setInterval(() => {
        setTimeRemaining((prev) => {
          if (prev <= 1) {
            clearInterval(countdownInterval)
            endGame(false)
            return 0
          }
          return prev - 1
        })
      }, 1000)

      return () => clearInterval(countdownInterval)
    }, 5000)

    return () => clearTimeout(previewTimer)
  }, [isOpen])

  const handleCardClick = (cardId: number) => {
    if (!gameStarted || gameOver) return

    const card = cards.find((c) => c.id === cardId)
    if (!card || card.isMatched || card.isFlipped) return
    if (flippedCards.length >= 2) return

    // Flip card
    setCards((prev) =>
      prev.map((c) => (c.id === cardId ? { ...c, isFlipped: true } : c))
    )

    const newFlippedCards = [...flippedCards, cardId]
    setFlippedCards(newFlippedCards)

    // Check for match
    if (newFlippedCards.length === 2) {
      setMoves((prev) => prev + 1)

      const [firstId, secondId] = newFlippedCards
      const firstCard = cards.find((c) => c.id === firstId)
      const secondCard = cards.find((c) => c.id === secondId)

      if (firstCard && secondCard && firstCard.symbol === secondCard.symbol) {
        // Match!
        setTimeout(() => {
          setCards((prev) =>
            prev.map((c) =>
              c.id === firstId || c.id === secondId
                ? { ...c, isMatched: true }
                : c
            )
          )
          setMatchedPairs((prev) => prev + 1)
          setFlippedCards([])

          // Check for win
          if (matchedPairs + 1 === 4) {
            endGame(true)
          }
        }, 500)
      } else {
        // No match
        setTimeout(() => {
          setCards((prev) =>
            prev.map((c) =>
              c.id === firstId || c.id === secondId
                ? { ...c, isFlipped: false }
                : c
            )
          )
          setFlippedCards([])
        }, 1000)
      }
    }
  }

  const endGame = (won: boolean) => {
    setGameOver(true)
    setGameStarted(false)

    if (won) {
      setMessage(`🎉 Nyertél! ${moves + 1} lépésből!`)
      setMessageType('success')
    } else {
      setMessage('⏱️ Lejárt az idő! Próbáld újra!')
      setMessageType('failure')
    }
  }

  const handleConfirm = () => {
    const result: MemoryGameResult = {
      type: 'MEMORY_GAME',
      modal_id: 'memory_game',
      success: messageType === 'success',
      timeSpent: 20 - timeRemaining,
      moves: moves
    }

    onClose(result)
  }

  return (
    <ModalRoot
      isOpen={isOpen}
      onClose={() => onClose(null)}
      title="🧩 Memória Próba"
      size="large"
      closeOnOverlay={false}
      closeOnEsc={false}
      showCloseButton={false}
    >
      <div className="memory-game-container">
        <div className="memory-stats">
          <div className="memory-stat">
            <div className="memory-stat-label">Idő</div>
            <div className="memory-stat-value">{timeRemaining}</div>
          </div>
          <div className="memory-stat">
            <div className="memory-stat-label">Lépések</div>
            <div className="memory-stat-value">{moves}</div>
          </div>
          <div className="memory-stat">
            <div className="memory-stat-label">Párok</div>
            <div className="memory-stat-value">{matchedPairs}/4</div>
          </div>
        </div>

        <div className="memory-grid">
          {cards.map((card) => (
            <div
              key={card.id}
              className={`memory-card ${card.isFlipped ? 'flipped' : ''} ${
                card.isMatched ? 'matched' : ''
              }`}
              onClick={() => handleCardClick(card.id)}
            >
              <div className="memory-card-inner">
                <div className="memory-card-front">?</div>
                <div className="memory-card-back">{card.symbol}</div>
              </div>
            </div>
          ))}
        </div>

        <div className={`memory-message ${messageType}`}>
          {message}
        </div>

        {gameOver && (
          <div className="memory-footer">
            <button className="memory-confirm-btn" onClick={handleConfirm}>
              Tovább
            </button>
          </div>
        )}
      </div>
    </ModalRoot>
  )
}
