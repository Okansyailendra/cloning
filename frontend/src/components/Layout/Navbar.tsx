import React, { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { Activity, History, GitCompare, BookOpen, ShieldAlert, Waves } from 'lucide-react';
import { fetchHealth } from '../../services/api';
import type { HealthResponse } from '../../types/api';

export const Navbar: React.FC = () => {
  const [healthData, setHealthData] = useState<HealthResponse | null>(null);
  const [serverOnline, setServerOnline] = useState<boolean | null>(null);

  useEffect(() => {
    let mounted = true;
    const check = async () => {
      try {
        const res = await fetchHealth();
        if (mounted) {
          setHealthData(res);
          setServerOnline(res.status === 'ok' && res.model_loaded);
        }
      } catch {
        if (mounted) {
          setHealthData(null);
          setServerOnline(false);
        }
      }
    };
    check();
    const interval = setInterval(check, 10000);
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
    <header style={{
      position: 'sticky',
      top: 0,
      zIndex: 100,
      width: '100%',
      backgroundColor: 'rgba(7, 22, 31, 0.85)',
      backdropFilter: 'blur(16px)',
      WebkitBackdropFilter: 'blur(16px)',
      borderBottom: '1px solid rgba(45, 212, 191, 0.18)',
      boxShadow: '0 4px 20px rgba(0, 0, 0, 0.35)'
    }}>
      <div style={{
        maxWidth: '1440px',
        margin: '0 auto',
        padding: '0 24px',
        height: '70px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '20px'
      }}>
        {/* Brand Identity */}
        <NavLink to="/" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: 'var(--radius-md)',
            background: 'linear-gradient(135deg, rgba(20, 184, 166, 0.25) 0%, rgba(6, 182, 212, 0.2) 100%)',
            border: '1px solid rgba(45, 212, 191, 0.45)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#2DD4BF',
            boxShadow: '0 0 16px rgba(20, 184, 166, 0.3)'
          }}>
            <Waves size={22} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{
              fontFamily: 'var(--font-display)',
              fontSize: '20px',
              fontWeight: 800,
              letterSpacing: '-0.02em',
              background: 'linear-gradient(135deg, #F0FDFA 0%, #2DD4BF 50%, #06B6D4 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              lineHeight: 1.1
            }}>
              Sound Lab
            </span>
            <span style={{
              fontSize: '11px',
              color: '#5EEAD4',
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
              fontWeight: 600,
              fontFamily: 'var(--font-mono)'
            }}>
              Noise Acoustic Engine
            </span>
          </div>
        </NavLink>

        {/* Center Navigation Links */}
        <nav style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          backgroundColor: 'rgba(11, 34, 48, 0.55)',
          padding: '5px 8px',
          borderRadius: '9999px',
          border: '1px solid rgba(45, 212, 191, 0.15)'
        }}>
          {navLinks.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              style={({ isActive }) => ({
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 14px',
                borderRadius: '9999px',
                fontSize: '13px',
                fontWeight: isActive ? 600 : 500,
                color: isActive ? '#F0FDFA' : '#94A3B8',
                backgroundColor: isActive ? 'rgba(20, 184, 166, 0.20)' : 'transparent',
                border: `1px solid ${isActive ? 'rgba(45, 212, 191, 0.40)' : 'transparent'}`,
                boxShadow: isActive ? '0 0 12px rgba(20, 184, 166, 0.2)' : 'none',
                transition: 'all 0.15s ease'
              })}
            >
              <Icon size={16} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        {/* Right Info: Model Badge & Real-time Backend Engine Status */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {/* Model Specification Badge */}
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '5px 12px',
            borderRadius: '9999px',
            backgroundColor: 'rgba(11, 34, 48, 0.75)',
            border: '1px solid rgba(45, 212, 191, 0.25)',
            fontSize: '11px',
            fontWeight: 600,
            fontFamily: 'var(--font-mono)',
            color: '#99F6E4'
          }}>
            <span style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              backgroundColor: '#06B6D4',
              display: 'inline-block'
            }} />
            <span>v1.0 • Random Forest</span>
          </div>

          {/* Real-time Backend Status */}
          <div
            title={healthData ? `Uptime: ${healthData.uptime_s}s | sklearn: ${healthData.sklearn_version} | Status: ${healthData.status}` : 'Backend Status'}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '5px 12px',
              borderRadius: '9999px',
              backgroundColor: serverOnline === true
                ? 'rgba(16, 185, 129, 0.12)'
                : serverOnline === false
                ? 'rgba(239, 68, 68, 0.15)'
                : 'rgba(245, 158, 11, 0.12)',
              border: `1px solid ${
                serverOnline === true
                  ? 'rgba(16, 185, 129, 0.35)'
                  : serverOnline === false
                  ? 'rgba(239, 68, 68, 0.40)'
                  : 'rgba(245, 158, 11, 0.35)'
              }`,
              fontSize: '12px',
              fontFamily: 'var(--font-mono)',
              color: serverOnline === true
                ? '#10B981'
                : serverOnline === false
                ? '#EF4444'
                : '#F59E0B'
            }}
          >
            <span
              className={serverOnline === true ? 'pulse-indicator' : ''}
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: serverOnline === true
                  ? '#10B981'
                  : serverOnline === false
                  ? '#EF4444'
                  : '#F59E0B',
                display: 'inline-block'
              }}
            />
            <span style={{ fontWeight: 600 }}>
              {serverOnline === true
                ? '● Engine Siap'
                : serverOnline === false
                ? '● Engine Offline'
                : '● Menghubungkan...'}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
};
