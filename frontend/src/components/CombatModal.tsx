import { useState, useEffect } from 'react'
import ModalRoot from './ModalRoot'
import './CombatModal.css'

interface CombatEnemy {
  name: string
  icon: string
  strength: number
  speed: number
  experience: number
}

interface PlayerItem {
  id: string
  name: string
  icon: string
  quantity: number
  stats?: {
    strength?: number
    speed?: number
    experience?: number
  }
}

interface CombatModalProps {
  isOpen: boolean
  onClose: (result: CombatResult | null) => void
  enemy: CombatEnemy
  playerItems: PlayerItem[]
}

export interface CombatResult {
  type: 'COMBAT'
  modal_id: string
  victory: boolean
  playerTotal: number
  enemyTotal: number
  rolls: number[]
  roundsPlayed: number
}

export default function CombatModal({
  isOpen,
  onClose,
  enemy,
  playerItems
}: CombatModalProps) {
  const [currentRound, setCurrentRound] = useState(1)
  const [rolls, setRolls] = useState<number[]>([])
  const [isRolling, setIsRolling] = useState(false)
  const [combatOver, setCombatOver] = useState(false)
  const [victory, setVictory] = useState(false)
  const [animatedDice, setAnimatedDice] = useState(1)

  // Calculate totals
  const enemyTotal = enemy.strength + enemy.speed + enemy.experience

  const playerStats = playerItems.reduce(
    (acc, item) => {
      if (item.stats) {
        acc.strength += item.stats.strength || 0
        acc.speed += item.stats.speed || 0
        acc.experience += item.stats.experience || 0
      }
      return acc
    },
    { strength: 0, speed: 0, experience: 0 }
  )

  const playerBaseTotal = playerStats.strength + playerStats.speed + playerStats.experience
  const rollsTotal = rolls.reduce((sum, roll) => sum + roll, 0)
  const playerFinalTotal = playerBaseTotal + rollsTotal

  useEffect(() => {
    if (!isOpen) {
      // Reset state
      setCurrentRound(1)
      setRolls([])
      setIsRolling(false)
      setCombatOver(false)
      setVictory(false)
      setAnimatedDice(1)
    }
  }, [isOpen])

  const rollDice = () => {
    if (isRolling || combatOver || currentRound > 2) return

    setIsRolling(true)

    // Animate dice rolling
    const rollInterval = setInterval(() => {
      setAnimatedDice(Math.floor(Math.random() * 6) + 1)
    }, 100)

    // Final result after 1 second
    setTimeout(() => {
      clearInterval(rollInterval)
      const roll = Math.floor(Math.random() * 6) + 1
      setAnimatedDice(roll)

      const newRolls = [...rolls, roll]
      setRolls(newRolls)
      setIsRolling(false)

      // Check if combat ends
      if (currentRound === 2) {
        // Combat ends after round 2
        const totalRolls = newRolls.reduce((sum, r) => sum + r, 0)
        const finalPlayerTotal = playerBaseTotal + totalRolls
        const won = finalPlayerTotal > enemyTotal

        setVictory(won)
        setCombatOver(true)
      } else {
        // Move to next round
        setCurrentRound(2)
      }
    }, 1200)
  }

  const handleFinish = () => {
    const result: CombatResult = {
      type: 'COMBAT',
      modal_id: 'combat',
      victory,
      playerTotal: playerFinalTotal,
      enemyTotal,
      rolls,
      roundsPlayed: rolls.length
    }

    onClose(result)
  }

  return (
    <ModalRoot
      isOpen={isOpen}
      onClose={() => onClose(null)}
      title="⚔️ Harc"
      size="large"
      closeOnOverlay={false}
      closeOnEsc={false}
      showCloseButton={false}
    >
      <div className="combat-modal-container">
        {/* Enemy section */}
        <div className="combat-enemy-section">
          <div className="combat-enemy-icon">{enemy.icon}</div>
          <div className="combat-enemy-name">{enemy.name}</div>
          <div className="combat-stats-row">
            <div className="combat-stat">
              <span className="stat-label">💪 Erő</span>
              <span className="stat-value">{enemy.strength}</span>
            </div>
            <div className="combat-stat">
              <span className="stat-label">⚡ Gyorsaság</span>
              <span className="stat-value">{enemy.speed}</span>
            </div>
            <div className="combat-stat">
              <span className="stat-label">🎓 Tapasztalat</span>
              <span className="stat-value">{enemy.experience}</span>
            </div>
          </div>
          <div className="combat-total">
            <span>Összesen:</span>
            <span className="total-value enemy-total">{enemyTotal}</span>
          </div>
        </div>

        {/* VS divider */}
        <div className="combat-vs-divider">
          <div className="vs-text">VS</div>
        </div>

        {/* Player section */}
        <div className="combat-player-section">
          <div className="combat-player-icon">🧑‍⚔️</div>
          <div className="combat-player-name">Te</div>
          <div className="combat-stats-row">
            <div className="combat-stat">
              <span className="stat-label">💪 Erő</span>
              <span className="stat-value">{playerStats.strength}</span>
            </div>
            <div className="combat-stat">
              <span className="stat-label">⚡ Gyorsaság</span>
              <span className="stat-value">{playerStats.speed}</span>
            </div>
            <div className="combat-stat">
              <span className="stat-label">🎓 Tapasztalat</span>
              <span className="stat-value">{playerStats.experience}</span>
            </div>
          </div>
          <div className="combat-total">
            <span>Alap összesen:</span>
            <span className="total-value player-total">{playerBaseTotal}</span>
          </div>
        </div>

        {/* Combat progress */}
        <div className="combat-progress-section">
          <div className="combat-round-indicator">
            <span className="round-label">Forduló:</span>
            <span className="round-value">{currentRound}/2</span>
          </div>

          {/* Dice display */}
          <div className="combat-dice-section">
            <div className={`combat-dice ${isRolling ? 'rolling' : ''}`}>
              <div className="dice-value">{animatedDice}</div>
            </div>
            {!combatOver && (
              <button
                className="combat-roll-btn"
                onClick={rollDice}
                disabled={isRolling}
              >
                {isRolling ? 'Dobás...' : `🎲 Dob (${currentRound}. forduló)`}
              </button>
            )}
          </div>

          {/* Rolls history */}
          {rolls.length > 0 && (
            <div className="combat-rolls-history">
              <div className="rolls-label">Dobások:</div>
              <div className="rolls-list">
                {rolls.map((roll, index) => (
                  <div key={index} className="roll-item">
                    <span className="roll-round">{index + 1}. forduló:</span>
                    <span className="roll-value">{roll}</span>
                  </div>
                ))}
              </div>
              <div className="rolls-total">
                <span>Dobások összesen:</span>
                <span className="total-value">{rollsTotal}</span>
              </div>
            </div>
          )}

          {/* Final totals comparison */}
          {combatOver && (
            <div className="combat-final-comparison">
              <div className="final-score player-score">
                <div className="score-label">Te</div>
                <div className="score-breakdown">
                  {playerBaseTotal} (alap) + {rollsTotal} (dobások)
                </div>
                <div className="score-total">{playerFinalTotal}</div>
              </div>
              <div className="final-vs">VS</div>
              <div className="final-score enemy-score">
                <div className="score-label">{enemy.name}</div>
                <div className="score-breakdown">{enemyTotal}</div>
                <div className="score-total">{enemyTotal}</div>
              </div>
            </div>
          )}

          {/* Result message */}
          {combatOver && (
            <div className={`combat-result-message ${victory ? 'victory' : 'defeat'}`}>
              {victory ? (
                <>
                  <div className="result-icon">🎉</div>
                  <div className="result-text">Győzelem!</div>
                  <div className="result-subtext">
                    Legyőzted {enemy.name}-t!
                  </div>
                </>
              ) : (
                <>
                  <div className="result-icon">💀</div>
                  <div className="result-text">Vereség...</div>
                  <div className="result-subtext">
                    {enemy.name} túl erős volt...
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Action button */}
        {combatOver && (
          <div className="combat-footer">
            <button className="combat-finish-btn" onClick={handleFinish}>
              Tovább
            </button>
          </div>
        )}
      </div>
    </ModalRoot>
  )
}
