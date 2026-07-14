import React, { useState } from 'react';
import { LogOut, Tags, CheckSquare, Plus, Edit2, Trash2, Calendar, RefreshCw, EyeOff, RotateCcw, Clock, ChevronRight, ChevronDown, Shield } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { CalendarView } from './CalendarView';
import { getSortedTagsWithDepth } from '../../utils/tagUtils';

interface Tag {
  id: number;
  name: string;
  parent_id?: number | null;
}

interface Task {
  id: number;
  title: string;
  due_date?: string | null;
  start_time?: string | null;
  end_time?: string | null;
  status: 'PENDING' | 'COMPLETED' | 'SKIPPED';
  template_id?: number | null;
  tags?: Tag[];
  template?: {
    recurrence: string;
  } | null;
}

interface DashboardProps {
  tasks: Task[];
  tags: Tag[];
  selectedTagId: number | null;
  onSelectTag: (id: number | null) => void;
  onCreateTaskTrigger: () => void;
  onEditTaskTrigger: (task: Task) => void;
  onManageTagsTrigger: () => void;
  onToggleStatus: (task: Task) => void;
  onSkipTask: (task: Task) => void;
  onRestoreTask: (task: Task) => void;
  onDeleteTask: (id: number) => void;
  onAdminPortalTrigger: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  tasks,
  tags,
  selectedTagId,
  onSelectTag,
  onCreateTaskTrigger,
  onEditTaskTrigger,
  onManageTagsTrigger,
  onToggleStatus,
  onSkipTask,
  onRestoreTask,
  onDeleteTask,
  onAdminPortalTrigger,
}) => {
  const { user, logout } = useAuth();
  const [currentView, setCurrentView] = useState<'list' | 'calendar'>('list');
  const [collapsedTagIds, setCollapsedTagIds] = useState<Set<number>>(new Set());

  const toggleCollapse = (tagId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setCollapsedTagIds((prev) => {
      const next = new Set(prev);
      if (next.has(tagId)) {
        next.delete(tagId);
      } else {
        next.add(tagId);
      }
      return next;
    });
  };

  const sortedTags = getSortedTagsWithDepth(tags);

  const isTagVisible = (tag: Tag) => {
    let currentParentId = tag.parent_id;
    while (currentParentId) {
      if (collapsedTagIds.has(currentParentId)) {
        return false;
      }
      const parentTag = tags.find((t) => t.id === currentParentId);
      currentParentId = parentTag ? parentTag.parent_id : null;
    }
    return true;
  };

  const visibleTags = sortedTags.filter(({ tag }) => isTagVisible(tag));

  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return 'No due date';
    try {
      const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', year: 'numeric' };
      return new Date(dateStr).toLocaleDateString('en-US', options);
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="app-container">
      {/* 1. Slim Navigation Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-logo" onClick={() => onSelectTag(null)}>S</div>
        <nav className="sidebar-nav">
          <button
            type="button"
            className="sidebar-icon-btn active"
            title="Tasks"
            onClick={() => onSelectTag(null)}
          >
            <CheckSquare size={22} />
          </button>
          <button
            type="button"
            className="sidebar-icon-btn"
            title="Manage Tags"
            onClick={onManageTagsTrigger}
          >
            <Tags size={22} />
          </button>
          {user?.is_admin && (
            <button
              type="button"
              className="sidebar-icon-btn"
              title="Admin Portal"
              onClick={onAdminPortalTrigger}
              style={{ color: 'var(--primary-color)', opacity: 0.85 }}
            >
              <Shield size={22} />
            </button>
          )}
        </nav>
        <div className="sidebar-user">
          <div className="user-avatar" title={`Logged in as ${user?.username}`}>
            {user?.username.slice(0, 2).toUpperCase()}
          </div>
          <button
            type="button"
            className="sidebar-icon-btn"
            title="Log Out"
            onClick={logout}
          >
            <LogOut size={20} />
          </button>
        </div>
      </aside>

      {/* 2. Tag Filter Panel */}
      <section className="tag-panel">
        <div>
          <h3 className="tag-panel-header">Workspace Tags</h3>
          <div className="tag-list-scroll">
            <button
              type="button"
              className={`tag-pill-btn ${selectedTagId === null ? 'active' : ''}`}
              onClick={() => onSelectTag(null)}
            >
              <span>All Tasks</span>
              {selectedTagId === null && <span className="tag-pill-indicator" />}
            </button>
            {visibleTags.map(({ tag, depth }) => {
              const hasChildren = tags.some((t) => t.parent_id === tag.id);
              const isCollapsed = collapsedTagIds.has(tag.id);

              return (
                <button
                  key={tag.id}
                  type="button"
                  className={`tag-pill-btn ${selectedTagId === tag.id ? 'active' : ''}`}
                  style={{ paddingLeft: `${16 + depth * 16}px` }}
                  onClick={() => onSelectTag(tag.id)}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {depth > 0 && <span style={{ color: 'var(--text-muted)' }}>↳</span>}
                    {hasChildren ? (
                      <span
                        onClick={(e) => toggleCollapse(tag.id, e)}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                          padding: '2px',
                          borderRadius: '4px',
                          color: 'var(--text-secondary)',
                          transition: 'background-color 0.2s',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.05)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = 'transparent';
                        }}
                      >
                        {isCollapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
                      </span>
                    ) : (
                      // Render a blank spacer to keep names aligned
                      <span style={{ width: '18px' }} />
                    )}
                    <span>{tag.name}</span>
                  </span>
                  {selectedTagId === tag.id && <span className="tag-pill-indicator" />}
                </button>
              );
            })}
          </div>
        </div>

        <button type="button" className="manage-tags-btn" onClick={onManageTagsTrigger}>
          <Plus size={16} />
          <span>Manage Tags</span>
        </button>
      </section>

      {/* 3. Main Content Area */}
      <main className="main-content">
        <div className="dashboard-header">
          <div className="dashboard-title-container">
            <h1 className="dashboard-title">My Tasks</h1>
            <p className="dashboard-subtitle">
              {selectedTagId
                ? `Filtered by: ${tags.find((t) => t.id === selectedTagId)?.name}`
                : 'Distraction-free tasks lists'}
            </p>
          </div>

          <div className="view-toggle-container">
            <button
              type="button"
              className={`view-toggle-btn ${currentView === 'list' ? 'active' : ''}`}
              onClick={() => setCurrentView('list')}
            >
              List
            </button>
            <button
              type="button"
              className={`view-toggle-btn ${currentView === 'calendar' ? 'active' : ''}`}
              onClick={() => setCurrentView('calendar')}
            >
              Calendar
            </button>
          </div>
        </div>

        {/* Width-spanning Create Button */}
        <button type="button" className="create-task-wide-btn" onClick={onCreateTaskTrigger}>
          <Plus size={20} style={{ color: 'var(--primary-color)' }} />
          <span>Create New Task</span>
        </button>

        {currentView === 'list' ? (
          <>
            {/* Task Cards Stack */}
            {tasks.length === 0 ? (
              <div className="empty-state">
                <CheckSquare size={48} strokeWidth={1} />
                <h4 className="empty-state-title">No tasks found</h4>
                <p className="empty-state-text">
                  {selectedTagId
                    ? 'Try clearing the tag filter or create a new task with this tag.'
                    : 'Enjoy your clean dashboard! Tap the button above to add your first task.'}
                </p>
              </div>
            ) : (
              <div className="tasks-stack">
                {tasks.map((task) => {
                  const isCompleted = task.status === 'COMPLETED';
                  const isSkipped = task.status === 'SKIPPED';
                  
                  return (
                    <div key={task.id} className={`task-card ${isCompleted ? 'completed' : ''} ${isSkipped ? 'skipped' : ''}`}>
                      <div className="task-card-left" onClick={() => onToggleStatus(task)}>
                        <label className="custom-checkbox-container" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={isCompleted}
                            onChange={() => onToggleStatus(task)}
                          />
                          <span className="checkmark" />
                        </label>
                        
                        <div className="task-content-wrapper">
                          <span className="task-card-title">{task.title}</span>
                          <div className="task-meta-row">
                            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <Calendar size={12} />
                              {formatDate(task.due_date)}
                            </span>
                            {task.start_time && (
                              <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--text-secondary)' }}>
                                <Clock size={12} />
                                {task.start_time}
                                {task.end_time ? ` - ${task.end_time}` : ''}
                              </span>
                            )}
                            {task.template_id && (
                              <span className="task-recurrence-icon" title="Recurring Task schedule">
                                <RefreshCw size={12} />
                                {task.template?.recurrence || 'Recurring'}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="task-card-right">
                        {/* Render Tags */}
                        {task.tags && task.tags.length > 0 && (
                          <div className="task-tags-row">
                            {task.tags.map((t) => (
                              <span key={t.id} className="task-tag-pill">{t.name}</span>
                            ))}
                          </div>
                        )}

                        {/* Skipped state indicator */}
                        {isSkipped && <span className="task-skipped-badge">SKIPPED</span>}

                        {/* Hover Operations */}
                        <div className="task-card-actions" onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            className="task-action-btn"
                            title="Edit Task"
                            onClick={() => onEditTaskTrigger(task)}
                          >
                            <Edit2 size={15} />
                          </button>
                          
                          {isSkipped ? (
                            <button
                              type="button"
                              className="task-action-btn"
                              title="Restore Task"
                              onClick={() => onRestoreTask(task)}
                            >
                              <RotateCcw size={15} />
                            </button>
                          ) : (
                            !isCompleted && (
                              <button
                                type="button"
                                className="task-action-btn"
                                title="Skip Task"
                                onClick={() => onSkipTask(task)}
                              >
                                <EyeOff size={15} />
                              </button>
                            )
                          )}

                          <button
                            type="button"
                            className="task-action-btn delete-btn"
                            title="Delete Task"
                            onClick={() => onDeleteTask(task.id)}
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        ) : (
          <CalendarView
            tasks={tasks}
            tags={tags}
            selectedTagId={selectedTagId}
            onToggleStatus={onToggleStatus}
            onEditTaskTrigger={onEditTaskTrigger}
            onDeleteTask={onDeleteTask}
            onSkipTask={onSkipTask}
            onRestoreTask={onRestoreTask}
            onCreateTaskTrigger={onCreateTaskTrigger}
          />
        )}
      </main>
    </div>
  );
};
