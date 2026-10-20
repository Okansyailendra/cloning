import React, { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { Activity, History, GitCompare, BookOpen, ShieldAlert } from 'lucide-react';
import { fetchHealth } from '../../services/api';

export const Navbar: React.FC = () => {
  const [serverOnline, setServerOnline] = useState<boolean | null>(null);

  useEffect(() => {
    let mounted = true;
    const check = async () => {
      try {
        const res = await fetchHealth();
        if (mounted) setServerOnline(res.status === 'ok' && res.model_loaded);
      } catch {
        if (mounted) setServerOnline(false);
      }
    };
    check();
    const interval = setInterval(check, 15000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  const navLinks = [
    { to: '/', label: 'Analisis Audio', icon: Activity },
    { to: '/riwayat', label: 'Riwayat', icon: History },
    { to: '/bandingkan', label: 'Bandingkan', icon: GitCompare },
    { to: '/tentang-model', label: 'Tentang Model', icon: BookOpen },
    { to: '/batasan-etika', label: 'Batasan & Etika', icon: ShieldAlert },
  ];

  return (
    <aside style={{
      width: '260px',
      backgroundColor: 'var(--bg-surface)',
      borderRight: '1px solid var(--border-subtle)',
      display: 'flex',
      flexDirection: 'column',
      padding: '24px 16px',
      height: '100vh',
      position: 'sticky',
      top: 0,
      flexShrink: 0
    }}>
      {/* Brand Header */}
      <div style={{ paddingBottom: '24px', borderBottom: '1px solid var(--border-subtle)', marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '36px',
            height: '36px',
            borderRadius: 'var(--radius-md)',
            backgroundColor: 'var(--accent-quiet-bg)',
            border: '1px solid var(--accent-quiet-border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--accent-quiet)'
          }}>
            <Activity size={22} />
          </div>
          <div>
            <span style={{
              fontFamily: 'var(--font-display)',
              fontSize: '18px',
              fontWeight: 700,
              letterSpacing: '-0.02em',
              color: 'var(--text-primary)',
              display: 'block'
            }}>
              Sound Lab
            </span>
            <span style={{
              fontSize: '11px',
              color: 'var(--text-muted)',
              fontFamily: 'var(--font-mono)'
            }}>
              v1.0 • Random Forest
            </span>
          </div>
        </div>
      </div>

      {/* Navigation List */}
      <nav style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1 }}>
        {navLinks.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            style={({ isActive }) => ({
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '10px 14px',
              borderRadius: 'var(--radius-md)',
              fontSize: '14px',
              fontWeight: isActive ? 600 : 500,
              color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
              backgroundColor: isActive ? 'var(--bg-surface-elevated)' : 'transparent',
              borderLeft: isActive ? '3px solid var(--accent-quiet)' : '3px solid transparent',
              transition: 'background-color 0.15s, color 0.15s'
            })}
          >
            <Icon size={18} />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>

      {/* Backend Status Footer */}
      <div style={{
        paddingTop: '16px',
        borderTop: '1px solid var(--border-subtle)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        fontSize: '12px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            backgroundColor: serverOnline === true ? 'var(--accent-quiet)' : serverOnline === false ? 'var(--accent-danger)' : 'var(--accent-warning)',
            display: 'inline-block'
          }} />
          <span style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
            {serverOnline === true ? 'Engine Siap' : serverOnline === false ? 'Engine Offline' : 'Menghubungkan...'}
          </span>
        </div>
      </div>
    </aside>
  );
};
