import { useState, useRef, useCallback, useEffect } from 'react';
import { SIM_FLEET_CATALOG, createSimVehicle, simPhysicsTick, vehicleToData, injectFault, type SimVehicle } from '../simulator/engine';
import { computeScores } from '../intelligence/scoring';
import { runRuleEngine, type Alert } from '../intelligence/ruleEngine';
import { detectAnomalies } from '../intelligence/anomalyDetector';
import { estimateRUL } from '../intelligence/rulEstimator';
import { generateRecommendations } from '../intelligence/recommendations';
import type { VehicleData } from '../App';

const WS_URL = 'ws://localhost:8000/ws';

// ── Intelligence pipeline ──
function runIntelligence(vehicle: any): VehicleData {
  const { state, paramConfigs, subsystemWeights } = vehicle;
  const scoring = computeScores(state, paramConfigs, subsystemWeights);
  const alerts = runRuleEngine(state, paramConfigs);
  const anomalies = detectAnomalies(state, paramConfigs);
  const rulEstimates = estimateRUL(scoring.subsystemScores);
  const recommendations = generateRecommendations(scoring.subsystemScores, rulEstimates);
  return { ...vehicle, scoring, alerts, anomalies, rulEstimates, recommendations };
}

export interface UseFleetConnectionReturn {
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

export function useFleetConnection(isLoggedIn: boolean): UseFleetConnectionReturn {
  const [fleet, setFleet] = useState<VehicleData[]>([]);
  const [wsConnected, setWsConnected] = useState(false);
  const [mode, setMode] = useState<'LIVE' | 'SIM'>('SIM');
  const [evaluating, setEvaluating] = useState(false);
  const [tickCount, setTickCount] = useState(0);
  const [allAlerts, setAllAlerts] = useState<Alert[]>([]);
  
  const ws = useRef<WebSocket | null>(null);
  const simInterval = useRef<any>(null);
  const simVehiclesRef = useRef<SimVehicle[]>(SIM_FLEET_CATALOG.map(createSimVehicle));

  const processFleet = useCallback((rawFleet: any[]) => {
    const processed = rawFleet.map(runIntelligence);
    setFleet(processed);
    const newAlerts: Alert[] = [];
    for (const v of processed) {
      if (v.alerts) newAlerts.push(...v.alerts.map(a => ({ ...a, id: `${v.id}-${a.id}` })));
    }
    if (newAlerts.length > 0) {
      setAllAlerts(prev => [...newAlerts, ...prev].slice(0, 200));
    }
  }, []);

  // Show idle fleet (initial values, no simulation running)
  const showIdleFleet = useCallback(() => {
    const idleData = simVehiclesRef.current.map(vehicleToData);
    const processed = idleData.map(runIntelligence);
    setFleet(processed);
  }, []);

  // Start evaluation: begin the simulation tick loop
  const startEvaluation = useCallback(() => {
    setEvaluating(true);
    setAllAlerts([]);
    setTickCount(0);
    // Reset vehicles to fresh state
    simVehiclesRef.current = SIM_FLEET_CATALOG.map(createSimVehicle);
    // Start ticking
    simInterval.current = setInterval(() => {
      simVehiclesRef.current = simVehiclesRef.current.map(simPhysicsTick);
      const data = simVehiclesRef.current.map(vehicleToData);
      processFleet(data);
      setTickCount(prev => prev + 1);
    }, 2000);
    // Immediate first tick
    simVehiclesRef.current = simVehiclesRef.current.map(simPhysicsTick);
    processFleet(simVehiclesRef.current.map(vehicleToData));
    setTickCount(1);
  }, [processFleet]);

  const stopEvaluation = useCallback(() => {
    setEvaluating(false);
    if (simInterval.current) {
      clearInterval(simInterval.current);
      simInterval.current = null;
    }
  }, []);

  // WS connection
  const connectWs = useCallback(() => {
    const socket = new WebSocket(WS_URL);
    socket.onopen = () => {
      setWsConnected(true);
      setMode('LIVE');
      // In LIVE mode, evaluation starts automatically from backend
      setEvaluating(true);
      if (simInterval.current) { 
        clearInterval(simInterval.current); 
        simInterval.current = null; 
      }
    };
    socket.onclose = () => {
      setWsConnected(false);
      setMode('SIM');
      // Show idle fleet, wait for user to start evaluation
      showIdleFleet();
    };
    socket.onerror = () => { 
      socket.close(); 
    };
    socket.onmessage = (event) => {
      const payload = JSON.parse(event.data);
      if (payload.type === 'fleet_update') {
        processFleet(payload.data);
        setTickCount(prev => prev + 1);
      }
    };
    ws.current = socket;
  }, [processFleet, showIdleFleet]);

  useEffect(() => {
    if (isLoggedIn) {
      connectWs();
      // Show idle fleet immediately while connecting
      showIdleFleet();
    }
    return () => {
      stopEvaluation();
      if (ws.current) ws.current.close();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoggedIn]);

  const sendCommand = useCallback((cmd: any) => {
    // Handle local fault injection in SIM mode
    if (cmd.action === 'injectFault' && mode === 'SIM') {
      const v = simVehiclesRef.current.find(sv => sv.id === cmd.vehicle_id);
      if (v) injectFault(v, cmd.fault_type);
      return;
    }
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify(cmd));
    }
  }, [mode]);

  return {
    fleet,
    wsConnected,
    mode,
    evaluating,
    tickCount,
    allAlerts,
    sendCommand,
    startEvaluation,
    stopEvaluation,
  };
}
