import './StorySection.css'

interface StorySectionProps {
  text: string
}

export default function StorySection({ text }: StorySectionProps) {
  return (
    <section className="story-section">
      <div className="story-container">
        <p className="story-text">{text}</p>
      </div>
    </section>
  )
}
