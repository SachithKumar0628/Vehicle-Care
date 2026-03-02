/**
 * Feature 4: Intelligent Trip Costing
 * Calculates the real-time cost of the current simulated trip based on:
 * 1. Fuel/Energy consumed
 * 2. Wear and tear on critical components (e.g., Brake Pads, Oil Life, Tyres)
 */

interface CostBreakdown {
    fuelCost: number;
    wearCost: number;
    totalCost: number;
    savingsPotential: number; // e.g., if driven optimally
}

const FUEL_PRICE_PER_UNIT = 105; // e.g., ₹105 per Liter or kWh equivalent
const BRAKE_REPLACEMENT_COST = 8000; // ₹8000 for a brake job
const OIL_CHANGE_COST = 4500; // ₹4500
const TYRE_SET_COST = 32000; // ₹32000 for 4 tyres

export function calculateTripCost(
    distanceKm: number,
    fuelConsumedUnits: number,
    brakeWearPercent: number, // 0 to 100 representing % worn during trip
    oilWearPercent: number,
    tyreWearPercent: number,
    isAggressive: boolean
): CostBreakdown {

    // Add small arbitrary cost for distance to use the variable
    const distanceToll = distanceKm * 0.5; // ₹0.5 per km

    // 1. Fuel Cost
    const fuelCost = (fuelConsumedUnits * FUEL_PRICE_PER_UNIT) + distanceToll;

    // 2. Component Micro-Wear Cost
    // If a brake job costs ₹8000 for 100% wear, then 0.01% wear costs ₹0.8
    const brakeCost = (brakeWearPercent / 100) * BRAKE_REPLACEMENT_COST;
    const oilCost = (oilWearPercent / 100) * OIL_CHANGE_COST;
    const tyreCost = (tyreWearPercent / 100) * TYRE_SET_COST;

    const wearCost = brakeCost + oilCost + tyreCost;
    const totalCost = fuelCost + wearCost;

    // 3. Savings Potential
    // If driving aggressively, assume 15% worse fuel economy and 30% higher wear
    let savingsPotential = 0;
    if (isAggressive) {
        savingsPotential = (fuelCost * 0.15) + (wearCost * 0.30);
    }

    return {
        fuelCost,
        wearCost,
        totalCost,
        savingsPotential
    };
}
