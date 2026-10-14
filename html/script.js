/* =============================================
   FIRE SPEEDOMETER v2 — FiveM Script
   ============================================= */
'use strict';

// ─── Config ──────────────────────────────────────────────────────────────────
const RPM_ARC_LENGTH = 188.5; // circumference for r=30
const MAX_RPM_DISPLAY = 9000;

// ─── State ───────────────────────────────────────────────────────────────────
let unit         = 'MPH';
let curSpeed     = 0;
let curSpeedMPH  = 0;
let tgtSpeed     = 0;
let tgtSpeedMPH  = 0;
let odoMiles     = 0;
let rafId        = null;

// ─── DOM ─────────────────────────────────────────────────────────────────────
const hud         = document.getElementById('hud');
const speedEl     = document.getElementById('speed-val');
const gearEl      = document.getElementById('gear-val');
const rpmArc      = document.getElementById('rpm-arc');
const rpmValEl    = document.getElementById('rpm-val');
const fuelFill    = document.getElementById('fuel-fill');
const fuelPctEl   = document.getElementById('fuel-pct');
const healthFill  = document.getElementById('health-fill');
const healthPctEl = document.getElementById('health-pct');
const odoEl       = document.getElementById('odo-val');
const boostFlash  = document.getElementById('boost-flash');
const dotEngine   = document.getElementById('dot-engine');
const lblEngine   = document.getElementById('lbl-engine');
const btnMPH      = document.getElementById('btn-mph');
const btnKPH      = document.getElementById('btn-kph');

// ─── Unit Toggle ─────────────────────────────────────────────────────────────
function setUnit(u) {
    unit = u;
    btnMPH.classList.toggle('active', u === 'MPH');
    btnKPH.classList.toggle('active', u === 'KPH');
}

// ─── Speed Color ─────────────────────────────────────────────────────────────
function applySpeedColor(spd) {
    const max = unit === 'MPH' ? 180 : 290;
    speedEl.classList.remove('s-slow', 's-med', 's-fast', 's-max');
    if      (spd < max * 0.25) speedEl.classList.add('s-slow');
    else if (spd < max * 0.55) speedEl.classList.add('s-med');
    else if (spd < max * 0.80) speedEl.classList.add('s-fast');
    else                        speedEl.classList.add('s-max');
}

// ─── RPM Arc ─────────────────────────────────────────────────────────────────
function updateRpmArc(rpmRatio) {
    // 270deg sweep (75% of circle)
    const maxArc = RPM_ARC_LENGTH * 0.75;
    const offset = RPM_ARC_LENGTH - (rpmRatio * maxArc);
    rpmArc.style.strokeDashoffset = offset.toFixed(2);
}

// ─── Bar Helpers ─────────────────────────────────────────────────────────────
function updateBar(fillEl, pctEl, value, type) {
    const pct = Math.max(0, Math.min(100, value));
    fillEl.style.width = pct + '%';
    pctEl.textContent  = pct + '%';

    if (type === 'fuel') {
        if (pct <= 15) {
            fillEl.style.background = 'linear-gradient(90deg,#880000,#bb0000)';
            fillEl.style.boxShadow  = '0 0 8px rgba(180,0,0,0.9)';
        } else if (pct <= 30) {
            fillEl.style.background = 'linear-gradient(90deg,#cc3300,#ff5500)';
            fillEl.style.boxShadow  = '0 0 6px rgba(220,60,0,0.7)';
        } else {
            fillEl.style.background = 'linear-gradient(90deg,#ff2200,#ff6600,#ffcc00)';
            fillEl.style.boxShadow  = '0 0 6px rgba(255,100,0,0.7)';
        }
    } else {
        if (pct <= 25) {
            fillEl.style.background = 'linear-gradient(90deg,#770000,#aa0000)';
            fillEl.style.boxShadow  = '0 0 8px rgba(160,0,0,0.9)';
        } else if (pct <= 50) {
            fillEl.style.background = 'linear-gradient(90deg,#bb2200,#ee3300)';
            fillEl.style.boxShadow  = '0 0 6px rgba(200,30,0,0.7)';
        } else {
            fillEl.style.background = 'linear-gradient(90deg,#cc0000,#ff4400,#ff8800)';
            fillEl.style.boxShadow  = '0 0 6px rgba(255,60,0,0.7)';
        }
    }
}

// ─── Smooth Speed RAF ────────────────────────────────────────────────────────
function rafTick() {
    const diffKPH = tgtSpeed    - curSpeed;
    const diffMPH = tgtSpeedMPH - curSpeedMPH;

    if (Math.abs(diffKPH) > 0.5) {
        curSpeed    += diffKPH * 0.16;
        curSpeedMPH += diffMPH * 0.16;
    } else {
        curSpeed    = tgtSpeed;
        curSpeedMPH = tgtSpeedMPH;
    }

    const display = unit === 'MPH' ? Math.round(curSpeedMPH) : Math.round(curSpeed);
    speedEl.textContent = display;
    applySpeedColor(display);

    rafId = requestAnimationFrame(rafTick);
}

// ─── Main Update ─────────────────────────────────────────────────────────────
function updateHUD(d) {
    // Speed targets
    tgtSpeed    = d.speed    || 0;
    tgtSpeedMPH = d.speedMPH || 0;

    // Gear
    const g = d.gear || 0;
    gearEl.textContent = g === 0 ? 'N' : String(g);
    if (g === 0) {
        gearEl.style.color      = '#66aaff';
        gearEl.style.textShadow = '0 0 10px #4488ff,0 0 20px #2255cc';
    } else if (g >= 5) {
        gearEl.style.color      = '#ff4400';
        gearEl.style.textShadow = '0 0 10px #ff2200,0 0 22px #cc0000';
    } else {
        gearEl.style.color      = '#ffdd00';
        gearEl.style.textShadow = '0 0 10px #ff6600,0 0 22px #ff2200';
    }

    // RPM
    const rpm      = d.rpm || 0; // 0.0 - 1.0
    const rpmRaw   = Math.round(rpm * MAX_RPM_DISPLAY);
    updateRpmArc(rpm);
    rpmValEl.textContent = rpmRaw.toLocaleString() + ' RPM';

    // Fuel & Health
    updateBar(fuelFill,   fuelPctEl,   d.fuel         || 0, 'fuel');
    updateBar(healthFill, healthPctEl, d.engineHealth  || 0, 'health');

    // ODO (accumulate miles from speed)
    // odo is sent from server in miles if available, else we compute locally
    if (d.odo !== undefined) {
        odoMiles = d.odo;
    }
    odoEl.textContent = odoMiles.toFixed(1) + ' Miles';

    // Engine status
    if (d.engineOn) {
        dotEngine.style.background = '#22ff44';
        dotEngine.style.boxShadow  = '0 0 5px #00ff33';
        lblEngine.textContent      = 'ON';
        lblEngine.className        = 'lbl-val on';
    } else {
        dotEngine.style.background = '#ff2222';
        dotEngine.style.boxShadow  = '0 0 5px #cc0000';
        lblEngine.textContent      = 'OFF';
        lblEngine.className        = 'lbl-val off';
    }

    // Boost
    boostFlash.classList.toggle('active', !!d.boost);
}

// ─── Visibility ───────────────────────────────────────────────────────────────
function setVisible(v) {
    if (v) {
        hud.classList.remove('hidden');
        if (!rafId) rafId = requestAnimationFrame(rafTick);
    } else {
        hud.classList.add('hidden');
        if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
        tgtSpeed = 0; tgtSpeedMPH = 0;
    }
}

// ─── NUI Message ─────────────────────────────────────────────────────────────
window.addEventListener('message', function(e) {
    const d = e.data;
    if (!d || !d.action) return;
    if (d.action === 'setVisible') setVisible(d.value);
    if (d.action === 'update')     updateHUD(d);
});

// ─── ODO accumulator (client-side estimate) ──────────────────────────────────
// Runs every 1s, adds distance based on current KPH
setInterval(function() {
    if (!hud.classList.contains('hidden') && curSpeed > 2) {
        odoMiles += (curSpeed / 3600) * 0.621371; // km -> miles per second
    }
}, 1000);

// ─── Dev Preview ─────────────────────────────────────────────────────────────
// Auto-enables when opened directly in browser (not inside FiveM NUI)
if (typeof window.invokeNative === 'undefined') {
    setVisible(true);
    let ps = 0, dir = 1;
    setInterval(function() {
        ps += dir * 4;
        if (ps >= 260) dir = -1;
        if (ps <= 0)   dir =  1;
        updateHUD({
            speed:        ps,
            speedMPH:     Math.round(ps * 0.621),
            rpm:          Math.min(1, ps / 240),
            gear:         Math.min(6, Math.max(1, Math.floor(ps / 43))),
            fuel:         68,
            engineHealth: 92,
            engineOn:     true,
            boost:        ps > 230,
            odo:          372.1
        });
    }, 50);
}
