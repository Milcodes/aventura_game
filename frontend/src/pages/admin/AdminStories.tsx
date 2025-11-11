import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { storiesApi, Story, StoryStatus } from '../../api/stories';
import Header from '../../components/Header';
import './AdminStories.css';

export default function AdminStories() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [stories, setStories] = useState<Story[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | StoryStatus>('all');

  useEffect(() => {
    loadStories();
  }, [user]);

  const loadStories = async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);
      const response = await storiesApi.getAll(user.id, false);
      setStories(response.data);
    } catch (err: any) {
      console.error('Failed to load stories:', err);
      setError(err.response?.data?.message || 'Failed to load stories');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateStory = async () => {
    try {
      const response = await storiesApi.create({
        title: 'Új történet',
        language: 'hu',
      });
      navigate(`/admin/stories/${response.data.id}`);
    } catch (err: any) {
      console.error('Failed to create story:', err);
      const errorMessage = err.response?.data?.message || err.message || 'Nem sikerült létrehozni a történetet';
      alert(`Hiba: ${errorMessage}`);
    }
  };

  const handleDeleteStory = async (id: string, title: string) => {
    if (!window.confirm(`Biztosan törölni szeretnéd ezt a történetet: "${title}"?`)) {
      return;
    }

    try {
      await storiesApi.delete(id);
      setStories(stories.filter(s => s.id !== id));
    } catch (err: any) {
      console.error('Failed to delete story:', err);
      alert('Nem sikerült törölni a történetet');
    }
  };

  const handleStatusChange = async (id: string, newStatus: StoryStatus) => {
    try {
      await storiesApi.updateStatus(id, newStatus);
      setStories(stories.map(s =>
        s.id === id ? { ...s, status: newStatus } : s
      ));
    } catch (err: any) {
      console.error('Failed to update status:', err);
      alert(err.response?.data?.message || 'Nem sikerült frissíteni a státuszt');
    }
  };

  const getStatusBadgeClass = (status: StoryStatus) => {
    switch (status) {
      case StoryStatus.DRAFT:
        return 'status-draft';
      case StoryStatus.REVIEW:
        return 'status-review';
      case StoryStatus.PUBLISHED:
        return 'status-published';
      case StoryStatus.ARCHIVED:
        return 'status-archived';
      default:
        return '';
    }
  };

  const getStatusLabel = (status: StoryStatus) => {
    switch (status) {
      case StoryStatus.DRAFT:
        return 'Vázlat';
      case StoryStatus.REVIEW:
        return 'Véleményezés';
      case StoryStatus.PUBLISHED:
        return 'Publikált';
      case StoryStatus.ARCHIVED:
        return 'Archivált';
      default:
        return status;
    }
  };

  const filteredStories = filter === 'all'
    ? stories
    : stories.filter(s => s.status === filter);

  if (loading) {
    return (
      <div className="admin-stories">
        <Header />
        <div className="admin-content">
          <div className="loading">Betöltés...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-stories">
      <Header />

      <div className="admin-content">
        <div className="admin-header">
          <h1>Történetek kezelése</h1>
          <button className="btn-create" onClick={handleCreateStory}>
            ➕ Új történet
          </button>
        </div>

        {error && (
          <div className="error-message">
            ⚠️ {error}
            <button onClick={loadStories}>Újra</button>
          </div>
        )}

        <div className="filters">
          <button
            className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
            onClick={() => setFilter('all')}
          >
            Mind ({stories.length})
          </button>
          <button
            className={`filter-btn ${filter === StoryStatus.DRAFT ? 'active' : ''}`}
            onClick={() => setFilter(StoryStatus.DRAFT)}
          >
            Vázlat ({stories.filter(s => s.status === StoryStatus.DRAFT).length})
          </button>
          <button
            className={`filter-btn ${filter === StoryStatus.REVIEW ? 'active' : ''}`}
            onClick={() => setFilter(StoryStatus.REVIEW)}
          >
            Véleményezés ({stories.filter(s => s.status === StoryStatus.REVIEW).length})
          </button>
          <button
            className={`filter-btn ${filter === StoryStatus.PUBLISHED ? 'active' : ''}`}
            onClick={() => setFilter(StoryStatus.PUBLISHED)}
          >
            Publikált ({stories.filter(s => s.status === StoryStatus.PUBLISHED).length})
          </button>
          <button
            className={`filter-btn ${filter === StoryStatus.ARCHIVED ? 'active' : ''}`}
            onClick={() => setFilter(StoryStatus.ARCHIVED)}
          >
            Archivált ({stories.filter(s => s.status === StoryStatus.ARCHIVED).length})
          </button>
        </div>

        {filteredStories.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📚</div>
            <h2>Nincs még történeted</h2>
            <p>Hozz létre egy új történetet a kezdéshez!</p>
            <button className="btn-create-large" onClick={handleCreateStory}>
              ➕ Új történet létrehozása
            </button>
          </div>
        ) : (
          <div className="stories-table">
            <table>
              <thead>
                <tr>
                  <th>Cím</th>
                  <th>Leírás</th>
                  <th>Státusz</th>
                  <th>Nyilvános</th>
                  <th>Verzió</th>
                  <th>Frissítve</th>
                  <th>Műveletek</th>
                </tr>
              </thead>
              <tbody>
                {filteredStories.map(story => (
                  <tr key={story.id}>
                    <td>
                      <button
                        className="story-title-link"
                        onClick={() => navigate(`/admin/stories/${story.id}`)}
                      >
                        {story.title}
                      </button>
                    </td>
                    <td className="description-cell">
                      {story.description || <span className="empty">-</span>}
                    </td>
                    <td>
                      <select
                        className={`status-badge ${getStatusBadgeClass(story.status)}`}
                        value={story.status}
                        onChange={(e) => handleStatusChange(story.id, e.target.value as StoryStatus)}
                      >
                        <option value={StoryStatus.DRAFT}>Vázlat</option>
                        <option value={StoryStatus.REVIEW}>Véleményezés</option>
                        <option value={StoryStatus.PUBLISHED}>Publikált</option>
                        <option value={StoryStatus.ARCHIVED}>Archivált</option>
                      </select>
                    </td>
                    <td>
                      {story.isPublic ? (
                        <span className="public-badge">🌐 Igen</span>
                      ) : (
                        <span className="private-badge">🔒 Nem</span>
                      )}
                    </td>
                    <td className="version-cell">v{story.version}</td>
                    <td className="date-cell">
                      {new Date(story.updatedAt).toLocaleDateString('hu-HU', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="actions-cell">
                      <button
                        className="btn-edit"
                        onClick={() => navigate(`/admin/stories/${story.id}`)}
                        title="Szerkesztés"
                      >
                        ✏️
                      </button>
                      <button
                        className="btn-delete"
                        onClick={() => handleDeleteStory(story.id, story.title)}
                        title="Törlés"
                      >
                        🗑️
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
