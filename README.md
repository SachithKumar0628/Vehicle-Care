# AutoIntel - Adaptive Vehicle Health Intelligence Platform

A comprehensive, real-time vehicle simulation and fleet monitoring platform. AutoIntel utilizes physics-based telemetry generation, live Websocket broadcasting, and a modern React dashboard to assess vehicle health, inject faults, and detect engine anomalies dynamically.

## Project Structure

- `/backend` — FastAPI server handling REST endpoints, WebSocket connections for live telemetry, and routing commands to the simulator.
- `/simulator` — Python-based vehicle telemetry engine. Simulates realistic vehicle physics for Engine, Brakes, Transmission, Tyres, and EV Batteries, including correlated thermodynamic physics and fault injection behavior.
- `/frontend` — React/Vite web application. Provides a responsive, mobile-first dashboard with real-time SVG charts, health scoring, the rule engine evaluation feed, and AI Insights. 

## Requirements

### Backend Requirements:
- Python 3.9+
- Run `pip install -r requirements.txt` to install FastAPI, Uvicorn, WebSockets, and NumPy.

### Frontend Requirements:
- Node.js 18+
- Run `npm install` inside the `frontend/` directory to install React, Vite, Tailwind CSS, Lucide icons, and Recharts.

## How to Run

1. **Start the Backend Engine & API Server:**
   From the project root directory, run:
   ```bash
   python -m uvicorn backend.main:app --reload --port 8000
   ```

2. **Start the Frontend Application:**
   Open a second terminal, navigate to the frontend folder, and start Vite:
   ```bash
   cd frontend
   npm run dev
   ```

3. **Log In:**
   - Open `http://localhost:5174` in your browser.
   - Enter Phone Number: `9876543210`
   - Request OTP.
   - Enter OTP: `1111`
   - Click Verify.

## Features

- **Start Evaluation Mode:** Press "Start Evaluation" on the Home page to begin streaming active data from the physics simulator.
- **Physics-based Anomaly Generation:** Employs Box-Muller Gaussian noise and thermodynamic limits to produce accurate sensor drift.
- **Rule Engine Alerts:** Hard-coded rule evaluation detects parameter threshold violations (e.g., Brake Pad < 15%, Oil Temp > 115°C) in real-time.
- **Dynamic Fault Injection:** Click "Inject Fault" in the Vehicle Details Health tab to artificially apply severe faults (e.g., Coolant Leak, Alternator Failure) and watch the simulation dynamically drop parameter scores.
