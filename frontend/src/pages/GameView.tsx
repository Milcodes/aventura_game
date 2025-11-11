import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import GameHeader from '../components/GameHeader'
import MediaSection from '../components/MediaSection'
import StorySection from '../components/StorySection'
import DecisionButtons from '../components/DecisionButtons'
import InventoryBar from '../components/InventoryBar'
import './GameView.css'

// Mock game data
const mockScene = {
  id: 'scene_1',
  mediaType: 'image' as const,
  mediaUrl: 'https://via.placeholder.com/800x400/1a1a2e/667eea?text=Mysterious+House',
  storyText: `Belépsz a rejtélyes házba. Az előtér sötét, csak a hold fénye világítja meg.
    Két ajtót látsz: az egyik félig nyitva van, és halkan zeneszót hallasz mögötte.
    A másik ajtó zárt, de egy furcsa fénysugár szivárog ki alóla. Mit teszel?`,
  decisions: [
    { id: 'decision_1', text: 'Bemész a zenélő ajtón', nextScene: 'scene_2' },
    { id: 'decision_2', text: 'Megvizsgálod a fényes ajtót', nextScene: 'scene_3' },
    { id: 'decision_3', text: 'Visszamész az udvarra', nextScene: 'scene_0' },
  ]
}

const mockInventory = {
  currencies: [
    { id: 'gold', name: 'Arany', icon: '💰', value: 150 },
    { id: 'crystal', name: 'Kristály', icon: '💎', value: 5 },
    { id: 'mana', name: 'Akámi', icon: '⚗️', value: 80 },
  ],
  items: [
    { id: 'potion', name: 'Varázsital', icon: '🧪', quantity: 2 },
    { id: 'armor', name: 'Fekete páncél', icon: '⚫', quantity: 1 },
    { id: 'key', name: 'Titokzatos kulcs', icon: '🔑', quantity: 2 },
  ]
}

export default function GameView() {
  const navigate = useNavigate()
  const [currentScene] = useState(mockScene)
  const [inventory] = useState(mockInventory)
  const [isTransitioning, setIsTransitioning] = useState(false)

  const handleDecision = async (decisionId: string, nextSceneId: string) => {
    setIsTransitioning(true)

    // TODO: Send decision to backend
    console.log('Decision made:', decisionId, '-> Scene:', nextSceneId)

    // Simulate scene transition
    setTimeout(() => {
      // TODO: Load next scene from backend
      setIsTransitioning(false)
    }, 500)
  }

  const handleExitGame = () => {
    if (confirm('Biztosan ki akarsz lépni? A játék állása automatikusan mentésre kerül.')) {
      navigate('/dashboard')
    }
  }

  return (
    <div className="game-view">
      <GameHeader
        storyTitle="A Rejtélyes Ház"
        onExit={handleExitGame}
      />

      <main className={`game-content ${isTransitioning ? 'transitioning' : ''}`}>
        <MediaSection
          type={currentScene.mediaType}
          url={currentScene.mediaUrl}
        />

        <StorySection
          text={currentScene.storyText}
        />

        <DecisionButtons
          decisions={currentScene.decisions}
          onDecision={handleDecision}
          disabled={isTransitioning}
        />
      </main>

      <InventoryBar
        currencies={inventory.currencies}
        items={inventory.items}
      />
    </div>
  )
}
