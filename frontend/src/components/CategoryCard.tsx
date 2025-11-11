import './CategoryCard.css'

interface CategoryCardProps {
  title: string
  icon: string
  color: string
  onClick: () => void
}

export default function CategoryCard({ title, icon, color, onClick }: CategoryCardProps) {
  return (
    <div
      className="category-card"
      style={{ '--card-color': color } as React.CSSProperties}
      onClick={onClick}
    >
      <div className="category-icon">{icon}</div>
      <h3 className="category-title">{title}</h3>
      <div className="category-overlay"></div>
    </div>
  )
}
