import React, { useState } from 'react';
import { useAuth } from './AuthContext';

export const Login: React.FC = () => {
  const { login, signup, error, setError, checkUsername, resetPassword } = useAuth();
  const [mode, setMode] = useState<'login' | 'signup' | 'reset'>('login');
  const [resetStep, setResetStep] = useState<1 | 2 | 3>(1);
  const [username, setUsername] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [newPassword, setNewPassword] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (mode === 'reset') {
      if (resetStep === 1) {
        if (!username.trim()) {
          setError('Please enter your username.');
          return;
        }
        setSubmitting(true);
        setError(null);
        try {
          const exists = await checkUsername(username);
          if (exists) {
            setResetStep(2);
          }
        } catch (err) {
          // Handled by context
        } finally {
          setSubmitting(false);
        }
      } else if (resetStep === 2) {
        if (!newPassword.trim()) {
          setError('Please enter a new password.');
          return;
        }
        setSubmitting(true);
        setError(null);
        try {
          await resetPassword(username, newPassword);
          setResetStep(3);
        } catch (err) {
          // Handled by context
        } finally {
          setSubmitting(false);
        }
      }
      return;
    }

    if (!username.trim() || !password.trim()) {
      setError('Please fill in all fields.');
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      if (mode === 'login') {
        await login(username, password);
      } else {
        await signup(username, password);
      }
    } catch (err) {
      // Errors are handled by context
    } finally {
      setSubmitting(false);
    }
  };

  const handleModeChange = (newMode: 'login' | 'signup' | 'reset') => {
    setMode(newMode);
    setResetStep(1);
    setError(null);
    setUsername('');
    setPassword('');
    setNewPassword('');
  };

  return (
    <div className="auth-wrapper">
      <div className="auth-card">
        <div className="auth-header">
          <div className="auth-logo">
            <div className="auth-logo-symbol">S</div>
            <span>Productive Floof</span>
          </div>
          <p className="auth-subtitle">
            {mode === 'login' && 'Enter your workspace'}
            {mode === 'signup' && 'Create a clean, new account'}
            {mode === 'reset' && resetStep === 1 && 'Find your account'}
            {mode === 'reset' && resetStep === 2 && 'Set your new password'}
            {mode === 'reset' && resetStep === 3 && 'Password successfully reset'}
          </p>
        </div>

        {error && <div className="auth-error">{error}</div>}

        {mode === 'reset' && resetStep === 3 ? (
          <div className="auth-success-state">
            <div className="auth-success-icon">✓</div>
            <p className="auth-success-msg">Your password has been updated successfully.</p>
            <button
              type="button"
              className="auth-btn"
              onClick={() => handleModeChange('login')}
            >
              Back to Log In
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="auth-form-group">
              <label className="auth-label" htmlFor="username">Username</label>
              <input
                type="text"
                id="username"
                className="auth-input"
                placeholder="Your username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={submitting || (mode === 'reset' && resetStep === 2)}
                autoComplete="username"
                required
              />
            </div>

            {(mode === 'login' || mode === 'signup') && (
              <div className="auth-form-group">
                <div className="auth-label-row">
                  <label className="auth-label" htmlFor="password">Password</label>
                  {mode === 'login' && (
                    <span
                      className="auth-forgot-link"
                      onClick={() => handleModeChange('reset')}
                    >
                      Forgot password?
                    </span>
                  )}
                </div>
                <input
                  type="password"
                  id="password"
                  className="auth-input"
                  placeholder="Your secure password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={submitting}
                  autoComplete={mode === 'login' ? "current-password" : "new-password"}
                  required
                />
              </div>
            )}

            {mode === 'reset' && resetStep === 2 && (
              <div className="auth-form-group">
                <label className="auth-label" htmlFor="new-password">New Password</label>
                <input
                  type="password"
                  id="new-password"
                  className="auth-input"
                  placeholder="Enter your new password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  disabled={submitting}
                  autoComplete="new-password"
                  required
                />
              </div>
            )}

            <button type="submit" className="auth-btn" disabled={submitting}>
              {submitting ? 'Processing...' :
               mode === 'login' ? 'Log In' :
               mode === 'signup' ? 'Sign Up' :
               resetStep === 1 ? 'Check Username' : 'Reset Password'}
            </button>
          </form>
        )}

        <div className="auth-footer">
          {mode === 'reset' ? (
            <p>
              Remember your password?{' '}
              <span className="auth-link" onClick={() => handleModeChange('login')}>
                Log In
              </span>
            </p>
          ) : (
            <p>
              {mode === 'login' ? "Don't have an account? " : "Already have an account? "}
              <span className="auth-link" onClick={() => handleModeChange(mode === 'login' ? 'signup' : 'login')}>
                {mode === 'login' ? 'Sign Up' : 'Log In'}
              </span>
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
