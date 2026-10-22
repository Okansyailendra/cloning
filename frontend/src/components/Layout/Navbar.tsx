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
    <header style={{
      width: '100%',
      position: 'sticky',
      top: 0,
      zIndex: 50,
      backgroundColor: 'rgba(232, 236, 230, 0.88)',
      backdropFilter: 'blur(16px)',
      WebkitBackdropFilter: 'blur(16px)',
      borderBottom: '1px solid rgba(0, 0, 0, 0.06)',
      padding: '16px 32px',
      boxSizing: 'border-box'
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '20px',
        width: '100%',
        maxWidth: '1560px',
        margin: '0 auto'
      }}>
        {/* Brand Identity: Sonalyze Audio Wave Logo */}
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

        {/* Center Floating Capsule Pill Navbar */}
        <nav style={{
          display: 'flex',
          alignItems: 'center',
          gap: '2px',
          backgroundColor: 'rgba(255, 255, 255, 0.65)',
          padding: '4px',
          borderRadius: 'var(--radius-pill)',
          border: '1px solid rgba(255, 255, 255, 0.85)',
          boxShadow: '0 2px 10px rgba(0, 0, 0, 0.03)',
          backdropFilter: 'blur(10px)'
        }}>
          {navLinks.map(({ to, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              style={({ isActive }) => ({
                display: 'inline-flex',
                alignItems: 'center',
                padding: '6px 16px',
                borderRadius: 'var(--radius-pill)',
                fontSize: '13px',
                fontWeight: isActive ? 600 : 500,
                color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                backgroundColor: isActive ? 'var(--bg-surface)' : 'transparent',
                boxShadow: isActive ? '0 2px 8px rgba(0, 0, 0, 0.06)' : 'none',
                transition: 'all 0.18s ease',
                whiteSpace: 'nowrap'
              })}
            >
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>
      </div>
    </header>
  );
};
