import React, { useEffect, useState } from 'react';
import { AuthProvider, useAuth } from './components/auth/AuthContext';
import { Login } from './components/auth/Login';
import { Dashboard } from './components/todo/Dashboard';
import { TaskForm } from './components/todo/TaskForm';
import { ConflictView } from './components/todo/ConflictView';
import { TagManager } from './components/todo/TagManager';
import { AdminPortal } from './components/todo/AdminPortal';
import api from './services/api';

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

const MainAppContent: React.FC = () => {
  const { token, loading } = useAuth();
  const [view, setView] = useState<'list' | 'create' | 'edit' | 'tags' | 'admin'>(() => {
    const path = window.location.pathname;
    if (path === '/admin/users') return 'admin';
    if (path === '/tags') return 'tags';
    return 'list';
  });

  const navigateTo = (newView: 'list' | 'create' | 'edit' | 'tags' | 'admin') => {
    setView(newView);
    const paths: Record<string, string> = {
      list: '/',
      admin: '/admin/users',
      tags: '/tags',
      create: '/tasks/create',
      edit: '/tasks/edit'
    };
    const targetPath = paths[newView] || '/';
    if (window.location.pathname !== targetPath) {
      window.history.pushState({}, '', targetPath);
    }
  };

  useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname;
      if (path === '/admin/users') {
        setView('admin');
      } else if (path === '/tags') {
        setView('tags');
      } else {
        setView('list');
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [selectedTagId, setSelectedTagId] = useState<number | null>(null);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  
  // Recurrence conflict state
  const [conflictTaskData, setConflictTaskData] = useState<{
    title: string;
    due_date: string | null;
    start_time: string | null;
    end_time: string | null;
    recurrence: string;
    tag_ids: number[];
  } | null>(null);

  const [apiError, setApiError] = useState<string | null>(null);

  const loadData = async () => {
    if (!token) return;
    try {
      setApiError(null);
      // Fetch Tags
      const tagRes = await api.get<Tag[]>('/tags');
      setTags(tagRes.data);

      // Fetch Tasks
      const params = selectedTagId ? { tag_id: selectedTagId } : {};
      const taskRes = await api.get<Task[]>('/tasks', { params });
      setTasks(taskRes.data);
    } catch (err: any) {
      setApiError(err.response?.data?.detail || 'Failed to sync workspace data.');
    }
  };

  useEffect(() => {
    if (token) {
      loadData();
    }
  }, [token, selectedTagId]);

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        width: '100vw',
        backgroundColor: 'var(--bg-color)',
        color: 'var(--primary-color)',
        fontSize: '1.2rem',
        fontWeight: 600
      }}>
        Syncing Productive Floof...
      </div>
    );
  }

  if (!token) {
    return <Login />;
  }

  // Task operation handlers
  const handleToggleStatus = async (task: Task) => {
    const newStatus = task.status === 'COMPLETED' ? 'PENDING' : 'COMPLETED';
    try {
      await api.put(`/tasks/${task.id}`, { status: newStatus });
      loadData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleSkipTask = async (task: Task) => {
    try {
      await api.put(`/tasks/${task.id}`, { status: 'SKIPPED' });
      loadData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleRestoreTask = async (task: Task) => {
    try {
      await api.put(`/tasks/${task.id}`, { status: 'PENDING' });
      loadData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteTask = async (id: number) => {
    if (!confirm('Are you sure you want to delete this task?')) return;
    try {
      await api.delete(`/tasks/${id}`);
      loadData();
    } catch (err) {
      console.error(err);
    }
  };

  // Save flow: handles both creation and editing, intercepting recurrence conflicts
  const handleSaveTask = async (formData: {
    title: string;
    due_date: string | null;
    start_time: string | null;
    end_time: string | null;
    recurrence: string;
    tag_ids: number[];
  }) => {
    try {
      setApiError(null);
      if (editingTask === null) {
        // Creation Flow
        await api.post('/tasks', formData);
        navigateTo('list');
        loadData();
      } else {
        // Editing Flow
        const hasTemplate = editingTask.template_id !== null && editingTask.template_id !== undefined;
        
        // Check if details are modified
        const currentTagIds = editingTask.tags?.map((t) => t.id) || [];
        const isTagsModified = JSON.stringify(currentTagIds.sort()) !== JSON.stringify(formData.tag_ids.sort());
        const isDetailsModified = 
          editingTask.title !== formData.title ||
          editingTask.due_date !== formData.due_date ||
          editingTask.start_time !== formData.start_time ||
          editingTask.end_time !== formData.end_time ||
          isTagsModified ||
          (editingTask.template?.recurrence !== formData.recurrence && formData.recurrence !== 'None');

        if (hasTemplate && isDetailsModified) {
          // Open Recurrence Conflict screen
          setConflictTaskData(formData);
        } else {
          // Standard Update
          await api.put(`/tasks/${editingTask.id}`, {
            title: formData.title,
            due_date: formData.due_date,
            start_time: formData.start_time,
            end_time: formData.end_time,
            tag_ids: formData.tag_ids,
          });
          setEditingTask(null);
          navigateTo('list');
          loadData();
        }
      }
    } catch (err: any) {
      if (err.response?.status === 409) {
        // Intercepted backend 409 conflict
        setConflictTaskData(formData);
      } else {
        setApiError(err.response?.data?.detail || 'Failed to save task.');
      }
    }
  };

  // Recurrence Resolution flow
  const handleResolveConflict = async (choice: 'instance' | 'future') => {
    if (!editingTask || !conflictTaskData) return;

    try {
      setApiError(null);
      await api.put(`/tasks/${editingTask.id}/recurrence`, {
        choice,
        title: conflictTaskData.title,
        due_date: conflictTaskData.due_date,
        start_time: conflictTaskData.start_time,
        end_time: conflictTaskData.end_time,
        tag_ids: conflictTaskData.tag_ids,
        recurrence: conflictTaskData.recurrence,
      });

      // Clear states
      setConflictTaskData(null);
      setEditingTask(null);
      navigateTo('list');
      loadData();
    } catch (err: any) {
      setApiError(err.response?.data?.detail || 'Failed to apply recurring task resolution.');
    }
  };

  return (
    <>
      {apiError && (
        <div className="auth-error" style={{
          position: 'fixed',
          top: '1rem',
          right: '1rem',
          zIndex: 9999,
          maxWidth: '350px',
          boxShadow: 'var(--shadow-md)'
        }}>
          {apiError}
          <button
            type="button"
            onClick={() => setApiError(null)}
            style={{
              background: 'transparent',
              border: 'none',
              marginLeft: '1rem',
              color: '#ef4444',
              cursor: 'pointer',
              fontWeight: 'bold'
            }}
          >
            ✕
          </button>
        </div>
      )}

      {view === 'list' && (
        <Dashboard
          tasks={tasks}
          tags={tags}
          selectedTagId={selectedTagId}
          onSelectTag={setSelectedTagId}
          onCreateTaskTrigger={() => {
            setEditingTask(null);
            navigateTo('create');
          }}
          onEditTaskTrigger={(task) => {
            setEditingTask(task);
            navigateTo('edit');
          }}
          onManageTagsTrigger={() => navigateTo('tags')}
          onToggleStatus={handleToggleStatus}
          onSkipTask={handleSkipTask}
          onRestoreTask={handleRestoreTask}
          onDeleteTask={handleDeleteTask}
          onAdminPortalTrigger={() => navigateTo('admin')}
        />
      )}

      {(view === 'create' || view === 'edit') && (
        <TaskForm
          task={editingTask}
          availableTags={tags}
          defaultTagId={selectedTagId}
          onSave={handleSaveTask}
          onCancel={() => {
            setEditingTask(null);
            navigateTo('list');
          }}
        />
      )}

      {view === 'tags' && (
        <TagManager
          tags={tags}
          onBack={() => navigateTo('list')}
          onRefresh={loadData}
        />
      )}

      {view === 'admin' && (
        <AdminPortal
          onBack={() => navigateTo('list')}
        />
      )}

      {/* Recurrence Conflict Dialog Overlay */}
      {conflictTaskData && editingTask && (
        <ConflictView
          taskTitle={editingTask.title}
          onResolve={handleResolveConflict}
          onCancel={() => setConflictTaskData(null)}
        />
      )}
    </>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <MainAppContent />
    </AuthProvider>
  );
}
