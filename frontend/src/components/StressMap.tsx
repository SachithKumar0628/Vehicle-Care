import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Polyline, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { useFleet } from '../App';

// Fix for default marker icons missing in Leaflet when bundled
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface StressMapProps {
    vehicleId: string;
}

// A realistic route simulating actual roads in Bangalore (MG Road / Cubbon Park area)
const BASE_ROUTE: [number, number][] = [
    [12.9738, 77.6119], // Trinity Metro
    [12.9734, 77.6083], // MG Road start
    [12.9731, 77.6046], // MG Road mid
    [12.9727, 77.6006], // MG Road Metro
    [12.9724, 77.5960], // Anil Kumble Circle
    [12.9750, 77.5954], // Queen's Road turn
    [12.9780, 77.5948], // Cantonment approach
    [12.9810, 77.5942],
    [12.9825, 77.5954], // Mount Carmel turn
    [12.9840, 77.5975], // High Grounds
    [12.9830, 77.6015], // Golf Course Road
    [12.9815, 77.6050], // Chalukya Circle
    [12.9790, 77.6075], // Race Course approach
    [12.9765, 77.6095], // St Marks Road
    // loops back to start roughly
];

interface PathSegment {
    positions: [number, number][];
    color: string;
}

function MapUpdater({ center }: { center: [number, number] }) {
    const map = useMap();
    useEffect(() => {
        map.setView(center);
    }, [center, map]);
    return null;
}

export default function StressMap({ vehicleId }: StressMapProps) {
    const { fleet, tickCount } = useFleet();
    const vehicle = fleet.find(v => v.id === vehicleId);
    const [segments, setSegments] = useState<PathSegment[]>([]);

    useEffect(() => {
        if (!vehicle || tickCount === 0) return;

        // Simulate movement along the route based on tickCount
        // We'll loop the route
        const pointIndex = tickCount % BASE_ROUTE.length;
        const currentLoc = BASE_ROUTE[pointIndex];

        // Determine stress color
        const score = vehicle.scoring?.overallScore || 100;
        const speed = vehicle.state?.speed || 0;
        const rpm = vehicle.state?.rpm || 0;

        let color = '#22c55e'; // Green (Smooth)
        if (score < 50 || speed > 110 || rpm > 4500) {
            color = '#ef4444'; // Red (High Strain)
        } else if (score < 75 || speed > 80) {
            color = '#f5a623'; // Orange (Moderate)
        }

        setSegments(prev => {
            if (prev.length === 0) {
                // Start the very first segment with the first two points so Polyline doesn't crash on 1 point
                return [{ positions: [BASE_ROUTE[0], currentLoc], color }];
            }

            const lastSegment = prev[prev.length - 1];
            const lastPoint = lastSegment.positions[lastSegment.positions.length - 1];

            // Prevent pushing identical consecutive points (happens in React strict mode)
            if (lastPoint[0] === currentLoc[0] && lastPoint[1] === currentLoc[1]) {
                return prev;
            }

            // If color is the same, just add point to current segment
            if (lastSegment.color === color) {
                const updatedSegment = { ...lastSegment, positions: [...lastSegment.positions, currentLoc] };
                return [...prev.slice(0, -1), updatedSegment];
            } else {
                // Start a new color segment, bridging from the last point so there are no gaps
                return [...prev, { positions: [lastPoint, currentLoc], color }];
            }
        });

    }, [tickCount, vehicle]);

    if (!vehicle) return null;

    const currentLoc = segments.length > 0
        ? segments[segments.length - 1].positions[segments[segments.length - 1].positions.length - 1]
        : BASE_ROUTE[0];

    return (
        <div style={{ height: '400px', width: '100%', minHeight: '400px', position: 'relative', zIndex: 0 }}>
            {tickCount === 0 && (
                <div style={{ position: 'absolute', inset: 0, zIndex: 400, background: 'rgba(255,255,255,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
                    <p style={{ background: '#1e293b', color: '#fff', padding: '8px 16px', borderRadius: 20, fontSize: 13, fontWeight: 700, boxShadow: '0 10px 25px rgba(0,0,0,0.2)' }}>
                        Press "Start Evaluation" to trace live route
                    </p>
                </div>
            )}
            <MapContainer center={currentLoc} zoom={15} style={{ height: '100%', width: '100%', borderRadius: '0 0 12px 12px' }}>
                <TileLayer
                    attribution='&copy; <a href="https://carto.com/">CartoDB</a>'
                    url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
                />
                <MapUpdater center={currentLoc} />

                {segments.map((seg, i) => (
                    seg.positions.length > 1 && (
                        <Polyline
                            key={i}
                            positions={seg.positions}
                            color={seg.color}
                            weight={6}
                            opacity={0.8}
                            lineCap="round"
                            lineJoin="round"
                        />
                    )
                ))}

                <Marker position={currentLoc}>
                    <Popup>
                        <div style={{ textAlign: 'center' }}>
                            <p style={{ fontWeight: 800, margin: 0 }}>{vehicle.info.name}</p>
                            <p style={{ margin: 0, color: '#64748b' }}>Speed: {Math.round(vehicle.state?.speed || 0)} km/h</p>
                        </div>
                    </Popup>
                </Marker>
            </MapContainer>
        </div>
    );
}
