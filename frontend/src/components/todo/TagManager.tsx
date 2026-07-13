import React, { useState } from 'react';
import { ArrowLeft, Trash2, Edit2, Check, X } from 'lucide-react';
import api from '../../services/api';
import { getSortedTagsWithDepth } from '../../utils/tagUtils';

interface Tag {
  id: number;
  name: string;
  parent_id?: number | null;
}

interface TagManagerProps {
  tags: Tag[];
  onBack: () => void;
  onRefresh: () => void;
}

export const TagManager: React.FC<TagManagerProps> = ({
  tags,
  onBack,
  onRefresh,
}) => {
  const [newTagName, setNewTagName] = useState<string>('');
  const [parentTagId, setParentTagId] = useState<string>('');
  const [editingTagId, setEditingTagId] = useState<number | null>(null);
  const [editingName, setEditingName] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  const handleCreateTag = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTagName.trim()) return;

    try {
      setError(null);
      await api.post('/tags', { 
        name: newTagName.trim(),
        parent_id: parentTagId ? parseInt(parentTagId, 10) : null
      });
      setNewTagName('');
      setParentTagId('');
      onRefresh();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to create tag.');
    }
  };

  const handleStartEdit = (tag: Tag) => {
    setEditingTagId(tag.id);
    setEditingName(tag.name);
  };

  const handleCancelEdit = () => {
    setEditingTagId(null);
    setEditingName('');
  };

  const handleSaveEdit = async (id: number) => {
    if (!editingName.trim()) return;
    try {
      setError(null);
      await api.put(`/tags/${id}`, { name: editingName.trim() });
      setEditingTagId(null);
      onRefresh();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to update tag.');
    }
  };

  const handleDeleteTag = async (id: number) => {
    if (!confirm('Are you sure you want to delete this tag? Tasks using this tag will be untagged.')) return;
    try {
      setError(null);
      await api.delete(`/tags/${id}`);
      onRefresh();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to delete tag.');
    }
  };

  const sortedTags = getSortedTagsWithDepth(tags);

  return (
    <div className="full-screen-canvas">
      <div className="tag-manager-container">
        <div className="tag-manager-title-row">
          <button type="button" className="tag-manager-back-btn" onClick={onBack} title="Back to tasks">
            <ArrowLeft size={20} />
          </button>
          <h2>Manage Tags</h2>
        </div>

        {error && <div className="auth-error">{error}</div>}

        <form onSubmit={handleCreateTag} className="tag-manager-create-form" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'flex', gap: '12px', width: '100%' }}>
            <input
              type="text"
              className="tag-manager-input"
              style={{ flex: 1 }}
              placeholder="Create a new tag (e.g., Personal, Work)"
              value={newTagName}
              onChange={(e) => setNewTagName(e.target.value)}
              required
            />
            <select
              className="canvas-select"
              style={{ width: '220px', padding: '0.85rem 1.25rem', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', fontFamily: 'var(--font-sans)', fontSize: '1rem', color: 'var(--text-color)', backgroundColor: 'var(--card-bg)' }}
              value={parentTagId}
              onChange={(e) => setParentTagId(e.target.value)}
            >
              <option value="">No Parent (Root Tag)</option>
              {sortedTags.map(({ tag, depth }) => (
                <option key={tag.id} value={tag.id}>
                  {'\u00A0'.repeat(depth * 3)} {depth > 0 ? '↳ ' : ''}{tag.name}
                </option>
              ))}
            </select>
            <button type="submit" className="tag-manager-btn">Add Tag</button>
          </div>
        </form>

        <div className="tag-manager-list">
          {tags.length === 0 ? (
            <p style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '2rem' }}>
              No tags found. Add one above.
            </p>
          ) : (
            sortedTags.map(({ tag, depth }) => (
              <div key={tag.id} className="tag-manager-item" style={{ marginLeft: `${depth * 20}px` }}>
                {editingTagId === tag.id ? (
                  <input
                    type="text"
                    className="tag-manager-item-name-input"
                    value={editingName}
                    onChange={(e) => setEditingName(e.target.value)}
                    autoFocus
                  />
                ) : (
                  <span style={{ fontWeight: 500, display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {depth > 0 && <span style={{ color: 'var(--text-muted)' }}>↳</span>}
                    {tag.name}
                  </span>
                )}

                <div className="tag-manager-item-actions">
                  {editingTagId === tag.id ? (
                    <>
                      <button
                        type="button"
                        className="task-action-btn"
                        style={{ color: '#10b981' }}
                        onClick={() => handleSaveEdit(tag.id)}
                      >
                        <Check size={16} />
                      </button>
                      <button
                        type="button"
                        className="task-action-btn"
                        onClick={handleCancelEdit}
                      >
                        <X size={16} />
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        className="task-action-btn"
                        onClick={() => handleStartEdit(tag)}
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        type="button"
                        className="task-action-btn delete-btn"
                        onClick={() => handleDeleteTag(tag.id)}
                      >
                        <Trash2 size={16} />
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
