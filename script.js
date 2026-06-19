// =============================================================
// HOME BUYING COST CALCULATOR — script.js
// =============================================================

// =============================================================
// STATE DATA TABLES
// All rates are approximate state averages. Users can edit them.
// =============================================================

// Effective annual property tax rate (% of home value)
// Source: Tax Foundation, 2024
const PROPERTY_TAX = {
    AL:0.41, AK:1.19, AZ:0.63, AR:0.62, CA:0.75, CO:0.54, CT:1.79, DE:0.57,
    FL:0.91, GA:0.91, HI:0.29, ID:0.64, IL:2.23, IN:0.87, IA:1.57, KS:1.41,
    KY:0.86, LA:0.55, ME:1.36, MD:1.09, MA:1.23, MI:1.54, MN:1.12, MS:0.81,
    MO:0.97, MT:0.84, NE:1.73, NV:0.59, NH:2.18, NJ:2.49, NM:0.80, NY:1.72,
    NC:0.84, ND:0.98, OH:1.59, OK:0.90, OR:0.97, PA:1.67, RI:1.63, SC:0.57,
    SD:1.31, TN:0.71, TX:1.80, UT:0.63, VT:1.90, VA:0.82, WA:0.98, WV:0.59,
    WI:1.76, WY:0.61, DC:0.56
};

// Average homeowners insurance (% of home value, annual)
// Source: ValuePenguin / NAIC, 2024
const INSURANCE = {
    AL:0.89, AK:0.48, AZ:0.50, AR:1.10, CA:0.55, CO:0.73, CT:0.60, DE:0.44,
    FL:1.31, GA:0.73, HI:0.34, ID:0.55, IL:0.73, IN:0.78, IA:0.80, KS:1.35,
    KY:0.82, LA:1.16, ME:0.60, MD:0.54, MA:0.68, MI:0.73, MN:0.85, MS:1.17,
    MO:1.07, MT:0.78, NE:1.32, NV:0.51, NH:0.55, NJ:0.65, NM:0.73, NY:0.65,
    NC:0.75, ND:1.04, OH:0.63, OK:1.59, OR:0.60, PA:0.60, RI:0.73, SC:0.88,
    SD:1.09, TN:0.82, TX:1.59, UT:0.55, VT:0.55, VA:0.60, WA:0.60, WV:0.65,
    WI:0.63, WY:0.75, DC:0.54
};

// Average utilities cost ($/sq-ft/month)
// Source: EIA residential energy survey, 2024
const UTILITIES = {
    AL:0.165, AK:0.210, AZ:0.165, AR:0.160, CA:0.195, CO:0.175, CT:0.215,
    DE:0.165, FL:0.185, GA:0.165, HI:0.220, ID:0.155, IL:0.185, IN:0.175,
    IA:0.185, KS:0.170, KY:0.165, LA:0.165, ME:0.215, MD:0.175, MA:0.220,
    MI:0.190, MN:0.195, MS:0.160, MO:0.175, MT:0.180, NE:0.175, NV:0.160,
    NH:0.215, NJ:0.200, NM:0.155, NY:0.215, NC:0.160, ND:0.180, OH:0.175,
    OK:0.160, OR:0.165, PA:0.185, RI:0.215, SC:0.160, SD:0.175, TN:0.165,
    TX:0.175, UT:0.160, VT:0.215, VA:0.170, WA:0.155, WV:0.175, WI:0.190,
    WY:0.175, DC:0.200
};

// Transfer tax rate by state (buyer's portion, % of sale price)
// Source: state revenue department websites, 2024
// Note: many counties/cities add additional taxes on top of these
const TRANSFER_TAX = {
    AL:0.05, AK:0.00, AZ:0.00, AR:0.33, CA:0.11, CO:0.01, CT:0.75, DE:1.50,
    FL:0.70, GA:0.10, HI:0.10, ID:0.00, IL:0.10, IN:0.00, IA:0.16, KS:0.00,
    KY:0.10, LA:0.00, ME:0.44, MD:0.50, MA:0.46, MI:0.75, MN:0.33, MS:0.00,
    MO:0.00, MT:0.00, NE:0.23, NV:0.26, NH:0.75, NJ:1.00, NM:0.00, NY:0.40,
    NC:0.20, ND:0.00, OH:0.10, OK:0.15, OR:0.10, PA:1.00, RI:0.46, SC:0.37,
    SD:0.10, TN:0.37, TX:0.00, UT:0.00, VT:1.25, VA:0.25, WA:1.28, WV:0.22,
    WI:0.30, WY:0.00, DC:1.10
};

// Default mortgage rates used when FRED API key is not set
const RATE_DEFAULTS = { 30: 6.99, 15: 6.30 };

// =============================================================
// OPTIONAL: ATTOM API FOR ADDRESS / PROPERTY LOOKUP
// 1. Sign up for a free trial at https://api.gateway.attomdata.com
// 2. Paste your API key below
// =============================================================
const ATTOM_API_KEY = '781294974224fc64dbb4d2df2fd04d32';

// =============================================================
// OPTIONAL: FRED API FOR LIVE MORTGAGE RATES
// 1. Sign up free at https://fredaccount.stlouisfed.org/login/secure/
//    (takes about 60 seconds — no credit card)
// 2. Go to My Account → API Keys → Request API Key
// 3. Paste your key between the quotes below
// =============================================================
const FRED_API_KEY = '0d79a05314816d5ffb7777564568e984';

// =============================================================
// APP STATE
// =============================================================
let dpMode      = 'pct';  // 'pct' or 'dollar'
let term        = 30;     // mortgage term in years
let ratesLocked = false;
let savedRates  = {};     // stores auto-fetched values for reset
let sqftLocked  = false;
let savedSqft   = null;

// Fields that get locked after auto-fill
const RATE_FIELDS = ['interest-rate', 'property-tax-rate', 'insurance-rate', 'utilities-rate'];

// =============================================================
// INIT — runs once when the page loads
// =============================================================
document.addEventListener('DOMContentLoaded', () => {

    const inputIds = [
        'home-value', 'dp-pct', 'dp-dollar', 'sqft', 'hoa',
        'interest-rate', 'property-tax-rate', 'insurance-rate', 'utilities-rate',
        'agent-fee', 'transfer-tax', 'title-insurance', 'origination-fee',
        'appraisal-fee', 'inspection-fee', 'recording-fee', 'other-closing'
    ];
    inputIds.forEach(id => {
        document.getElementById(id).addEventListener('input', calculate);
    });

    document.getElementById('zip').addEventListener('keydown', e => {
        if (e.key === 'Enter') handleZipLookup();
    });

    if (FRED_API_KEY) fetchMortgageRate(term);

    calculate();
});

// =============================================================
// ADDRESS / PROPERTY LOOKUP (ATTOM Data)
// Fetches estimated home value and square footage from public records.
// =============================================================
async function handleAddressLookup() {
    const addr1    = document.getElementById('addr1').value.trim();
    const addr2    = document.getElementById('addr2').value.trim();
    const resultEl = document.getElementById('addr-result');
    const errorEl  = document.getElementById('addr-error');
    const btn      = document.getElementById('addr-btn');

    resultEl.style.display = 'none';
    errorEl.style.display  = 'none';

    if (!addr1 || !addr2) {
        errorEl.textContent   = 'Enter both a street address and city/state/ZIP.';
        errorEl.style.display = 'block';
        return;
    }

    if (!ATTOM_API_KEY) {
        errorEl.textContent   = 'Add your ATTOM API key to script.js to enable address lookup.';
        errorEl.style.display = 'block';
        return;
    }

    btn.textContent = '…';
    btn.disabled    = true;

    const base    = 'https://api.gateway.attomdata.com/propertyapi/v1.0.0';
    const params  = `address1=${encodeURIComponent(addr1)}&address2=${encodeURIComponent(addr2)}`;
    const headers = { 'apikey': ATTOM_API_KEY, 'accept': 'application/json' };

    try {
        // Fetch property detail and AVM simultaneously
        const [detailRes, avmRes] = await Promise.allSettled([
            fetch(`${base}/property/detail?${params}`,    { headers }),
            fetch(`${base}/property/avmdetail?${params}`, { headers })
        ]);

        // Parse detail (building size, address, assessed value)
        let sqft = 0, assessedValue = 0, zip = '', displayAddr = '';
        if (detailRes.status === 'fulfilled' && detailRes.value.ok) {
            const d    = await detailRes.value.json();
            const prop = d.property?.[0];
            if (prop) {
                sqft          = prop.building?.size?.universalsize || prop.building?.size?.grosssize || 0;
                assessedValue = prop.assessment?.assessed?.assdttlvalue || 0;
                zip           = prop.address?.postal1 || '';
                displayAddr   = prop.address?.oneLine || `${addr1}, ${addr2}`;
            }
        }

        // Parse AVM (estimated market value — better than assessed value when available)
        let avmValue = 0, avmLow = 0, avmHigh = 0;
        if (avmRes.status === 'fulfilled' && avmRes.value.ok) {
            const d    = await avmRes.value.json();
            const prop = d.property?.[0];
            if (prop) {
                avmValue = prop.avm?.amount?.value || 0;
                avmLow   = prop.avm?.amount?.low   || 0;
                avmHigh  = prop.avm?.amount?.high  || 0;
            }
        }

        if (!sqft && !avmValue && !assessedValue) throw new Error('No data returned');

        // Populate fields — prefer AVM over assessed value
        const homeValue = avmValue || assessedValue;
        if (homeValue) document.getElementById('home-value').value = homeValue;
        if (sqft) {
            document.getElementById('sqft').value = sqft;
            lockSqft();
        }

        // Auto-trigger ZIP lookup to fill market rates
        if (zip) {
            document.getElementById('zip').value = zip;
            await handleZipLookup();
        }

        // Build result message
        const valueLabel = avmValue
            ? `Est. value: ${money(avmValue)}${avmLow ? ` (range: ${money(avmLow)}–${money(avmHigh)})` : ''}`
            : assessedValue
                ? `Assessed value: ${money(assessedValue)} — market value may differ`
                : `Enter home value manually`;

        resultEl.innerHTML = `✓ ${displayAddr}<br><small style="opacity:0.85">${valueLabel}${sqft ? ` · ${sqft.toLocaleString()} sq ft` : ''}</small>`;
        resultEl.style.display = 'block';

        calculate();

    } catch (err) {
        errorEl.textContent   = 'Property not found. Check the address and try again.';
        errorEl.style.display = 'block';
        console.error('ATTOM lookup error:', err);
    } finally {
        btn.textContent = 'Look Up';
        btn.disabled    = false;
    }
}

// =============================================================
// ZIP CODE LOOKUP
// Uses zippopotam.us — free, no API key needed
// =============================================================
async function handleZipLookup() {
    const zip      = document.getElementById('zip').value.trim();
    const errorEl  = document.getElementById('zip-error');
    const locEl    = document.getElementById('location-display');
    const btn      = document.getElementById('zip-btn');

    errorEl.style.display = 'none';
    locEl.style.display   = 'none';

    if (!/^\d{5}$/.test(zip)) {
        errorEl.textContent = 'Enter a valid 5-digit ZIP code.';
        errorEl.style.display = 'block';
        return;
    }

    btn.textContent = '…';
    btn.disabled    = true;

    try {
        const res  = await fetch(`https://api.zippopotam.us/us/${zip}`);
        if (!res.ok) throw new Error('Not found');

        const data  = await res.json();
        const city  = data.places[0]['place name'];
        const state = data.places[0]['state abbreviation'];

        locEl.textContent   = `📍 ${city}, ${state}`;
        locEl.style.display = 'block';

        if (PROPERTY_TAX[state])
            document.getElementById('property-tax-rate').value = PROPERTY_TAX[state];
        if (INSURANCE[state])
            document.getElementById('insurance-rate').value = INSURANCE[state];
        if (UTILITIES[state])
            document.getElementById('utilities-rate').value = UTILITIES[state].toFixed(3);

        if (TRANSFER_TAX[state] !== undefined)
            document.getElementById('transfer-tax').value = TRANSFER_TAX[state];

        if (FRED_API_KEY) fetchMortgageRate(term);

        lockRates();
        calculate();

    } catch {
        errorEl.textContent  = 'ZIP code not found. Double-check the number.';
        errorEl.style.display = 'block';
    } finally {
        btn.textContent = 'Look Up';
        btn.disabled    = false;
    }
}

// =============================================================
// FRED API — Live Mortgage Rate
// FRED doesn't send CORS headers for browser requests, so we
// route through allorigins.win (a public CORS proxy).
// =============================================================
async function fetchMortgageRate(years) {
    if (!FRED_API_KEY) return;

    const seriesId = years === 30 ? 'MORTGAGE30US' : 'MORTGAGE15US';
    const fredUrl  = `https://api.stlouisfed.org/fred/series/observations`
                   + `?series_id=${seriesId}&api_key=${FRED_API_KEY}`
                   + `&file_type=json&limit=1&sort_order=desc`;
    const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(fredUrl)}`;

    try {
        const res   = await fetch(proxyUrl);
        const outer = await res.json();
        const data  = JSON.parse(outer.contents);
        const rate  = parseFloat(data.observations[0].value);
        if (!isNaN(rate)) {
            document.getElementById('interest-rate').value = rate.toFixed(2);
            savedRates['interest-rate'] = rate.toFixed(2);
            calculate();
        }
    } catch (err) {
        console.warn('FRED rate fetch failed:', err);
    }
}

// =============================================================
// CLOSING COSTS TOGGLE
// =============================================================
function toggleClosing() {
    const items = document.getElementById('closing-items');
    const icon  = document.getElementById('closing-icon');
    const isOpen = items.classList.contains('open');
    items.classList.toggle('open', !isOpen);
    icon.classList.toggle('open', !isOpen);
}

// =============================================================
// RATE FIELD LOCKING
// =============================================================
function lockRates() {
    ratesLocked = true;

    RATE_FIELDS.forEach(id => {
        const input = document.getElementById(id);
        savedRates[id] = input.value;
        input.setAttribute('readonly', true);
        input.closest('.input-wrap').classList.add('locked');
    });

    const btn = document.getElementById('rates-override-btn');
    btn.style.display = 'inline-block';
    btn.textContent   = '✏️ Override';
    btn.classList.remove('unlocked');

    document.getElementById('rates-note').textContent =
        'Rates locked to auto-filled values. Click Override to edit manually.';
}

function toggleRatesLock() {
    if (ratesLocked) {
        // Unlock for manual editing
        ratesLocked = false;
        RATE_FIELDS.forEach(id => {
            const input = document.getElementById(id);
            input.removeAttribute('readonly');
            input.closest('.input-wrap').classList.remove('locked');
        });

        const btn = document.getElementById('rates-override-btn');
        btn.textContent = '↩ Reset to auto';
        btn.classList.add('unlocked');

        document.getElementById('rates-note').textContent =
            'Editing manually. Click "Reset to auto" to restore fetched values.';
    } else {
        // Re-lock and restore saved values
        RATE_FIELDS.forEach(id => {
            if (savedRates[id] !== undefined) {
                document.getElementById(id).value = savedRates[id];
            }
        });
        lockRates();
        calculate();
    }
}

// =============================================================
// SQFT LOCKING (set after ATTOM address lookup)
// =============================================================
function lockSqft() {
    sqftLocked = true;
    savedSqft  = document.getElementById('sqft').value;

    const input = document.getElementById('sqft');
    input.setAttribute('readonly', true);
    document.getElementById('sqft-wrap').classList.add('locked');

    const btn = document.getElementById('sqft-override-btn');
    btn.style.display = 'inline-block';
    btn.textContent   = '✏️ Override';
    btn.classList.remove('unlocked');

    document.getElementById('sqft-source').style.display = 'block';
}

function toggleSqftLock() {
    const input = document.getElementById('sqft');
    const btn   = document.getElementById('sqft-override-btn');

    if (sqftLocked) {
        sqftLocked = false;
        input.removeAttribute('readonly');
        document.getElementById('sqft-wrap').classList.remove('locked');
        btn.textContent = '↩ Reset to auto';
        btn.classList.add('unlocked');
        document.getElementById('sqft-source').textContent = '📐 Editing manually — ATTOM value was ' + Number(savedSqft).toLocaleString() + ' sq ft';
    } else {
        sqftLocked = true;
        input.value = savedSqft;
        input.setAttribute('readonly', true);
        document.getElementById('sqft-wrap').classList.add('locked');
        btn.textContent = '✏️ Override';
        btn.classList.remove('unlocked');
        document.getElementById('sqft-source').textContent = '📐 From ATTOM property records';
        calculate();
    }
}

// =============================================================
// DOWN PAYMENT MODE TOGGLE
// =============================================================
function setDPMode(mode) {
    dpMode = mode;
    document.getElementById('dp-pct-btn').classList.toggle('active', mode === 'pct');
    document.getElementById('dp-dollar-btn').classList.toggle('active', mode === 'dollar');
    document.getElementById('dp-pct-wrap').style.display    = mode === 'pct'    ? 'flex' : 'none';
    document.getElementById('dp-dollar-wrap').style.display = mode === 'dollar' ? 'flex' : 'none';
    calculate();
}

// =============================================================
// TERM TOGGLE (30yr / 15yr)
// =============================================================
function setTerm(years) {
    term = years;
    document.getElementById('term-30-btn').classList.toggle('active', years === 30);
    document.getElementById('term-15-btn').classList.toggle('active', years === 15);
    document.getElementById('r-term-label').textContent = years;

    document.getElementById('rate-link').href = years === 30
        ? 'https://fred.stlouisfed.org/series/MORTGAGE30US'
        : 'https://fred.stlouisfed.org/series/MORTGAGE15US';

    if (FRED_API_KEY) {
        fetchMortgageRate(years);
    } else {
        document.getElementById('interest-rate').value = RATE_DEFAULTS[years];
    }

    calculate();
}

// =============================================================
// CORE CALCULATION
// =============================================================
function calculate() {

    const homeValue    = num('home-value');
    const sqft         = num('sqft');
    const hoa          = num('hoa');
    const interestRate = num('interest-rate')      / 100;
    const taxRate      = num('property-tax-rate')  / 100;
    const insRate      = num('insurance-rate')     / 100;
    const utilRate     = num('utilities-rate');

    // Down payment
    let downPayment, downPct;
    if (dpMode === 'pct') {
        downPct     = num('dp-pct') / 100;
        downPayment = homeValue * downPct;
    } else {
        downPayment = num('dp-dollar');
        downPct     = homeValue > 0 ? downPayment / homeValue : 0;
    }

    // Update preview
    const preview = document.getElementById('dp-preview');
    if (dpMode === 'pct') {
        preview.textContent = `= ${money(downPayment)} (${percent(downPct)})`;
    } else {
        preview.textContent = `= ${percent(downPct)} of home value`;
    }

    // PMI required when down payment < 20%
    const needsPMI  = downPct < 0.20;
    document.getElementById('pmi-warning').style.display = needsPMI ? 'block' : 'none';
    document.getElementById('pmi-line').style.display    = needsPMI ? 'flex'  : 'none';

    // Loan fundamentals
    const loanAmount = homeValue - downPayment;

    // Closing costs — itemized
    const agentFee       = homeValue   * (num('agent-fee')       / 100);
    const transferTax    = homeValue   * (num('transfer-tax')    / 100);
    const titleIns       = homeValue   * (num('title-insurance') / 100);
    const originationFee = loanAmount  * (num('origination-fee') / 100);
    const appraisalFee   = num('appraisal-fee');
    const inspectionFee  = num('inspection-fee');
    const recordingFee   = num('recording-fee');
    const otherClosing   = num('other-closing');

    const closingCosts = agentFee + transferTax + titleIns + originationFee + appraisalFee + inspectionFee + recordingFee + otherClosing;
    const closingPct   = homeValue > 0 ? (closingCosts / homeValue * 100) : 0;
    const cashToClose  = downPayment + closingCosts;

    // Monthly mortgage — standard amortization formula
    // M = P × [r(1+r)^n] / [(1+r)^n − 1]
    const r = interestRate / 12;
    const n = term * 12;
    let monthlyMortgage = 0;
    if (r > 0 && loanAmount > 0) {
        const factor = Math.pow(1 + r, n);
        monthlyMortgage = loanAmount * (r * factor) / (factor - 1);
    } else if (loanAmount > 0) {
        monthlyMortgage = loanAmount / n;
    }

    // Additional monthly costs
    const monthlyTax       = (homeValue * taxRate)  / 12;
    const monthlyIns       = (homeValue * insRate)  / 12;
    const monthlyPMI       = needsPMI ? (homeValue * 0.01) / 12 : 0;
    const monthlyUtilities = sqft * utilRate;

    // Totals
    const totalMonthly  = monthlyMortgage + monthlyTax + monthlyIns + monthlyPMI + monthlyUtilities + hoa;
    const totalInterest = (monthlyMortgage * n) - loanAmount;
    const totalCost     = loanAmount + (totalInterest > 0 ? totalInterest : 0) + downPayment;

    document.getElementById('hoa-line').style.display = hoa > 0 ? 'flex' : 'none';

    // Update mobile sticky bar
    set('mobile-r-total',    money(totalMonthly));
    set('mobile-r-mortgage', money(monthlyMortgage));

    // Update results
    set('r-total',         money(totalMonthly));
    set('r-mortgage',      money(monthlyMortgage));
    set('r-tax',           money(monthlyTax));
    set('r-insurance',     money(monthlyIns));
    set('r-pmi',           money(monthlyPMI));
    set('r-utilities',     money(monthlyUtilities));
    set('r-hoa',           money(hoa));
    set('r-monthly-total', money(totalMonthly));

    // Closing cost item amounts
    set('r-agent-fee',       money(agentFee));
    set('r-transfer-tax',    money(transferTax));
    set('r-title-insurance', money(titleIns));
    set('r-origination-fee', money(originationFee));
    set('r-appraisal-fee',   money(appraisalFee));
    set('r-inspection-fee',  money(inspectionFee));
    set('r-recording-fee',   money(recordingFee));
    set('r-other-closing',   money(otherClosing));
    set('r-closing-total',   money(closingCosts));

    // Closing summary preview (shown in collapsed header)
    document.getElementById('closing-summary').textContent =
        `${money(closingCosts)} (${closingPct.toFixed(1)}%)`;

    set('r-down',              money(downPayment));
    set('r-closing-pct-label', closingPct.toFixed(1));
    set('r-closing',           money(closingCosts));
    set('r-cash-close',        money(cashToClose));

    set('r-loan',          money(loanAmount));
    set('r-interest',      money(totalInterest > 0 ? totalInterest : 0));
    set('r-total-cost',    money(totalCost));
}

// =============================================================
// HELPERS
// =============================================================
function num(id) {
    return parseFloat(document.getElementById(id).value) || 0;
}

function set(id, value) {
    document.getElementById(id).textContent = value;
}

function money(n) {
    if (!isFinite(n) || n < 0) return '$—';
    return '$' + Math.round(n).toLocaleString('en-US');
}

function percent(n) {
    if (!isFinite(n)) return '—';
    return (n * 100).toFixed(1) + '%';
}
