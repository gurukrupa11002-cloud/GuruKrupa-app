// --- Supabase Initialization ---
const supabaseUrl = 'https://kqgtomdvgpiuvfuoiyjw.supabase.co'; 
const supabaseKey = 'sb_publishable_nQuk3NkG2oB2zESabijRMA_fGoOxgNT'; 
const supabaseClient = window.supabase.createClient(supabaseUrl, supabaseKey);

// --- Authentication Logic ---
document.addEventListener("DOMContentLoaded", () => {
    // Hide the main app container on load
    document.querySelector('.app-container').style.display = 'none';
    checkSession();
});

async function checkSession() {
    const { data: { session }, error } = await supabaseClient.auth.getSession();
    
    if (session) {
        // User is logged in! Hide the auth screen
        document.getElementById('authScreen').style.display = 'none';
        
        // Fetch their payment status from the profiles table
        const { data: profile, error: profileError } = await supabaseClient
            .from('profiles')
            .select('payment_status')
            .eq('id', session.user.id)
            .single();

        if (profile && profile.payment_status === 'cleared') {
            // Fully Unlocked - Show the workspace
            document.getElementById('paymentScreen').style.display = 'none';
            document.querySelector('.app-container').style.display = 'flex';
        } else {
            // Locked - Show the Payment Pending screen
            document.querySelector('.app-container').style.display = 'none';
            document.getElementById('paymentScreen').style.display = 'flex';
        }
    } else {
        // Not logged in, ensure auth screen is visible
        document.getElementById('authScreen').style.display = 'flex';
        document.getElementById('paymentScreen').style.display = 'none';
        document.querySelector('.app-container').style.display = 'none';
    }
}

async function handleSignUp() {
    const email = document.getElementById('emailInput').value;
    const password = document.getElementById('passwordInput').value;
    const msg = document.getElementById('authMessage');
    
    msg.style.color = "var(--text-muted)";
    msg.innerText = "Creating account...";
    
    const { data, error } = await supabaseClient.auth.signUp({ email, password });
    
    if (error) {
        msg.style.color = "var(--danger)";
        msg.innerText = error.message;
    } else {
        msg.style.color = "var(--accent-primary)";
        msg.innerText = "Account created! You can now log in.";
    }
}

async function handleLogin() {
    const email = document.getElementById('emailInput').value;
    const password = document.getElementById('passwordInput').value;
    const msg = document.getElementById('authMessage');
    
    msg.style.color = "var(--text-muted)";
    msg.innerText = "Logging in...";

    const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
    
    if (error) {
        msg.style.color = "var(--danger)";
        msg.innerText = error.message;
    } else {
        msg.innerText = "";
        checkSession(); // Refresh the UI to show the app
    }
}
async function handleLogout() {
    // Tell Supabase to destroy their secure session
    const { error } = await supabaseClient.auth.signOut();
    
    if (error) {
        alert("Error logging out: " + error.message);
    } else {
        // Refresh the page. Because they have no session, checkSession() will automatically kick them back to the login screen!
        window.location.reload(); 
    }
}
let projectWindows = []; 
let currentBoxes = []; 
let historyStack = [];
let currentLogoData = "logo.png";

document.addEventListener("DOMContentLoaded", () => {
    loadAutoSave();
});

// --- State Management ---
function saveHistory() { 
    historyStack.push(JSON.stringify(currentBoxes)); 
    if (historyStack.length > 50) historyStack.shift(); 
}

function undoAction() { 
    if (historyStack.length > 0) { 
        currentBoxes = JSON.parse(historyStack.pop()); 
        renderPartsUI(); 
        drawPreview(); 
    } 
}

window.addEventListener('keydown', (e) => { 
    if ((e.ctrlKey || e.metaKey) && e.key === 'z') { 
        e.preventDefault(); 
        undoAction(); 
    } 
});

// Input Handlers
function handleManualSeries(v) { document.getElementById('seriesManual').classList.toggle('hidden', v !== "MANUAL"); drawPreview(); }
function handleManualMesh(v) { document.getElementById('meshManual').classList.toggle('hidden', v !== "MANUAL"); drawPreview(); }

function handleLogoUpload(event) {
    let reader = new FileReader();
    reader.onload = function(e) { 
        currentLogoData = e.target.result; 
        document.getElementById('welcomeLogo').src = currentLogoData; 
        document.getElementById('headerLogo').src = currentLogoData; 
        document.getElementById('welcomeLogo').style.display = 'block'; 
        document.getElementById('headerLogo').style.display = 'block'; 
        renderProject(); 
    }
    reader.readAsDataURL(event.target.files[0]);
}

// Unit Conversions
function toBase(v, uO) { 
    let u = uO || document.getElementById('unit').value; 
    return u === "inch" ? v / 12 : (u === "mm" ? v / 304.8 : v); 
}
function fromBase(v, uO) { 
    let u = uO || document.getElementById('unit').value; 
    return u === "inch" ? v * 12 : (u === "mm" ? v * 304.8 : v); 
}

// Geometry Logic
function initBase() {
    let wR = parseFloat(document.getElementById('w').value) || 0; 
    let hR = parseFloat(document.getElementById('h').value) || 0;
    let w = toBase(wR); 
    let h = toBase(hR);
    
    if (w > 0 && h > 0) {
        if (currentBoxes.length === 0) { 
            currentBoxes = [{ id: Date.now(), x: 0, y: 0, w: w, h: h, type: 'sliding', p: 1, gBars: [{h:0, v:0}], doorType: '1L' }]; 
        } else { 
            let oW = currentBoxes.reduce((m, b) => Math.max(m, b.x + b.w), 0); 
            let oH = currentBoxes.reduce((m, b) => Math.max(m, b.y + b.h), 0); 
            let sW = w / oW, sH = h / oH; 
            currentBoxes.forEach(b => { b.x *= sW; b.y *= sH; b.w *= sW; b.h *= sH; }); 
        } 
        renderPartsUI(); 
        drawPreview();
    }
}

// Render Partition Editors
function renderPartsUI() {
    let html = "";
    currentBoxes.forEach((b, i) => {
        let gBarsHtml = ""; 
        for(let j=0; j<b.p; j++) { 
            let gb = b.gBars[j] || {h:0, v:0}; 
            gBarsHtml += `<div class="gbar-item"><span><b>P${j+1}</b></span> <div style="display:flex; gap:10px; align-items:center;"> H <input type="number" value="${gb.h}" onchange="updateGBar(${i},${j},'h',this.value)"> V <input type="number" value="${gb.v}" onchange="updateGBar(${i},${j},'v',this.value)"></div></div>`; 
        }

        let typeSelect = `<select onchange="updatePart(${i}, 'type', this.value)">
            <option value="sliding" ${b.type==='sliding'?'selected':''}>Sliding System</option>
            <option value="fixed" ${b.type==='fixed'?'selected':''}>Fixed Panel</option>
            <option value="door" ${b.type==='door'?'selected':''}>Door Entry</option>
            <option value="fan" ${b.type==='fan'?'selected':''}>Exhaust Cutout</option>
        </select>`;

        let extraSettings = "";
        if (b.type === 'door') {
            extraSettings = `<label style="margin:0;">Open:</label> <select onchange="updatePart(${i}, 'doorType', this.value)">
                <option value="1L" ${b.doorType==='1L'?'selected':''}>1 Left</option>
                <option value="1R" ${b.doorType==='1R'?'selected':''}>1 Right</option>
                <option value="double" ${b.doorType==='double'?'selected':''}>Double Door</option>
                <option value="tophung" ${b.doorType==='tophung'?'selected':''}>Top Hung</option>
            </select>`;
        } else if (b.type !== 'fan') {
            extraSettings = `<label style="margin:0;">Panels:</label> <input type="number" value="${b.p}" onchange="updatePart(${i}, 'p', this.value)">
                <button class="btn btn-micro" onclick="toggleGBar(${i})">Design Grid ⚙️</button>`;
        }

        html += `<div class="part-card">
            <div class="part-header">
                <span>Part ${i+1}</span>
                <span style="color:var(--text-muted); font-weight:500;">${fromBase(b.w).toFixed(2)} x ${fromBase(b.h).toFixed(2)}</span>
            </div>
            <div class="part-controls">
                <div class="part-actions">
                    <button class="btn btn-micro" onclick="splitH(${i})">✂️ Split Horiz</button>
                    <button class="btn btn-micro" onclick="splitV(${i})">✂️ Split Vert</button>
                    <button class="btn btn-micro" onclick="editPart(${i})">📐 Edit Dims</button>
                    <button class="btn btn-micro btn-micro-danger" onclick="deletePart(${i})">🗑️ Delete</button>
                </div>
                <div class="part-settings">
                    <label style="margin:0;">Type:</label> ${typeSelect} ${extraSettings}
                </div>
                <div id="gbar_${i}" class="gbar-container">
                    <div style="font-weight:600; margin-bottom:10px; display:flex; justify-content:space-between; font-size:12px;">
                        Internal Grid Design
                        <button class="btn btn-micro" onclick="applyGToAll(${i})">Sync All Panels</button>
                    </div>
                    ${gBarsHtml}
                </div>
            </div>
        </div>`;
    });
    
    document.getElementById('partsManager').innerHTML = html || `<div class="empty-state">
        <div class="empty-icon">📏</div>
        Input dimensions to initialize structural grid
    </div>`;
}

// Part Modifications
function toggleGBar(idx) { 
    let el = document.getElementById('gbar_'+idx); 
    el.style.display = (el.style.display === 'block') ? 'none' : 'block'; 
}

function updateGBar(pIdx, gIdx, field, val) { 
    saveHistory(); 
    if(!currentBoxes[pIdx].gBars[gIdx]) currentBoxes[pIdx].gBars[gIdx] = {h:0, v:0}; 
    currentBoxes[pIdx].gBars[gIdx][field] = parseInt(val) || 0; 
    drawPreview(); 
}

function applyGToAll(idx) { 
    saveHistory(); 
    let b = currentBoxes[idx]; 
    let first = b.gBars[0] || {h:0, v:0}; 
    for(let j=0; j<b.p; j++) b.gBars[j] = { ...first }; 
    renderPartsUI(); 
    drawPreview(); 
}

function splitH(idx) { 
    saveHistory(); 
    let b = currentBoxes[idx]; 
    let vR = parseFloat(prompt(`ENTER TOP HEIGHT:`)); 
    if (vR > 0 && toBase(vR) < b.h) { 
        let val = toBase(vR); 
        let pid = Date.now(); 
        currentBoxes.splice(idx, 1, 
            { ...b, id: pid, h: val, type: 'fixed', p: 1, gBars:[{h:0, v:0}], doorType:'1L' }, 
            { ...b, id: pid+1, y: b.y + val, h: b.h - val, p: 1, gBars:[{h:0, v:0}], doorType:'1L' }
        ); 
        renderPartsUI(); 
        drawPreview(); 
    } 
}

function splitV(idx) { 
    saveHistory(); 
    let b = currentBoxes[idx]; 
    let vR = parseFloat(prompt(`ENTER LEFT WIDTH:`)); 
    if (vR > 0 && toBase(vR) < b.w) { 
        let val = toBase(vR); 
        let pid = Date.now(); 
        currentBoxes.splice(idx, 1, 
            { ...b, id: pid, w: val, type: 'fixed', p: 1, gBars:[{h:0, v:0}], doorType:'1L' }, 
            { ...b, id: pid+1, x: b.x + val, w: b.w - val, p: 1, gBars:[{h:0, v:0}], doorType:'1L' }
        ); 
        renderPartsUI(); 
        drawPreview(); 
    } 
}

function editPart(idx) { 
    saveHistory(); 
    let b = currentBoxes[idx]; 
    let n = currentBoxes[idx + 1] || currentBoxes[idx - 1]; 
    if (!n) return alert("NO NEIGHBOR!"); 
    let iN = (currentBoxes[idx + 1] === n); 
    let axis = (b.y === n.y) ? 'V' : (b.x === n.x ? 'H' : null); 
    
    if (axis === 'V') { 
        let tW = fromBase(b.w + n.w); 
        let nR = parseFloat(prompt(`NEW WIDTH:`)); 
        if (nR > 0 && nR < tW) { 
            let nV = toBase(nR); 
            b.w = nV; n.w = toBase(tW) - nV; 
            if (iN) n.x = b.x + b.w; else b.x = n.x + n.w; 
        } 
    } else if (axis === 'H') { 
        let tH = fromBase(b.h + n.h); 
        let nR = parseFloat(prompt(`NEW HEIGHT:`)); 
        if (nR > 0 && nR < tH) { 
            let nV = toBase(nR); 
            b.h = nV; n.h = toBase(tH) - nV; 
            if (iN) n.y = b.y + b.h; else b.y = n.y + n.h; 
        } 
    } 
    renderPartsUI(); 
    drawPreview(); 
}

function deletePart(idx) { 
    if (currentBoxes.length <= 1) return alert("LAST PART!"); 
    saveHistory(); 
    let b = currentBoxes[idx]; 
    let nI = (idx > 0) ? idx - 1 : idx + 1; 
    let n = currentBoxes[nI]; 
    if (b.x === n.x && b.w === n.w) { 
        n.h += b.h; if (idx < nI) n.y = b.y; 
    } else if (b.y === n.y && b.h === n.h) { 
        n.w += b.w; if (idx < nI) n.x = b.x; 
    } 
    currentBoxes.splice(idx, 1); 
    renderPartsUI(); 
    drawPreview(); 
}

function updatePart(i, f, v) { 
    saveHistory(); 
    currentBoxes[i][f] = (f==='p') ? parseInt(v) : v; 
    if(f==='p') { 
        currentBoxes[i].gBars = Array.from({length: v}, () => ({h:0,v:0})); 
        renderPartsUI(); 
    } 
    if(f==='type') renderPartsUI(); 
    drawPreview(); 
}

// --- Canvas Drawing Logic ---
function drawTick(ctx, x, y, iV) { 
    ctx.beginPath(); 
    ctx.strokeStyle = "#334155"; 
    ctx.lineWidth = 1.5; 
    if(iV) { 
        ctx.moveTo(x-5, y); ctx.lineTo(x+5, y); 
    } else { 
        ctx.moveTo(x, y-5); ctx.lineTo(x, y+5); 
    } 
    ctx.stroke(); 
}

function wrapText(ctx, text, x, y, maxWidth, lineHeight) { 
    if(!text) return y; 
    let tS = text.toUpperCase(); 
    let cX = x; 
    let line = ""; 
    for (let i = 0; i < tS.length; i++) { 
        let char = tS[i]; 
        let tW = ctx.measureText(line + char).width; 
        if (cX + tW > x + maxWidth) { 
            ctx.fillText(line, cX, y); 
            y += lineHeight; 
            cX = x; 
            line = char; 
        } else { 
            line += char; 
        } 
    } 
    ctx.fillText(line, cX, y); 
    return y + lineHeight; 
}

function wrapSpecLine(ctx, label, value, x, y, maxWidth, lineHeight) {
    ctx.fillStyle = "#475569"; 
    ctx.font="600 11px Arial"; 
    let lblW = ctx.measureText(label).width; 
    ctx.fillText(label, x, y);
    
    if(!value) { 
        ctx.fillStyle = "#ef4444"; 
        ctx.font="600 11px Arial"; 
        ctx.fillText("PENDING", x + lblW, y); 
        return y + lineHeight; 
    } 
    
    ctx.fillStyle = "#0f172a"; 
    ctx.font="11px Arial"; 
    let valStr = value.toUpperCase(); 
    let cX = x + lblW; 
    let line = "";
    
    for (let i = 0; i < valStr.length; i++) { 
        let char = valStr[i]; 
        let tW = ctx.measureText(line + char).width; 
        if (cX + tW > x + maxWidth) { 
            ctx.fillText(line, cX, y); 
            y += lineHeight; 
            cX = x; 
            line = char; 
        } else { 
            line += char; 
        } 
    }
    ctx.fillText(line, cX, y); 
    return y + lineHeight;
}

function drawPreview() { 
    let d = { 
        w: parseFloat(document.getElementById("w").value)||0, 
        h: parseFloat(document.getElementById("h").value)||0, 
        unit: document.getElementById("unit").value, 
        tag: document.getElementById("winTag").value, 
        glass: document.getElementById("glassSpec").value, 
        color: document.getElementById("colorSpec").value, 
        lock: document.getElementById("lockSpec").value, 
        lockPos: document.getElementById("lockHSpec").value, 
        series: (document.getElementById("seriesSpec").value === "MANUAL" ? document.getElementById("seriesManual").value : document.getElementById("seriesSpec").value), 
        area: document.getElementById("areaSpec").value, 
        rate: document.getElementById("rateSpec").value, 
        mesh: (document.getElementById("meshSpec").value === "MANUAL" ? document.getElementById("meshManual").value : document.getElementById("meshSpec").value), 
        notes: document.getElementById("notes").value, 
        boxes: currentBoxes 
    }; 
    drawIndividual(document.getElementById("previewCanvas"), d, true); 
}

function drawIndividual(canvas, d, isP) {
    var ctx = canvas.getContext("2d"); 
    ctx.fillStyle = "white"; 
    ctx.fillRect(0,0, canvas.width, canvas.height); 
    
    if(d.w <= 0 || d.h <= 0 || d.boxes.length === 0) return;
    
    let wB = toBase(d.w, d.unit); 
    let hB = toBase(d.h, d.unit); 
    var scale = Math.min((canvas.width-80)/(wB*304.8), (canvas.height/2-80)/(hB*304.8)); 
    var x = 40, y = 80; 
    
    ctx.strokeStyle = "#0f172a"; 
    ctx.lineWidth = 1.5; 
    ctx.fillStyle = "#0f172a"; 
    ctx.font = "bold 11px Arial"; 
    ctx.textAlign = "center"; 
    let uL = (d.unit==="feet"?" FT":(d.unit==="inch"?"\"":" MM"));
    
    ctx.fillText(d.w.toFixed(2) + uL, x + (wB*304.8*scale)/2, y - 60); 
    ctx.beginPath(); ctx.moveTo(x, y-55); ctx.lineTo(x+(wB*304.8*scale), y-55); ctx.stroke(); 
    drawTick(ctx, x, y-55, false); drawTick(ctx, x+(wB*304.8*scale), y-55, false);
    
    ctx.save(); ctx.translate(x-30, y+(hB*304.8*scale)/2); ctx.rotate(-Math.PI/2); ctx.fillText(d.h.toFixed(2)+uL,0,0); ctx.restore(); 
    ctx.beginPath(); ctx.moveTo(x-25, y); ctx.lineTo(x-25, y+(hB*304.8*scale)); ctx.stroke(); 
    drawTick(ctx, x-25, y, true); drawTick(ctx, x-25, y+(hB*304.8*scale), true);
    
    let xs = [...new Set(d.boxes.map(b => b.x.toFixed(4)).concat(wB.toFixed(4)))].map(Number).sort((a,b)=>a-b); 
    let ys = [...new Set(d.boxes.map(b => b.y.toFixed(4)).concat(hB.toFixed(4)))].map(Number).sort((a,b)=>a-b);
    
    if(xs.length > 2) { 
        ctx.beginPath(); ctx.moveTo(x, y-25); ctx.lineTo(x+wB*304.8*scale, y-25); ctx.stroke(); 
        xs.forEach((v,i) => { 
            if(i<xs.length-1){ 
                let sw = fromBase(xs[i+1]-v, d.unit); 
                ctx.fillText(sw.toFixed(2)+uL, x+(v+(xs[i+1]-v)/2)*304.8*scale, y-30); 
                drawTick(ctx, x+v*304.8*scale, y-25, false); 
            } 
        }); 
        drawTick(ctx, x+wB*304.8*scale, y-25, false); 
    }
    
    if(ys.length > 2) { 
        ctx.beginPath(); ctx.moveTo(x-10, y); ctx.lineTo(x-10, y+hB*304.8*scale); ctx.stroke(); 
        ys.forEach((v,i) => { 
            if(i<ys.length-1){ 
                let sh = fromBase(ys[i+1]-v, d.unit); 
                ctx.save(); ctx.translate(x-15, y+(v+(ys[i+1]-v)/2)*304.8*scale); ctx.rotate(-Math.PI/2); ctx.fillText(sh.toFixed(2)+uL,0,0); ctx.restore(); 
                drawTick(ctx, x-10, y+v*304.8*scale, true); 
            } 
        }); 
        drawTick(ctx, x-10, y+hB*304.8*scale, true); 
    }
    
    d.boxes.forEach(b => {
        let bx = x+b.x*304.8*scale, by = y+b.y*304.8*scale, bw = b.w*304.8*scale, bh = b.h*304.8*scale; 
        ctx.strokeRect(bx, by, bw, bh); 
        let p = parseInt(b.p) || 1, pw = bw/p;
        
        for(let j=0; j<p; j++) { 
            let pX = bx + j*pw; 
            let gb = b.gBars[j] || {h:0, v:0}; 
            ctx.lineWidth = 0.5; ctx.strokeStyle = "#64748b"; 
            if(gb.h > 0) { for(let k=1; k<=gb.h; k++){ let gy = by+(bh/(gb.h+1))*k; ctx.beginPath(); ctx.moveTo(pX,gy); ctx.lineTo(pX+pw,gy); ctx.stroke(); } }
            if(gb.v > 0) { for(let k=1; k<=gb.v; k++){ let gx = pX+(pw/(gb.v+1))*k; ctx.beginPath(); ctx.moveTo(gx,by); ctx.lineTo(gx,by+bh); ctx.stroke(); } }
        } 
        
        ctx.lineWidth = 1.5; ctx.strokeStyle = "#0f172a"; 
        if (b.type === 'sliding' || b.type === 'fixed') {
            for(let i=1; i<p; i++){ ctx.beginPath(); ctx.moveTo(bx+pw*i, by); ctx.lineTo(bx+pw*i, by+bh); ctx.stroke(); }
            if (p > 1) { for(let j=0; j<p; j++) ctx.fillText(fromBase(b.w/p, d.unit).toFixed(2)+uL, bx+pw*j+pw/2, by+bh+15); } 
        }
        
        if (b.type === 'door') { 
            ctx.setLineDash([5, 5]); ctx.beginPath(); 
            if(b.doorType === 'double') { 
                let gap = 10; let pW = (bw - gap) / 2; 
                ctx.moveTo(bx, by); ctx.lineTo(bx+pW, by+bh/2); ctx.lineTo(bx, by+bh); 
                ctx.moveTo(bx+bw, by); ctx.lineTo(bx+bw-pW, by+bh/2); ctx.lineTo(bx+bw, by+bh); 
            } else if(b.doorType === '1L') { ctx.moveTo(bx, by); ctx.lineTo(bx+bw, by+bh/2); ctx.lineTo(bx, by+bh); 
            } else if(b.doorType === '1R') { ctx.moveTo(bx+bw, by); ctx.lineTo(bx, by+bh/2); ctx.lineTo(bx+bw, by+bh); 
            } else if(b.doorType === 'tophung') { ctx.moveTo(bx, by); ctx.lineTo(bx+bw/2, by+bh); ctx.lineTo(bx+bw, by); } 
            ctx.stroke(); ctx.setLineDash([]); 
        } else if (b.type === 'fan') { 
            let r = Math.min(bw, bh)*0.3; ctx.beginPath(); ctx.arc(bx+bw/2, by+bh/2, r, 0, 2*Math.PI); ctx.stroke(); 
            ctx.moveTo(bx+bw/2-r*0.7, by+bh/2-r*0.7); ctx.lineTo(bx+bw/2+r*0.7, by+bh/2+r*0.7); 
            ctx.moveTo(bx+bw/2+r*0.7, by+bh/2-r*0.7); ctx.lineTo(bx+bw/2-r*0.7, by+bh/2+r*0.7); ctx.stroke(); 
        }
    });
    
    ctx.textAlign="left"; ctx.font="bold 12px Arial"; 
    let sX = 15; let sY = y + hB*304.8*scale + 40; let mW = canvas.width - 30; 
    ctx.fillStyle = "#0f172a"; ctx.fillText("ASSET ID: ", sX, sY); 
    let idLW = ctx.measureText("ASSET ID: ").width; 
    
    if(!d.tag) { ctx.fillStyle = "#ef4444"; ctx.fillText("PENDING", sX + idLW, sY); 
    } else { ctx.fillStyle = "#4f46e5"; ctx.fillText(d.tag.toUpperCase(), sX + idLW, sY); }
    
    sY += 24; ctx.fillStyle = "#0f172a"; ctx.font="bold 11px Arial"; ctx.fillText("ENGINEERING SPECIFICATIONS:", sX, sY); sY += 16;
    
    // REDUCED SPEC ARRAY
    let sps = [
        {l:"SERIES SYSTEM: ", v:d.series}, {l:"GLASS: ", v:d.glass}, 
        {l:"COLOR: ", v:d.color}, {l:"LOCK TYPE: ", v:d.lock}, 
        {l:"LOCK POSITION: ", v:d.lockPos}, {l:"MESH OPTION: ", v:d.mesh}, 
        {l:"AREA (SQ.FT): ", v:d.area}, {l:"RATE / SQ.FT: ", v:d.rate}
    ];
    
    sps.forEach(s => { sY = wrapSpecLine(ctx, s.l, s.v, sX, sY, mW, 15); });
    
    if(d.notes) { 
        sY += 5;
        ctx.fillStyle = "#0f172a"; ctx.font="bold 11px Arial"; 
        ctx.fillText("NOTES: ", sX, sY); sY += 15; 
        ctx.font="11px Arial"; wrapText(ctx, d.notes, sX, sY, mW, 15); 
    }
}

// --- Data Saving & Flow Management ---
function addOrUpdateWindow() { 
    if(currentBoxes.length===0) return alert("ENTER SIZE"); 
    let d = { 
        w: parseFloat(document.getElementById("w").value), h: parseFloat(document.getElementById("h").value), unit: document.getElementById("unit").value, tag: document.getElementById("winTag").value, glass: document.getElementById("glassSpec").value, color: document.getElementById("colorSpec").value, lock: document.getElementById("lockSpec").value, lockPos: document.getElementById("lockHSpec").value, series: (document.getElementById("seriesSpec").value === "MANUAL" ? document.getElementById("seriesManual").value : document.getElementById("seriesSpec").value), 
        area: document.getElementById("areaSpec").value, 
        rate: document.getElementById("rateSpec").value, 
        mesh: (document.getElementById("meshSpec").value === "MANUAL" ? document.getElementById("meshManual").value : document.getElementById("meshSpec").value), notes: document.getElementById("notes").value, boxes: JSON.parse(JSON.stringify(currentBoxes)) 
    }; 
    let idx = parseInt(document.getElementById("editIndex").value); 
    if(idx === -1) projectWindows.push(d); else projectWindows[idx] = d; 
    
    renderProject(); clearAll(); 
}

function clearAll() { 
    document.getElementById("w").value = ""; document.getElementById("h").value = ""; document.getElementById("winTag").value = ""; document.getElementById("notes").value = ""; document.getElementById("glassSpec").value = ""; document.getElementById("colorSpec").value = ""; document.getElementById("lockSpec").value = ""; document.getElementById("lockHSpec").value = "CENTRE"; document.getElementById("seriesSpec").value = ""; document.getElementById("seriesManual").value = ""; document.getElementById("seriesManual").classList.add("hidden"); 
    
    document.getElementById("areaSpec").value = ""; 
    document.getElementById("rateSpec").value = ""; 
    
    document.getElementById("meshSpec").value = ""; document.getElementById("meshManual").value = ""; document.getElementById("meshManual").classList.add("hidden"); 
    
    currentBoxes = []; historyStack = []; 
    document.getElementById('partsManager').innerHTML = `<div class="empty-state"><div class="empty-icon">📏</div>Input dimensions to initialize structural grid</div>`; 
    document.getElementById("editIndex").value = "-1"; drawPreview(); 
}

function autoSave() { 
    localStorage.setItem('.pdf_autosave', JSON.stringify({ 
        client: document.getElementById("clientName").value, loc: document.getElementById("siteLoc").value, date: document.getElementById("projDate").value, welcome: document.getElementById("welcomeText").value, disclaimer: document.getElementById("disclaimerText").value, windows: projectWindows 
    })); 
}

function loadAutoSave() { 
    let s = localStorage.getItem('.pdf_autosave'); 
    if (s) { 
        let p = JSON.parse(s); 
        document.getElementById("clientName").value = p.client || ""; document.getElementById("siteLoc").value = p.loc || ""; document.getElementById("projDate").value = p.date || ""; document.getElementById("welcomeText").value = p.welcome || ""; document.getElementById("disclaimerText").value = p.disclaimer || ""; projectWindows = p.windows || []; renderProject(); 
    } 
}

function createNewProject() { 
    if (confirm("CLEAR CURRENT PROJECT AND START FRESH?")) { localStorage.removeItem('.pdf_autosave'); location.reload(); } 
}

function renderProject() {
    let hasW = projectWindows.length > 0;
    document.getElementById("welcomePage").style.display = hasW ? "block" : "none"; document.getElementById("drawingsTable").style.display = hasW ? "table" : "none";
    
    document.getElementById("printSite").innerText = (document.getElementById("siteLoc").value || "---").toUpperCase(); 
    document.getElementById("printDate").innerText = document.getElementById("projDate").value || "---"; 
    document.getElementById("printClientName").innerText = (document.getElementById("clientName").value || "---").toUpperCase();
    document.getElementById("printWelcomeLetter").innerText = document.getElementById("welcomeText").value.toUpperCase(); 
    document.getElementById("printDisclaimerText").innerText = document.getElementById("disclaimerText").value.toUpperCase();
    
    let l = document.getElementById("windowList"); l.innerHTML = "";
    
    projectWindows.forEach((win, i) => {
        let div = document.createElement("div"); div.className = "drawing-container";
        div.innerHTML = `<button class="copy-btn" onclick="copyWindow(${i})">COPY</button>
                         <button class="edit-btn-saved" onclick="editWindow(${i})">EDIT</button>
                         <button class="del-btn-saved" onclick="deleteSaved(${i})">X</button>`;
        let cvs = document.createElement("canvas"); cvs.width = 346; cvs.height = 650; 
        div.appendChild(cvs); l.appendChild(div); drawIndividual(cvs, win, false);
    }); 
    autoSave();
}

function deleteSaved(idx) { if(confirm("DELETE?")) { projectWindows.splice(idx,1); renderProject(); } }

function assignSpecValues(d) {
    let stdS = ["M PLUS 65", "M PLUS 16 SLIM", "M PRIME 55", "M PRIME 20 SLIM", "M PRO 50 TR", "M PRO 15 FB", ""]; 
    if (stdS.includes(d.series)) { document.getElementById("seriesSpec").value = d.series; document.getElementById("seriesManual").classList.add("hidden"); 
    } else { document.getElementById("seriesSpec").value = "MANUAL"; document.getElementById("seriesManual").value = d.series; document.getElementById("seriesManual").classList.remove("hidden"); } 
    
    let stdM = ["PLEATED INSIDE", "PLEATED OUTSIDE", "REGULAR", "NO MESH", ""]; 
    if (stdM.includes(d.mesh)) { document.getElementById("meshSpec").value = d.mesh; document.getElementById("meshManual").classList.add("hidden"); 
    } else { document.getElementById("meshSpec").value = "MANUAL"; document.getElementById("meshManual").value = d.mesh; document.getElementById("meshManual").classList.remove("hidden"); }
}

function copyWindow(i) { 
    let d = projectWindows[i]; document.getElementById("w").value = d.w; document.getElementById("h").value = d.h; document.getElementById("unit").value = d.unit; document.getElementById("winTag").value = d.tag + " (COPY)"; document.getElementById("glassSpec").value = d.glass || ""; document.getElementById("colorSpec").value = d.color || ""; document.getElementById("lockSpec").value = d.lock || ""; document.getElementById("lockHSpec").value = d.lockPos || "CENTRE"; assignSpecValues(d); 
    
    document.getElementById("areaSpec").value = d.area || ""; 
    document.getElementById("rateSpec").value = d.rate || ""; 
    
    document.getElementById("notes").value = d.notes; currentBoxes = JSON.parse(JSON.stringify(d.boxes)); document.getElementById("editIndex").value = "-1"; renderPartsUI(); drawPreview(); 
}

function editWindow(i) { 
    let d = projectWindows[i]; document.getElementById("w").value = d.w; document.getElementById("h").value = d.h; document.getElementById("unit").value = d.unit; document.getElementById("winTag").value = d.tag; document.getElementById("glassSpec").value = d.glass || ""; document.getElementById("colorSpec").value = d.color || ""; document.getElementById("lockSpec").value = d.lock || ""; document.getElementById("lockHSpec").value = d.lockPos || "CENTRE"; assignSpecValues(d); 
    
    document.getElementById("areaSpec").value = d.area || ""; 
    document.getElementById("rateSpec").value = d.rate || ""; 
    
    document.getElementById("notes").value = d.notes; currentBoxes = JSON.parse(JSON.stringify(d.boxes)); historyStack = []; document.getElementById("editIndex").value = i; renderPartsUI(); drawPreview(); 
}

function exportProjectFile() { 
    let pkg = { client: document.getElementById("clientName").value, loc: document.getElementById("siteLoc").value, date: document.getElementById("projDate").value, welcome: document.getElementById("welcomeText").value, disclaimer: document.getElementById("disclaimerText").value, windows: projectWindows }; let dl = document.createElement('a'); dl.setAttribute("href", "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(pkg))); dl.setAttribute("download", (document.getElementById("clientName").value || "PROJECT") + ".pdf"); dl.click(); 
}

function importProjectFile(event) { 
    let r = new FileReader(); r.onload = (e) => { let pkg = JSON.parse(e.target.result); document.getElementById("clientName").value = pkg.client || ""; document.getElementById("siteLoc").value = pkg.loc || ""; document.getElementById("projDate").value = pkg.date || ""; document.getElementById("welcomeText").value = pkg.welcome || ""; document.getElementById("disclaimerText").value = pkg.disclaimer || ""; projectWindows = pkg.windows; renderProject(); }; r.readAsText(event.target.files[0]); 
}