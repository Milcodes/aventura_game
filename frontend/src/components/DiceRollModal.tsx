import { useState, useEffect } from 'react'
import ModalRoot from './ModalRoot'
import './DiceRollModal.css'

interface DiceRollModalProps {
  isOpen: boolean
  onClose: (result: DiceRollResult | null) => void
  diceCount: number
  sides: number
  threshold?: number
  comparison?: '>' | '>=' | '<' | '<=' | '='
}

export interface DiceRollResult {
  type: 'DICE_RESULT'
  modal_id: string
  values: number[]
  sum: number
  meta: {
    dice_count: number
    sides: number
  }
  success?: boolean
}

export default function DiceRollModal({
  isOpen,
  onClose,
  diceCount,
  sides,
  threshold,
  comparison = '>'
}: DiceRollModalProps) {
  const [isRolling, setIsRolling] = useState(false)
  const [diceValues, setDiceValues] = useState<number[]>([])
  const [showResult, setShowResult] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setDiceValues([])
      setShowResult(false)
      setIsRolling(false)
    }
  }, [isOpen])

  const rollDice = () => {
    setIsRolling(true)
    setShowResult(false)

    // Animate rolling for 1.2 seconds
    const rollInterval = setInterval(() => {
      setDiceValues(
        Array.from({ length: diceCount }, () => Math.floor(Math.random() * sides) + 1)
      )
    }, 100)

    setTimeout(() => {
      clearInterval(rollInterval)
      // Final values
      const finalValues = Array.from(
        { length: diceCount },
        () => Math.floor(Math.random() * sides) + 1
      )
      setDiceValues(finalValues)
      setIsRolling(false)
      setShowResult(true)
    }, 1200)
  }

  const handleConfirm = () => {
    if (diceValues.length === 0) return

    const sum = diceValues.reduce((a, b) => a + b, 0)
    let success: boolean | undefined = undefined

    if (threshold !== undefined) {
      switch (comparison) {
        case '>':
          success = sum > threshold
          break
        case '>=':
          success = sum >= threshold
          break
        case '<':
          success = sum < threshold
          break
        case '<=':
          success = sum <= threshold
          break
        case '=':
          success = sum === threshold
          break
      }
    }

    const result: DiceRollResult = {
      type: 'DICE_RESULT',
      modal_id: `dice_roll_${diceCount}d${sides}`,
      values: diceValues,
      sum,
      meta: {
        dice_count: diceCount,
        sides
      },
      success
    }

    onClose(result)
  }

  const sum = diceValues.reduce((a, b) => a + b, 0)

  return (
    <ModalRoot
      isOpen={isOpen}
      onClose={() => onClose(null)}
      title={`🎲 Kockadobás (${diceCount}×D${sides})`}
      size="small"
      closeOnOverlay={false}
      closeOnEsc={false}
    >
      <div className="dice-roll-modal-body">
        {/* Dice Display */}
        <div className="dice-container">
          {diceValues.length === 0 ? (
            <div className="dice-placeholder">
              <p>Kattints a "Dobás" gombra!</p>
            </div>
          ) : (
            diceValues.map((value, index) => (
              <div
                key={index}
                className={`dice ${isRolling ? 'rolling' : ''}`}
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <div className="dice-value">{value}</div>
              </div>
            ))
          )}
        </div>

        {/* Result Display */}
        {showResult && (
          <div className="dice-result">
            <p className="result-text">
              Eredmény: {diceValues.join(' + ')} = <strong>{sum}</strong>
            </p>
            {threshold !== undefined && (
              <p className={`result-verdict ${sum > threshold ? 'success' : 'failure'}`}>
                {sum > threshold ? '✓ Siker!' : '✗ Sikertelen'}
              </p>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="dice-modal-footer">
          {!showResult ? (
            <button
              className="dice-roll-btn"
              onClick={rollDice}
              disabled={isRolling}
            >
              {isRolling ? 'Dobás...' : '🎲 Dobás'}
            </button>
          ) : (
            <button className="dice-confirm-btn" onClick={handleConfirm}>
              Tovább (eredmény rögzítése)
            </button>
          )}
        </div>
      </div>
    </ModalRoot>
  )
}
