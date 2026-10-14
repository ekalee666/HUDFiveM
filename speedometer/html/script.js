/* ============================================
   FIRE SPEEDOMETER - FiveM Script
   ============================================ */

'use strict';

// ─── State ───────────────────────────────────────────────────────────────────
let currentUnit = 'KPH';
let currentSpeed = 0;
let currentSpeedMPH = 0;
let targetSpeed = 0;
let targetSpeedMPH = 0;
let animFrameId = null;

// ─── DOM References ───────────────────────────────────────────────────────────
const hud           = document.getElementById('hud');
const speedValue    = document.getElementById('speed-value');
const speedUnit     = document.getElementById('speed-unit');
const gearDisplay   = document.getElementById('gear-display');
const rpmFill       = document.getElementById('rpm-fill');
const arcFill       = document.getElementById('arc-fill');
const fuelBar       = document.getElementById('fuel-bar');
const fuelPct       = document.getElementById('fuel-pct');
const engineBar     = document.getElementById('engine-bar');
const enginePct     = document.getElementById('engine-pct');
const engineStatus  = document.getElementById('engine-status');
const engineText    = document.getElementById('engine-text');
const boostIndicator= document.getElementById('boost-indicator');

// ─── Arc Config ──────────────────────────────────────────────────────────────
// The arc path length (half-circle r=90, length ≈ 283)
const ARC_LENGTH = 283;

// ─── Unit Toggle ─────────────────────────────────────────────────────────────
function setUnit(unit) {
    currentUnit = unit;

    document.getElementById('btn-kph').classList.toggle('active', unit === 'KPH');
    document.getElementById('btn-mph').classList.toggle('active', unit === 'MPH');

    // Force immediate display update
    const spd = unit === 'KPH' ? Math.round(currentSpeed) : Math.round(currentSpeedMPH);
    speedValue.textContent = spd;
    speedUnit.textContent  = unit;
    updateSpeedColor(spd);
}

// ─── Speed Color ─────────────────────────────────────────────────────────────
function updateSpeedColor(spd) {
    speedValue.classList.remove('slow', 'medium', 'fast', 'max');
    const limit = currentUnit === 'KPH' ? 300 : 186;

    if (spd < limit * 0.3)       speedValue.classList.add('slow');
    else if (spd < limit * 0.6)  speedValue.classList.add('medium');
    else if (spd < limit * 0.85) speedValue.classList.add('fast');
    else                          speedValue.classList.add('max');
}

// ─── RPM Arc ─────────────────────────────────────────────────────────────────
function updateArc(rpmRatio) {
    // rpmRatio 0..1 → offset from ARC_LENGTH (full) down to 0 (empty)
    const offset = ARC_LENGTH - (rpmRatio * ARC_LENGTH);
    arcFill.style.strokeDashoffset = offset.toFixed(1);
}

// ─── Smooth Speed Animation ───────────────────────────────────────────────────
function animateSpeed() {
    const diff    = targetSpeed - currentSpeed;
    const diffMPH = targetSpeedMPH - currentSpeedMPH;

    if (Math.abs(diff) > 0.4) {
        currentSpeed    += diff * 0.18;
        currentSpeedMPH += diffMPH * 0.18;
    } else {
        currentSpeed    = targetSpeed;
        currentSpeedMPH = targetSpeedMPH;
    }

    const displaySpd = currentUnit === 'KPH'
        ? Math.round(currentSpeed)
        : Math.round(currentSpeedMPH);

    speedValue.textContent = displaySpd;
    updateSpeedColor(displaySpd);

    animFrameId = requestAnimationFrame(animateSpeed);
}

// ─── Update From Lua ──────────────────────────────────────────────────────────
function updateHUD(data) {
    // Speed
    targetSpeed    = data.speed    || 0;
    targetSpeedMPH = data.speedMPH || 0;

    // Gear (N for 0, R for reverse detection isn't native but show 0 as N)
    const gearNum = data.gear || 0;
    gearDisplay.textContent = gearNum === 0 ? 'N' : gearNum;

    // Gear glow color
    if (gearNum === 0) {
        gearDisplay.style.color      = '#66aaff';
        gearDisplay.style.textShadow = '0 0 10px #4488ff, 0 0 20px #2255cc';
    } else {
        gearDisplay.style.color      = '#ffcc00';
        gearDisplay.style.textShadow = '0 0 10px #ff6600, 0 0 20px #ff4400, 0 0 40px #ff2200';
    }

    // RPM
    const rpm = data.rpm || 0;
    rpmFill.style.height = (rpm * 100).toFixed(1) + '%';
    updateArc(rpm);

    // Fuel
    const fuel = Math.max(0, Math.min(100, data.fuel || 0));
    fuelBar.style.width   = fuel + '%';
    fuelPct.textContent   = fuel + '%';

    // Color fuel bar red when low
    if (fuel <= 15) {
        fuelBar.style.background = 'linear-gradient(90deg, #990000, #cc2200)';
        fuelBar.style.boxShadow  = '0 0 8px rgba(200,0,0,0.8)';
    } else if (fuel <= 30) {
        fuelBar.style.background = 'linear-gradient(90deg, #cc4400, #ff6600)';
        fuelBar.style.boxShadow  = '0 0 6px rgba(255,80,0,0.6)';
    } else {
        fuelBar.style.background = 'linear-gradient(90deg, #ff2200, #ff6600, #ffcc00)';
        fuelBar.style.boxShadow  = '0 0 6px rgba(255,100,0,0.7)';
    }

    // Engine Health
    const eng = Math.max(0, Math.min(100, data.engineHealth || 0));
    engineBar.style.width  = eng + '%';
    enginePct.textContent  = eng + '%';

    if (eng <= 25) {
        engineBar.style.background = 'linear-gradient(90deg, #880000, #bb0000)';
        engineBar.style.boxShadow  = '0 0 8px rgba(180,0,0,0.9)';
    } else if (eng <= 50) {
        engineBar.style.background = 'linear-gradient(90deg, #cc2200, #ff3300)';
        engineBar.style.boxShadow  = '0 0 6px rgba(220,40,0,0.7)';
    } else {
        engineBar.style.background = 'linear-gradient(90deg, #cc0000, #ff4400, #ff8800)';
        engineBar.style.boxShadow  = '0 0 6px rgba(255,60,0,0.7)';
    }

    // Engine On/Off
    if (data.engineOn) {
        engineStatus.className = 'status-dot on';
        engineText.className   = 'status-text on';
        engineText.textContent = 'ON';
    } else {
        engineStatus.className = 'status-dot off';
        engineText.className   = 'status-text off';
        engineText.textContent = 'OFF';
    }

    // Boost / Burnout
    if (data.boost) {
        boostIndicator.classList.add('active');
    } else {
        boostIndicator.classList.remove('active');
    }
}

// ─── Visibility ───────────────────────────────────────────────────────────────
function setVisible(visible) {
    if (visible) {
        hud.classList.remove('hidden');
        if (!animFrameId) animFrameId = requestAnimationFrame(animateSpeed);
    } else {
        hud.classList.add('hidden');
        if (animFrameId) {
            cancelAnimationFrame(animFrameId);
            animFrameId = null;
        }
        // Reset values
        targetSpeed = 0;
        targetSpeedMPH = 0;
    }
}

// ─── NUI Message Listener ─────────────────────────────────────────────────────
window.addEventListener('message', function(event) {
    const data = event.data;
    if (!data || !data.action) return;

    switch (data.action) {
        case 'setVisible':
            setVisible(data.value);
            break;
        case 'update':
            updateHUD(data);
            break;
    }
});

// ─── Dev Preview (disable in production) ─────────────────────────────────────
// Uncomment below to preview in browser without FiveM
/*
setVisible(true);
let previewSpeed = 0;
let previewDir   = 1;
setInterval(() => {
    previewSpeed += previewDir * 3;
    if (previewSpeed >= 240) previewDir = -1;
    if (previewSpeed <= 0)   previewDir = 1;
    updateHUD({
        speed: previewSpeed,
        speedMPH: Math.round(previewSpeed * 0.621),
        rpm: previewSpeed / 240,
        gear: Math.min(6, Math.floor(previewSpeed / 40) + 1),
        fuel: 72,
        engineHealth: 95,
        engineOn: true,
        boost: previewSpeed > 200
    });
}, 50);
*/
