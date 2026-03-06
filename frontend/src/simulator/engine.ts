// ─────────────────────────────────────────
// Accurate Physics-Based Simulator
// ─────────────────────────────────────────

function _p(init: number, min: number, max: number, optMin: number, optMax: number,
  critBelow: number, critAbove: number, unit: string, label: string, subsystem: string) {
  return { init, min, max, optMin, optMax, critBelow, critAbove, unit, label, subsystem };
}

const ENGINE_PARAMS = {
  rpm: _p(850, 0, 8000, 700, 3500, 200, 6500, 'RPM', 'Engine RPM', 'engine'),
  coolant_temp: _p(35, -10, 150, 80, 100, 40, 115, '°C', 'Coolant Temperature', 'engine'),
  oil_pressure: _p(40, 0, 80, 25, 65, 15, 75, 'PSI', 'Oil Pressure', 'engine'),
  oil_life: _p(75, 0, 100, 20, 100, 10, 100, '%', 'Oil Life', 'engine'),
};
const BRAKE_PARAMS = {
  brake_pad_wear: _p(82, 0, 100, 25, 100, 15, 100, '%', 'Brake Pad Life', 'brakes'),
  brake_fluid: _p(95, 0, 100, 50, 100, 30, 100, '%', 'Brake Fluid Level', 'brakes'),
  brake_disc_temp: _p(30, 0, 500, 20, 200, 10, 350, '°C', 'Brake Disc Temp', 'brakes'),
};
const TRANSMISSION_PARAMS = {
  trans_temp: _p(40, 0, 180, 60, 100, 30, 130, '°C', 'Transmission Temp', 'transmission'),
  trans_slip: _p(0.5, 0, 15, 0, 3, 0, 8, '%', 'Transmission Slip', 'transmission'),
};
const ELECTRICAL_PARAMS = {
  battery_voltage: _p(12.6, 8, 16, 12.2, 13.2, 10.5, 14.8, 'V', 'Battery Voltage', 'electrical'),
  alternator_output: _p(13.8, 0, 16, 13.0, 14.5, 11.0, 15.5, 'V', 'Alternator Output', 'electrical'),
};
const TYRE_PARAMS = {
  tyre_pressure_fl: _p(32, 10, 50, 30, 35, 22, 42, 'PSI', 'Front Left Tyre', 'tyres'),
  tyre_pressure_fr: _p(32, 10, 50, 30, 35, 22, 42, 'PSI', 'Front Right Tyre', 'tyres'),
  tyre_pressure_rl: _p(32, 10, 50, 30, 35, 22, 42, 'PSI', 'Rear Left Tyre', 'tyres'),
  tyre_pressure_rr: _p(32, 10, 50, 30, 35, 22, 42, 'PSI', 'Rear Right Tyre', 'tyres'),
};
const EV_BATTERY_PARAMS = {
  battery_soc: _p(92, 0, 100, 20, 100, 10, 100, '%', 'Battery SOC', 'ev_battery'),
  cell_voltage_delta: _p(0.02, 0, 1.0, 0, 0.05, 0, 0.3, 'V', 'Cell Imbalance', 'ev_battery'),
  inverter_temp: _p(32, 0, 120, 20, 70, 10, 90, '°C', 'Inverter Temp', 'ev_battery'),
  motor_temp: _p(35, 0, 150, 20, 80, 10, 110, '°C', 'Motor Temp', 'ev_battery'),
};
const EMISSIONS_PARAMS = {
  co2_level: _p(120, 0, 400, 80, 180, 50, 250, 'g/km', 'CO2 Emissions', 'emissions'),
  exhaust_temp: _p(300, 0, 900, 200, 500, 100, 700, '°C', 'Exhaust Temp', 'emissions'),
};

const FAULT_SIGNATURES: Record<string, { param: string; rate: number; noise: number; ticks: number }> = {
  brake_failure: { param: 'brake_pad_wear', rate: -2.5, noise: 0.5, ticks: 20 },
  overheating: { param: 'coolant_temp', rate: 2.0, noise: 0.5, ticks: 25 },
  tyre_slow_leak: { param: 'tyre_pressure_fl', rate: -0.2, noise: 0.05, ticks: 60 },
  tyre_blowout: { param: 'tyre_pressure_fr', rate: -5.0, noise: 1.0, ticks: 4 },
  oil_leak: { param: 'oil_pressure', rate: -1.2, noise: 0.4, ticks: 30 },
  battery_drain: { param: 'battery_voltage', rate: -0.06, noise: 0.02, ticks: 50 },
  trans_overheat: { param: 'trans_temp', rate: 1.8, noise: 0.4, ticks: 25 },
  ev_cell_imbalance: { param: 'cell_voltage_delta', rate: 0.015, noise: 0.005, ticks: 40 },
  ev_battery_drain: { param: 'battery_soc', rate: -0.8, noise: 0.1, ticks: 40 },
};

// Vehicle configurations matching backend
export const SIM_FLEET_CATALOG = [
  {
    id: 'swift-dzire', name: 'Swift Dzire', manufacturer: 'Maruti Suzuki', model: 'Dzire VXi',
    year: 2022, fuel_type: 'Petrol', plate: 'KA01AB1234', type: 'car', odometer: 45200,
    params: { ...ENGINE_PARAMS, ...BRAKE_PARAMS, ...TRANSMISSION_PARAMS, ...ELECTRICAL_PARAMS, ...TYRE_PARAMS, ...EMISSIONS_PARAMS },
    weights: { engine: 1.5, brakes: 2.0, transmission: 1.0, electrical: 1.0, tyres: 1.2, emissions: 0.8 },
  },
  {
    id: 'fortuner', name: 'Toyota Fortuner', manufacturer: 'Toyota', model: 'Fortuner 4x4 AT',
    year: 2023, fuel_type: 'Diesel', plate: 'TN10GH4567', type: 'suv', odometer: 35800,
    params: { ...ENGINE_PARAMS, ...BRAKE_PARAMS, ...TRANSMISSION_PARAMS, ...ELECTRICAL_PARAMS, ...TYRE_PARAMS, ...EMISSIONS_PARAMS },
    weights: { engine: 1.5, brakes: 2.0, transmission: 1.2, electrical: 1.0, tyres: 1.3, emissions: 0.8 },
  },
  {
    id: 'nexon-ev', name: 'Tata Nexon EV', manufacturer: 'Tata Motors', model: 'Nexon EV Max',
    year: 2024, fuel_type: 'Electric', plate: 'MH02EV9999', type: 'ev', odometer: 12600,
    params: { ...EV_BATTERY_PARAMS, ...BRAKE_PARAMS, ...ELECTRICAL_PARAMS, ...TYRE_PARAMS },
    weights: { ev_battery: 2.0, brakes: 1.8, electrical: 1.0, tyres: 1.2 },
  },
];

export function gauss(mean: number, stddev: number): number {
  // Box-Muller transform
  const u1 = Math.random();
  const u2 = Math.random();
  return mean + stddev * Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

export function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

export interface SimVehicle {
  id: string;
  info: any;
  state: Record<string, number>;
  paramConfigs: Record<string, any>;
  subsystemWeights: Record<string, number>;
  odometer: number;
  rpm: number;
  speed: number;
  tickCount: number;
  activeFaults: Record<string, { param: string; rate: number; noise: number; startTick: number; duration: number }>;
}

export function createSimVehicle(catalog: typeof SIM_FLEET_CATALOG[0]): SimVehicle {
  const state: Record<string, number> = {};
  const paramConfigs: Record<string, any> = {};
  for (const [name, cfg] of Object.entries(catalog.params)) {
    state[name] = cfg.init;
    paramConfigs[name] = { ...cfg };
  }
  
  // Clean up the weights object to only include defined values
  const cleanWeights: Record<string, number> = {};
  for (const [key, value] of Object.entries(catalog.weights)) {
    if (value !== undefined) {
      cleanWeights[key] = value;
    }
  }
  
  return {
    id: catalog.id,
    info: { name: catalog.name, manufacturer: catalog.manufacturer, model: catalog.model, year: catalog.year, fuel_type: catalog.fuel_type, plate: catalog.plate, type: catalog.type },
    state, paramConfigs,
    subsystemWeights: cleanWeights,
    odometer: catalog.odometer,
    rpm: 850, speed: 0, tickCount: 0,
    activeFaults: {},
  };
}

export function simPhysicsTick(v: SimVehicle): SimVehicle {
  v.tickCount++;
  const s = { ...v.state };
  const cfgs = v.paramConfigs;

  // ── Driving pattern: RPM fluctuates naturally ──
  if (v.tickCount > 3) {
    v.rpm = clamp(v.rpm + gauss(0, 180), 600, 6000);
  } else {
    v.rpm = 850 + gauss(0, 30);
  }
  v.speed = Math.max(0, v.rpm * 0.018 + gauss(0, 2));
  const deltaRpm = v.rpm - 850;

  for (const pName of Object.keys(s)) {
    const cfg = cfgs[pName];
    if (!cfg) continue;
    let val = s[pName];

    // ── Correlated physics per parameter type ──
    if (pName === 'rpm') {
      val = v.rpm;
    } else if (pName === 'coolant_temp' || pName === 'trans_temp') {
      // Temperature correlated with RPM (warms up gradually)
      const target = (cfg.optMin + cfg.optMax) / 2;
      const rpmHeat = Math.log1p(Math.max(0, deltaRpm)) * 0.04;
      val += (target - val) * 0.025 + rpmHeat + gauss(0, 0.3);
    } else if (pName === 'oil_pressure') {
      // Oil pressure follows RPM dynamics
      val = Math.max(15, 40 + (v.rpm - 1000) * 0.004 + gauss(0, 0.8));
    } else if (pName === 'oil_life' || pName === 'brake_pad_wear') {
      // Slow degradation proportional to RPM
      const rate = 0.003 + (v.rpm / 6000) * 0.005;
      val -= rate + Math.abs(gauss(0, 0.002));
    } else if (pName === 'brake_fluid') {
      val += gauss(0, 0.02);
    } else if (pName === 'brake_disc_temp') {
      // Brake disc temp correlates with speed
      const target = 30 + v.speed * 1.5;
      val += (target - val) * 0.05 + gauss(0, 1.0);
    } else if (pName === 'trans_slip') {
      val = Math.max(0, 0.5 + (v.rpm / 6000) * 2.0 + gauss(0, 0.2));
    } else if (pName.startsWith('tyre_pressure')) {
      // Tyre pressure slightly affected by temperature
      const engineTemp = s.coolant_temp || s.inverter_temp || 90;
      const tempEffect = (engineTemp - 90) * 0.004;
      val += tempEffect + gauss(0, 0.06);
    } else if (pName === 'battery_voltage' || pName === 'alternator_output') {
      const target = cfg.init;
      val += (target - val) * 0.02 + gauss(0, 0.01);
    } else if (pName === 'battery_soc') {
      const discharge = 0.03 + v.speed * 0.001;
      val = Math.max(0, val - discharge + gauss(0, 0.01));
    } else if (pName === 'cell_voltage_delta') {
      val += gauss(0.0005, 0.003);
      val = Math.max(0.01, val);
    } else if (pName === 'inverter_temp' || pName === 'motor_temp') {
      const soc = s.battery_soc || 80;
      const target = cfg.init + (100 - soc) * 0.1;
      val += (target - val) * 0.03 + gauss(0, 0.3);
    } else if (pName === 'co2_level' || pName === 'exhaust_temp') {
      const target = cfg.init + (v.rpm - 850) * 0.02;
      val += (target - val) * 0.04 + gauss(0, 1.0);
    } else {
      val += gauss(0, 0.1);
    }

    s[pName] = clamp(val, cfg.min, cfg.max);
  }

  // ── Random anomaly injection (12% chance) ──
  if (Math.random() < 0.12) {
    const keys = Object.keys(s);
    const pick = keys[Math.floor(Math.random() * keys.length)];
    const cfg = cfgs[pick];
    if (cfg) {
      if (Math.random() < 0.5) {
        s[pick] = clamp(cfg.critAbove + gauss(0, 3), cfg.min, cfg.max);
      } else {
        s[pick] = clamp(cfg.critBelow - Math.abs(gauss(0, 3)), cfg.min, cfg.max);
      }
    }
  }

  // ── Apply active faults ──
  const expired: string[] = [];
  for (const [fname, finfo] of Object.entries(v.activeFaults)) {
    const elapsed = v.tickCount - finfo.startTick;
    if (elapsed <= finfo.duration) {
      if (s[finfo.param] !== undefined) {
        s[finfo.param] = clamp(s[finfo.param] + finfo.rate + gauss(0, finfo.noise),
          cfgs[finfo.param].min, cfgs[finfo.param].max);
      }
    } else {
      expired.push(fname);
    }
  }
  for (const f of expired) delete v.activeFaults[f];

  // ── Odometer ──
  v.odometer += v.speed * (2.0 / 3600.0);

  v.state = s;
  return v;
}

export function injectFault(v: SimVehicle, faultType: string) {
  const sig = FAULT_SIGNATURES[faultType];
  if (sig && v.state[sig.param] !== undefined) {
    v.activeFaults[faultType] = {
      param: sig.param, rate: sig.rate, noise: sig.noise,
      startTick: v.tickCount, duration: sig.ticks,
    };
  }
}

export function vehicleToData(v: SimVehicle): any {
  const subsystems: Record<string, Record<string, number>> = {};
  for (const [pName, val] of Object.entries(v.state)) {
    const sub = v.paramConfigs[pName]?.subsystem || 'other';
    if (!subsystems[sub]) subsystems[sub] = {};
    subsystems[sub][pName] = Math.round(val * 100) / 100;
  }
  const flatState: Record<string, number> = {};
  for (const [k, val] of Object.entries(v.state)) {
    flatState[k] = Math.round(val * 100) / 100;
  }
  return {
    id: v.id, timestamp: Date.now() / 1000, info: v.info,
    state: flatState, subsystems, paramConfigs: v.paramConfigs,
    subsystemWeights: v.subsystemWeights,
    odometer: Math.round(v.odometer * 10) / 10,
    rpm: Math.round(v.rpm), speed: Math.round(v.speed * 10) / 10,
    active_faults: Object.keys(v.activeFaults),
  };
}
