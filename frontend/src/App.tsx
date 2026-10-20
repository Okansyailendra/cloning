import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Navbar } from './components/Layout/Navbar';
import { AnalisisPage } from './pages/AnalisisPage';
import { RiwayatPage } from './pages/RiwayatPage';
import { BandingkanPage } from './pages/BandingkanPage';
import { TentangModelPage } from './pages/TentangModelPage';
import { BatasanEtikaPage } from './pages/BatasanEtikaPage';

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: 'var(--bg-canvas)' }}>
        <Navbar />
        <main style={{
          flex: 1,
          padding: '32px 40px',
          maxWidth: '1200px',
          margin: '0 auto',
          width: '100%'
        }}>
          <Routes>
            <Route path="/" element={<AnalisisPage />} />
            <Route path="/riwayat" element={<RiwayatPage />} />
            <Route path="/bandingkan" element={<BandingkanPage />} />
            <Route path="/tentang-model" element={<TentangModelPage />} />
            <Route path="/batasan-etika" element={<BatasanEtikaPage />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
};

export default App;
