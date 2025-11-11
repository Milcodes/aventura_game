import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import GameHeader from '../components/GameHeader'
import MediaSection from '../components/MediaSection'
import StorySection from '../components/StorySection'
import DecisionButtons from '../components/DecisionButtons'
import InventoryBar from '../components/InventoryBar'
import InventoryModal from '../components/InventoryModal'
import DiceRollModal, { DiceRollResult } from '../components/DiceRollModal'
import QuizModal, { QuizResult } from '../components/QuizModal'
import MemoryGameModal, { MemoryGameResult } from '../components/MemoryGameModal'
import ShopModal, { ShopResult } from '../components/ShopModal'
import Toast from '../components/Toast'
import './GameView.css'

// Mock game scenes following the specification
const gameScenes: Record<string, any> = {
  scene_music_door: {
    id: 'scene_music_door',
    mediaType: 'image' as const,
    mediaUrl: 'https://via.placeholder.com/800x400/1a1a2e/667eea?text=Zenelo+Ajto',
    storyText: `Kinyitod a zenélő ajtót és belépsz. Az ajtó mögé csapdát állítottak...
      Most dől el, hogy elég ügyes vagy-e!`,
    decisions: [
      {
        id: 'decision_roll_dice',
        text: '🎲 Dobás (2 kocka)',
        action: { type: 'OPEN_MODAL', modal_id: 'dice_roll_2d6' }
      }
    ]
  },
  scene_candle_room: {
    id: 'scene_candle_room',
    mediaType: 'image' as const,
    mediaUrl: 'https://via.placeholder.com/800x400/1a1a2e/4caf50?text=Gyertyas+Szoba',
    storyText: `Szerencséd volt! A csapda nem talált el.
      A szobát egy gyertya fénye világítja be. A zene egy ládából hallatszik. Mit teszel?`,
    decisions: [
      {
        id: 'decision_check_box',
        text: 'Megvizsgálod a ládát',
        action: { type: 'OPEN_MODAL', modal_id: 'quiz_chest' }
      },
      { id: 'decision_look_around', text: 'Körülnézel a szobában', nextScene: 'scene_end' }
    ]
  },
  scene_trap_death: {
    id: 'scene_trap_death',
    mediaType: 'image' as const,
    mediaUrl: 'https://via.placeholder.com/800x400/1a1a2e/ff6b6b?text=Csapda',
    storyText: `A csapda végzetesnek bizonyult. Sajnos nem volt szerencséd...`,
    decisions: [
      { id: 'decision_menu', text: 'Vissza a főmenübe', action: { type: 'NAVIGATE', target: 'main_menu' } },
      { id: 'decision_restart', text: 'Folytatás a legutóbbi mentett pontról', action: { type: 'LOAD_LATEST_SAVE' } }
    ]
  },
  scene_secret_door_found: {
    id: 'scene_secret_door_found',
    mediaType: 'image' as const,
    mediaUrl: 'https://via.placeholder.com/800x400/1a1a2e/667eea?text=Titkos+Ajto',
    storyText: `Szuper, ügyes voltál! A térkép segítségével találtál egy titkos ajtót.
      Az ajtó régi és misztikusnak tűnik. Bemész rajta?`,
    decisions: [
      {
        id: 'decision_enter_door',
        text: 'Bemész az ajtón',
        nextScene: 'scene_broken_handle'
      },
      { id: 'decision_go_back', text: 'Inkább visszamész', nextScene: 'scene_end' }
    ]
  },
  scene_broken_handle: {
    id: 'scene_broken_handle',
    mediaType: 'image' as const,
    mediaUrl: 'https://via.placeholder.com/800x400/1a1a2e/ff9800?text=Toros+Kilincs',
    storyText: `Az ajtó kilincse régi és ahogy próbáltad lenyomni eltört...
      De egy üzenet van az ajtóra vészve: "A memória próbája nyitja az utat. Hat pár, 20 másodperc."`,
    decisions: [
      {
        id: 'decision_solve_puzzle',
        text: '🧩 Megoldod a titkot',
        action: { type: 'OPEN_MODAL', modal_id: 'memory_game' }
      }
    ]
  },
  scene_memory_success: {
    id: 'scene_memory_success',
    mediaType: 'image' as const,
    mediaUrl: 'https://via.placeholder.com/800x400/1a1a2e/4caf50?text=Siker',
    storyText: `Remek! Megoldottad a memória próbáját! Az ajtó lassan kinyílik,
      felfedve egy titokzatos folyosót...`,
    decisions: [
      { id: 'decision_continue', text: 'Tovább a folyosón', nextScene: 'scene_corridor' }
    ]
  },
  scene_memory_failure: {
    id: 'scene_memory_failure',
    mediaType: 'image' as const,
    mediaUrl: 'https://via.placeholder.com/800x400/1a1a2e/ff6b6b?text=Sikertelen',
    storyText: `Sajnos nem sikerült időben megoldani a feladványt.
      Az ajtó bezárva marad. Talán később visszatérhetsz...`,
    decisions: [
      { id: 'decision_back', text: 'Visszamész', nextScene: 'scene_end' }
    ]
  },
  scene_corridor: {
    id: 'scene_corridor',
    mediaType: 'image' as const,
    mediaUrl: 'https://via.placeholder.com/800x400/1a1a2e/667eea?text=Folyoso',
    storyText: `A folyosó hosszú és sötét. A végén egy alakot látsz - egy árus állítólag
      ritka tárgyakat kínál kalandoroknak. Mit teszel?`,
    decisions: [
      {
        id: 'decision_talk_merchant',
        text: '🛒 Odamész az árushoz',
        nextScene: 'scene_merchant'
      },
      {
        id: 'decision_skip_merchant',
        text: 'Továbbmész a kijárat felé',
        nextScene: 'scene_exit'
      }
    ]
  },
  scene_merchant: {
    id: 'scene_merchant',
    mediaType: 'image' as const,
    mediaUrl: 'https://via.placeholder.com/800x400/1a1a2e/ff9800?text=Arus',
    storyText: `Az árus barátságosan köszönt: "Üdvözöllek, kalandor! Nálam mindig
      megtalálod, amire szükséged van. Szeretnél vásárolni?"`,
    decisions: [
      {
        id: 'decision_open_shop',
        text: '🛒 Megnézem az áruit',
        action: { type: 'OPEN_MODAL', modal_id: 'shop' }
      }
    ]
  },
  scene_exit: {
    id: 'scene_exit',
    mediaType: 'image' as const,
    mediaUrl: 'https://via.placeholder.com/800x400/1a1a2e/4caf50?text=Kijarat',
    storyText: `Végre a kijárat! A friss levegő megkönnyebbülést hoz.
      De várj... valami közeledik a sötétben...`,
    decisions: [
      { id: 'decision_continue_exit', text: '⚔️ Felkészülsz...', nextScene: 'scene_end' }
    ]
  },
  scene_end: {
    id: 'scene_end',
    mediaType: 'text' as const,
    content: 'Köszönjük, hogy játszottál! (Demo vége)',
    storyText: 'Ez volt a demo jelenet. A teljes történet hamarosan elérhető lesz!',
    decisions: [
      { id: 'decision_menu', text: 'Vissza a főmenübe', action: { type: 'NAVIGATE', target: 'main_menu' } }
    ]
  }
}

const chestQuiz = {
  question: 'A láda tetején egy rejtély van felírva: "Melyik elem szimbóluma a H?',
  options: [
    { id: 'opt_a', text: 'Hélium', isCorrect: false },
    { id: 'opt_b', text: 'Hidrogén', isCorrect: true },
    { id: 'opt_c', text: 'Higany', isCorrect: false },
    { id: 'opt_d', text: 'Hafnium', isCorrect: false },
  ]
}

const merchantItems = [
  {
    id: 'titan_helmet',
    name: 'Titán sisak',
    icon: '⛑️',
    price: 20,
    currencyType: 'gold',
    description: '+5 védelem a fejre'
  },
  {
    id: 'mana_potion',
    name: 'Mana főzet',
    icon: '🧪',
    price: 15,
    currencyType: 'gold',
    description: 'Visszatölt 50 mana-t'
  },
  {
    id: 'enchanted_sword',
    name: 'Megbűvölt kard',
    icon: '⚔️',
    price: 50,
    currencyType: 'gold',
    description: '+10 támadás'
  },
  {
    id: 'crystal_amulet',
    name: 'Kristály amulett',
    icon: '📿',
    price: 3,
    currencyType: 'crystal',
    description: 'Védelem a mágikus támadás ellen'
  },
  {
    id: 'fire_scroll',
    name: 'Tűz tekercs',
    icon: '📜',
    price: 30,
    currencyType: 'mana',
    description: 'Tűzlabda varázslat (1x használat)'
  },
  {
    id: 'shield',
    name: 'Acél pajzs',
    icon: '🛡️',
    price: 35,
    currencyType: 'gold',
    description: '+8 védelem'
  }
]

interface InventoryState {
  currencies: Array<{ id: string; name: string; icon: string; value: number }>
  items: Array<{ id: string; name: string; icon: string; quantity: number }>
}

interface ToastNotification {
  id: number
  message: string
  type: 'success' | 'error' | 'info'
  icon?: string
}

export default function GameView() {
  const navigate = useNavigate()
  const [currentSceneId, setCurrentSceneId] = useState('scene_music_door')
  const [inventory, setInventory] = useState<InventoryState>({
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
  })
  const [isTransitioning, setIsTransitioning] = useState(false)

  // Modal states
  const [isInventoryOpen, setIsInventoryOpen] = useState(false)
  const [isDiceModalOpen, setIsDiceModalOpen] = useState(false)
  const [isQuizModalOpen, setIsQuizModalOpen] = useState(false)
  const [isMemoryGameOpen, setIsMemoryGameOpen] = useState(false)
  const [isShopOpen, setIsShopOpen] = useState(false)

  // Toast notifications
  const [toasts, setToasts] = useState<ToastNotification[]>([])

  const currentScene = gameScenes[currentSceneId]

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info', icon?: string) => {
    const id = Date.now()
    setToasts((prev) => [...prev, { id, message, type, icon }])
  }

  const removeToast = (id: number) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id))
  }

  const addCurrency = (currencyId: string, amount: number) => {
    setInventory((prev) => ({
      ...prev,
      currencies: prev.currencies.map((curr) =>
        curr.id === currencyId
          ? { ...curr, value: curr.value + amount }
          : curr
      )
    }))
  }

  const addItem = (itemId: string, itemName: string, itemIcon: string, quantity: number) => {
    setInventory((prev) => {
      const existingItem = prev.items.find((item) => item.id === itemId)
      if (existingItem) {
        return {
          ...prev,
          items: prev.items.map((item) =>
            item.id === itemId
              ? { ...item, quantity: item.quantity + quantity }
              : item
          )
        }
      } else {
        return {
          ...prev,
          items: [...prev.items, { id: itemId, name: itemName, icon: itemIcon, quantity }]
        }
      }
    })
  }

  const handleDecision = async (_decisionId: string, decision: any) => {
    // Handle modal actions
    if (decision.action?.type === 'OPEN_MODAL') {
      if (decision.action.modal_id === 'dice_roll_2d6') {
        setIsDiceModalOpen(true)
      } else if (decision.action.modal_id === 'quiz_chest') {
        setIsQuizModalOpen(true)
      } else if (decision.action.modal_id === 'memory_game') {
        setIsMemoryGameOpen(true)
      } else if (decision.action.modal_id === 'shop') {
        setIsShopOpen(true)
      }
      return
    }

    // Handle navigation actions
    if (decision.action?.type === 'NAVIGATE' && decision.action.target === 'main_menu') {
      navigate('/dashboard')
      return
    }

    if (decision.action?.type === 'LOAD_LATEST_SAVE') {
      // Restart from beginning for demo
      transitionToScene('scene_music_door')
      return
    }

    // Handle regular scene transitions
    if (decision.nextScene) {
      transitionToScene(decision.nextScene)
    }
  }

  const handleDiceRollResult = (result: DiceRollResult | null) => {
    setIsDiceModalOpen(false)

    if (!result) return

    // Evaluate dice roll (threshold: > 8)
    if (result.success) {
      // Success: go to candle room
      transitionToScene('scene_candle_room')
    } else {
      // Failure: death scene
      transitionToScene('scene_trap_death')
    }

    // TODO: Save decision to backend
    console.log('Dice roll result:', result)
  }

  const handleQuizResult = (result: QuizResult | null) => {
    setIsQuizModalOpen(false)

    if (!result) return

    // Evaluate quiz result
    if (result.success) {
      // Success: give map + 20 gold
      addItem('map', 'Ősi térkép', '🗺️', 1)
      addCurrency('gold', 20)

      showToast('+ Ősi térkép', 'success', '🗺️')
      setTimeout(() => {
        showToast('+ 20 Arany', 'success', '💰')
      }, 500)

      // Continue to secret door scene
      setTimeout(() => {
        transitionToScene('scene_secret_door_found')
      }, 1500)
    } else {
      // Failure: no rewards, but continue
      showToast('A láda üres maradt...', 'error')
      setTimeout(() => {
        transitionToScene('scene_end')
      }, 1500)
    }

    console.log('Quiz result:', result)
  }

  const handleMemoryGameResult = (result: MemoryGameResult | null) => {
    setIsMemoryGameOpen(false)

    if (!result) return

    // Evaluate memory game result
    if (result.success) {
      // Success: proceed to success scene
      showToast('Sikeres megoldás!', 'success', '🎉')
      setTimeout(() => {
        transitionToScene('scene_memory_success')
      }, 1000)
    } else {
      // Failure: proceed to failure scene
      showToast('Nem sikerült...', 'error', '😞')
      setTimeout(() => {
        transitionToScene('scene_memory_failure')
      }, 1000)
    }

    console.log('Memory game result:', result)
  }

  const handleShopResult = (result: ShopResult | null) => {
    setIsShopOpen(false)

    if (!result) return

    if (result.purchased && result.items.length > 0) {
      // Process purchases
      result.items.forEach((item) => {
        // Deduct currency
        setInventory((prev) => ({
          ...prev,
          currencies: prev.currencies.map((curr) =>
            curr.id === item.currencyType
              ? { ...curr, value: curr.value - item.price }
              : curr
          )
        }))

        // Add item to inventory
        addItem(item.id, item.name, item.icon, 1)

        // Show toast for each item
        showToast(`+ ${item.name}`, 'success', item.icon)
      })

      // Show total cost toast
      setTimeout(() => {
        const totalGold = result.totalCost.gold || 0
        const totalCrystal = result.totalCost.crystal || 0
        const totalMana = result.totalCost.mana || 0

        if (totalGold > 0) {
          showToast(`-${totalGold} Arany`, 'info', '💰')
        }
        if (totalCrystal > 0) {
          setTimeout(() => showToast(`-${totalCrystal} Kristály`, 'info', '💎'), 200)
        }
        if (totalMana > 0) {
          setTimeout(() => showToast(`-${totalMana} Mana`, 'info', '⚗️'), 400)
        }
      }, result.items.length * 200)

      // Go to exit scene after purchases
      setTimeout(() => {
        transitionToScene('scene_exit')
      }, 2000)
    } else {
      // No purchase or skipped
      showToast('Nem vásároltál semmit', 'info')
      setTimeout(() => {
        transitionToScene('scene_exit')
      }, 1000)
    }

    console.log('Shop result:', result)
  }

  const transitionToScene = (sceneId: string) => {
    setIsTransitioning(true)

    setTimeout(() => {
      setCurrentSceneId(sceneId)
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
          content={currentScene.content}
        />

        <StorySection
          text={currentScene.storyText}
        />

        <DecisionButtons
          decisions={currentScene.decisions}
          onDecision={(decisionId, _nextSceneId) => {
            const decision = currentScene.decisions.find((d: any) => d.id === decisionId)
            handleDecision(decisionId, decision)
          }}
          disabled={isTransitioning}
        />
      </main>

      <InventoryBar
        currencies={inventory.currencies}
        onOpenInventory={() => setIsInventoryOpen(true)}
      />

      {/* Modals */}
      <InventoryModal
        isOpen={isInventoryOpen}
        onClose={() => setIsInventoryOpen(false)}
        currencies={inventory.currencies}
        items={inventory.items}
      />

      <DiceRollModal
        isOpen={isDiceModalOpen}
        onClose={handleDiceRollResult}
        diceCount={2}
        sides={6}
        threshold={8}
        comparison=">"
      />

      <QuizModal
        isOpen={isQuizModalOpen}
        onClose={handleQuizResult}
        question={chestQuiz.question}
        options={chestQuiz.options}
        timeLimit={30}
      />

      <MemoryGameModal
        isOpen={isMemoryGameOpen}
        onClose={handleMemoryGameResult}
      />

      <ShopModal
        isOpen={isShopOpen}
        onClose={handleShopResult}
        items={merchantItems}
        availableCurrency={{
          gold: inventory.currencies.find((c) => c.id === 'gold')?.value || 0,
          crystal: inventory.currencies.find((c) => c.id === 'crystal')?.value || 0,
          mana: inventory.currencies.find((c) => c.id === 'mana')?.value || 0
        }}
      />

      {/* Toast Notifications */}
      <div className="toast-container">
        {toasts.map((toast) => (
          <Toast
            key={toast.id}
            message={toast.message}
            type={toast.type}
            icon={toast.icon}
            onClose={() => removeToast(toast.id)}
          />
        ))}
      </div>
    </div>
  )
}
