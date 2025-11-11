import { useState, useEffect } from 'react';
import { storiesApi, StoryNode, CreateStoryNodeDto, UpdateStoryNodeDto } from '../api/stories';
import './NodeEditorModal.css';

interface NodeEditorModalProps {
  storyId: string;
  branchId?: string | null;
  node?: StoryNode | null;
  existingNodes: StoryNode[];
  onClose: () => void;
  onSave: () => void;
}

export default function NodeEditorModal({
  storyId,
  branchId,
  node,
  existingNodes,
  onClose,
  onSave,
}: NodeEditorModalProps) {
  const [order, setOrder] = useState(node?.order || existingNodes.length + 1);
  const [label, setLabel] = useState(node?.label || '');
  const [mediaType, setMediaType] = useState(node?.mediaType || '');
  const [mediaUrl, setMediaUrl] = useState(node?.mediaUrl || '');
  const [storyText, setStoryText] = useState(node?.storyText || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEditing = !!node;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!label.trim()) {
      setError('A címke kötelező!');
      return;
    }

    try {
      setSaving(true);
      setError(null);

      if (isEditing) {
        const dto: UpdateStoryNodeDto = {
          order,
          label,
          mediaType: mediaType || undefined,
          mediaUrl: mediaUrl || undefined,
          storyText: storyText || undefined,
        };
        await storiesApi.updateNode(node.id, dto);
      } else {
        const dto: CreateStoryNodeDto = {
          storyId,
          branchId: branchId || undefined,
          order,
          label,
          mediaType: mediaType || undefined,
          mediaUrl: mediaUrl || undefined,
          storyText: storyText || undefined,
        };
        await storiesApi.createNode(dto);
      }

      onSave();
    } catch (err: any) {
      console.error('Failed to save node:', err);
      setError(err.response?.data?.message || 'Nem sikerült menteni');
      setSaving(false);
    }
  };

  return (
    <div className="node-modal-overlay" onClick={onClose}>
      <div className="node-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="node-modal-header">
          <h2>{isEditing ? 'Node szerkesztése' : 'Új node létrehozása'}</h2>
          <button className="btn-close" onClick={onClose}>✕</button>
        </div>

        <form onSubmit={handleSubmit} className="node-modal-body">
          {error && <div className="error-message">⚠️ {error}</div>}

          <div className="form-group">
            <label>Sorrend *</label>
            <input
              type="number"
              value={order}
              onChange={(e) => setOrder(parseInt(e.target.value))}
              min={1}
              required
            />
            <span className="hint">
              Pozíció a szekvenciában (1, 2, 3...)
            </span>
          </div>

          <div className="form-group">
            <label>Címke *</label>
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="pl. Születés, Gyerekkor, Barna Szoba..."
              required
            />
            <span className="hint">
              Rövid név a node azonosítására
            </span>
          </div>

          <div className="form-group">
            <label>Történet szöveg</label>
            <textarea
              value={storyText}
              onChange={(e) => setStoryText(e.target.value)}
              placeholder="Írd le, mi történik ebben a pontban..."
              rows={6}
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Média típus</label>
              <select
                value={mediaType}
                onChange={(e) => setMediaType(e.target.value)}
              >
                <option value="">Nincs</option>
                <option value="image">Kép</option>
                <option value="video">Videó</option>
                <option value="audio">Hang</option>
              </select>
            </div>

            <div className="form-group">
              <label>Média URL</label>
              <input
                type="text"
                value={mediaUrl}
                onChange={(e) => setMediaUrl(e.target.value)}
                placeholder="https://..."
                disabled={!mediaType}
              />
            </div>
          </div>

          <div className="form-info">
            <p>ℹ️ <strong>Döntések és effektek</strong> a node létrehozása után adhatók hozzá.</p>
            {branchId && (
              <p>🌳 Ez a node egy <strong>branch-hez</strong> tartozik.</p>
            )}
            {!branchId && (
              <p>🔗 Ez egy <strong>mainline</strong> node.</p>
            )}
          </div>

          <div className="modal-actions">
            <button type="button" className="btn-cancel" onClick={onClose}>
              Mégse
            </button>
            <button type="submit" className="btn-submit" disabled={saving}>
              {saving ? 'Mentés...' : '💾 Mentés'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
