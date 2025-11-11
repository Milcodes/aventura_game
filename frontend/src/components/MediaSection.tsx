import './MediaSection.css'

interface MediaSectionProps {
  type: 'image' | 'video' | 'text' | 'html'
  url?: string
  content?: string
}

export default function MediaSection({ type, url, content }: MediaSectionProps) {
  return (
    <section className="media-section">
      {type === 'image' && url && (
        <div className="media-image-container">
          <img src={url} alt="Scene" className="media-image" />
        </div>
      )}

      {type === 'video' && url && (
        <div className="media-video-container">
          <video src={url} controls className="media-video" />
        </div>
      )}

      {type === 'text' && content && (
        <div className="media-text-container">
          <p className="media-text">{content}</p>
        </div>
      )}

      {type === 'html' && content && (
        <div
          className="media-html-container"
          dangerouslySetInnerHTML={{ __html: content }}
        />
      )}
    </section>
  )
}
