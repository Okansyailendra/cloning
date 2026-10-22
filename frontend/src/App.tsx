import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Navbar } from './components/Layout/Navbar';
import { AnalisisPage } from './pages/AnalisisPage';
import { RiwayatPage } from './pages/RiwayatPage';
import { BandingkanPage } from './pages/BandingkanPage';
import { TentangModelPage } from './pages/TentangModelPage';

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <div className="app-shell">
        <Navbar />
        <main className="app-main">
          <Routes>
            <Route path="/" element={<AnalisisPage />} />
            <Route path="/riwayat" element={<RiwayatPage />} />
            <Route path="/bandingkan" element={<BandingkanPage />} />
            <Route path="/tentang-model" element={<TentangModelPage />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
};

export default App;
