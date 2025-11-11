import { useNavigate } from 'react-router-dom'
import Header from '../components/Header'
import CategoryCard from '../components/CategoryCard'
import OngoingGameCard from '../components/OngoingGameCard'
import './Dashboard.css'

const categories = [
  { id: 'action', title: 'Akció', icon: '⚔️', color: '#e74c3c' },
  { id: 'adventure', title: 'Kaland', icon: '🗺️', color: '#3498db' },
  { id: 'horror', title: 'Horror', icon: '👻', color: '#8e44ad' },
  { id: 'science', title: 'Tudomány', icon: '🔬', color: '#16a085' },
  { id: 'fantasy', title: 'Fantasy', icon: '🐉', color: '#e67e22' },
]

// Mock data for ongoing games
const ongoingGames = [
  {
    id: '1',
    title: 'A Sárkány Legendája',
    lastSaved: '2 órája',
    coverImage: undefined,
  },
  {
    id: '2',
    title: 'Titokzatos Kastély',
    lastSaved: '1 napja',
    coverImage: undefined,
  },
  {
    id: '3',
    title: 'Űr Kaland',
    lastSaved: '3 napja',
    coverImage: undefined,
  },
]

export default function Dashboard() {
  const navigate = useNavigate()

  const handleCategoryClick = (categoryId: string) => {
    // TODO: Navigate to category detail view or fetch stories
    console.log('Selected category:', categoryId)
  }

  const handleContinueGame = (gameId: string) => {
    // For now, navigate to a demo game
    navigate(`/game/story-${gameId}/session-${gameId}`)
  }

  return (
    <div className="dashboard">
      <Header />

      <main className="dashboard-content">
        <section className="hero-section">
          <h1 className="hero-title">
            Válassz egy történetet és kezdd el a játékot,<br />
            vagy hozz létre saját sztorit!
          </h1>
        </section>

        <section className="categories-section">
          <h2 className="section-title">Kategóriák</h2>
          <div className="categories-grid">
            {categories.map((category) => (
              <CategoryCard
                key={category.id}
                title={category.title}
                icon={category.icon}
                color={category.color}
                onClick={() => handleCategoryClick(category.id)}
              />
            ))}
          </div>
        </section>

        {ongoingGames.length > 0 && (
          <section className="ongoing-section">
            <h2 className="section-title">Folyamatban lévő játékok</h2>
            <div className="ongoing-grid">
              {ongoingGames.map((game) => (
                <OngoingGameCard
                  key={game.id}
                  title={game.title}
                  lastSaved={game.lastSaved}
                  coverImage={game.coverImage}
                  onContinue={() => handleContinueGame(game.id)}
                />
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  )
}
