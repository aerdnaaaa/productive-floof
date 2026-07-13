import React, { useState, useEffect } from 'react';

interface Tag {
  id: number;
  name: string;
}

interface Task {
  id: number;
  title: string;
  due_date?: string | null;
  start_time?: string | null;
  end_time?: string | null;
  status: string;
  template_id?: number | null;
  tags?: Tag[];
  template?: {
    recurrence: string;
  } | null;
}

interface TaskFormProps {
  task: Task | null;
  availableTags: Tag[];
  onSave: (data: { 
    title: string; 
    due_date: string | null; 
    start_time: string | null; 
    end_time: string | null; 
    recurrence: string; 
    tag_ids: number[] 
  }) => void;
  onCancel: () => void;
}

export const TaskForm: React.FC<TaskFormProps> = ({
  task,
  availableTags,
  onSave,
  onCancel,
}) => {
  const [title, setTitle] = useState<string>('');
  const [dueDate, setDueDate] = useState<string>('');
  const [startTime, setStartTime] = useState<string>('');
  const [endTime, setEndTime] = useState<string>('');
  const [recurrence, setRecurrence] = useState<string>('None');
  const [selectedTagIds, setSelectedTagIds] = useState<number[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (task) {
      setTitle(task.title);
      setDueDate(task.due_date || '');
      setStartTime(task.start_time || '');
      setEndTime(task.end_time || '');
      setRecurrence(task.template?.recurrence || 'None');
      setSelectedTagIds(task.tags?.map((t) => t.id) || []);
    } else {
      setTitle('');
      setDueDate('');
      setStartTime('');
      setEndTime('');
      setRecurrence('None');
      setSelectedTagIds([]);
    }
  }, [task]);

  const handleToggleTag = (tagId: number) => {
    if (selectedTagIds.includes(tagId)) {
      setSelectedTagIds(selectedTagIds.filter((id) => id !== tagId));
    } else {
      setSelectedTagIds([...selectedTagIds, tagId]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Task title is required.');
      return;
    }
    if (recurrence !== 'None' && !dueDate) {
      setError('Due date is required for recurring tasks.');
      return;
    }
    onSave({
      title: title.trim(),
      due_date: dueDate || null,
      start_time: startTime || null,
      end_time: endTime || null,
      recurrence,
      tag_ids: selectedTagIds,
    });
  };

  return (
    <div className="full-screen-canvas">
      <form onSubmit={handleSubmit} className="canvas-body">
        <div>
          <input
            type="text"
            className="canvas-title-input"
            placeholder="What needs to be done?"
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              if (error) setError(null);
            }}
            autoFocus
            required
          />
          {error && <p className="auth-error" style={{ marginTop: '0.5rem' }}>{error}</p>}
        </div>

        <div className="canvas-input-row">
          <div className="canvas-field">
            <span className="canvas-section-label">Target Date (optional)</span>
            <input
              type="date"
              className="canvas-date-input"
              value={dueDate}
              onChange={(e) => {
                setDueDate(e.target.value);
                if (error) setError(null);
              }}
            />
          </div>

          <div className="canvas-field">
            <span className="canvas-section-label">Recurrence Settings</span>
            <select
              className="canvas-select"
              value={recurrence}
              onChange={(e) => {
                setRecurrence(e.target.value);
                if (error) setError(null);
              }}
              disabled={!!task && task.template_id !== null && task.template_id !== undefined}
              title={
                task?.template_id
                  ? 'Recurrence pattern cannot be modified directly. It must be edited as part of the recurrence schedule.'
                  : 'Select task recurrence'
              }
            >
              <option value="None">None</option>
              <option value="Daily">Daily</option>
              <option value="Weekly">Weekly</option>
              <option value="Monthly">Monthly</option>
            </select>
          </div>
        </div>

        {/* Start and End Times Row */}
        <div className="canvas-input-row" style={{ marginTop: '1.25rem' }}>
          <div className="canvas-field">
            <span className="canvas-section-label">Start Time (optional)</span>
            <input
              type="time"
              className="canvas-date-input"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
            />
          </div>

          <div className="canvas-field">
            <span className="canvas-section-label">End Time (optional)</span>
            <input
              type="time"
              className="canvas-date-input"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
            />
          </div>
        </div>

        <div className="canvas-section">
          <span className="canvas-section-label">Tags</span>
          {availableTags.length === 0 ? (
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
              No tags created yet.
            </p>
          ) : (
            <div className="tag-picker-wrap">
              {availableTags.map((tag) => {
                const isSelected = selectedTagIds.includes(tag.id);
                return (
                  <button
                    key={tag.id}
                    type="button"
                    className={`tag-picker-item ${isSelected ? 'selected' : ''}`}
                    onClick={() => handleToggleTag(tag.id)}
                  >
                    {tag.name}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="canvas-footer">
          <button type="button" className="canvas-btn cancel" onClick={onCancel}>
            Cancel
          </button>
          <button type="submit" className="canvas-btn save">
            Save Task
          </button>
        </div>
      </form>
    </div>
  );
};
