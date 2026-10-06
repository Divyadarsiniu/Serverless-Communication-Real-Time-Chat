import React from 'react';
import { useTheme } from '../context/ThemeContext';
import { Sun, Moon } from 'lucide-react';

export default function ThemeToggle({ size = 20, className = '' }) {
  const { isDark, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      type="button"
      title={isDark ? 'Switch to Daylight Mode (Day)' : 'Switch to Midnight Mode (Night)'}
      aria-label="Toggle theme"
      className={`theme-toggle-btn ${className}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '38px',
        height: '38px',
        borderRadius: '10px',
        border: '1px solid var(--border-color)',
        backgroundColor: 'var(--bg-glass)',
        backdropFilter: 'blur(8px)',
        color: isDark ? '#fbbf24' : '#6366f1',
        cursor: 'pointer',
        transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transform: isDark ? 'rotate(0deg) scale(1)' : 'rotate(90deg) scale(0)',
          transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          position: isDark ? 'relative' : 'absolute',
          opacity: isDark ? 1 : 0
        }}
      >
        <Moon size={size} />
      </div>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transform: !isDark ? 'rotate(0deg) scale(1)' : 'rotate(-90deg) scale(0)',
          transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          position: !isDark ? 'relative' : 'absolute',
          opacity: !isDark ? 1 : 0
        }}
      >
        <Sun size={size} />
      </div>
    </button>
  );
}
