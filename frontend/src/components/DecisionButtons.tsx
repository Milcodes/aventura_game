import './DecisionButtons.css'

interface Decision {
  id: string
  text: string
  nextScene: string
}

interface DecisionButtonsProps {
  decisions: Decision[]
  onDecision: (decisionId: string, nextSceneId: string) => void
  disabled?: boolean
}

export default function DecisionButtons({ decisions, onDecision, disabled }: DecisionButtonsProps) {
  return (
    <section className="decision-section">
      <div className="decision-container">
        {decisions.map((decision, index) => (
          <button
            key={decision.id}
            className="decision-button"
            onClick={() => onDecision(decision.id, decision.nextScene)}
            disabled={disabled}
            style={{ animationDelay: `${index * 0.1}s` }}
          >
            <span className="decision-icon">→</span>
            <span className="decision-text">{decision.text}</span>
          </button>
        ))}
      </div>
    </section>
  )
}
