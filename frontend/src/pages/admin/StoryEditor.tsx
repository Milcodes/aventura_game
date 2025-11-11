import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { storiesApi, Story, StoryNode, Branch, StoryStatus, BranchType } from '../../api/stories';
import Header from '../../components/Header';
import NodeEditorModal from '../../components/NodeEditorModal';
import BranchEditorModal from '../../components/BranchEditorModal';
import './StoryEditor.css';

type Tab = 'metadata' | 'nodes' | 'branches' | 'preview';

export default function StoryEditor() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<Tab>('metadata');
  const [story, setStory] = useState<Story | null>(null);
  const [mainlineNodes, setMainlineNodes] = useState<StoryNode[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Modal states
  const [nodeModalOpen, setNodeModalOpen] = useState(false);
  const [branchModalOpen, setBranchModalOpen] = useState(false);
  const [editingNode, setEditingNode] = useState<StoryNode | null>(null);
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null);
  const [selectedBranchForNodes, setSelectedBranchForNodes] = useState<string | null>(null);

  // Metadata form
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [language, setLanguage] = useState('hu');
  const [isPublic, setIsPublic] = useState(false);

  useEffect(() => {
    loadStory();
  }, [id]);

  const loadStory = async () => {
    if (!id) return;

    try {
      setLoading(true);
      setError(null);

      const [storyRes, nodesRes, branchesRes] = await Promise.all([
        storiesApi.getOne(id, true),
        storiesApi.getNodes(id),
        storiesApi.getBranches(id),
      ]);

      const storyData = storyRes.data;
      setStory(storyData);
      setTitle(storyData.title);
      setDescription(storyData.description || '');
      setLanguage(storyData.language);
      setIsPublic(storyData.isPublic);

      setMainlineNodes(nodesRes.data.sort((a, b) => a.order - b.order));
      setBranches(branchesRes.data);
    } catch (err: any) {
      console.error('Failed to load story:', err);
      setError(err.response?.data?.message || 'Failed to load story');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveMetadata = async () => {
    if (!story) return;

    try {
      setSaving(true);
      await storiesApi.update(story.id, {
        title,
        description,
        isPublic,
        version: story.version,
      });

      setStory({ ...story, title, description, isPublic, version: story.version + 1 });
      alert('Mentve!');
    } catch (err: any) {
      console.error('Failed to save metadata:', err);
      alert(err.response?.data?.message || 'Nem sikerült menteni');
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (newStatus: StoryStatus) => {
    if (!story) return;

    try {
      await storiesApi.updateStatus(story.id, newStatus);
      setStory({ ...story, status: newStatus });
      alert(`Státusz frissítve: ${getStatusLabel(newStatus)}`);

      // Reload to ensure validation passed
      await loadStory();
    } catch (err: any) {
      console.error('Failed to update status:', err);
      alert(err.response?.data?.message || 'Nem sikerült frissíteni a státuszt');
    }
  };

  const handleCreateNode = (branchId?: string) => {
    setEditingNode(null);
    setSelectedBranchForNodes(branchId || null);
    setNodeModalOpen(true);
  };

  const handleEditNode = (node: StoryNode) => {
    setEditingNode(node);
    setSelectedBranchForNodes(node.branchId || null);
    setNodeModalOpen(true);
  };

  const handleDeleteNode = async (nodeId: string) => {
    if (!window.confirm('Biztosan törölni szeretnéd ezt a node-ot?')) return;

    try {
      await storiesApi.deleteNode(nodeId);
      setMainlineNodes(mainlineNodes.filter(n => n.id !== nodeId));

      // Reload branches to update their nodes
      const branchesRes = await storiesApi.getBranches(story!.id);
      setBranches(branchesRes.data);
    } catch (err: any) {
      console.error('Failed to delete node:', err);
      alert(err.response?.data?.message || 'Nem sikerült törölni');
    }
  };

  const handleNodeSaved = async () => {
    setNodeModalOpen(false);
    await loadStory();
  };

  const handleCreateBranch = () => {
    setEditingBranch(null);
    setBranchModalOpen(true);
  };

  const handleEditBranch = (branch: Branch) => {
    setEditingBranch(branch);
    setBranchModalOpen(true);
  };

  const handleDeleteBranch = async (branchId: string, branchName: string) => {
    if (!window.confirm(`Biztosan törölni szeretnéd ezt a branchot: "${branchName}"?`)) return;

    try {
      await storiesApi.deleteBranch(branchId);
      setBranches(branches.filter(b => b.id !== branchId));
    } catch (err: any) {
      console.error('Failed to delete branch:', err);
      alert(err.response?.data?.message || 'Nem sikerült törölni');
    }
  };

  const handleBranchSaved = async () => {
    setBranchModalOpen(false);
    await loadStory();
  };

  const getStatusLabel = (status: StoryStatus) => {
    switch (status) {
      case StoryStatus.DRAFT: return 'Vázlat';
      case StoryStatus.REVIEW: return 'Véleményezés';
      case StoryStatus.PUBLISHED: return 'Publikált';
      case StoryStatus.ARCHIVED: return 'Archivált';
      default: return status;
    }
  };

  const getStatusClass = (status: StoryStatus) => {
    switch (status) {
      case StoryStatus.DRAFT: return 'status-draft';
      case StoryStatus.REVIEW: return 'status-review';
      case StoryStatus.PUBLISHED: return 'status-published';
      case StoryStatus.ARCHIVED: return 'status-archived';
      default: return '';
    }
  };

  if (loading) {
    return (
      <div className="story-editor">
        <Header />
        <div className="editor-content">
          <div className="loading">Betöltés...</div>
        </div>
      </div>
    );
  }

  if (error || !story) {
    return (
      <div className="story-editor">
        <Header />
        <div className="editor-content">
          <div className="error-state">
            <h2>⚠️ Hiba</h2>
            <p>{error || 'Történet nem található'}</p>
            <button onClick={() => navigate('/admin/stories')}>
              Vissza a listához
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="story-editor">
      <Header />

      <div className="editor-content">
        <div className="editor-header">
          <div className="editor-title-section">
            <button className="btn-back" onClick={() => navigate('/admin/stories')}>
              ← Vissza
            </button>
            <h1>{story.title}</h1>
            <span className={`status-badge ${getStatusClass(story.status)}`}>
              {getStatusLabel(story.status)}
            </span>
          </div>

          <div className="editor-actions">
            <select
              className="status-selector"
              value={story.status}
              onChange={(e) => handleStatusChange(e.target.value as StoryStatus)}
            >
              <option value={StoryStatus.DRAFT}>Vázlat</option>
              <option value={StoryStatus.REVIEW}>Véleményezés</option>
              <option value={StoryStatus.PUBLISHED}>Publikált</option>
              <option value={StoryStatus.ARCHIVED}>Archivált</option>
            </select>
          </div>
        </div>

        <div className="editor-tabs">
          <button
            className={`tab ${activeTab === 'metadata' ? 'active' : ''}`}
            onClick={() => setActiveTab('metadata')}
          >
            📝 Alapadatok
          </button>
          <button
            className={`tab ${activeTab === 'nodes' ? 'active' : ''}`}
            onClick={() => setActiveTab('nodes')}
          >
            🔗 Mainline Nodes ({mainlineNodes.length})
          </button>
          <button
            className={`tab ${activeTab === 'branches' ? 'active' : ''}`}
            onClick={() => setActiveTab('branches')}
          >
            🌳 Branches ({branches.length})
          </button>
          <button
            className={`tab ${activeTab === 'preview' ? 'active' : ''}`}
            onClick={() => setActiveTab('preview')}
          >
            👁️ Preview
          </button>
        </div>

        <div className="editor-body">
          {/* METADATA TAB */}
          {activeTab === 'metadata' && (
            <div className="metadata-tab">
              <div className="form-group">
                <label>Cím *</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Történet címe"
                />
              </div>

              <div className="form-group">
                <label>Leírás</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Rövid leírás a történetről..."
                  rows={4}
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Nyelv</label>
                  <select value={language} onChange={(e) => setLanguage(e.target.value)} disabled>
                    <option value="hu">Magyar</option>
                    <option value="en">English</option>
                  </select>
                  <span className="hint">⚠️ A nyelv a létrehozás után nem módosítható</span>
                </div>

                <div className="form-group">
                  <label>
                    <input
                      type="checkbox"
                      checked={isPublic}
                      onChange={(e) => setIsPublic(e.target.checked)}
                    />
                    Nyilvános (forkable)
                  </label>
                </div>
              </div>

              <div className="form-info">
                <p><strong>Verzió:</strong> {story.version}</p>
                <p><strong>Létrehozva:</strong> {new Date(story.createdAt).toLocaleString('hu-HU')}</p>
                <p><strong>Frissítve:</strong> {new Date(story.updatedAt).toLocaleString('hu-HU')}</p>
              </div>

              <button
                className="btn-save"
                onClick={handleSaveMetadata}
                disabled={saving}
              >
                {saving ? 'Mentés...' : '💾 Mentés'}
              </button>
            </div>
          )}

          {/* NODES TAB */}
          {activeTab === 'nodes' && (
            <div className="nodes-tab">
              <div className="tab-header">
                <h2>Mainline Nodes</h2>
                <button className="btn-create" onClick={() => handleCreateNode()}>
                  ➕ Új node
                </button>
              </div>

              {mainlineNodes.length === 0 ? (
                <div className="empty-state">
                  <p>Még nincs egyetlen mainline node sem.</p>
                  <p className="hint">
                    💡 A mainline a fő idővonalon (Birth → Life → Death) történik.
                    Minimum 3 node szükséges a publikáláshoz.
                  </p>
                  <button className="btn-create-large" onClick={() => handleCreateNode()}>
                    ➕ Első node létrehozása
                  </button>
                </div>
              ) : (
                <div className="nodes-table">
                  <table>
                    <thead>
                      <tr>
                        <th>Sorrend</th>
                        <th>Címke</th>
                        <th>Szöveg</th>
                        <th>Média</th>
                        <th>Döntések</th>
                        <th>Műveletek</th>
                      </tr>
                    </thead>
                    <tbody>
                      {mainlineNodes.map((node) => (
                        <tr key={node.id}>
                          <td className="order-cell">#{node.order}</td>
                          <td className="label-cell">{node.label}</td>
                          <td className="text-cell">
                            {node.storyText ? (
                              <span className="text-preview">
                                {node.storyText.substring(0, 50)}
                                {node.storyText.length > 50 ? '...' : ''}
                              </span>
                            ) : (
                              <span className="empty">-</span>
                            )}
                          </td>
                          <td className="media-cell">
                            {node.mediaType ? (
                              <span className="media-badge">{node.mediaType}</span>
                            ) : (
                              <span className="empty">-</span>
                            )}
                          </td>
                          <td className="decisions-cell">
                            {Array.isArray(node.decisions) && node.decisions.length > 0 ? (
                              <span className="count-badge">{node.decisions.length}</span>
                            ) : (
                              <span className="empty">0</span>
                            )}
                          </td>
                          <td className="actions-cell">
                            <button
                              className="btn-edit"
                              onClick={() => handleEditNode(node)}
                              title="Szerkesztés"
                            >
                              ✏️
                            </button>
                            <button
                              className="btn-delete"
                              onClick={() => handleDeleteNode(node.id)}
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
          )}

          {/* BRANCHES TAB */}
          {activeTab === 'branches' && (
            <div className="branches-tab">
              <div className="tab-header">
                <h2>Branches (Mellékszálak)</h2>
                <button className="btn-create" onClick={handleCreateBranch}>
                  ➕ Új branch
                </button>
              </div>

              {branches.length === 0 ? (
                <div className="empty-state">
                  <p>Még nincs egyetlen branch sem.</p>
                  <p className="hint">
                    💡 A branch-ek mellékszálak (helyszínek, szobák, események).
                    Maximum 3 szintű beágyazás lehetséges.
                  </p>
                  <button className="btn-create-large" onClick={handleCreateBranch}>
                    ➕ Első branch létrehozása
                  </button>
                </div>
              ) : (
                <div className="branches-list">
                  {branches.map((branch) => (
                    <div key={branch.id} className="branch-card" style={{ marginLeft: `${(branch.depth - 1) * 2}rem` }}>
                      <div className="branch-header">
                        <div className="branch-info">
                          <h3>{branch.name}</h3>
                          <span className="branch-type">{branch.type}</span>
                          <span className="branch-depth">Mélység: {branch.depth}</span>
                        </div>
                        <div className="branch-actions">
                          <button
                            className="btn-add-node"
                            onClick={() => handleCreateNode(branch.id)}
                            title="Node hozzáadása"
                          >
                            ➕ Node
                          </button>
                          <button
                            className="btn-edit"
                            onClick={() => handleEditBranch(branch)}
                            title="Szerkesztés"
                          >
                            ✏️
                          </button>
                          <button
                            className="btn-delete"
                            onClick={() => handleDeleteBranch(branch.id, branch.name)}
                            title="Törlés"
                          >
                            🗑️
                          </button>
                        </div>
                      </div>

                      {branch.nodes && branch.nodes.length > 0 && (
                        <div className="branch-nodes">
                          <p className="nodes-count">Nodes: {branch.nodes.length}/100</p>
                          <div className="nodes-mini-list">
                            {branch.nodes.slice(0, 5).map((node) => (
                              <div key={node.id} className="node-mini">
                                #{node.order}: {node.label}
                              </div>
                            ))}
                            {branch.nodes.length > 5 && (
                              <div className="node-mini more">+{branch.nodes.length - 5} több...</div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* PREVIEW TAB */}
          {activeTab === 'preview' && (
            <div className="preview-tab">
              <div className="preview-info">
                <h2>📊 Történet áttekintés</h2>

                <div className="stats-grid">
                  <div className="stat-card">
                    <div className="stat-value">{mainlineNodes.length}</div>
                    <div className="stat-label">Mainline Nodes</div>
                    {mainlineNodes.length < 3 && (
                      <div className="stat-warning">⚠️ Min. 3 szükséges</div>
                    )}
                  </div>

                  <div className="stat-card">
                    <div className="stat-value">{branches.length}</div>
                    <div className="stat-label">Branches</div>
                  </div>

                  <div className="stat-card">
                    <div className="stat-value">
                      {branches.reduce((sum, b) => sum + (b.nodes?.length || 0), 0)}
                    </div>
                    <div className="stat-label">Branch Nodes</div>
                  </div>

                  <div className="stat-card">
                    <div className="stat-value">
                      {Math.max(...branches.map(b => b.depth), 0)}
                    </div>
                    <div className="stat-label">Max Depth</div>
                    {Math.max(...branches.map(b => b.depth), 0) > 3 && (
                      <div className="stat-warning">⚠️ Max 3 megengedett</div>
                    )}
                  </div>
                </div>

                <div className="validation-section">
                  <h3>✅ Validáció</h3>
                  <ul className="validation-list">
                    <li className={mainlineNodes.length >= 3 ? 'valid' : 'invalid'}>
                      {mainlineNodes.length >= 3 ? '✓' : '✗'}
                      Minimum 3 mainline node ({mainlineNodes.length}/3)
                    </li>
                    <li className={branches.every(b => (b.nodes?.length || 0) <= 100) ? 'valid' : 'invalid'}>
                      {branches.every(b => (b.nodes?.length || 0) <= 100) ? '✓' : '✗'}
                      Max 100 node per branch
                    </li>
                    <li className={Math.max(...branches.map(b => b.depth), 0) <= 3 ? 'valid' : 'invalid'}>
                      {Math.max(...branches.map(b => b.depth), 0) <= 3 ? '✓' : '✗'}
                      Max 3 depth nesting
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      {nodeModalOpen && (
        <NodeEditorModal
          storyId={story.id}
          branchId={selectedBranchForNodes}
          node={editingNode}
          existingNodes={mainlineNodes}
          onClose={() => setNodeModalOpen(false)}
          onSave={handleNodeSaved}
        />
      )}

      {branchModalOpen && (
        <BranchEditorModal
          storyId={story.id}
          branch={editingBranch}
          existingNodes={mainlineNodes}
          existingBranches={branches}
          onClose={() => setBranchModalOpen(false)}
          onSave={handleBranchSaved}
        />
      )}
    </div>
  );
}
