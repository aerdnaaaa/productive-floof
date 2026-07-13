import React from 'react';

interface ConflictViewProps {
  taskTitle: string;
  onResolve: (choice: 'instance' | 'future') => void;
  onCancel: () => void;
}

export const ConflictView: React.FC<ConflictViewProps> = ({
  taskTitle,
  onResolve,
  onCancel,
}) => {
  return (
    <div className="conflict-overlay">
      <div className="conflict-card">
        <h2 className="conflict-header">Modify Recurring Task?</h2>
        <div className="conflict-task-title">“{taskTitle}”</div>
        <p className="conflict-subtext">
          This task belongs to a recurring schedule. How would you like to apply your changes?
        </p>

        <div className="conflict-action-grid">
          <button
            type="button"
            className="conflict-choice-btn left"
            onClick={() => onResolve('instance')}
          >
            <span className="conflict-choice-title">Apply to This Instance Only</span>
            <span className="conflict-choice-desc">
              Orphan this specific task from the recurrence schedule. Historical logs remain safe.
            </span>
          </button>

          <button
            type="button"
            className="conflict-choice-btn right"
            onClick={() => onResolve('future')}
          >
            <span className="conflict-choice-title">Apply to All Future Tasks</span>
            <span className="conflict-choice-desc">
              Modify the underlying template and cascade updates to all future pending task instances.
            </span>
          </button>
        </div>

        <button
          type="button"
          className="canvas-btn cancel"
          style={{ marginTop: '2rem', width: '100%', maxWidth: '200px' }}
          onClick={onCancel}
        >
          Cancel
        </button>
      </div>
    </div>
  );
};
