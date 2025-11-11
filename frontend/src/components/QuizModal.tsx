import { useState, useEffect } from 'react'
import ModalRoot from './ModalRoot'
import './QuizModal.css'

interface QuizOption {
  id: string
  text: string
  isCorrect: boolean
}

interface QuizModalProps {
  isOpen: boolean
  onClose: (result: QuizResult | null) => void
  question: string
  options: QuizOption[]
  timeLimit?: number // seconds
}

export interface QuizResult {
  type: 'QUIZ_RESULT'
  modal_id: string
  success: boolean
  selectedOptionId: string
  timeSpent: number // seconds
  payload: {
    correct: boolean
    timeRemaining: number
  }
}

export default function QuizModal({
  isOpen,
  onClose,
  question,
  options,
  timeLimit = 30
}: QuizModalProps) {
  const [selectedOption, setSelectedOption] = useState<string | null>(null)
  const [timeRemaining, setTimeRemaining] = useState(timeLimit)
  const [isAnswered, setIsAnswered] = useState(false)
  const [isCorrect, setIsCorrect] = useState(false)

  useEffect(() => {
    if (!isOpen) {
      setSelectedOption(null)
      setTimeRemaining(timeLimit)
      setIsAnswered(false)
      setIsCorrect(false)
      return
    }

    // Timer countdown
    const interval = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(interval)
          // Time's up - auto-submit as wrong
          if (!isAnswered) {
            handleTimeout()
          }
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [isOpen, timeLimit, isAnswered])

  const handleTimeout = () => {
    setIsAnswered(true)
    setIsCorrect(false)
  }

  const handleOptionSelect = (optionId: string) => {
    if (isAnswered) return
    setSelectedOption(optionId)
  }

  const handleSubmit = () => {
    if (!selectedOption || isAnswered) return

    const selected = options.find((opt) => opt.id === selectedOption)
    const correct = selected?.isCorrect || false

    setIsAnswered(true)
    setIsCorrect(correct)
  }

  const handleConfirm = () => {
    const timeSpent = timeLimit - timeRemaining

    const result: QuizResult = {
      type: 'QUIZ_RESULT',
      modal_id: 'quiz_modal',
      success: isCorrect,
      selectedOptionId: selectedOption || '',
      timeSpent,
      payload: {
        correct: isCorrect,
        timeRemaining
      }
    }

    onClose(result)
  }

  const getTimerColor = () => {
    if (timeRemaining > 20) return '#4caf50'
    if (timeRemaining > 10) return '#ff9800'
    return '#ff6b6b'
  }

  return (
    <ModalRoot
      isOpen={isOpen}
      onClose={() => onClose(null)}
      title="❓ Kvíz"
      size="medium"
      closeOnOverlay={false}
      closeOnEsc={false}
      showCloseButton={false}
    >
      <div className="quiz-modal-body">
        {/* Timer */}
        <div className="quiz-timer" style={{ borderColor: getTimerColor() }}>
          <span className="timer-icon">⏱️</span>
          <span className="timer-value" style={{ color: getTimerColor() }}>
            {timeRemaining}s
          </span>
        </div>

        {/* Question */}
        <div className="quiz-question">
          <p>{question}</p>
        </div>

        {/* Options */}
        <div className="quiz-options">
          {options.map((option) => (
            <button
              key={option.id}
              className={`quiz-option ${selectedOption === option.id ? 'selected' : ''} ${
                isAnswered
                  ? option.isCorrect
                    ? 'correct'
                    : selectedOption === option.id
                    ? 'incorrect'
                    : ''
                  : ''
              }`}
              onClick={() => handleOptionSelect(option.id)}
              disabled={isAnswered}
            >
              <span className="option-letter">
                {String.fromCharCode(65 + options.indexOf(option))}
              </span>
              <span className="option-text">{option.text}</span>
              {isAnswered && option.isCorrect && (
                <span className="option-check">✓</span>
              )}
              {isAnswered && selectedOption === option.id && !option.isCorrect && (
                <span className="option-cross">✗</span>
              )}
            </button>
          ))}
        </div>

        {/* Result Message */}
        {isAnswered && (
          <div className={`quiz-result ${isCorrect ? 'success' : 'failure'}`}>
            {isCorrect ? (
              <>
                <span className="result-icon">🎉</span>
                <p>Helyes válasz! Gratulálunk!</p>
              </>
            ) : (
              <>
                <span className="result-icon">😞</span>
                <p>{timeRemaining === 0 ? 'Lejárt az idő!' : 'Sajnos helytelen válasz.'}</p>
              </>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="quiz-modal-footer">
          {!isAnswered ? (
            <button
              className="quiz-submit-btn"
              onClick={handleSubmit}
              disabled={!selectedOption}
            >
              Válasz beküldése
            </button>
          ) : (
            <button className="quiz-confirm-btn" onClick={handleConfirm}>
              Tovább
            </button>
          )}
        </div>
      </div>
    </ModalRoot>
  )
}
