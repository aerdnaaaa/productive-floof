import React, { useState, useEffect } from 'react';
import { Shield, Users, CheckSquare, Tags, Trash2, Key, RefreshCw, Check, X, Search, ShieldAlert, LogOut, Download, Upload } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import api from '../../services/api';

interface AdminUserStats {
  id: number;
  username: string;
  is_admin: boolean;
  tasks_count: number;
  tags_count: number;
}

interface AdminPortalProps {
}

export const AdminPortal: React.FC<AdminPortalProps> = () => {
  const { user: currentUser, logout } = useAuth();
  const [users, setUsers] = useState<AdminUserStats[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Password reset inline state
  const [resettingUserId, setResettingUserId] = useState<number | null>(null);
  const [newPassword, setNewPassword] = useState<string>('');

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get<AdminUserStats[]>('/admin/users');
      setUsers(res.data);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to fetch users list.');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadDatabase = async () => {
    try {
      setError(null);
      setSuccess(null);
      const response = await api.get('/admin/download-db', {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'productive_floof.db');
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
      setSuccess('Database downloaded successfully.');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to download database.');
    }
  };

  const handleRestoreDatabase = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!confirm('Are you absolutely sure you want to restore the database? This will completely overwrite all current users, tasks, and tags. This action is irreversible.')) {
      e.target.value = '';
      return;
    }

    const formData = new FormData();
    formData.append('file', file);

    try {
      setLoading(true);
      setError(null);
      setSuccess(null);
      
      await api.post('/admin/restore-db', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      setSuccess('Database restored successfully.');
      fetchUsers();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to restore database.');
    } finally {
      setLoading(false);
      e.target.value = '';
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleToggleAdmin = async (userId: number) => {
    try {
      setError(null);
      setSuccess(null);
      const res = await api.put<{ is_admin: boolean }>(`/admin/users/${userId}/toggle-admin`);
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, is_admin: res.data.is_admin } : u))
      );
      setSuccess(`Admin status updated successfully.`);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to toggle admin status.');
    }
  };

  const handleResetPassword = async (userId: number, username: string) => {
    if (!newPassword.trim()) return;
    try {
      setError(null);
      setSuccess(null);
      await api.put(`/admin/users/${userId}/reset-password`, { new_password: newPassword.trim() });
      setSuccess(`Successfully reset password for user "${username}".`);
      setResettingUserId(null);
      setNewPassword('');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to reset password.');
    }
  };

  const handleDeleteUser = async (userId: number, username: string) => {
    if (!confirm(`Are you absolutely sure you want to delete user "${username}"? This will permanently erase their account and all their tasks and tags. This action is irreversible.`)) {
      return;
    }
    try {
      setError(null);
      setSuccess(null);
      await api.delete(`/admin/users/${userId}`);
      setUsers((prev) => prev.filter((u) => u.id !== userId));
      setSuccess(`Successfully deleted user "${username}" and all their associated data.`);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to delete user.');
    }
  };

  // Calculations for summary stats
  const totalUsers = users.length;
  const totalTasks = users.reduce((acc, curr) => acc + curr.tasks_count, 0);
  const totalTags = users.reduce((acc, curr) => acc + curr.tags_count, 0);

  // Filtering users by search query
  const filteredUsers = users.filter((u) =>
    u.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="full-screen-canvas" style={{ display: 'block', padding: '3.5rem 8vw' }}>
      <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
        
        {/* Header Row */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div>
              <h2 style={{ fontSize: '1.8rem', fontWeight: 700, color: 'var(--primary-color)' }}>Admin Control Portal</h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', fontWeight: 300 }}>Manage users and monitor system statistics</p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            {/* Hidden File Input for Restore */}
            <input
              type="file"
              id="db-restore-upload"
              accept=".db,application/x-sqlite3"
              onChange={handleRestoreDatabase}
              style={{ display: 'none' }}
            />
            <button
              type="button"
              className="task-action-btn"
              onClick={handleDownloadDatabase}
              title="Download SQLite Database"
              style={{
                padding: '8px 12px',
                borderRadius: '10px',
                border: '1px solid var(--border-color)',
                backgroundColor: 'var(--card-bg)',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                cursor: 'pointer',
                color: 'var(--primary-color)'
              }}
            >
              <Download size={16} />
              <span style={{ fontSize: '0.85rem', fontWeight: 500 }}>Download DB</span>
            </button>
            <button
              type="button"
              className="task-action-btn"
              onClick={() => document.getElementById('db-restore-upload')?.click()}
              title="Restore SQLite Database from file"
              style={{
                padding: '8px 12px',
                borderRadius: '10px',
                border: '1px solid var(--border-color)',
                backgroundColor: 'var(--card-bg)',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                cursor: 'pointer',
                color: 'var(--primary-color)'
              }}
            >
              <Upload size={16} />
              <span style={{ fontSize: '0.85rem', fontWeight: 500 }}>Restore DB</span>
            </button>
            <button
              type="button"
              className="task-action-btn"
              onClick={fetchUsers}
              title="Refresh users data"
              style={{
                padding: '8px',
                borderRadius: '10px',
                border: '1px solid var(--border-color)',
                backgroundColor: 'var(--card-bg)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: 'var(--text-secondary)'
              }}
            >
              <RefreshCw size={16} className={loading ? 'spin-anim' : ''} />
            </button>
            <button
              type="button"
              className="task-action-btn"
              onClick={logout}
              title="Log Out"
              style={{
                padding: '8px 12px',
                borderRadius: '10px',
                border: '1px solid var(--border-color)',
                backgroundColor: 'var(--card-bg)',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                cursor: 'pointer',
                color: '#ef4444'
              }}
            >
              <LogOut size={16} />
              <span style={{ fontSize: '0.85rem', fontWeight: 500 }}>Log Out</span>
            </button>
          </div>
        </div>

        {/* Message Notifications */}
        {error && (
          <div className="auth-error" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', marginBottom: '1.5rem' }}>
            <span>{error}</span>
            <button type="button" onClick={() => setError(null)} style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', fontWeight: 'bold' }}>✕</button>
          </div>
        )}
        {success && (
          <div style={{
            backgroundColor: '#ecfdf5',
            color: '#047857',
            padding: '1rem',
            borderRadius: 'var(--radius-sm)',
            fontSize: '0.9rem',
            marginBottom: '1.5rem',
            border: '1px solid #d1fae5',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}>
            <span>{success}</span>
            <button type="button" onClick={() => setSuccess(null)} style={{ background: 'transparent', border: 'none', color: '#047857', cursor: 'pointer', fontWeight: 'bold' }}>✕</button>
          </div>
        )}

        {/* Premium Dashboard Overview Statistics Cards Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '20px',
          marginBottom: '2.5rem'
        }}>
          <div className="admin-stat-card" style={{
            backgroundColor: 'var(--card-bg)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-md)',
            padding: '1.5rem',
            boxShadow: 'var(--shadow-sm)',
            display: 'flex',
            alignItems: 'center',
            gap: '16px'
          }}>
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              backgroundColor: 'var(--primary-light)',
              color: 'var(--primary-color)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Users size={24} />
            </div>
            <div>
              <p style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Registered Users</p>
              <h3 style={{ fontSize: '1.8rem', fontWeight: 700, color: 'var(--text-color)', marginTop: '2px' }}>{loading ? '...' : totalUsers}</h3>
            </div>
          </div>

          <div className="admin-stat-card" style={{
            backgroundColor: 'var(--card-bg)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-md)',
            padding: '1.5rem',
            boxShadow: 'var(--shadow-sm)',
            display: 'flex',
            alignItems: 'center',
            gap: '16px'
          }}>
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              backgroundColor: 'var(--primary-light)',
              color: 'var(--primary-color)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <CheckSquare size={24} />
            </div>
            <div>
              <p style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Tasks Managed</p>
              <h3 style={{ fontSize: '1.8rem', fontWeight: 700, color: 'var(--text-color)', marginTop: '2px' }}>{loading ? '...' : totalTasks}</h3>
            </div>
          </div>

          <div className="admin-stat-card" style={{
            backgroundColor: 'var(--card-bg)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-md)',
            padding: '1.5rem',
            boxShadow: 'var(--shadow-sm)',
            display: 'flex',
            alignItems: 'center',
            gap: '16px'
          }}>
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              backgroundColor: 'var(--primary-light)',
              color: 'var(--primary-color)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Tags size={24} />
            </div>
            <div>
              <p style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Workspace Tags Defined</p>
              <h3 style={{ fontSize: '1.8rem', fontWeight: 700, color: 'var(--text-color)', marginTop: '2px' }}>{loading ? '...' : totalTags}</h3>
            </div>
          </div>
        </div>

        {/* User List Main Card */}
        <div style={{
          backgroundColor: 'var(--card-bg)',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border-color)',
          boxShadow: 'var(--shadow-md)',
          overflow: 'hidden'
        }}>
          
          {/* List Search Header */}
          <div style={{
            padding: '1.5rem 2rem',
            borderBottom: '1px solid var(--border-color)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '16px',
            flexWrap: 'wrap'
          }}>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 600, color: 'var(--text-color)' }}>System Users ({filteredUsers.length})</h3>
            <div style={{ position: 'relative', width: '280px' }}>
              <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}>
                <Search size={16} />
              </span>
              <input
                type="text"
                placeholder="Search users..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px 8px 36px',
                  borderRadius: '10px',
                  border: '1px solid var(--border-color)',
                  fontFamily: 'var(--font-sans)',
                  fontSize: '0.9rem',
                  outline: 'none',
                  transition: 'var(--transition-smooth)'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = 'var(--border-focus)';
                  e.target.style.boxShadow = '0 0 0 3px rgba(167, 139, 250, 0.1)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = 'var(--border-color)';
                  e.target.style.boxShadow = 'none';
                }}
              />
            </div>
          </div>

          {/* User List Content */}
          <div style={{ padding: '1rem 0' }}>
            {loading ? (
              <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
                <RefreshCw size={24} className="spin-anim" style={{ margin: '0 auto 12px' }} />
                <span>Loading users database...</span>
              </div>
            ) : filteredUsers.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '4rem 2rem', color: 'var(--text-muted)' }}>
                <ShieldAlert size={48} strokeWidth={1} style={{ margin: '0 auto 12px', color: 'var(--text-muted)' }} />
                <h4 style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>No users matched the criteria</h4>
                <p style={{ fontSize: '0.85rem', marginTop: '4px' }}>Try adjusting your search query.</p>
              </div>
            ) : (
              filteredUsers.map((u) => {
                const isSelf = u.id === currentUser?.id;
                const isResetting = resettingUserId === u.id;

                return (
                  <div key={u.id} style={{
                    borderBottom: '1px solid var(--border-color)',
                    padding: '1.25rem 2rem',
                    display: 'flex',
                    flexDirection: 'column',
                    transition: 'var(--transition-smooth)',
                  }} className="admin-user-row">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', gap: '16px' }}>
                      
                      {/* User Info & Avatar */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flex: 2 }}>
                        <div style={{
                          width: '42px',
                          height: '42px',
                          borderRadius: '12px',
                          backgroundColor: u.is_admin ? 'var(--primary-light)' : 'var(--bg-darker)',
                          color: u.is_admin ? 'var(--primary-color)' : 'var(--text-secondary)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 700,
                          fontSize: '1rem'
                        }}>
                          {u.username.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontWeight: 600, color: 'var(--text-color)', fontSize: '1rem' }}>{u.username}</span>
                            {u.is_admin && (
                              <span style={{
                                fontSize: '0.7rem',
                                fontWeight: 700,
                                backgroundColor: 'var(--primary-light)',
                                color: 'var(--primary-color)',
                                padding: '2px 8px',
                                borderRadius: '12px',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px'
                              }}>
                                <Shield size={10} />
                                ADMIN
                              </span>
                            )}
                            {isSelf && (
                              <span style={{
                                fontSize: '0.7rem',
                                fontWeight: 700,
                                backgroundColor: '#eff6ff',
                                color: '#1d4ed8',
                                padding: '2px 8px',
                                borderRadius: '12px'
                              }}>
                                YOU
                              </span>
                            )}
                          </div>
                          <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>User ID: #{u.id}</span>
                        </div>
                      </div>

                      {/* Stats */}
                      <div style={{ display: 'flex', gap: '20px', flex: 1.5 }}>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Tasks</span>
                          <span style={{ fontWeight: 600, color: 'var(--text-color)' }}>{u.tasks_count}</span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Tags</span>
                          <span style={{ fontWeight: 600, color: 'var(--text-color)' }}>{u.tags_count}</span>
                        </div>
                      </div>

                      {/* Actions */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        
                        {/* Toggle Admin */}
                        <button
                          type="button"
                          className="task-action-btn"
                          title={u.is_admin ? "Revoke Admin Privileges" : "Grant Admin Privileges"}
                          disabled={isSelf}
                          onClick={() => handleToggleAdmin(u.id)}
                          style={{
                            opacity: isSelf ? 0.35 : 1,
                            cursor: isSelf ? 'not-allowed' : 'pointer',
                            color: u.is_admin ? 'var(--primary-color)' : 'var(--text-secondary)',
                            backgroundColor: u.is_admin ? 'var(--primary-light)' : 'transparent',
                            padding: '8px',
                            borderRadius: '8px'
                          }}
                        >
                          <Shield size={16} />
                        </button>

                        {/* Reset Password Trigger */}
                        <button
                          type="button"
                          className="task-action-btn"
                          title="Reset Password"
                          onClick={() => {
                            if (isResetting) {
                              setResettingUserId(null);
                              setNewPassword('');
                            } else {
                              setResettingUserId(u.id);
                              setNewPassword('');
                            }
                          }}
                          style={{
                            color: isResetting ? 'var(--primary-color)' : 'var(--text-secondary)',
                            backgroundColor: isResetting ? 'var(--primary-light)' : 'transparent',
                            padding: '8px',
                            borderRadius: '8px'
                          }}
                        >
                          <Key size={16} />
                        </button>

                        {/* Delete User */}
                        <button
                          type="button"
                          className="task-action-btn delete-btn"
                          title="Delete User Account"
                          disabled={isSelf}
                          onClick={() => handleDeleteUser(u.id, u.username)}
                          style={{
                            opacity: isSelf ? 0.35 : 1,
                            cursor: isSelf ? 'not-allowed' : 'pointer',
                            padding: '8px',
                            borderRadius: '8px'
                          }}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>

                    </div>

                    {/* Expandable Reset Password Row */}
                    {isResetting && (
                      <div style={{
                        marginTop: '12px',
                        padding: '12px 16px',
                        backgroundColor: 'var(--bg-color)',
                        borderRadius: 'var(--radius-md)',
                        border: '1px dashed var(--border-color)',
                        display: 'flex',
                        gap: '12px',
                        alignItems: 'center',
                        animation: 'fadeIn 0.2s ease-out'
                      }}>
                        <span style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-secondary)' }}>Set New Password:</span>
                        <input
                          type="password"
                          placeholder="Enter new password..."
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          style={{
                            flex: 1,
                            padding: '6px 12px',
                            borderRadius: '8px',
                            border: '1px solid var(--border-color)',
                            fontSize: '0.85rem',
                            outline: 'none',
                            fontFamily: 'var(--font-sans)'
                          }}
                        />
                        <button
                          type="button"
                          className="task-action-btn"
                          title="Save new password"
                          onClick={() => handleResetPassword(u.id, u.username)}
                          style={{ color: '#10b981', padding: '6px 12px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.85rem' }}
                        >
                          <Check size={16} />
                          <span>Save</span>
                        </button>
                        <button
                          type="button"
                          className="task-action-btn"
                          title="Cancel"
                          onClick={() => {
                            setResettingUserId(null);
                            setNewPassword('');
                          }}
                          style={{ color: '#ef4444', padding: '6px 12px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.85rem' }}
                        >
                          <X size={16} />
                          <span>Cancel</span>
                        </button>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

        </div>

      </div>
    </div>
  );
};
