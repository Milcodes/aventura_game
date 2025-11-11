import { useState, useEffect } from 'react'
import ModalRoot from './ModalRoot'
import './HTMLModal.css'

interface HTMLModalProps {
  isOpen: boolean
  onClose: (result: HTMLModalResult | null) => void
  title: string
  htmlContent: string
  timeLimit?: number
}

export interface HTMLModalResult {
  type: 'HTML_RESULT'
  modal_id: string
  success: boolean
  timeSpent: number
  payload: {
    score?: number
    moves?: number
    [key: string]: any
  }
}

export default function HTMLModal({
  isOpen,
  onClose,
  title,
  htmlContent,
  timeLimit
}: HTMLModalProps) {
  const [timeRemaining, setTimeRemaining] = useState(timeLimit || 0)
  const [isGameOver, setIsGameOver] = useState(false)
  const [gameResult, setGameResult] = useState<any>(null)

  useEffect(() => {
    if (!isOpen) {
      setTimeRemaining(timeLimit || 0)
      setIsGameOver(false)
      setGameResult(null)
      return
    }

    if (!timeLimit) return

    // Timer countdown
    const interval = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(interval)
          // Time's up - check if game was won
          if (!isGameOver) {
            handleGameTimeout()
          }
          return 0
        }
        return prev - 1
      })
    }, 1000)

    // Listen for game events from iframe
    const handleMessage = (event: MessageEvent) => {
      if (event.data.type === 'GAME_WIN') {
        setIsGameOver(true)
        setGameResult(event.data.payload)
        clearInterval(interval)
      } else if (event.data.type === 'GAME_LOSE') {
        setIsGameOver(true)
        setGameResult({ success: false })
        clearInterval(interval)
      }
    }

    window.addEventListener('message', handleMessage)

    return () => {
      clearInterval(interval)
      window.removeEventListener('message', handleMessage)
    }
  }, [isOpen, timeLimit, isGameOver])

  const handleGameTimeout = () => {
    setIsGameOver(true)
    setGameResult({ success: false, timeout: true })
  }

  const handleConfirm = () => {
    const result: HTMLModalResult = {
      type: 'HTML_RESULT',
      modal_id: 'html_game',
      success: gameResult?.success !== false,
      timeSpent: (timeLimit || 0) - timeRemaining,
      payload: gameResult || {}
    }

    onClose(result)
  }

  return (
    <ModalRoot
      isOpen={isOpen}
      onClose={() => onClose(null)}
      title={title}
      size="large"
      closeOnOverlay={false}
      closeOnEsc={false}
      showCloseButton={false}
    >
      <div className="html-modal-body">
        {timeLimit && timeLimit > 0 && (
          <div className="html-timer">
            <span className="timer-icon">⏱️</span>
            <span className="timer-value">{timeRemaining}s</span>
          </div>
        )}

        <div
          className="html-game-container"
          dangerouslySetInnerHTML={{ __html: htmlContent }}
        />

        {isGameOver && (
          <div className="html-modal-footer">
            <button className="html-confirm-btn" onClick={handleConfirm}>
              Tovább
            </button>
          </div>
        )}
      </div>
    </ModalRoot>
  )
}
