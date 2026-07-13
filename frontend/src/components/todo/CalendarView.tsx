import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Edit2, Trash2, EyeOff, RotateCcw, RefreshCw, CheckSquare, Clock } from 'lucide-react';

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
  status: 'PENDING' | 'COMPLETED' | 'SKIPPED';
  template_id?: number | null;
  tags?: Tag[];
  template?: {
    recurrence: string;
  } | null;
}

interface CalendarViewProps {
  tasks: Task[];
  tags: Tag[];
  selectedTagId: number | null;
  onToggleStatus: (task: Task) => void;
  onEditTaskTrigger: (task: Task) => void;
  onDeleteTask: (id: number) => void;
  onSkipTask: (task: Task) => void;
  onRestoreTask: (task: Task) => void;
  onCreateTaskTrigger: () => void;
}

const getLocalDateString = (date: Date): string => {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

export const CalendarView: React.FC<CalendarViewProps> = ({
  tasks,
  onToggleStatus,
  onEditTaskTrigger,
  onDeleteTask,
  onSkipTask,
  onRestoreTask,
}) => {
  const [calendarMode, setCalendarMode] = useState<'day' | 'week' | 'month'>('month');
  const [referenceDate, setReferenceDate] = useState<Date>(new Date());

  // Navigation Handlers
  const handlePrev = () => {
    const newDate = new Date(referenceDate);
    if (calendarMode === 'month') {
      newDate.setMonth(newDate.getMonth() - 1);
    } else if (calendarMode === 'week') {
      newDate.setDate(newDate.getDate() - 7);
    } else {
      newDate.setDate(newDate.getDate() - 1);
    }
    setReferenceDate(newDate);
  };

  const handleNext = () => {
    const newDate = new Date(referenceDate);
    if (calendarMode === 'month') {
      newDate.setMonth(newDate.getMonth() + 1);
    } else if (calendarMode === 'week') {
      newDate.setDate(newDate.getDate() + 7);
    } else {
      newDate.setDate(newDate.getDate() + 1);
    }
    setReferenceDate(newDate);
  };

  const handleToday = () => {
    setReferenceDate(new Date());
  };

  // Date Range Labeling
  const getHeaderLabel = (): string => {
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    const year = referenceDate.getFullYear();
    const month = months[referenceDate.getMonth()];

    if (calendarMode === 'month') {
      return `${month} ${year}`;
    }

    if (calendarMode === 'week') {
      // Find start and end of week
      const start = new Date(referenceDate);
      start.setDate(referenceDate.getDate() - referenceDate.getDay());
      const end = new Date(start);
      end.setDate(start.getDate() + 6);

      const startMonth = months[start.getMonth()].substring(0, 3);
      const endMonth = months[end.getMonth()].substring(0, 3);
      
      if (start.getFullYear() !== end.getFullYear()) {
        return `${startMonth} ${start.getDate()}, ${start.getFullYear()} - ${endMonth} ${end.getDate()}, ${end.getFullYear()}`;
      }
      if (start.getMonth() !== end.getMonth()) {
        return `${startMonth} ${start.getDate()} - ${endMonth} ${end.getDate()}, ${year}`;
      }
      return `${month} ${start.getDate()} - ${end.getDate()}, ${year}`;
    }

    // Day View
    const dayName = referenceDate.toLocaleDateString('en-US', { weekday: 'long' });
    return `${dayName}, ${month} ${referenceDate.getDate()}, ${year}`;
  };

  // Filtering helper for tasks
  const getTasksForDate = (date: Date): Task[] => {
    const dateStr = getLocalDateString(date);
    return tasks.filter((task) => task.due_date === dateStr);
  };

  // Renders a single task compact card for Month/Week grids
  const renderTaskCompact = (task: Task) => {
    const isCompleted = task.status === 'COMPLETED';
    const isSkipped = task.status === 'SKIPPED';
    
    return (
      <div 
        key={task.id} 
        className={`cal-task-compact ${isCompleted ? 'completed' : ''} ${isSkipped ? 'skipped' : ''}`}
        title={`${task.title} (${task.status})${task.start_time ? ` @ ${task.start_time}${task.end_time ? ` - ${task.end_time}` : ''}` : ''}`}
      >
        <span 
          className="cal-task-checkbox" 
          onClick={(e) => {
            e.stopPropagation();
            onToggleStatus(task);
          }}
        >
          <input 
            type="checkbox" 
            checked={isCompleted} 
            readOnly 
          />
        </span>
        <span className="cal-task-title" onClick={() => onEditTaskTrigger(task)}>
          {task.title} {task.start_time ? `(${task.start_time})` : ''}
        </span>
        <div className="cal-task-hover-actions">
          <button 
            type="button" 
            className="cal-mini-action-btn"
            title="Edit"
            onClick={(e) => { e.stopPropagation(); onEditTaskTrigger(task); }}
          >
            <Edit2 size={11} />
          </button>
          {isSkipped ? (
            <button 
              type="button" 
              className="cal-mini-action-btn"
              title="Restore"
              onClick={(e) => { e.stopPropagation(); onRestoreTask(task); }}
            >
              <RotateCcw size={11} />
            </button>
          ) : (
            !isCompleted && (
              <button 
                type="button" 
                className="cal-mini-action-btn"
                title="Skip"
                onClick={(e) => { e.stopPropagation(); onSkipTask(task); }}
              >
                <EyeOff size={11} />
              </button>
            )
          )}
          <button 
            type="button" 
            className="cal-mini-action-btn delete"
            title="Delete"
            onClick={(e) => { e.stopPropagation(); onDeleteTask(task.id); }}
          >
            <Trash2 size={11} />
          </button>
        </div>
      </div>
    );
  };

  // Render month view grid
  const renderMonthView = () => {
    const year = referenceDate.getFullYear();
    const month = referenceDate.getMonth();

    const firstDayIndex = new Date(year, month, 1).getDay();
    const totalDays = new Date(year, month + 1, 0).getDate();
    const prevMonthEnd = new Date(year, month, 0).getDate();

    const cells: React.ReactNode[] = [];
    const todayStr = getLocalDateString(new Date());

    // Preceding month buffer days
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const dayNum = prevMonthEnd - i;
      const cellDate = new Date(year, month - 1, dayNum);
      const dayTasks = getTasksForDate(cellDate);

      cells.push(
        <div key={`prev-${dayNum}`} className="cal-cell buffer">
          <div className="cal-cell-header">
            <span className="cal-day-num">{dayNum}</span>
          </div>
          <div className="cal-cell-tasks">
            {dayTasks.map(renderTaskCompact)}
          </div>
        </div>
      );
    }

    // Current month days
    for (let dayNum = 1; dayNum <= totalDays; dayNum++) {
      const cellDate = new Date(year, month, dayNum);
      const dateStr = getLocalDateString(cellDate);
      const dayTasks = getTasksForDate(cellDate);
      const isToday = dateStr === todayStr;

      cells.push(
        <div key={`curr-${dayNum}`} className={`cal-cell ${isToday ? 'today' : ''}`}>
          <div className="cal-cell-header">
            <span className="cal-day-num">{dayNum}</span>
            {isToday && <span className="cal-today-dot" />}
          </div>
          <div className="cal-cell-tasks">
            {dayTasks.map(renderTaskCompact)}
          </div>
        </div>
      );
    }

    // Succeeding month buffer days
    const totalCellsSoFar = cells.length;
    const remainingCells = totalCellsSoFar <= 35 ? 35 - totalCellsSoFar : 42 - totalCellsSoFar;
    for (let dayNum = 1; dayNum <= remainingCells; dayNum++) {
      const cellDate = new Date(year, month + 1, dayNum);
      const dayTasks = getTasksForDate(cellDate);

      cells.push(
        <div key={`next-${dayNum}`} className="cal-cell buffer">
          <div className="cal-cell-header">
            <span className="cal-day-num">{dayNum}</span>
          </div>
          <div className="cal-cell-tasks">
            {dayTasks.map(renderTaskCompact)}
          </div>
        </div>
      );
    }

    const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    return (
      <div className="cal-month-container">
        <div className="cal-weekdays-header">
          {weekdays.map((d) => (
            <div key={d} className="cal-weekday-label">{d}</div>
          ))}
        </div>
        <div className="cal-month-grid">
          {cells}
        </div>
      </div>
    );
  };

  // Render week view grid
  const renderWeekView = () => {
    const startOfWeek = new Date(referenceDate);
    startOfWeek.setDate(referenceDate.getDate() - referenceDate.getDay());
    
    const todayStr = getLocalDateString(new Date());
    const weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    return (
      <div className="cal-week-grid">
        {weekdays.map((dayName, idx) => {
          const cellDate = new Date(startOfWeek);
          cellDate.setDate(startOfWeek.getDate() + idx);
          const dateStr = getLocalDateString(cellDate);
          const dayTasks = getTasksForDate(cellDate);
          const isToday = dateStr === todayStr;

          return (
            <div key={dayName} className={`cal-week-col ${isToday ? 'today' : ''}`}>
              <div className="cal-week-col-header">
                <span className="cal-week-day-name">{dayName.substring(0, 3)}</span>
                <span className="cal-week-day-date">{cellDate.getDate()}</span>
                {isToday && <span className="cal-today-pill">Today</span>}
              </div>
              <div className="cal-week-col-content">
                {dayTasks.length === 0 ? (
                  <div className="cal-empty-day-state">No tasks</div>
                ) : (
                  <div className="cal-week-tasks-list">
                    {dayTasks.map(renderTaskCompact)}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  // Render day view
  const renderDayView = () => {
    const dayTasks = getTasksForDate(referenceDate);
    const todayStr = getLocalDateString(new Date());
    const isToday = getLocalDateString(referenceDate) === todayStr;

    return (
      <div className="cal-day-container">
        <div className="cal-day-details-header">
          <h2>
            {referenceDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
            {isToday && <span className="cal-today-badge">Today</span>}
          </h2>
          <p>{dayTasks.length} {dayTasks.length === 1 ? 'task' : 'tasks'} scheduled for this day</p>
        </div>

        {dayTasks.length === 0 ? (
          <div className="empty-state" style={{ marginTop: '2rem' }}>
            <CheckSquare size={48} strokeWidth={1} />
            <h4 className="empty-state-title">All clean!</h4>
            <p className="empty-state-text">No tasks due on this day.</p>
          </div>
        ) : (
          <div className="tasks-stack" style={{ marginTop: '1.5rem', width: '100%', maxWidth: '800px', marginInline: 'auto' }}>
            {dayTasks.map((task) => {
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
                        {task.start_time && (
                          <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--text-secondary)' }}>
                            <Clock size={12} />
                            {task.start_time}
                            {task.end_time ? ` - ${task.end_time}` : ''}
                          </span>
                        )}
                        {task.template_id && (
                          <span className="task-recurrence-icon">
                            <RefreshCw size={12} />
                            {task.template?.recurrence || 'Recurring'}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="task-card-right">
                    {task.tags && task.tags.length > 0 && (
                      <div className="task-tags-row">
                        {task.tags.map((t) => (
                          <span key={t.id} className="task-tag-pill">{t.name}</span>
                        ))}
                      </div>
                    )}
                    {isSkipped && <span className="task-skipped-badge">SKIPPED</span>}

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
      </div>
    );
  };

  return (
    <div className="calendar-view-container">
      {/* Navigation and View Selectors */}
      <div className="calendar-header-nav">
        <div className="calendar-nav-controls">
          <button type="button" className="cal-btn icon-btn" onClick={handlePrev} title="Previous">
            <ChevronLeft size={18} />
          </button>
          <button type="button" className="cal-btn text-btn" onClick={handleToday}>
            Today
          </button>
          <button type="button" className="cal-btn icon-btn" onClick={handleNext} title="Next">
            <ChevronRight size={18} />
          </button>
          <h2 className="calendar-nav-title">{getHeaderLabel()}</h2>
        </div>

        <div className="calendar-mode-toggle">
          <button
            type="button"
            className={`cal-mode-btn ${calendarMode === 'day' ? 'active' : ''}`}
            onClick={() => setCalendarMode('day')}
          >
            Day
          </button>
          <button
            type="button"
            className={`cal-mode-btn ${calendarMode === 'week' ? 'active' : ''}`}
            onClick={() => setCalendarMode('week')}
          >
            Week
          </button>
          <button
            type="button"
            className={`cal-mode-btn ${calendarMode === 'month' ? 'active' : ''}`}
            onClick={() => setCalendarMode('month')}
          >
            Month
          </button>
        </div>
      </div>

      {/* Main Calendar Content */}
      <div className="calendar-content-body">
        {calendarMode === 'month' && renderMonthView()}
        {calendarMode === 'week' && renderWeekView()}
        {calendarMode === 'day' && renderDayView()}
      </div>
    </div>
  );
};
