// --- Supabase Initialization ---
const supabaseUrl = 'https://kqgtomdvgpiuvfuoiyjw.supabase.co'; 
const supabaseKey = 'sb_publishable_nQuk3NkG2oB2zESabijRMA_fGoOxgNT'; 
const supabaseClient = window.supabase.createClient(supabaseUrl, supabaseKey);

let currentCloudProjectId = null; 

// --- SAFE DOM HELPERS (Prevents Crashes) ---
const getVal = (id) => document.getElementById(id) ? document.getElementById(id).value : "";
const setVal = (id, val) => { if(document.getElementById(id)) document.getElementById(id).value = val; };
const setDisplay = (id, val) => { if(document.getElementById(id)) document.getElementById(id).style.display = val; };
const setText = (id, val) => { if(document.getElementById(id)) document.getElementById(id).innerText = val; };

// --- Authentication & Initialization Logic ---
document.addEventListener("DOMContentLoaded", () => {
    const appContainer = document.querySelector('.app-container');
    if (appContainer) appContainer.style.display = 'none';
    loadBranding(); 
    checkSession();
});

// --- Fetch and Apply Global Branding ---
async function loadBranding() {
    const { data, error } = await supabaseClient.from('app_settings').select('*').eq('id', 1).single();
    
    if (data && !error) {
        const name = data.company_name;
        
        if(document.getElementById('pageTitle')) document.getElementById('pageTitle').innerText = `${name} - Premium Engineering Studio`;
        if(document.getElementById('heroBrandName')) document.getElementById('heroBrandName').innerText = name;
        if(document.getElementById('navBrandName')) document.getElementById('navBrandName').innerText = name;
        if(document.getElementById('companyName')) document.getElementById('companyName').value = name;
        
        const welcomeEl = document.getElementById('welcomeText');
        if(welcomeEl && welcomeEl.value.includes('SMG Infosolutions')) {
            welcomeEl.value = welcomeEl.value.replace(/SMG Infosolutions/g, name);
        }

        if(data.logo_data) {
            currentLogoData = data.logo_data; 
            
            const pl = document.getElementById('printLogo');
            if(pl) { pl.src = data.logo_data; pl.style.display = 'block'; }

            const topBarIcon = document.querySelector('.top-bar .brand-icon');
            if (topBarIcon) {
                topBarIcon.innerHTML = `<img src="${data.logo_data}" style="width: 100%; height: 100%; object-fit: contain;">`;
                topBarIcon.style.background = 'transparent';
                topBarIcon.style.padding = '0';
                topBarIcon.style.width = '35px';
                topBarIcon.style.height = '35px';
            }

            const loginIcon = document.querySelector('.brand-icon-large');
            if (loginIcon) {
                loginIcon.innerHTML = `<img src="${data.logo_data}" style="width: 100%; height: 100%; object-fit: contain;">`;
                loginIcon.style.background = 'transparent';
                loginIcon.style.padding = '0';
                loginIcon.style.width = '80px';
                loginIcon.style.height = '80px';
            }
        }
    }
}

function toggleAuthMode(mode) {
    const msg = document.getElementById('authMessage');
    if(msg) msg.innerText = ""; 
    
    const emailInput = document.getElementById('emailInput');

    if (mode === 'signup') {
        setText('authTitle', 'Create Account');
        if(document.getElementById('authSubtitle')) document.getElementById('authSubtitle').innerHTML = 'Enter your details to register';
        setDisplay('signupFields', 'block');
        setDisplay('passwordWrapper', 'block');
        if(emailInput) emailInput.style.display = 'block';
        
        setDisplay('loginBtn', 'none');
        setDisplay('resetBtn', 'none');
        setDisplay('signupBtn', 'block');
        
        setDisplay('toggleSignUpText', 'none');
        setDisplay('toggleForgotText', 'none');
        setDisplay('toggleLoginText', 'block');
    } 
    else if (mode === 'reset') {
        setText('authTitle', 'Reset Password');
        if(document.getElementById('authSubtitle')) document.getElementById('authSubtitle').innerHTML = 'Email services are disabled for this workspace.<br><br><span style="color: var(--brand-dark); font-weight: 600;">Please contact your System Administrator to obtain a new temporary password.</span>';
        
        setDisplay('signupFields', 'none');
        setDisplay('passwordWrapper', 'none');
        if(emailInput) emailInput.style.display = 'none'; 
        
        setDisplay('loginBtn', 'none');
        setDisplay('signupBtn', 'none');
        setDisplay('resetBtn', 'none'); 
        
        setDisplay('toggleForgotText', 'none');
        setDisplay('toggleSignUpText', 'none');
        setDisplay('toggleLoginText', 'block');
    } 
    else {
        setText('authTitle', 'Welcome Back');
        if(document.getElementById('authSubtitle')) document.getElementById('authSubtitle').innerHTML = 'Sign in to access your workspace';
        setDisplay('signupFields', 'none');
        setDisplay('passwordWrapper', 'block');
        if(emailInput) emailInput.style.display = 'block';
        
        setDisplay('resetBtn', 'none');
        setDisplay('signupBtn', 'none');
        setDisplay('loginBtn', 'block');
        
        setDisplay('toggleLoginText', 'none');
        setDisplay('toggleForgotText', 'block');
        setDisplay('toggleSignUpText', 'block');
    }
}

async function checkSession() {
    const { data: { session }, error } = await supabaseClient.auth.getSession();
    
    if (session) {
        setDisplay('authScreen', 'none');
        
        const { data: profile } = await supabaseClient
            .from('profiles')
            .select('payment_status, subscription_end_date')
            .eq('id', session.user.id)
            .single();

        if (profile && profile.payment_status === 'cleared') {
            
            let today = new Date();
            today.setHours(0, 0, 0, 0); 
            
            let endDate = profile.subscription_end_date ? new Date(profile.subscription_end_date) : null;
            
            if (endDate) {
                endDate.setHours(0, 0, 0, 0);
                if (today > endDate) {
                    const appCont = document.querySelector('.app-container');
                    if(appCont) appCont.style.display = 'none';
                    setDisplay('paymentScreen', 'flex');
                    await supabaseClient.from('profiles').update({ payment_status: 'pending' }).eq('id', session.user.id);
                    return; 
                }
            }

            setDisplay('paymentScreen', 'none');
            const appCont = document.querySelector('.app-container');
            if(appCont) appCont.style.display = 'flex';
            
            if (endDate) {
                let diffTime = endDate - today;
                let diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                
                if (diffDays <= 7 && diffDays >= 0) {
                    showExpiryWarning(diffDays, endDate.toLocaleDateString());
                } else {
                    let existingBanner = document.getElementById('expiry-banner');
                    if (existingBanner) existingBanner.remove();
                }
            }

        } else {
            const appCont = document.querySelector('.app-container');
            if(appCont) appCont.style.display = 'none';
            setDisplay('paymentScreen', 'flex');
        }
    } else {
        setDisplay('authScreen', 'flex');
        setDisplay('paymentScreen', 'none');
        const appCont = document.querySelector('.app-container');
        if(appCont) appCont.style.display = 'none';
    }
}

function showExpiryWarning(daysLeft, dateStr) {
    let existingBanner = document.getElementById('expiry-banner');
    if (!existingBanner) {
        let banner = document.createElement('div');
        banner.id = 'expiry-banner';
        banner.style.cssText = 'background-color: #fef08a; color: #854d0e; padding: 10px; text-align: center; font-family: "Poppins", sans-serif; font-size: 13px; font-weight: 600; border-bottom: 2px solid #eab308; width: 100%; z-index: 9999; position: relative;';
        document.body.insertBefore(banner, document.body.firstChild);
        existingBanner = banner;
    }
    let timeText = daysLeft === 0 ? "TODAY" : `in ${daysLeft} days`;
    existingBanner.innerHTML = `⚠️ <strong>Action Required:</strong> Your subscription expires ${timeText} (${dateStr}). Please arrange payment to avoid service interruption.`;
}

async function handleSignUp() {
    const email = getVal('emailInput');
    const password = getVal('passwordInput');
    const name = getVal('regName');
    const phone = getVal('regPhone');
    const address = getVal('regAddress');
    const msg = document.getElementById('authMessage');
    
    if(!email || !password || !name || !phone || !address) {
        if(msg) { msg.style.color = "var(--danger)"; msg.innerText = "Please fill in all fields."; }
        return;
    }
    
    if(msg) { msg.style.color = "var(--text-muted)"; msg.innerText = "Creating account..."; }
    
    const { data, error } = await supabaseClient.auth.signUp({ email, password });
    
    if (error) { 
        if(msg) { msg.style.color = "var(--danger)"; msg.innerText = error.message; }
    } else { 
        if(data.user) {
            await supabaseClient.from('profiles').upsert({
                id: data.user.id, email: email, full_name: name, phone: phone, address: address, role: 'client', payment_status: 'pending'
            });
        }
        if(msg) { msg.style.color = "var(--accent-primary)"; msg.innerText = "Account created! You can now log in."; }
        toggleAuthMode('login'); 
    }
}

async function handleLogin() {
    const email = getVal('emailInput');
    const password = getVal('passwordInput');
    const msg = document.getElementById('authMessage');
    if(msg) { msg.style.color = "var(--text-muted)"; msg.innerText = "Logging in..."; }

    const { error } = await supabaseClient.auth.signInWithPassword({ email, password });
    if (error) { if(msg) { msg.style.color = "var(--danger)"; msg.innerText = error.message; } } 
    else { if(msg) msg.innerText = ""; checkSession(); }
}

async function handleLogout() {
    await supabaseClient.auth.signOut();
    window.location.reload(); 
}

async function handlePasswordReset() {
    alert("Email services are disabled. Please contact the administrator.");
}

async function saveNewPassword() {
    const newPassword = getVal('newPasswordInput');
    const msg = document.getElementById('updateMsg');
    if (!newPassword || newPassword.length < 6) { if(msg) msg.innerText = "Password must be at least 6 characters."; return; }
    if(msg) { msg.style.color = "var(--text-muted)"; msg.innerText = "Saving..."; }
    const { error } = await supabaseClient.auth.updateUser({ password: newPassword });
    if (error) { if(msg) { msg.style.color = "var(--danger)"; msg.innerText = error.message; } } else { alert("Password updated successfully!"); window.location.reload(); }
}

// --- CLOUD SYNCHRONIZATION LOGIC ---
async function saveProjectToCloud() {
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (!session) return alert("You must be logged in to save.");

    const payload = {
        user_id: session.user.id,
        client_name: getVal("clientName") || "Untitled Client",
        site_location: getVal("siteLoc"),
        project_date: getVal("projDate"),
        welcome_text: getVal("welcomeText"),
        disclaimer_text: getVal("disclaimerText"),
        windows_data: projectWindows 
    };

    const btn = document.querySelector('.global-actions button:first-child');
    let originalText = "☁️ Save to Cloud";
    if(btn) { originalText = btn.innerText; btn.innerText = "☁️ Saving..."; }

    let errorObj = null;

    if (currentCloudProjectId) {
        const { error } = await supabaseClient.from('quotations').update(payload).eq('id', currentCloudProjectId);
        errorObj = error;
    } else {
        const { data, error } = await supabaseClient.from('quotations').insert([payload]).select();
        errorObj = error;
        if (data && data.length > 0) currentCloudProjectId = data[0].id;
    }

    if (errorObj) {
        alert("Failed to save to cloud: " + errorObj.message);
    } else {
        if(btn) { btn.innerText = "✅ Saved!"; setTimeout(() => btn.innerText = originalText, 2000); }
    }
}

async function openCloudBrowser() {
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (!session) return;

    setDisplay('cloudBrowser', 'flex');
    const list = document.getElementById('cloudProjectList');
    if(list) list.innerHTML = "<p style='text-align:center;'>Fetching your projects...</p>";

    const { data: projects, error } = await supabaseClient
        .from('quotations')
        .select('id, client_name, site_location, project_date, created_at')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false });

    if(!list) return;
    if (error) { list.innerHTML = `<p style='color:red;'>Error loading projects: ${error.message}</p>`; return; }
    if (projects.length === 0) { list.innerHTML = "<p style='text-align:center;'>No projects found in the cloud.</p>"; return; }

    list.innerHTML = "";
    projects.forEach(p => {
        const dateStr = new Date(p.created_at).toLocaleDateString();
        const div = document.createElement('div');
        div.style.cssText = "padding: 15px; border: 1px solid var(--border-color); border-radius: var(--radius-sm); display: flex; justify-content: space-between; align-items: center; background: #f8fafc;";
        div.innerHTML = `
            <div>
                <h4 style="margin: 0 0 5px 0; color: var(--brand-dark);">${p.client_name}</h4>
                <p style="margin: 0; font-size: 11px; color: var(--text-muted);">Site: ${p.site_location || 'N/A'} | Saved: ${dateStr}</p>
            </div>
            <button class="btn btn-primary" style="background: var(--accent-primary); color: white;" onclick="loadSpecificProject('${p.id}')">Load Data</button>
        `;
        list.appendChild(div);
    });
}

async function loadSpecificProject(projectId) {
    const list = document.getElementById('cloudProjectList');
    if(list) list.innerHTML = "<p style='text-align:center;'>Downloading project data...</p>";
    
    const { data, error } = await supabaseClient.from('quotations').select('*').eq('id', projectId).single();
    if (error) { alert("Error loading project: " + error.message); return; }

    currentCloudProjectId = data.id;
    setVal("clientName", data.client_name || "");
    setVal("siteLoc", data.site_location || "");
    setVal("projDate", data.project_date || "");
    setVal("welcomeText", data.welcome_text || "");
    setVal("disclaimerText", data.disclaimer_text || "");
    
    projectWindows = data.windows_data || [];
    renderProject();
    setDisplay('cloudBrowser', 'none');
}

function createNewProject() { 
    if (confirm("START FRESH? This will clear the screen (make sure you saved first!).")) { 
        currentCloudProjectId = null;
        projectWindows = [];
        clearAll();
        setVal("clientName", "");
        setVal("siteLoc", "");
        renderProject();
    } 
}

// --- Quotation Maker Core Logic ---
let projectWindows = []; let currentBoxes = []; let historyStack = []; let currentLogoData = "logo.png";
function saveHistory() { historyStack.push(JSON.stringify(currentBoxes)); if (historyStack.length > 50) historyStack.shift(); }
function undoAction() { if (historyStack.length > 0) { currentBoxes = JSON.parse(historyStack.pop()); renderPartsUI(); drawPreview(); } }
function handleManualSeries(v) { const el = document.getElementById('seriesManual'); if(el) el.classList.toggle('hidden', v !== "MANUAL"); drawPreview(); }
function handleManualMesh(v) { const el = document.getElementById('meshManual'); if(el) el.classList.toggle('hidden', v !== "MANUAL"); drawPreview(); }

function handleLogoUpload(event) {
    let reader = new FileReader();
    reader.onload = function(e) { 
        currentLogoData = e.target.result; 
        const pl = document.getElementById('printLogo');
        if(pl) { pl.src = currentLogoData; pl.style.display = 'block'; }
        renderProject(); 
    }
    if(event.target.files.length > 0) reader.readAsDataURL(event.target.files[0]);
}

function toBase(v, uO) { let u = uO || getVal('unit') || "feet"; return u === "inch" ? v / 12 : (u === "mm" ? v / 304.8 : v); }
function fromBase(v, uO) { let u = uO || getVal('unit') || "feet"; return u === "inch" ? v * 12 : (u === "mm" ? v * 304.8 : v); }

function initBase() {
    let wR = parseFloat(getVal('w')) || 0; let hR = parseFloat(getVal('h')) || 0;
    let w = toBase(wR); let h = toBase(hR);
    if (w > 0 && h > 0) {
        if (currentBoxes.length === 0) { currentBoxes = [{ id: Date.now(), x: 0, y: 0, w: w, h: h, type: 'sliding', p: 1, gBars: [{h:0, v:0}], doorType: '1L' }]; } 
        else { let oW = currentBoxes.reduce((m, b) => Math.max(m, b.x + b.w), 0); let oH = currentBoxes.reduce((m, b) => Math.max(m, b.y + b.h), 0); let sW = w / oW, sH = h / oH; currentBoxes.forEach(b => { b.x *= sW; b.y *= sH; b.w *= sW; b.h *= sH; }); } 
        renderPartsUI(); drawPreview();
    }
}

function renderPartsUI() {
    let html = "";
    currentBoxes.forEach((b, i) => {
        let gBarsHtml = ""; 
        for(let j=0; j<b.p; j++) { let gb = b.gBars[j] || {h:0, v:0}; gBarsHtml += `<div class="gbar-item"><span><b>P${j+1}</b></span> <div style="display:flex; gap:10px; align-items:center;"> H <input type="number" value="${gb.h}" onchange="updateGBar(${i},${j},'h',this.value)"> V <input type="number" value="${gb.v}" onchange="updateGBar(${i},${j},'v',this.value)"></div></div>`; }
        let typeSelect = `<select onchange="updatePart(${i}, 'type', this.value)"><option value="sliding" ${b.type==='sliding'?'selected':''}>Sliding System</option><option value="fixed" ${b.type==='fixed'?'selected':''}>Fixed Panel</option><option value="door" ${b.type==='door'?'selected':''}>Door Entry</option><option value="fan" ${b.type==='fan'?'selected':''}>Exhaust Cutout</option></select>`;
        let extraSettings = "";
        if (b.type === 'door') { extraSettings = `<label style="margin:0;">Open:</label> <select onchange="updatePart(${i}, 'doorType', this.value)"><option value="1L" ${b.doorType==='1L'?'selected':''}>1 Left</option><option value="1R" ${b.doorType==='1R'?'selected':''}>1 Right</option><option value="double" ${b.doorType==='double'?'selected':''}>Double Door</option><option value="tophung" ${b.doorType==='tophung'?'selected':''}>Top Hung</option></select>`; } else if (b.type !== 'fan') { extraSettings = `<label style="margin:0;">Panels:</label> <input type="number" value="${b.p}" onchange="updatePart(${i}, 'p', this.value)"><button class="btn btn-micro" onclick="toggleGBar(${i})">Design Grid ⚙️</button>`; }
        html += `<div class="part-card"><div class="part-header"><span>Part ${i+1}</span><span style="color:var(--text-muted); font-weight:500;">${fromBase(b.w).toFixed(2)} x ${fromBase(b.h).toFixed(2)}</span></div><div class="part-controls"><div class="part-actions"><button class="btn btn-micro" onclick="splitH(${i})">✂️ Split Horiz</button><button class="btn btn-micro" onclick="splitV(${i})">✂️ Split Vert</button><button class="btn btn-micro" onclick="editPart(${i})">📐 Edit Dims</button><button class="btn btn-micro btn-micro-danger" onclick="deletePart(${i})">🗑️ Delete</button></div><div class="part-settings"><label style="margin:0;">Type:</label> ${typeSelect} ${extraSettings}</div><div id="gbar_${i}" class="gbar-container"><div style="font-weight:600; margin-bottom:10px; display:flex; justify-content:space-between; font-size:12px;">Internal Grid Design<button class="btn btn-micro" onclick="applyGToAll(${i})">Sync All Panels</button></div>${gBarsHtml}</div></div></div>`;
    });
    const pm = document.getElementById('partsManager');
    if(pm) pm.innerHTML = html || `<div class="empty-state"><div class="empty-icon">📏</div>Input dimensions to initialize structural grid</div>`;
}

function toggleGBar(idx) { let el = document.getElementById('gbar_'+idx); if(el) el.style.display = (el.style.display === 'block') ? 'none' : 'block'; }
function updateGBar(pIdx, gIdx, field, val) { saveHistory(); if(!currentBoxes[pIdx].gBars[gIdx]) currentBoxes[pIdx].gBars[gIdx] = {h:0, v:0}; currentBoxes[pIdx].gBars[gIdx][field] = parseInt(val) || 0; drawPreview(); }
function applyGToAll(idx) { saveHistory(); let b = currentBoxes[idx]; let first = b.gBars[0] || {h:0, v:0}; for(let j=0; j<b.p; j++) b.gBars[j] = { ...first }; renderPartsUI(); drawPreview(); }
function splitH(idx) { saveHistory(); let b = currentBoxes[idx]; let vR = parseFloat(prompt(`ENTER TOP HEIGHT:`)); if (vR > 0 && toBase(vR) < b.h) { let val = toBase(vR); let pid = Date.now(); currentBoxes.splice(idx, 1, { ...b, id: pid, h: val, type: 'fixed', p: 1, gBars:[{h:0, v:0}], doorType:'1L' }, { ...b, id: pid+1, y: b.y + val, h: b.h - val, p: 1, gBars:[{h:0, v:0}], doorType:'1L' }); renderPartsUI(); drawPreview(); } }
function splitV(idx) { saveHistory(); let b = currentBoxes[idx]; let vR = parseFloat(prompt(`ENTER LEFT WIDTH:`)); if (vR > 0 && toBase(vR) < b.w) { let val = toBase(vR); let pid = Date.now(); currentBoxes.splice(idx, 1, { ...b, id: pid, w: val, type: 'fixed', p: 1, gBars:[{h:0, v:0}], doorType:'1L' }, { ...b, id: pid+1, x: b.x + val, w: b.w - val, p: 1, gBars:[{h:0, v:0}], doorType:'1L' }); renderPartsUI(); drawPreview(); } }
function editPart(idx) { saveHistory(); let b = currentBoxes[idx]; let n = currentBoxes[idx + 1] || currentBoxes[idx - 1]; if (!n) return alert("NO NEIGHBOR!"); let iN = (currentBoxes[idx + 1] === n); let axis = (b.y === n.y) ? 'V' : (b.x === n.x ? 'H' : null); if (axis === 'V') { let tW = fromBase(b.w + n.w); let nR = parseFloat(prompt(`NEW WIDTH:`)); if (nR > 0 && nR < tW) { let nV = toBase(nR); b.w = nV; n.w = toBase(tW) - nV; if (iN) n.x = b.x + b.w; else b.x = n.x + n.w; } } else if (axis === 'H') { let tH = fromBase(b.h + n.h); let nR = parseFloat(prompt(`NEW HEIGHT:`)); if (nR > 0 && nR < tH) { let nV = toBase(nR); b.h = nV; n.h = toBase(tH) - nV; if (iN) n.y = b.y + b.h; else b.y = n.y + n.h; } } renderPartsUI(); drawPreview(); }
function deletePart(idx) { if (currentBoxes.length <= 1) return alert("LAST PART!"); saveHistory(); let b = currentBoxes[idx]; let nI = (idx > 0) ? idx - 1 : idx + 1; let n = currentBoxes[nI]; if (b.x === n.x && b.w === n.w) { n.h += b.h; if (idx < nI) n.y = b.y; } else if (b.y === n.y && b.h === n.h) { n.w += b.w; if (idx < nI) n.x = b.x; } currentBoxes.splice(idx, 1); renderPartsUI(); drawPreview(); }
function updatePart(i, f, v) { saveHistory(); currentBoxes[i][f] = (f==='p') ? parseInt(v) : v; if(f==='p') { currentBoxes[i].gBars = Array.from({length: v}, () => ({h:0,v:0})); renderPartsUI(); } if(f==='type') renderPartsUI(); drawPreview(); }

function drawTick(ctx, x, y, iV) { ctx.beginPath(); ctx.strokeStyle = "#0f172a"; ctx.lineWidth = 1.5; if(iV) { ctx.moveTo(x-5, y); ctx.lineTo(x+5, y); } else { ctx.moveTo(x, y-5); ctx.lineTo(x, y+5); } ctx.stroke(); }
function wrapText(ctx, text, x, y, maxWidth, lineHeight) { if(!text) return y; let tS = String(text).toUpperCase(); let cX = x; let line = ""; for (let i = 0; i < tS.length; i++) { let char = tS[i]; let tW = ctx.measureText(line + char).width; if (cX + tW > x + maxWidth) { ctx.fillText(line, cX, y); y += lineHeight; cX = x; line = char; } else { line += char; } } ctx.fillText(line, cX, y); return y + lineHeight; }

function wrapSpecLine(ctx, label, value, x, y, maxWidth, lineHeight) {
    ctx.fillStyle = "#475569"; ctx.font="600 11px Arial"; let lblW = ctx.measureText(label).width; ctx.fillText(label, x, y);
    if(value === undefined || value === null || value === "" || (typeof value === 'number' && isNaN(value))) { 
        ctx.fillStyle = "#ef4444"; ctx.font="600 11px Arial"; ctx.fillText("PENDING", x + lblW, y); return y + lineHeight; 
    } 
    ctx.fillStyle = "#0f172a"; ctx.font="11px Arial"; let valStr = String(value).toUpperCase(); let cX = x + lblW; let line = "";
    for (let i = 0; i < valStr.length; i++) { 
        let char = valStr[i]; let tW = ctx.measureText(line + char).width; 
        if (cX + tW > x + maxWidth) { ctx.fillText(line, cX, y); y += lineHeight; cX = x; line = char; } 
        else { line += char; } 
    }
    ctx.fillText(line, cX, y); return y + lineHeight;
}

function drawPreview() { 
    let sVal = getVal("seriesSpec");
    let mVal = getVal("meshSpec");

    let d = { 
        w: parseFloat(getVal("w")) || 0, 
        h: parseFloat(getVal("h")) || 0, 
        unit: getVal("unit") || "feet", 
        tag: getVal("winTag"), 
        glass: getVal("glassSpec"), 
        color: getVal("colorSpec"), 
        lock: getVal("lockSpec"), 
        series: (sVal === "MANUAL" ? getVal("seriesManual") : sVal), 
        qty: getVal("qtySpec") || "1",
        rate: getVal("rateSpec"), 
        mesh: (mVal === "MANUAL" ? getVal("meshManual") : mVal), 
        notes: getVal("notes"), 
        boxes: currentBoxes 
    }; 
    
    let canvas = document.getElementById("previewCanvas");
    if(canvas) drawIndividual(canvas, d, true); 
}

function drawIndividual(canvas, d, isP) {
    var ctx = canvas.getContext("2d"); ctx.fillStyle = "white"; ctx.fillRect(0,0, canvas.width, canvas.height); 
    if(d.w <= 0 || d.h <= 0 || d.boxes.length === 0) return;
    
    let wB = toBase(d.w, d.unit); let hB = toBase(d.h, d.unit); 
    let availableHeight = isP ? canvas.height : (canvas.height / 2);
    var scale = Math.min((canvas.width - 80) / (wB * 304.8), (availableHeight - 120) / (hB * 304.8)); 
    var x = 40, y = 80; 
    
    ctx.strokeStyle = "#0f172a"; ctx.lineWidth = 1.5; ctx.fillStyle = "#0f172a"; ctx.font = "bold 11px Arial"; ctx.textAlign = "center"; let uL = (d.unit==="feet"?" FT":(d.unit==="inch"?"\"":" MM"));
    
    ctx.fillText(d.w.toFixed(2) + uL, x + (wB*304.8*scale)/2, y - 60); ctx.beginPath(); ctx.moveTo(x, y-55); ctx.lineTo(x+(wB*304.8*scale), y-55); ctx.stroke(); drawTick(ctx, x, y-55, false); drawTick(ctx, x+(wB*304.8*scale), y-55, false);
    ctx.save(); ctx.translate(x-30, y+(hB*304.8*scale)/2); ctx.rotate(-Math.PI/2); ctx.fillText(d.h.toFixed(2)+uL,0,0); ctx.restore(); ctx.beginPath(); ctx.moveTo(x-25, y); ctx.lineTo(x-25, y+(hB*304.8*scale)); ctx.stroke(); drawTick(ctx, x-25, y, true); drawTick(ctx, x-25, y+(hB*304.8*scale), true);
    
    let xs = [...new Set(d.boxes.map(b => b.x.toFixed(4)).concat(wB.toFixed(4)))].map(Number).sort((a,b)=>a-b); let ys = [...new Set(d.boxes.map(b => b.y.toFixed(4)).concat(hB.toFixed(4)))].map(Number).sort((a,b)=>a-b);
    if(xs.length > 2) { ctx.beginPath(); ctx.moveTo(x, y-25); ctx.lineTo(x+wB*304.8*scale, y-25); ctx.stroke(); xs.forEach((v,i) => { if(i<xs.length-1){ let sw = fromBase(xs[i+1]-v, d.unit); ctx.fillText(sw.toFixed(2)+uL, x+(v+(xs[i+1]-v)/2)*304.8*scale, y-30); drawTick(ctx, x+v*304.8*scale, y-25, false); } }); drawTick(ctx, x+wB*304.8*scale, y-25, false); }
    if(ys.length > 2) { ctx.beginPath(); ctx.moveTo(x-10, y); ctx.lineTo(x-10, y+hB*304.8*scale); ctx.stroke(); ys.forEach((v,i) => { if(i<ys.length-1){ let sh = fromBase(ys[i+1]-v, d.unit); ctx.save(); ctx.translate(x-15, y+(v+(ys[i+1]-v)/2)*304.8*scale); ctx.rotate(-Math.PI/2); ctx.fillText(sh.toFixed(2)+uL,0,0); ctx.restore(); drawTick(ctx, x-10, y+v*304.8*scale, true); } }); drawTick(ctx, x-10, y+hB*304.8*scale, true); }
    
    d.boxes.forEach(b => {
        let bx = x+b.x*304.8*scale, by = y+b.y*304.8*scale, bw = b.w*304.8*scale, bh = b.h*304.8*scale; ctx.strokeRect(bx, by, bw, bh); let p = parseInt(b.p) || 1, pw = bw/p;
        for(let j=0; j<p; j++) { let pX = bx + j*pw; let gb = b.gBars[j] || {h:0, v:0}; ctx.lineWidth = 0.5; ctx.strokeStyle = "#64748b"; if(gb.h > 0) { for(let k=1; k<=gb.h; k++){ let gy = by+(bh/(gb.h+1))*k; ctx.beginPath(); ctx.moveTo(pX,gy); ctx.lineTo(pX+pw,gy); ctx.stroke(); } } if(gb.v > 0) { for(let k=1; k<=gb.v; k++){ let gx = pX+(pw/(gb.v+1))*k; ctx.beginPath(); ctx.moveTo(gx,by); ctx.lineTo(gx,by+bh); ctx.stroke(); } } } 
        
        ctx.lineWidth = 1.5; ctx.strokeStyle = "#0f172a"; 
        if (b.type === 'sliding' || b.type === 'fixed') { 
            for(let i=1; i<p; i++){ ctx.beginPath(); ctx.moveTo(bx+pw*i, by); ctx.lineTo(bx+pw*i, by+bh); ctx.stroke(); } 
            if (p > 1) { 
                for(let j=0; j<p; j++) ctx.fillText(fromBase(b.w/p, d.unit).toFixed(2)+uL, bx+pw*j+pw/2, by+bh+15); 
                
                // Draw Sliding Direction Arrows
                if (b.type === 'sliding') {
                    for (let j = 0; j < p; j++) {
                        let cx = bx + j * pw + pw / 2;
                        let cy = by + bh / 2;
                        let dir = (j < p / 2) ? 1 : -1;
                        if (p % 2 !== 0 && j === Math.floor(p / 2)) dir = 1; // Middle panel default direction
                        
                        let aLen = Math.min(pw * 0.4, 30);
                        let aH = 4;
                        let hS = 10;
                        
                        let sX = cx - dir * (aLen / 2);
                        let eX = cx + dir * (aLen / 2);
                        
                        ctx.beginPath();
                        ctx.moveTo(sX, cy - aH);
                        ctx.lineTo(eX - dir * hS, cy - aH);
                        ctx.lineTo(eX - dir * hS, cy - aH * 2);
                        ctx.lineTo(eX, cy);
                        ctx.lineTo(eX - dir * hS, cy + aH * 2);
                        ctx.lineTo(eX - dir * hS, cy + aH);
                        ctx.lineTo(sX, cy + aH);
                        ctx.closePath();
                        
                        let oldFill = ctx.fillStyle;
                        ctx.fillStyle = "white";
                        ctx.fill();
                        ctx.fillStyle = oldFill;
                        ctx.stroke();
                    }
                }
            } 
        }

        if (b.type === 'door') { ctx.setLineDash([5, 5]); ctx.beginPath(); if(b.doorType === 'double') { let gap = 10; let pW = (bw - gap) / 2; ctx.moveTo(bx, by); ctx.lineTo(bx+pW, by+bh/2); ctx.lineTo(bx, by+bh); ctx.moveTo(bx+bw, by); ctx.lineTo(bx+bw-pW, by+bh/2); ctx.lineTo(bx+bw, by+bh); } else if(b.doorType === '1L') { ctx.moveTo(bx, by); ctx.lineTo(bx+bw, by+bh/2); ctx.lineTo(bx, by+bh); } else if(b.doorType === '1R') { ctx.moveTo(bx+bw, by); ctx.lineTo(bx, by+bh/2); ctx.lineTo(bx+bw, by+bh); } else if(b.doorType === 'tophung') { ctx.moveTo(bx, by); ctx.lineTo(bx+bw/2, by+bh); ctx.lineTo(bx+bw, by); } ctx.stroke(); ctx.setLineDash([]); } else if (b.type === 'fan') { let r = Math.min(bw, bh)*0.3; ctx.beginPath(); ctx.arc(bx+bw/2, by+bh/2, r, 0, 2*Math.PI); ctx.stroke(); ctx.moveTo(bx+bw/2-r*0.7, by+bh/2-r*0.7); ctx.lineTo(bx+bw/2+r*0.7, by+bh/2+r*0.7); ctx.moveTo(bx+bw/2+r*0.7, by+bh/2-r*0.7); ctx.lineTo(bx+bw/2-r*0.7, by+bh/2+r*0.7); ctx.stroke(); }
    });
    
    let qty = parseFloat(d.qty) || 1;
    let area = (wB * hB * qty).toFixed(2);
    let rate = parseFloat(d.rate) || 0;
    let amount = (area * rate).toFixed(2);

    if(isP) {
        setVal("areaSpec", area);

        // Render HTML specifications beside the canvas
        let specEl = document.getElementById("liveSpecsHtml");
        if (specEl) {
            let getStatus = (val) => val ? `<span style="color:#0f172a; font-weight: 500;">${String(val).toUpperCase()}</span>` : `<span style="color:#ef4444; font-weight: 600;">PENDING</span>`;

            specEl.innerHTML = `
                <div style="font-weight: 600; color: var(--brand-dark); margin-bottom: 15px; font-size: 13px; border-bottom: 1px solid var(--border-color); padding-bottom: 10px; text-transform: uppercase;">Engineering Specifications</div>
                <div style="display: flex; flex-direction: column; gap: 12px; font-size: 12px; color: var(--text-muted); flex: 1;">
                    <div style="display: flex; justify-content: space-between; align-items: center;"><b>TAG NO:</b> ${d.tag ? `<span style="color:#4f46e5; font-weight:600; background: #eef2ff; padding: 2px 6px; border-radius: 4px;">${d.tag.toUpperCase()}</span>` : `<span style="color:#ef4444; font-weight: 600;">PENDING</span>`}</div>
                    <div style="display: flex; justify-content: space-between;"><b>SERIES:</b> ${getStatus(d.series)}</div>
                    <div style="display: flex; justify-content: space-between;"><b>GLASS:</b> ${getStatus(d.glass)}</div>
                    <div style="display: flex; justify-content: space-between;"><b>COLOR:</b> ${getStatus(d.color)}</div>
                    <div style="display: flex; justify-content: space-between;"><b>LOCK:</b> ${getStatus(d.lock)}</div>
                    <div style="display: flex; justify-content: space-between;"><b>MESH:</b> ${getStatus(d.mesh)}</div>
                    <div style="display: flex; justify-content: space-between;"><b>QTY:</b> <span style="color:#0f172a; font-weight: 500;">${qty}</span></div>
                    <div style="display: flex; justify-content: space-between;"><b>AREA (SQ.FT):</b> <span style="color:#0f172a; font-weight: 500;">${area}</span></div>
                    <div style="display: flex; justify-content: space-between;"><b>RATE/SQ.FT:</b> ${rate > 0 ? `<span style="color:#0f172a; font-weight: 500;">₹ ${rate}</span>` : `<span style="color:#ef4444; font-weight: 600;">PENDING</span>`}</div>
                </div>
                <div style="display: flex; justify-content: space-between; border-top: 1px dashed var(--border-color); margin-top: 15px; padding-top: 15px; font-size: 14px; color: var(--brand-dark);">
                    <b>TOTAL AMOUNT:</b> ${rate > 0 ? `<span style="color:#16a34a; font-weight:bold;">₹ ${amount}</span>` : `<span style="color:#ef4444; font-weight: 600;">PENDING</span>`}
                </div>
                ${d.notes ? `<div style="margin-top: 15px; font-size: 11px; background: #f8fafc; padding: 10px; border-radius: 6px; border: 1px solid #e2e8f0; color: var(--text-main);"><b>NOTES:</b><br>${d.notes.toUpperCase()}</div>` : ''}
            `;
        }
        return; 
    }

    // PDF Text rendering fallback (Legacy)
    ctx.textAlign="left"; ctx.font="bold 12px Arial"; 
    let sX = 15; let sY = y + hB*304.8*scale + 40; let mW = canvas.width - 30; 
    
    ctx.fillStyle = "#0f172a"; ctx.fillText("TAG NO / S.NO: ", sX, sY); 
    let idLW = ctx.measureText("TAG NO / S.NO: ").width; 
    
    if(!d.tag) { ctx.fillStyle = "#ef4444"; ctx.fillText("PENDING", sX + idLW, sY); 
    } else { ctx.fillStyle = "#4f46e5"; ctx.fillText(String(d.tag).toUpperCase(), sX + idLW, sY); }
    
    sY += 24; ctx.fillStyle = "#0f172a"; ctx.font="bold 11px Arial"; ctx.fillText("ENGINEERING SPECIFICATIONS:", sX, sY); sY += 16;

    let sps = [
        {l:"SERIES SYSTEM: ", v:d.series}, 
        {l:"GLASS: ", v:d.glass}, 
        {l:"COLOR: ", v:d.color}, 
        {l:"LOCK TYPE: ", v:d.lock}, 
        {l:"MESH OPTION: ", v:d.mesh}, 
        {l:"QUANTITY: ", v:qty}, 
        {l:"AREA (SQ.FT): ", v:area}, 
        {l:"RATE / SQ.FT: ", v:rate}, 
        {l:"TOTAL AMOUNT: ", v: rate > 0 ? "₹ " + amount : ""}
    ];
    
    sps.forEach(s => { sY = wrapSpecLine(ctx, s.l, s.v, sX, sY, mW, 15); });
    
    if(d.notes) { 
        sY += 5;
        ctx.fillStyle = "#0f172a"; ctx.font="bold 11px Arial"; 
        ctx.fillText("NOTES: ", sX, sY); sY += 15; 
        ctx.font="11px Arial"; wrapText(ctx, d.notes, sX, sY, mW, 15); 
    }
}

function addOrUpdateWindow() { 
    if(currentBoxes.length===0) return alert("ENTER SIZE"); 
    
    let sVal = getVal("seriesSpec");
    let mVal = getVal("meshSpec");

    let d = { 
        w: parseFloat(getVal("w")) || 0, 
        h: parseFloat(getVal("h")) || 0, 
        unit: getVal("unit") || "feet", 
        tag: getVal("winTag"), 
        glass: getVal("glassSpec"), 
        color: getVal("colorSpec"), 
        lock: getVal("lockSpec"), 
        series: (sVal === "MANUAL" ? getVal("seriesManual") : sVal), 
        qty: getVal("qtySpec") || "1",
        area: getVal("areaSpec"), 
        rate: getVal("rateSpec"), 
        mesh: (mVal === "MANUAL" ? getVal("meshManual") : mVal), 
        notes: getVal("notes"), 
        boxes: JSON.parse(JSON.stringify(currentBoxes)) 
    }; 
    
    let editIdxVal = getVal("editIndex");
    let idx = editIdxVal ? parseInt(editIdxVal) : -1; 
    
    if(idx === -1) projectWindows.push(d); else projectWindows[idx] = d; 
    
    renderProject(); 
    clearAll(); 
    setTimeout(() => { 
        let sheet = document.getElementById("projectSheet");
        if(sheet) sheet.scrollIntoView({ behavior: 'smooth', block: 'start' }); 
    }, 100);
}

function clearAll() { 
    setVal("w", ""); 
    setVal("h", ""); 
    setVal("winTag", ""); 
    setVal("notes", ""); 
    setVal("glassSpec", ""); 
    setVal("colorSpec", ""); 
    setVal("lockSpec", ""); 
    setVal("seriesSpec", ""); 
    setVal("seriesManual", ""); 
    
    let sMan = document.getElementById("seriesManual");
    if(sMan) sMan.classList.add("hidden"); 
    
    setVal("areaSpec", ""); 
    setVal("rateSpec", ""); 
    setVal("meshSpec", ""); 
    setVal("meshManual", ""); 
    
    let mMan = document.getElementById("meshManual");
    if(mMan) mMan.classList.add("hidden"); 
    
    setVal("qtySpec", "1");
    currentBoxes = []; 
    historyStack = []; 
    
    const pm = document.getElementById('partsManager');
    if(pm) pm.innerHTML = `<div class="empty-state"><div class="empty-icon">📏</div>Input dimensions to initialize structural grid</div>`; 
    
    setVal("editIndex", "-1"); 

    let specEl = document.getElementById("liveSpecsHtml");
    if(specEl) {
        specEl.innerHTML = `<div class="empty-state" style="margin: auto; border: none; background: transparent;"><div class="empty-icon">📝</div>Waiting for specifications...</div>`;
    }

    drawPreview(); 
}

function renderProject() {
    let hasW = projectWindows.length > 0;
    setDisplay("projectSheet", hasW ? "block" : "none"); 
    
    // Map new company details
    setText("printCompanyName", (getVal("companyName") || "---").toUpperCase()); 
    setText("printCompanyAddress", (getVal("companyAddress") || "---").toUpperCase()); 
    
    // Map existing client details
    setText("printSite", (getVal("siteLoc") || "---").toUpperCase()); 
    setText("printDate", getVal("projDate") || "---"); 
    setText("printClientName", (getVal("clientName") || "---").toUpperCase());
    
    let tbody = document.getElementById("estimateTableBody"); 
    if(!tbody) return;
    
    tbody.innerHTML = "";
    
    // Variables for Grand Totals
    let totalQty = 0;
    let totalAmt = 0;

    projectWindows.forEach((win, i) => {
        let tr = document.createElement("tr");
        
        let wB = toBase(win.w, win.unit); 
        let hB = toBase(win.h, win.unit);
        let qty = parseFloat(win.qty) || 1;
        let area = (wB * hB * qty).toFixed(2);
        let rate = parseFloat(win.rate) || 0;
        let amount = (area * rate).toFixed(2);
        let unitLabel = win.unit.toUpperCase();

        // Accumulate totals
        totalQty += qty;
        totalAmt += parseFloat(amount);

        // Put Tag No. in the first column, fallback to the row number if empty
        let displayTag = win.tag ? win.tag.toUpperCase() : (i + 1);

        tr.innerHTML = `
            <td><b>${displayTag}</b>
                <div class="no-print" style="margin-top: 10px; display:flex; flex-direction:column; gap:5px; align-items:center;">
                    <button class="btn btn-micro" style="background:#15803d; color:white; width: 50px;" onclick="copyWindow(${i})">Cpy</button>
                    <button class="btn btn-micro" style="background:#f59e0b; color:black; width: 50px;" onclick="editWindow(${i})">Edit</button>
                    <button class="btn btn-micro" style="background:#b91c1c; color:white; width: 50px;" onclick="deleteSaved(${i})">Del</button>
                </div>
            </td>
            <td class="canvas-cell">
                <canvas id="canvas_print_${i}" width="120" height="120"></canvas>
            </td>
            <td>${win.series || '-'}</td>
            <td>${win.color || '-'}</td>
            <td>${win.glass || '-'}</td>
            <td>${win.w} ${unitLabel}</td>
            <td>${win.h} ${unitLabel}</td>
            <td>${qty}</td>
            <td>${area}</td>
            <td>${rate > 0 ? rate : '-'}</td>
            <td>${rate > 0 ? amount : '-'}</td>
        `;
        tbody.appendChild(tr);
        
        // Add Notes Row right below it (spans full width of the table)
        if (win.notes && win.notes.trim() !== '') {
            let noteTr = document.createElement("tr");
            noteTr.innerHTML = `
                <td colspan="11" style="text-align: left; padding: 6px 10px; background-color: #f8fafc; font-size: 11px; border: 1px solid #000; color: #0f172a;">
                    <b style="color:var(--brand-dark);">ENGINEERING NOTES:</b> ${win.notes.toUpperCase()}
                </td>
            `;
            tbody.appendChild(noteTr);
        }
        
        // Draw the mini canvas inside the table cell
        let cvs = document.getElementById(`canvas_print_${i}`);
        drawTableCanvas(cvs, win);
    }); 

    // --- APPEND SUMMARY ROWS ---
    let glassAmt = parseFloat(getVal("glassWorkAmount")) || 0;
    let freightAmt = parseFloat(getVal("freightAmount")) || 0;
    let grandTotal = totalAmt + glassAmt + freightAmt;

    if (totalAmt > 0 || totalQty > 0) {
        let tfootHtml = `
            <tr style="font-weight: bold; border-top: 2px solid #000;">
                <td colspan="7" style="text-align: center;">Total</td>
                <td>${totalQty}</td>
                <td colspan="2"></td>
                <td>${totalAmt.toFixed(0)}</td>
            </tr>
        `;

        if (glassAmt > 0) {
            tfootHtml += `
            <tr style="font-weight: bold;">
                <td colspan="10" style="text-align: left; padding-left: 10px;">Amount of Estimate for Glass Work</td>
                <td>${glassAmt.toFixed(0)}</td>
            </tr>`;
        }

        if (freightAmt > 0) {
            tfootHtml += `
            <tr style="font-weight: bold;">
                <td colspan="10" style="text-align: left; padding-left: 10px;">Freight</td>
                <td>${freightAmt.toFixed(0)}</td>
            </tr>`;
        }

        if (glassAmt > 0 || freightAmt > 0) {
            tfootHtml += `
            <tr style="font-weight: bold; border-top: 2px solid #000; border-bottom: 2px solid #000;">
                <td colspan="10" style="text-align: center;">Total</td>
                <td>${grandTotal.toFixed(0)}</td>
            </tr>`;
        }

        tbody.insertAdjacentHTML('beforeend', tfootHtml);
    }

    // MAP TERMS & NOTES TEXT
    const pTerms = getVal("paymentTermsText");
    if(document.getElementById("printPaymentTerms")) setText("printPaymentTerms", pTerms);
    
    const pNotes = getVal("projectNotesText");
    if(document.getElementById("printProjectNotes")) setText("printProjectNotes", pNotes);
}

function drawTableCanvas(canvas, d) {
    var ctx = canvas.getContext("2d"); 
    ctx.fillStyle = "white"; 
    ctx.fillRect(0,0, canvas.width, canvas.height); 
    if(d.w <= 0 || d.h <= 0 || d.boxes.length === 0) return;
    
    let wB = toBase(d.w, d.unit); let hB = toBase(d.h, d.unit); 
    let pad = 20; // Padding so dimension numbers fit
    var scale = Math.min((canvas.width - pad*2) / (wB * 304.8), (canvas.height - pad*2) / (hB * 304.8)); 
    
    var dW = wB * 304.8 * scale;
    var dH = hB * 304.8 * scale;
    
    // Center it inside the cell canvas
    var x = (canvas.width - dW) / 2 + 5; 
    var y = (canvas.height - dH) / 2 + 10;
    
    ctx.strokeStyle = "#000"; ctx.lineWidth = 1; ctx.fillStyle = "#000"; ctx.font = "10px Arial"; ctx.textAlign = "center"; 
    
    // Top Dimensions
    ctx.fillText(d.w, x + dW/2, y - 8); 
    ctx.beginPath(); ctx.moveTo(x, y-5); ctx.lineTo(x+dW, y-5); ctx.stroke(); 
    drawTick(ctx, x, y-5, false); drawTick(ctx, x+dW, y-5, false);
    
    // Left Dimensions
    ctx.save(); ctx.translate(x-12, y+dH/2); ctx.rotate(-Math.PI/2); ctx.fillText(d.h,0,0); ctx.restore(); 
    ctx.beginPath(); ctx.moveTo(x-5, y); ctx.lineTo(x-5, y+dH); ctx.stroke(); 
    drawTick(ctx, x-5, y, true); drawTick(ctx, x-5, y+dH, true);
    
    // Draw the structural boxes
    d.boxes.forEach(b => {
        let bx = x+b.x*304.8*scale, by = y+b.y*304.8*scale, bw = b.w*304.8*scale, bh = b.h*304.8*scale; 
        ctx.strokeRect(bx, by, bw, bh); 
        let p = parseInt(b.p) || 1, pw = bw/p;
        
        for(let j=0; j<p; j++) { 
            let pX = bx + j*pw; let gb = b.gBars[j] || {h:0, v:0}; 
            ctx.lineWidth = 0.5; ctx.strokeStyle = "#555"; 
            if(gb.h > 0) { for(let k=1; k<=gb.h; k++){ let gy = by+(bh/(gb.h+1))*k; ctx.beginPath(); ctx.moveTo(pX,gy); ctx.lineTo(pX+pw,gy); ctx.stroke(); } } 
            if(gb.v > 0) { for(let k=1; k<=gb.v; k++){ let gx = pX+(pw/(gb.v+1))*k; ctx.beginPath(); ctx.moveTo(gx,by); ctx.lineTo(gx,by+bh); ctx.stroke(); } } 
        } 
        
        ctx.lineWidth = 1; ctx.strokeStyle = "#000"; 
        if (b.type === 'sliding' || b.type === 'fixed') { 
            for(let i=1; i<p; i++){ ctx.beginPath(); ctx.moveTo(bx+pw*i, by); ctx.lineTo(bx+pw*i, by+bh); ctx.stroke(); } 
            
            // Draw Sliding Direction Arrows
            if (b.type === 'sliding' && p > 1) {
                for (let j = 0; j < p; j++) {
                    let cx = bx + j * pw + pw / 2;
                    let cy = by + bh / 2;
                    let dir = (j < p / 2) ? 1 : -1;
                    if (p % 2 !== 0 && j === Math.floor(p / 2)) dir = 1; 
                    
                    let aLen = Math.min(pw * 0.4, 20);
                    let aH = 2;
                    let hS = 5;
                    
                    let sX = cx - dir * (aLen / 2);
                    let eX = cx + dir * (aLen / 2);
                    
                    ctx.beginPath();
                    ctx.moveTo(sX, cy - aH);
                    ctx.lineTo(eX - dir * hS, cy - aH);
                    ctx.lineTo(eX - dir * hS, cy - aH * 2);
                    ctx.lineTo(eX, cy);
                    ctx.lineTo(eX - dir * hS, cy + aH * 2);
                    ctx.lineTo(eX - dir * hS, cy + aH);
                    ctx.lineTo(sX, cy + aH);
                    ctx.closePath();
                    
                    let oldFill = ctx.fillStyle;
                    ctx.fillStyle = "white";
                    ctx.fill();
                    ctx.fillStyle = oldFill;
                    ctx.stroke();
                }
            }
        }
        
        if (b.type === 'door') { 
            ctx.setLineDash([3, 3]); ctx.beginPath(); 
            if(b.doorType === 'double') { let gap = 5; let pW = (bw - gap) / 2; ctx.moveTo(bx, by); ctx.lineTo(bx+pW, by+bh/2); ctx.lineTo(bx, by+bh); ctx.moveTo(bx+bw, by); ctx.lineTo(bx+bw-pW, by+bh/2); ctx.lineTo(bx+bw, by+bh); } 
            else if(b.doorType === '1L') { ctx.moveTo(bx, by); ctx.lineTo(bx+bw, by+bh/2); ctx.lineTo(bx, by+bh); } 
            else if(b.doorType === '1R') { ctx.moveTo(bx+bw, by); ctx.lineTo(bx, by+bh/2); ctx.lineTo(bx+bw, by+bh); } 
            else if(b.doorType === 'tophung') { ctx.moveTo(bx, by); ctx.lineTo(bx+bw/2, by+bh); ctx.lineTo(bx+bw, by); } 
            ctx.stroke(); ctx.setLineDash([]); 
        } else if (b.type === 'fan') { 
            let r = Math.min(bw, bh)*0.3; ctx.beginPath(); ctx.arc(bx+bw/2, by+bh/2, r, 0, 2*Math.PI); ctx.stroke(); 
            ctx.moveTo(bx+bw/2-r*0.7, by+bh/2-r*0.7); ctx.lineTo(bx+bw/2+r*0.7, by+bh/2+r*0.7); ctx.moveTo(bx+bw/2+r*0.7, by+bh/2-r*0.7); ctx.lineTo(bx+bw/2-r*0.7, by+bh/2+r*0.7); ctx.stroke(); 
        }
    });
}

function deleteSaved(idx) { if(confirm("DELETE?")) { projectWindows.splice(idx,1); renderProject(); } }

function assignSpecValues(d) {
    let stdS = ["M PLUS 65", "M PLUS 16 SLIM", "M PRIME 55", "M PRIME 20 SLIM", "M PRO 50 TR", "M PRO 15 FB", ""]; 
    if (stdS.includes(d.series)) { 
        setVal("seriesSpec", d.series); 
        let sMan = document.getElementById("seriesManual");
        if(sMan) sMan.classList.add("hidden"); 
    } else { 
        setVal("seriesSpec", "MANUAL"); 
        setVal("seriesManual", d.series); 
        let sMan = document.getElementById("seriesManual");
        if(sMan) sMan.classList.remove("hidden"); 
    } 
    let stdM = ["PLEATED INSIDE", "PLEATED OUTSIDE", "REGULAR", "NO MESH", ""]; 
    if (stdM.includes(d.mesh)) { 
        setVal("meshSpec", d.mesh); 
        let mMan = document.getElementById("meshManual");
        if(mMan) mMan.classList.add("hidden"); 
    } else { 
        setVal("meshSpec", "MANUAL"); 
        setVal("meshManual", d.mesh); 
        let mMan = document.getElementById("meshManual");
        if(mMan) mMan.classList.remove("hidden"); 
    }
}

function copyWindow(i) { 
    let d = projectWindows[i]; 
    setVal("w", d.w); 
    setVal("h", d.h); 
    setVal("unit", d.unit); 
    setVal("winTag", d.tag + " (COPY)"); 
    setVal("glassSpec", d.glass || ""); 
    setVal("colorSpec", d.color || ""); 
    setVal("lockSpec", d.lock || ""); 
    assignSpecValues(d); 
    setVal("qtySpec", d.qty || "1"); 
    setVal("areaSpec", d.area || ""); 
    setVal("rateSpec", d.rate || ""); 
    setVal("notes", d.notes || ""); 
    currentBoxes = JSON.parse(JSON.stringify(d.boxes)); 
    setVal("editIndex", "-1"); 
    renderPartsUI(); 
    drawPreview(); 
    window.scrollTo({top: 0, behavior: 'smooth'});
}

function editWindow(i) { 
    let d = projectWindows[i]; 
    setVal("w", d.w); 
    setVal("h", d.h); 
    setVal("unit", d.unit); 
    setVal("winTag", d.tag || ""); 
    setVal("glassSpec", d.glass || ""); 
    setVal("colorSpec", d.color || ""); 
    setVal("lockSpec", d.lock || ""); 
    assignSpecValues(d); 
    setVal("qtySpec", d.qty || "1"); 
    setVal("areaSpec", d.area || ""); 
    setVal("rateSpec", d.rate || ""); 
    setVal("notes", d.notes || ""); 
    currentBoxes = JSON.parse(JSON.stringify(d.boxes)); 
    historyStack = []; 
    setVal("editIndex", i); 
    renderPartsUI(); 
    drawPreview(); 
    window.scrollTo({top: 0, behavior: 'smooth'});
}