import { useState, useEffect } from 'react';
import { storiesApi, Branch, StoryNode, BranchType, ExitType, CreateBranchDto, UpdateBranchDto } from '../api/stories';
import './BranchEditorModal.css';

interface BranchEditorModalProps {
  storyId: string;
  branch?: Branch | null;
  existingNodes: StoryNode[];
  existingBranches: Branch[];
  onClose: () => void;
  onSave: () => void;
}

export default function BranchEditorModal({
  storyId,
  branch,
  existingNodes,
  existingBranches,
  onClose,
  onSave,
}: BranchEditorModalProps) {
  const [name, setName] = useState(branch?.name || '');
  const [type, setType] = useState<BranchType>(branch?.type || BranchType.LOCATION);
  const [entryNodeId, setEntryNodeId] = useState(branch?.entryNodeId || '');
  const [exitNodeIds, setExitNodeIds] = useState<string[]>(
    branch?.exitNodeIds || []
  );
  const [exitType, setExitType] = useState<ExitType>(branch?.exitType || ExitType.NODE);
  const [parentBranchId, setParentBranchId] = useState(branch?.parentBranchId || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEditing = !!branch;

  // Available parent branches (max depth 2, since we can nest to depth 3)
  const availableParentBranches = existingBranches.filter(
    (b) => b.depth < 3 && (!branch || b.id !== branch.id)
  );

  // Available entry nodes based on parent branch selection
  const availableEntryNodes = parentBranchId
    ? existingBranches.find(b => b.id === parentBranchId)?.nodes || []
    : existingNodes.filter(n => !n.branchId); // Mainline nodes only for top-level branches

  // Available exit nodes (mainline only for now, or "DEATH")
  const availableExitNodes = existingNodes.filter(n => !n.branchId);

  const handleExitNodeToggle = (nodeId: string) => {
    if (exitNodeIds.includes(nodeId)) {
      setExitNodeIds(exitNodeIds.filter(id => id !== nodeId));
    } else {
      setExitNodeIds([...exitNodeIds, nodeId]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      setError('A név kötelező!');
      return;
    }

    if (!entryNodeId) {
      setError('Válassz egy belépési pontot!');
      return;
    }

    if (exitType === ExitType.NODE && exitNodeIds.length === 0) {
      setError('Legalább egy kilépési pontot válassz, vagy válaszd a "Halál" opciót!');
      return;
    }

    try {
      setSaving(true);
      setError(null);

      if (isEditing) {
        const dto: UpdateBranchDto = {
          name,
          type,
          entryNodeId,
          exitNodeIds: exitType === ExitType.DEATH ? ['DEATH'] : exitNodeIds,
          exitType,
        };
        await storiesApi.updateBranch(branch.id, dto);
      } else {
        const dto: CreateBranchDto = {
          storyId,
          name,
          type,
          entryNodeId,
          exitNodeIds: exitType === ExitType.DEATH ? ['DEATH'] : exitNodeIds,
          exitType,
          parentBranchId: parentBranchId || undefined,
        };
        await storiesApi.createBranch(dto);
      }

      onSave();
    } catch (err: any) {
      console.error('Failed to save branch:', err);
      setError(err.response?.data?.message || 'Nem sikerült menteni');
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{isEditing ? 'Branch szerkesztése' : 'Új branch létrehozása'}</h2>
          <button className="btn-close" onClick={onClose}>✕</button>
        </div>

        <form onSubmit={handleSubmit} className="modal-body">
          {error && <div className="error-message">⚠️ {error}</div>}

          <div className="form-group">
            <label>Név *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="pl. Rejtélyes Ház, Barna Szoba, 19-es Szoba"
              required
            />
            <span className="hint">
              Egyedi név, amit te adsz meg (nem generált ID)
            </span>
          </div>

          <div className="form-group">
            <label>Típus</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as BranchType)}
            >
              <option value={BranchType.LOCATION}>Helyszín (Location)</option>
              <option value={BranchType.ROOM}>Szoba (Room)</option>
              <option value={BranchType.EVENT}>Esemény (Event)</option>
            </select>
          </div>

          {!isEditing && availableParentBranches.length > 0 && (
            <div className="form-group">
              <label>Szülő branch (opcionális)</label>
              <select
                value={parentBranchId}
                onChange={(e) => {
                  setParentBranchId(e.target.value);
                  setEntryNodeId(''); // Reset entry node when parent changes
                }}
              >
                <option value="">Nincs (mainline-ból indul)</option>
                {availableParentBranches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} (mélység: {b.depth})
                  </option>
                ))}
              </select>
              <span className="hint">
                Maximum 3 szintű beágyazás lehetséges
              </span>
            </div>
          )}

          <div className="form-group">
            <label>Belépési pont *</label>
            <select
              value={entryNodeId}
              onChange={(e) => setEntryNodeId(e.target.value)}
              required
            >
              <option value="">Válassz...</option>
              {availableEntryNodes.map((node) => (
                <option key={node.id} value={node.id}>
                  #{node.order}: {node.label}
                </option>
              ))}
            </select>
            <span className="hint">
              {parentBranchId
                ? 'A szülő branch egy node-ja'
                : 'Mainline node, ahonnan ez a branch indul'}
            </span>
          </div>

          <div className="form-group">
            <label>Kilépés típusa</label>
            <div className="radio-group">
              <label>
                <input
                  type="radio"
                  checked={exitType === ExitType.NODE}
                  onChange={() => setExitType(ExitType.NODE)}
                />
                Visszatér node-hoz
              </label>
              <label>
                <input
                  type="radio"
                  checked={exitType === ExitType.DEATH}
                  onChange={() => {
                    setExitType(ExitType.DEATH);
                    setExitNodeIds([]);
                  }}
                />
                Halál (game over)
              </label>
            </div>
          </div>

          {exitType === ExitType.NODE && (
            <div className="form-group">
              <label>Kilépési pontok *</label>
              <div className="checkbox-list">
                {availableExitNodes.length === 0 ? (
                  <p className="hint">Nincs elérhető mainline node kilépéshez</p>
                ) : (
                  availableExitNodes.map((node) => (
                    <label key={node.id} className="checkbox-item">
                      <input
                        type="checkbox"
                        checked={exitNodeIds.includes(node.id)}
                        onChange={() => handleExitNodeToggle(node.id)}
                      />
                      #{node.order}: {node.label}
                    </label>
                  ))
                )}
              </div>
              <span className="hint">
                Mainline node(ok), ahová a branch visszatér
              </span>
            </div>
          )}

          <div className="form-info">
            <p>💡 <strong>Validációs szabályok:</strong></p>
            <ul>
              <li>Maximum 100 node per branch</li>
              <li>Maximum 3 szintű beágyazás</li>
              <li>Minden branch-nek kell entry és exit pont</li>
            </ul>
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
