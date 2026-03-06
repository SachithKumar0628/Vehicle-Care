import { useState, createContext, useContext } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import HomePage from './pages/HomePage';
import VehiclesPage from './pages/VehiclesPage';
import VehicleDetailPage from './pages/VehicleDetailPage';
import AlertsPage from './pages/AlertsPage';
import ProfilePage from './pages/ProfilePage';
import { DesktopNav, MobileNav, ModeBadge } from './components/BottomNav';
import { type ScoringResult } from './intelligence/scoring';
import { type Alert } from './intelligence/ruleEngine';
import { type Anomaly } from './intelligence/anomalyDetector';
import { type RulEstimate } from './intelligence/rulEstimator';
import { type Recommendation } from './intelligence/recommendations';
import { useFleetConnection } from './hooks/useFleetConnection';

export interface VehicleData {
  id: string;
  timestamp: number;
  info: any;
  state: Record<string, number>;
  subsystems: Record<string, Record<string, number>>;
  paramConfigs: Record<string, any>;
  subsystemWeights: Record<string, number>;
  odometer: number;
  rpm: number;
  speed: number;
  active_faults: string[];
  scoring?: ScoringResult;
  alerts?: Alert[];
  anomalies?: Anomaly[];
  rulEstimates?: RulEstimate[];
  recommendations?: Recommendation[];
}

interface FleetContextType {
  fleet: VehicleData[];
  wsConnected: boolean;
  mode: 'LIVE' | 'SIM';
  evaluating: boolean;
  tickCount: number;
  allAlerts: Alert[];
  sendCommand: (cmd: any) => void;
  startEvaluation: () => void;
  stopEvaluation: () => void;
}

export const FleetContext = createContext<FleetContextType>({
  fleet: [], wsConnected: false, mode: 'SIM', evaluating: false, tickCount: 0,
  allAlerts: [], sendCommand: () => { }, startEvaluation: () => { }, stopEvaluation: () => { },
});
export const useFleet = () => useContext(FleetContext);

// ── Main App ──
export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(() => localStorage.getItem('vh_auth') === 'true');
  const [userName, setUserName] = useState(() => localStorage.getItem('vh_user') || 'User');
  
  const {
    fleet,
    wsConnected,
    mode,
    evaluating,
    tickCount,
    allAlerts,
    sendCommand,
    startEvaluation,
    stopEvaluation,
  } = useFleetConnection(isLoggedIn);

  const handleLogin = (name: string) => {
    setIsLoggedIn(true); 
    setUserName(name);
    localStorage.setItem('vh_auth', 'true'); 
    localStorage.setItem('vh_user', name);
  };
  
  const handleLogout = () => {
    setIsLoggedIn(false); 
    setUserName('User');
    localStorage.removeItem('vh_auth'); 
    localStorage.removeItem('vh_user');
  };

  if (!isLoggedIn) return <LoginPage onLogin={handleLogin} />;

  return (
    <FleetContext.Provider value={{ fleet, wsConnected, mode, evaluating, tickCount, allAlerts, sendCommand, startEvaluation, stopEvaluation }}>
      <ModeBadge />
      <div className="app-shell">
        <DesktopNav />
        <div>
          <Routes>
            <Route path="/" element={<HomePage userName={userName} />} />
            <Route path="/vehicles" element={<VehiclesPage />} />
            <Route path="/vehicle/:id" element={<VehicleDetailPage />} />
            <Route path="/alerts" element={<AlertsPage />} />
            <Route path="/profile" element={<ProfilePage userName={userName} onLogout={handleLogout} />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </div>
      <MobileNav />
    </FleetContext.Provider>
  );
}
