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
      backgroundColor: 'rgba(3, 27, 20, 0.82)',
      backdropFilter: 'blur(18px)',
      WebkitBackdropFilter: 'blur(18px)',
      borderBottom: '1px solid rgba(74, 222, 128, 0.20)',
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
            background: 'linear-gradient(135deg, rgba(74, 222, 128, 0.28) 0%, rgba(132, 204, 22, 0.22) 100%)',
            border: '1px solid rgba(74, 222, 128, 0.45)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#4ADE80',
            boxShadow: '0 0 16px rgba(74, 222, 128, 0.35)'
          }}>
            <Waves size={22} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{
              fontFamily: 'var(--font-display)',
              fontSize: '20px',
              fontWeight: 800,
              letterSpacing: '-0.02em',
              background: 'linear-gradient(135deg, #F0FDF4 0%, #D9F99D 45%, #4ADE80 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              lineHeight: 1.1
            }}>
              Sound Lab
            </span>
            <span style={{
              fontSize: '11px',
              color: '#86EFAC',
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
          backgroundColor: 'rgba(4, 38, 29, 0.65)',
          padding: '5px 8px',
          borderRadius: '9999px',
          border: '1px solid rgba(74, 222, 128, 0.18)'
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
                color: isActive ? '#F0FDF4' : '#BBF7D0',
                backgroundColor: isActive ? 'rgba(74, 222, 128, 0.22)' : 'transparent',
                border: `1px solid ${isActive ? 'rgba(132, 204, 22, 0.45)' : 'transparent'}`,
                boxShadow: isActive ? '0 0 14px rgba(74, 222, 128, 0.25)' : 'none',
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
            backgroundColor: 'rgba(4, 38, 29, 0.80)',
            border: '1px solid rgba(74, 222, 128, 0.28)',
            fontSize: '11px',
            fontWeight: 600,
            fontFamily: 'var(--font-mono)',
            color: '#BBF7D0'
          }}>
            <span style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              backgroundColor: '#84CC16',
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
                ? 'rgba(74, 222, 128, 0.14)'
                : serverOnline === false
                ? 'rgba(239, 68, 68, 0.15)'
                : 'rgba(245, 158, 11, 0.14)',
              border: `1px solid ${
                serverOnline === true
                  ? 'rgba(74, 222, 128, 0.38)'
                  : serverOnline === false
                  ? 'rgba(239, 68, 68, 0.40)'
                  : 'rgba(245, 158, 11, 0.38)'
              }`,
              fontSize: '12px',
              fontFamily: 'var(--font-mono)',
              color: serverOnline === true
                ? '#4ADE80'
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
                  ? '#4ADE80'
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
