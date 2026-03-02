import React, { useState } from 'react';
import { useFleet } from '../App';
import { useParams, useNavigate } from 'react-router-dom';
import HealthRing from '../components/HealthRing';
import TrendChart from '../components/TrendChart';
import { getTier } from '../intelligence/scoring';
import { calculateTripCost } from '../intelligence/tripCosting';
import StressMap from '../components/StressMap';
import { ArrowLeft, Gauge, Activity, Wrench, Zap, AlertTriangle, TrendingDown, Settings, Battery, Disc, CircuitBoard, Wind, Cog, Car, Play, Calendar, IndianRupee, Download, Map } from 'lucide-react';

const SUBSYSTEM_ICONS: Record<string, React.ReactNode> = {
    engine: <Settings size={18} color="#f97316" />,
    brakes: <Disc size={18} color="#ef4444" />,
    transmission: <Cog size={18} color="#8b5cf6" />,
    electrical: <CircuitBoard size={18} color="#3478F6" />,
    tyres: <Car size={18} color="#64748b" />,
    emissions: <Wind size={18} color="#6b7280" />,
    ev_battery: <Battery size={18} color="#22c55e" />,
};

const SUBSYSTEM_LABELS: Record<string, string> = {
    engine: 'Engine', brakes: 'Brakes', transmission: 'Transmission', electrical: 'Electrical',
    tyres: 'Tyres', emissions: 'Emissions', ev_battery: 'EV Battery',
};

export default function VehicleDetailPage() {
    const { id } = useParams<{ id: string }>();
    const { fleet, sendCommand, evaluating, startEvaluation, tickCount } = useFleet();
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('general');

    const vehicle = fleet.find(v => v.id === id);

    if (!vehicle) {
        return (
            <div className="page" style={{ textAlign: 'center', paddingTop: 100 }}>
                <Car size={48} color="#cbd5e1" style={{ margin: '0 auto 12px' }} />
                <p style={{ fontSize: 16, fontWeight: 600, color: '#94a3b8' }}>Vehicle not found</p>
                <button onClick={() => navigate('/vehicles')} style={{ marginTop: 16, color: '#3478F6', background: 'none', border: 'none', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>Back to Vehicles</button>
            </div>
        );
    }

    const info = vehicle.info || {};
    const scoring = vehicle.scoring;
    const overallScore = scoring?.overallScore || 0;
    const subsystemScores = scoring?.subsystemScores || {};
    const paramScores = scoring?.paramScores || {};
    const paramConfigs = vehicle.paramConfigs || {};
    const state = vehicle.state || {};
    const alerts = vehicle.alerts || [];
    const anomalies = vehicle.anomalies || [];
    const rul = vehicle.rulEstimates || [];
    const recommendations = vehicle.recommendations || [];
    const tabs = ['General', 'Health', 'Charts', 'Insights', 'Map'];

    const getColor = (s: number) => {
        if (s >= 85) return '#22c55e';
        if (s >= 70) return '#3478F6';
        if (s >= 50) return '#F5A623';
        if (s >= 25) return '#f97316';
        return '#ef4444';
    };

    // Calculate Trip Cost
    const distanceKm = state.speed ? (state.speed * (tickCount * 2) / 3600) : 0;
    const energyConsumed = info.fuel_type === 'Electric'
        ? ((100 - (state.battery_soc || 100)) * 0.6) // Assume 60kWh battery
        : ((100 - (state.fuel_level || 100)) * 0.5); // Assume 50L tank

    // Calculate wear drops (starting from 100% optimal and degrading)
    const brakeWearPercent = 100 - (state.pad_wear || 100);
    const oilWearPercent = 100 - (state.oil_life || 100);
    const isAggressive = state.speed > 100 || (state.rpm > 4000);

    const tripCost = calculateTripCost(distanceKm, energyConsumed, brakeWearPercent, oilWearPercent, 0.01, isAggressive);

    // Feature 5: Service Handshake / Black Box JSON Export
    const downloadJobCard = () => {
        const jobCard = {
            timestamp: new Date().toISOString(),
            vehicle: info,
            health_summary: scoring,
            active_alerts: alerts,
            anomalies: anomalies,
            rul_estimates: rul,
            ai_recommendations: recommendations,
            black_box_snapshot: state // the frozen snapshot of current parameters
        };
        const blob = new Blob([JSON.stringify(jobCard, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `JobCard_${info.plate}_${new Date().getTime()}.json`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const paramsBySubsystem: Record<string, string[]> = {};
    for (const [pName, cfg] of Object.entries(paramConfigs)) {
        const sys = (cfg as any).subsystem;
        if (!paramsBySubsystem[sys]) paramsBySubsystem[sys] = [];
        paramsBySubsystem[sys].push(pName);
    }

    return (
        <div className="page" style={{ paddingBottom: 80, background: '#f5f6fa' }}>
            {/* Header */}
            <div style={{ background: '#fff', padding: '16px', borderRadius: 16, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
                <button onClick={() => navigate('/vehicles')} style={{ width: 36, height: 36, borderRadius: '50%', border: '1px solid #e8ecf1', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
                    <ArrowLeft size={18} color="#1e293b" />
                </button>
                <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 17, fontWeight: 700, color: '#1e293b' }}>{info.name}</p>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 2 }}>
                        <span style={{ fontSize: 11, fontWeight: 600, background: '#1e293b', color: '#fff', padding: '2px 8px', borderRadius: 6 }}>{info.plate}</span>
                        <span className={`badge ${overallScore >= 70 ? 'badge-success' : overallScore >= 50 ? 'badge-warning' : 'badge-danger'}`} style={{ fontSize: 10 }}>
                            {scoring?.tier || 'Loading...'}
                        </span>
                        {overallScore < 60 && (
                            <button onClick={downloadJobCard} style={{ display: 'flex', alignItems: 'center', gap: 4, background: '#ef4444', color: '#fff', border: 'none', padding: '2px 8px', borderRadius: 6, fontSize: 10, fontWeight: 700, cursor: 'pointer', animation: 'pulse 2s infinite' }}>
                                <Download size={10} /> BOOK SERVICE
                            </button>
                        )}
                    </div>
                </div>
                <div style={{ fontSize: 28, fontWeight: 800, color: getColor(overallScore) }}>{overallScore}%</div>
            </div>

            {/* Start Evaluation banner (only when not evaluating) */}
            {!evaluating && (
                <div style={{
                    background: 'linear-gradient(135deg, #22c55e, #16a34a)', borderRadius: 12, padding: '14px 20px',
                    marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    boxShadow: '0 4px 14px rgba(34,197,94,0.25)',
                }}>
                    <div>
                        <p style={{ color: '#fff', fontSize: 14, fontWeight: 700 }}>Evaluation not running</p>
                        <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: 12 }}>Start to see real-time data in graphs and insights</p>
                    </div>
                    <button onClick={startEvaluation} style={{
                        display: 'flex', alignItems: 'center', gap: 6,
                        padding: '10px 20px', borderRadius: 10, border: 'none',
                        background: '#fff', color: '#16a34a', fontSize: 14, fontWeight: 700, cursor: 'pointer',
                    }}>
                        <Play size={14} /> Start Evaluation
                    </button>
                </div>
            )}

            {/* Tab Bar */}
            <div className="tab-bar" style={{ marginBottom: 16 }}>
                {tabs.map(tab => (
                    <button key={tab} className={activeTab === tab.toLowerCase() ? 'active' : ''} onClick={() => setActiveTab(tab.toLowerCase())}>{tab}</button>
                ))}
            </div>

            {/* GENERAL TAB */}
            {activeTab === 'general' && (
                <div style={{ animation: 'fadeIn 0.3s ease-out' }}>
                    <div className="card-elevated" style={{ textAlign: 'center', marginBottom: 16 }}>
                        <HealthRing value={overallScore} />
                        <p style={{ fontSize: 16, fontWeight: 700, color: '#1e293b', marginTop: 4 }}>Overall condition</p>
                        <p style={{ fontSize: 13, color: '#94a3b8' }}>Last check: {new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                    </div>

                    <div className="responsive-grid-3" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 16 }}>
                        {Object.entries(subsystemScores).map(([sys, score]) => {
                            const tier = getTier(score);
                            return (
                                <div key={sys} className={`card ${score < 25 ? 'critical-glow' : ''}`} style={{ textAlign: 'center', padding: '14px 8px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 6 }}>
                                        {SUBSYSTEM_ICONS[sys] || <Settings size={18} color="#64748b" />}
                                    </div>
                                    <p style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>{SUBSYSTEM_LABELS[sys] || sys}</p>
                                    <p style={{ fontSize: 22, fontWeight: 800, color: tier.color, marginTop: 2 }}>{score}%</p>
                                    <div className="status-bar"><div className="status-bar-fill" style={{ width: `${Math.max(5, score)}%`, background: tier.color }} /></div>
                                </div>
                            );
                        })}
                    </div>

                    <div className="responsive-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                        <div className="card">
                            <p style={{ fontSize: 13, fontWeight: 700, color: '#64748b', marginBottom: 10 }}>Vehicle Info</p>
                            {[['Manufacturer', info.manufacturer], ['Model', info.model], ['Year', info.year], ['Fuel', info.fuel_type]].map(([label, val]) => (
                                <div key={label as string} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #f1f5f9' }}>
                                    <span style={{ fontSize: 12, color: '#94a3b8' }}>{label}</span>
                                    <span style={{ fontSize: 13, fontWeight: 600, color: '#1e293b' }}>{val}</span>
                                </div>
                            ))}
                        </div>
                        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                            <div style={{ textAlign: 'center' }}>
                                <Gauge size={24} color="#3478F6" style={{ margin: '0 auto 6px' }} />
                                <p style={{ fontSize: 20, fontWeight: 800, color: '#1e293b' }}>{vehicle.odometer?.toLocaleString()} km</p>
                                <p style={{ fontSize: 11, color: '#94a3b8' }}>Odometer</p>
                            </div>
                            <div style={{ textAlign: 'center' }}>
                                <Activity size={24} color="#3478F6" style={{ margin: '0 auto 6px' }} />
                                <p style={{ fontSize: 20, fontWeight: 800, color: '#1e293b' }}>{vehicle.speed} km/h</p>
                                <p style={{ fontSize: 11, color: '#94a3b8' }}>Current Speed</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* HEALTH TAB */}
            {activeTab === 'health' && (
                <div style={{ animation: 'fadeIn 0.3s ease-out' }}>
                    {Object.entries(paramsBySubsystem).map(([sys, params]) => (
                        <div key={sys} style={{ marginBottom: 20 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                                {SUBSYSTEM_ICONS[sys] || <Settings size={18} color="#64748b" />}
                                <h3 style={{ fontSize: 15, fontWeight: 700, color: '#1e293b' }}>{SUBSYSTEM_LABELS[sys] || sys}</h3>
                                <span style={{ marginLeft: 'auto', fontSize: 14, fontWeight: 700, color: getColor(subsystemScores[sys] || 0) }}>{subsystemScores[sys] || 0}%</span>
                            </div>
                            <div className="responsive-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                                {params.map(pName => {
                                    const cfg = paramConfigs[pName] || {} as any;
                                    const value = state[pName] ?? 0;
                                    const score = paramScores[pName] ?? 50;
                                    const color = getColor(score);

                                    // Feature 3: Digital Twin Fleet Benchmarking
                                    const otherVehicles = fleet.filter(v => v.id !== id && v.scoring?.paramScores && v.scoring.paramScores[pName] !== undefined);
                                    let fleetAvgScore = score;
                                    let hasFleetData = false;
                                    if (otherVehicles.length > 0) {
                                        fleetAvgScore = otherVehicles.reduce((acc, v) => acc + (v.scoring?.paramScores[pName] || 0), 0) / otherVehicles.length;
                                        hasFleetData = true;
                                    }

                                    return (
                                        <div key={pName} className={`card ${score < 25 ? 'critical-glow' : ''}`} style={{ position: 'relative', padding: '14px 12px' }}>
                                            <div style={{ position: 'absolute', top: 8, right: 8 }}>
                                                <span className={`status-dot ${score >= 80 ? 'status-dot-green' : score >= 50 ? 'status-dot-orange' : 'status-dot-red'}`}></span>
                                            </div>
                                            <p style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>{cfg.label || pName}</p>
                                            <p style={{ fontSize: 22, fontWeight: 800, color, marginTop: 4 }}>
                                                {typeof value === 'number' ? value.toFixed(1) : value}{cfg.unit ? ` ${cfg.unit}` : ''}
                                            </p>
                                            <p style={{ fontSize: 10, color: '#94a3b8', marginTop: 2 }}>
                                                Optimal: {cfg.optMin}–{cfg.optMax} {cfg.unit}
                                            </p>
                                            <div className="status-bar" style={{ position: 'relative' }}>
                                                <div className="status-bar-fill" style={{ width: `${Math.max(5, score)}%`, background: color }} />
                                                {/* Fleet Benchmarking "Ghost" Marker */}
                                                {hasFleetData && (
                                                    <div title={`Fleet Average Score: ${Math.round(fleetAvgScore)}%`} style={{
                                                        position: 'absolute',
                                                        left: `${Math.max(5, fleetAvgScore)}%`,
                                                        top: -2,
                                                        bottom: -2,
                                                        width: 3,
                                                        background: '#64748b',
                                                        borderRadius: 2,
                                                        border: '1px solid #fff',
                                                        boxShadow: '0 0 2px rgba(0,0,0,0.3)'
                                                    }} />
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ))}

                    {/* Fault Injection */}
                    <div className="card" style={{ marginTop: 8 }}>
                        <p style={{ fontSize: 13, fontWeight: 700, color: '#64748b', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                            <Wrench size={14} /> Inject Fault
                        </p>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                            {['brake_failure', 'overheating', 'tyre_slow_leak', 'tyre_blowout', 'oil_leak', 'battery_drain', 'trans_overheat',
                                ...(info.fuel_type === 'Electric' ? ['ev_cell_imbalance', 'ev_battery_drain'] : [])
                            ].map(fault => (
                                <button key={fault} onClick={() => sendCommand({ action: 'injectFault', vehicle_id: id, fault_type: fault })}
                                    style={{ padding: '7px 12px', borderRadius: 8, fontSize: 11, fontWeight: 600, background: '#fff8eb', border: '1px solid #fde68a', color: '#92400e', cursor: 'pointer', transition: 'all 0.2s' }}>
                                    {fault.replace(/_/g, ' ')}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* CHARTS TAB */}
            {activeTab === 'charts' && (
                <div style={{ animation: 'fadeIn 0.3s ease-out' }}>
                    {Object.entries(paramsBySubsystem).map(([sys, params]) => {
                        const paramLabels: Record<string, string> = {};
                        for (const p of params) paramLabels[p] = paramConfigs[p]?.label || p;
                        return (
                            <div key={sys} className="card" style={{ marginBottom: 16 }}>
                                <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                                    {SUBSYSTEM_ICONS[sys] || <Settings size={16} color="#64748b" />} {SUBSYSTEM_LABELS[sys] || sys}
                                </h3>
                                <TrendChart params={params} labels={paramLabels} height={180} />
                            </div>
                        );
                    })}
                </div>
            )}

            {/* INSIGHTS TAB */}
            {activeTab === 'insights' && (
                <div style={{ animation: 'fadeIn 0.3s ease-out' }}>
                    {/* Rule Engine Alerts */}
                    <div className="card" style={{ marginBottom: 16 }}>
                        <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                            <AlertTriangle size={16} color="#ef4444" /> Rule Alerts ({alerts.length})
                        </h3>
                        {alerts.length === 0 ? (
                            <p style={{ fontSize: 12, color: '#22c55e', fontWeight: 500 }}>No threshold violations</p>
                        ) : (
                            <div className="alert-feed" style={{ maxHeight: 200 }}>
                                {alerts.map((a, i) => (
                                    <div key={a.id || i} style={{
                                        padding: '8px 10px', borderRadius: 8, marginBottom: 6, fontSize: 12,
                                        background: a.severity === 'danger' ? '#fef2f2' : a.severity === 'critical' ? '#fff8eb' : '#f0f9ff',
                                        borderLeft: `3px solid ${a.severity === 'danger' ? '#ef4444' : a.severity === 'critical' ? '#F5A623' : '#3478F6'}`,
                                    }}>
                                        <p style={{ fontWeight: 600, color: '#1e293b' }}>{a.message}</p>
                                        <p style={{ color: '#94a3b8', fontSize: 10, marginTop: 2 }}>Value: {typeof a.value === 'number' ? a.value.toFixed(1) : a.value} | Threshold: {a.threshold}</p>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Anomaly Detection */}
                    <div className="card" style={{ marginBottom: 16 }}>
                        <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                            <Zap size={16} color="#F5A623" /> Anomaly Detection ({anomalies.length})
                        </h3>
                        {anomalies.length === 0 ? (
                            <p style={{ fontSize: 12, color: '#22c55e', fontWeight: 500 }}>No statistical anomalies</p>
                        ) : (
                            anomalies.map((a, i) => (
                                <div key={i} style={{ padding: '8px 10px', borderRadius: 8, marginBottom: 6, background: a.severity === 'extreme' ? '#fef2f2' : '#fff8eb', borderLeft: '3px solid #F5A623', fontSize: 12 }}>
                                    <p style={{ fontWeight: 600, color: '#1e293b' }}>{a.label}</p>
                                    <p style={{ color: '#64748b', marginTop: 2 }}>Z-Score: <strong>{a.zScore}</strong> | Value: {a.value} | Mean: {a.mean}</p>
                                </div>
                            ))
                        )}
                    </div>

                    {/* RUL Estimates */}
                    <div className="card" style={{ marginBottom: 16 }}>
                        <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                            <TrendingDown size={16} color="#3478F6" /> Remaining Useful Life
                        </h3>
                        <div className="responsive-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                            {rul.map(r => (
                                <div key={r.subsystem} style={{
                                    padding: '10px', borderRadius: 10, fontSize: 12,
                                    background: r.status === 'critical' ? '#fef2f2' : r.status === 'degrading' ? '#fff8eb' : '#f0fdf4',
                                    border: `1px solid ${r.status === 'critical' ? '#fecaca' : r.status === 'degrading' ? '#fde68a' : '#bbf7d0'}`,
                                }}>
                                    <p style={{ fontWeight: 600, marginBottom: 4 }}>{SUBSYSTEM_LABELS[r.subsystem] || r.subsystem}</p>
                                    <p style={{ fontWeight: 800, fontSize: 16, color: getColor(r.currentScore) }}>{r.currentScore}%</p>
                                    <p style={{ color: '#64748b', marginTop: 2 }}>
                                        {r.status === 'stable' ? 'Stable' :
                                            r.status === 'degrading' ? `~${r.ticksToFailure > 60 ? (r.daysToFailure + 'd') : (r.secondsToFailure + 's')} to fail` :
                                                'Critical now'}
                                    </p>
                                    <p style={{ color: '#94a3b8', fontSize: 10 }}>Slope: {r.slope}/tick</p>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Predictive Maintenance & Trip Costing (Phase 5) */}
                    <div className="responsive-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>

                        {/* 1. Predictive Maintenance Window */}
                        <div className="card">
                            <h3 style={{ fontSize: 13, fontWeight: 700, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6, color: '#1e293b' }}>
                                <Calendar size={16} color="#8b5cf6" /> Maintenance Window
                            </h3>
                            {rul.filter(r => r.status === 'degrading' || r.status === 'critical').length > 0 ? (
                                rul.filter(r => r.status === 'degrading' || r.status === 'critical').slice(0, 2).map((r, i) => {
                                    const failureDate = new Date();
                                    failureDate.setDate(failureDate.getDate() + (r.daysToFailure > 0 ? r.daysToFailure : 0));
                                    return (
                                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, paddingBottom: 8, borderBottom: i === 0 ? '1px dashed #e2e8f0' : 'none' }}>
                                            <div>
                                                <p style={{ fontSize: 12, fontWeight: 700 }}>{SUBSYSTEM_LABELS[r.subsystem] || r.subsystem}</p>
                                                <p style={{ fontSize: 10, color: '#ef4444', fontWeight: 600 }}>Fails around {failureDate.toLocaleDateString()}</p>
                                            </div>
                                            <div style={{ background: '#f3f4f6', padding: '6px 10px', borderRadius: 8, textAlign: 'center' }}>
                                                <p style={{ fontSize: 16, fontWeight: 800, color: '#1e293b' }}>{Math.ceil(r.daysToFailure)}</p>
                                                <p style={{ fontSize: 9, color: '#64748b', textTransform: 'uppercase' }}>Days left</p>
                                            </div>
                                        </div>
                                    )
                                })
                            ) : (
                                <div style={{ textAlign: 'center', padding: '10px 0' }}>
                                    <p style={{ fontSize: 12, color: '#22c55e', fontWeight: 600 }}>All systems optimal.</p>
                                    <p style={{ fontSize: 10, color: '#64748b', marginTop: 4 }}>No imminent service dates.</p>
                                </div>
                            )}
                        </div>

                        {/* 4. Intelligent Trip Costing */}
                        <div className="card">
                            <h3 style={{ fontSize: 13, fontWeight: 700, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6, color: '#1e293b' }}>
                                <IndianRupee size={16} color="#10b981" /> This Trip's Cost
                            </h3>
                            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, marginBottom: 8 }}>
                                <span style={{ fontSize: 28, fontWeight: 800, color: '#10b981', lineHeight: 1 }}>₹{tripCost.totalCost.toFixed(2)}</span>
                                <span style={{ fontSize: 11, color: '#64748b', marginBottom: 4 }}>/ {distanceKm.toFixed(1)} km</span>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 11, color: '#475569' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <span>Energy Burn:</span>
                                    <span style={{ fontWeight: 600 }}>₹{tripCost.fuelCost.toFixed(2)}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <span>Micro-wear (Brakes, Oil):</span>
                                    <span style={{ fontWeight: 600 }}>₹{tripCost.wearCost.toFixed(2)}</span>
                                </div>
                                {tripCost.savingsPotential > 0 && (
                                    <div style={{ marginTop: 6, padding: '6px 8px', background: '#dcfce7', borderRadius: 6, color: '#166534', fontWeight: 600, fontSize: 10 }}>
                                        Slow down to save ~₹{tripCost.savingsPotential.toFixed(2)} / hr
                                    </div>
                                )}
                            </div>
                        </div>

                    </div>

                    {/* AI Recommendations */}
                    <div className="card">
                        <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                            <Wrench size={16} color="#3478F6" /> AI Recommendations
                        </h3>
                        {recommendations.length === 0 ? (
                            <p style={{ fontSize: 12, color: '#22c55e', fontWeight: 500 }}>All systems healthy — no action needed</p>
                        ) : (
                            recommendations.map((rec, i) => (
                                <div key={i} style={{
                                    padding: '12px', borderRadius: 10, marginBottom: 8,
                                    background: rec.urgency === 'critical' ? '#fef2f2' : rec.urgency === 'high' ? '#fff8eb' : '#f8fafc',
                                    border: `1px solid ${rec.urgency === 'critical' ? '#fecaca' : rec.urgency === 'high' ? '#fde68a' : '#e8ecf1'}`,
                                }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 4 }}>
                                        <p style={{ fontSize: 14, fontWeight: 700, color: '#1e293b' }}>{rec.action}</p>
                                        <span className={`badge ${rec.urgency === 'critical' ? 'badge-danger' : rec.urgency === 'high' ? 'badge-warning' : 'badge-info'}`} style={{ fontSize: 10 }}>
                                            {rec.urgency.toUpperCase()}
                                        </span>
                                    </div>
                                    <p style={{ fontSize: 12, color: '#64748b', lineHeight: 1.5 }}>{rec.detail}</p>
                                    <div style={{ display: 'flex', gap: 16, marginTop: 8, fontSize: 11 }}>
                                        <span style={{ color: '#1e293b', fontWeight: 600 }}>{rec.estimatedCost}</span>
                                        <span style={{ color: '#64748b' }}>{rec.timeline}</span>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}

            {/* MAP TAB (Geofencing) */}
            {activeTab === 'map' && (
                <div style={{ animation: 'fadeIn 0.3s ease-out' }}>
                    <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                        <div style={{ padding: 16, borderBottom: '1px solid #e2e8f0' }}>
                            <h3 style={{ fontSize: 14, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
                                <Map size={16} color="#3478F6" /> Dynamic Stress Mapping
                            </h3>
                            <p style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>
                                Route traced dynamically. Red paths indicate severe stress/anomalies over the geofence.
                            </p>
                        </div>
                        <StressMap vehicleId={id || ''} />
                    </div>
                </div>
            )}
        </div>
    );
}
