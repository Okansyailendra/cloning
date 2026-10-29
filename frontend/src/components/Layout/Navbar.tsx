import React from 'react';
import { NavLink } from 'react-router-dom';
import { Activity, History, GitCompare, BookOpen } from 'lucide-react';

export const Navbar: React.FC = () => {
  const navLinks = [
    { to: '/', label: 'Analisis Audio', icon: Activity },
    { to: '/riwayat', label: 'Riwayat', icon: History },
    { to: '/bandingkan', label: 'Bandingkan', icon: GitCompare },
    { to: '/tentang-model', label: 'Tentang Model', icon: BookOpen },
  ];

  return (
    <header className="navbar-header">
      <div className="navbar-container">
        {/* Brand Identity: Sonalyze Audio Wave Logo */}
        <div className="navbar-brand-row">
          <NavLink to="/" style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none' }}>
            <img
              src="/logo.png"
              alt="Sonalyze Logo"
              style={{
                width: '32px',
                height: '32px',
                objectFit: 'contain',
                display: 'block'
              }}
            />
            <span style={{
              fontFamily: 'var(--font-display)',
              fontSize: '22px',
              fontWeight: 800,
              letterSpacing: '-0.03em',
              color: 'var(--text-primary)',
              lineHeight: 1
            }}>
              Sonalyze
            </span>
          </NavLink>
        </div>

        {/* Center Floating Capsule Pill Navbar */}
        <nav className="navbar-nav">
          {navLinks.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) => `navbar-link ${isActive ? 'active' : ''}`}
            >
              <Icon size={14} style={{ flexShrink: 0 }} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>
      </div>
    </header>
  );
};
