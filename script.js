// --- Supabase Initialization ---
const supabaseUrl = 'https://kqgtomdvgpiuvfuoiyjw.supabase.co'; 
const supabaseKey = 'sb_publishable_nQuk3NkG2oB2zESabijRMA_fGoOxgNT'; 
const supabaseClient = window.supabase.createClient(supabaseUrl, supabaseKey);

let currentCloudProjectId = null; 

// --- Authentication & Initialization Logic ---
document.addEventListener("DOMContentLoaded", () => {
    document.querySelector('.app-container').style.display = 'none';
    loadBranding(); // Fetch custom name/logo
    checkSession();
});

// --- NEW: Fetch and Apply Global Branding ---
async function loadBranding() {
    const { data, error } = await supabaseClient.from('app_settings').select('*').eq('id', 1).single();
    
    if (data && !error) {
        const name = data.company_name;
        
        // Update Text Elements
        if(document.getElementById('pageTitle')) document.getElementById('pageTitle').innerText = `${name} - Premium Engineering Studio`;
        if(document.getElementById('heroBrandName')) document.getElementById('heroBrandName').innerText = name;
        if(document.getElementById('navBrandName')) document.getElementById('navBrandName').innerText = name;
        
        // Update default welcome text to use the new name
        const welcomeEl = document.getElementById('welcomeText');
        if(welcomeEl && welcomeEl.value.includes('SMG Infosolutions')) {
            welcomeEl.value = welcomeEl.value.replace(/SMG Infosolutions/g, name);
        }

        // Apply Global Logo if one exists
        if(data.logo_data) {
            currentLogoData = data.logo_data; 
            
            // 1. Update the PDF Generation Logos
            const wl = document.getElementById('welcomeLogo');
            const hl = document.getElementById('headerLogo');
            if(wl) { wl.src = data.logo_data; wl.style.display = 'block'; }
            if(hl) { hl.src = data.logo_data; hl.style.display = 'block'; }

            // 2. Update the Top Navigation Bar Logo
            const topBarIcon = document.querySelector('.top-bar .brand-icon');
            if (topBarIcon) {
                topBarIcon.innerHTML = `<img src="${data.logo_data}" style="width: 100%; height: 100%; object-fit: contain;">`;
                topBarIcon.style.background = 'transparent';
                topBarIcon.style.padding = '0';
                topBarIcon.style.width = '35px';
                topBarIcon.style.height = '35px';
            }

            // 3. Update the Login Screen Logo
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
    msg.innerText = ""; 
    
    const emailInput = document.getElementById('emailInput');

    if (mode === 'signup') {
        document.getElementById('authTitle').innerText = 'Create Account';
        document.getElementById('authSubtitle').innerHTML = 'Enter your details to register';
        document.getElementById('signupFields').style.display = 'block';
        document.getElementById('passwordWrapper').style.display = 'block';
        emailInput.style.display = 'block';
        
        document.getElementById('loginBtn').style.display = 'none';
        document.getElementById('resetBtn').style.display = 'none';
        document.getElementById('signupBtn').style.display = 'block';
        
        document.getElementById('toggleSignUpText').style.display = 'none';
        document.getElementById('toggleForgotText').style.display = 'none';
        document.getElementById('toggleLoginText').style.display = 'block';
    } 
    else if (mode === 'reset') {
        document.getElementById('authTitle').innerText = 'Reset Password';
        document.getElementById('authSubtitle').innerHTML = 'Email services are disabled for this workspace.<br><br><span style="color: var(--brand-dark); font-weight: 600;">Please contact your System Administrator to obtain a new temporary password.</span>';
        
        document.getElementById('signupFields').style.display = 'none';
        document.getElementById('passwordWrapper').style.display = 'none';
        emailInput.style.display = 'none'; 
        
        document.getElementById('loginBtn').style.display = 'none';
        document.getElementById('signupBtn').style.display = 'none';
        document.getElementById('resetBtn').style.display = 'none'; 
        
        document.getElementById('toggleForgotText').style.display = 'none';
        document.getElementById('toggleSignUpText').style.display = 'none';
        document.getElementById('toggleLoginText').style.display = 'block';
    } 
    else {
        document.getElementById('authTitle').innerText = 'Welcome Back';
        document.getElementById('authSubtitle').innerHTML = 'Sign in to access your workspace';
        document.getElementById('signupFields').style.display = 'none';
        document.getElementById('passwordWrapper').style.display = 'block';
        emailInput.style.display = 'block';
        
        document.getElementById('resetBtn').style.display = 'none';
        document.getElementById('signupBtn').style.display = 'none';
        document.getElementById('loginBtn').style.display = 'block';
        
        document.getElementById('toggleLoginText').style.display = 'none';
        document.getElementById('toggleForgotText').style.display = 'block';
        document.getElementById('toggleSignUpText').style.display = 'block';
    }
}

async function checkSession() {
    const { data: { session }, error } = await supabaseClient.auth.getSession();
    
    if (session) {
        document.getElementById('authScreen').style.display = 'none';
        
        const { data: profile } = await supabaseClient
            .from('profiles')
            .select('payment_status, subscription_end_date')
            .eq('id', session.user.id)
            .single();

        if (profile && profile.payment_status === 'cleared') {
            
            // --- Due Date Expiry Logic ---
            let today = new Date();
            today.setHours(0, 0, 0, 0); 
            
            let endDate = profile.subscription_end_date ? new Date(profile.subscription_end_date) : null;
            
            if (endDate) {
                endDate.setHours(0, 0, 0, 0);
                
                // 1. Check for lockout (Expired)
                if (today > endDate) {
                    document.querySelector('.app-container').style.display = 'none';
                    document.getElementById('paymentScreen').style.display = 'flex';
                    
                    await supabaseClient.from('profiles').update({ payment_status: 'pending' }).eq('id', session.user.id);
                    return; 
                }
            }

            // Access Granted
            document.getElementById('paymentScreen').style.display = 'none';
            document.querySelector('.app-container').style.display = 'flex';
            
            // 2. Check for Warning Banner (Expires in 7 days or less)
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
            document.querySelector('.app-container').style.display = 'none';
            document.getElementById('paymentScreen').style.display = 'flex';
        }
    } else {
        document.getElementById('authScreen').style.display = 'flex';
        document.getElementById('paymentScreen').style.display = 'none';
        document.querySelector('.app-container').style.display = 'none';
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
    const email = document.getElementById('emailInput').value;
    const password = document.getElementById('passwordInput').value;
    const name = document.getElementById('regName').value;
    const phone = document.getElementById('regPhone').value;
    const address = document.getElementById('regAddress').value;
    const msg = document.getElementById('authMessage');
    
    if(!email || !password || !name || !phone || !address) {
        msg.style.color = "var(--danger)"; 
        msg.innerText = "Please fill in all fields to create your account.";
        return;
    }
    
    msg.style.color = "var(--text-muted)"; 
    msg.innerText = "Creating account...";
    
    const { data, error } = await supabaseClient.auth.signUp({ email, password });
    
    if (error) { 
        msg.style.color = "var(--danger)"; 
        msg.innerText = error.message; 
    } else { 
        if(data.user) {
            const { error: profileError } = await supabaseClient.from('profiles').upsert({
                id: data.user.id,
                email: email,
                full_name: name,
                phone: phone,
                address: address,
                role: 'client',
                payment_status: 'pending'
            });

            if (profileError) {
                console.error("Could not save profile details:", profileError);
            }
        }
        
        msg.style.color = "var(--accent-primary)"; 
        msg.innerText = "Account created! You can now log in."; 
        toggleAuthMode('login'); 
    }
}

async function handleLogin() {
    const email = document.getElementById('emailInput').value;
    const password = document.getElementById('passwordInput').value;
    const msg = document.getElementById('authMessage');
    msg.style.color = "var(--text-muted)"; msg.innerText = "Logging in...";

    const { error } = await supabaseClient.auth.signInWithPassword({ email, password });
    if (error) { msg.style.color = "var(--danger)"; msg.innerText = error.message; } 
    else { msg.innerText = ""; checkSession(); }
}

async function handleLogout() {
    await supabaseClient.auth.signOut();
    window.location.reload(); 
}

async function handlePasswordReset() {
    alert("Email services are disabled. Please contact the administrator.");
}

async function saveNewPassword() {
    const newPassword = document.getElementById('newPasswordInput').value;
    const msg = document.getElementById('updateMsg');
    if (!newPassword || newPassword.length < 6) { msg.innerText = "Password must be at least 6 characters."; return; }
    msg.style.color = "var(--text-muted)"; msg.innerText = "Saving...";
    const { error } = await supabaseClient.auth.updateUser({ password: newPassword });
    if (error) { msg.style.color = "var(--danger)"; msg.innerText = error.message; } else { alert("Password updated successfully! Please log in with your new password."); window.location.reload(); }
}

// --- CLOUD SYNCHRONIZATION LOGIC ---
async function saveProjectToCloud() {
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (!session) return alert("You must be logged in to save.");

    const clientName = document.getElementById("clientName").value || "Untitled Client";
    const siteLoc = document.getElementById("siteLoc").value;
    
    const payload = {
        user_id: session.user.id,
        client_name: clientName,
        site_location: siteLoc,
        project_date: document.getElementById("projDate").value,
        welcome_text: document.getElementById("welcomeText").value,
        disclaimer_text: document.getElementById("disclaimerText").value,
        windows_data: projectWindows 
    };

    const btn = document.querySelector('.global-actions button:first-child');
    const originalText = btn.innerText;
    btn.innerText = "☁️ Saving...";

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
        btn.innerText = "✅ Saved!";
        setTimeout(() => btn.innerText = originalText, 2000);
    }
}

async function openCloudBrowser() {
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (!session) return;

    document.getElementById('cloudBrowser').style.display = 'flex';
    const list = document.getElementById('cloudProjectList');
    list.innerHTML = "<p style='text-align:center;'>Fetching your projects...</p>";

    const { data: projects, error } = await supabaseClient
        .from('quotations')
        .select('id, client_name, site_location, project_date, created_at')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false });

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
    document.getElementById('cloudProjectList').innerHTML = "<p style='text-align:center;'>Downloading project data...</p>";
    
    const { data, error } = await supabaseClient.from('quotations').select('*').eq('id', projectId).single();
    if (error) { alert("Error loading project: " + error.message); return; }

    currentCloudProjectId = data.id;
    document.getElementById("clientName").value = data.client_name || "";
    document.getElementById("siteLoc").value = data.site_location || "";
    document.getElementById("projDate").value = data.project_date || "";
    document.getElementById("welcomeText").value = data.welcome_text || "";
    document.getElementById("disclaimerText").value = data.disclaimer_text || "";
    
    projectWindows = data.windows_data || [];
    renderProject();
    document.getElementById('cloudBrowser').style.display = 'none';
}

function createNewProject() { 
    if (confirm("START FRESH? This will clear the screen (make sure you saved first!).")) { 
        currentCloudProjectId = null;
        projectWindows = [];
        clearAll();
        document.getElementById("clientName").value = "";
        document.getElementById("siteLoc").value = "";
        renderProject();
    } 
}


// --- Quotation Maker Core Logic ---
let projectWindows = []; let currentBoxes = []; let historyStack = []; let currentLogoData = "logo.png";
function saveHistory() { historyStack.push(JSON.stringify(currentBoxes)); if (historyStack.length > 50) historyStack.shift(); }
function undoAction() { if (historyStack.length > 0) { currentBoxes = JSON.parse(historyStack.pop()); renderPartsUI(); drawPreview(); } }
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

function toBase(v, uO) { let u = uO || document.getElementById('unit').value; return u === "inch" ? v / 12 : (u === "mm" ? v / 304.8 : v); }
function fromBase(v, uO) { let u = uO || document.getElementById('unit').value; return u === "inch" ? v * 12 : (u === "mm" ? v * 304.8 : v); }

function initBase() {
    let wR = parseFloat(document.getElementById('w').value) || 0; let hR = parseFloat(document.getElementById('h').value) || 0;
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
    document.getElementById('partsManager').innerHTML = html || `<div class="empty-state"><div class="empty-icon">📏</div>Input dimensions to initialize structural grid</div>`;
}

function toggleGBar(idx) { let el = document.getElementById('gbar_'+idx); el.style.display = (el.style.display === 'block') ? 'none' : 'block'; }
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
    let d = { 
        w: parseFloat(document.getElementById("w").value)||0, h: parseFloat(document.getElementById("h").value)||0, 
        unit: document.getElementById("unit").value, tag: document.getElementById("winTag").value, 
        glass: document.getElementById("glassSpec").value, color: document.getElementById("colorSpec").value, 
        series: (document.getElementById("seriesSpec").value === "MANUAL" ? document.getElementById("seriesManual").value : document.getElementById("seriesSpec").value), 
        qty: document.getElementById("qtySpec").value,
        rate: document.getElementById("rateSpec").value, 
        mesh: (document.getElementById("meshSpec").value === "MANUAL" ? document.getElementById("meshManual").value : document.getElementById("meshSpec").value), 
        notes: document.getElementById("notes").value, boxes: currentBoxes 
    }; 
    drawIndividual(document.getElementById("previewCanvas"), d, true); 
}

function drawIndividual(canvas, d, isP) {
    var ctx = canvas.getContext("2d"); ctx.fillStyle = "white"; ctx.fillRect(0,0, canvas.width, canvas.height); 
    if(d.w <= 0 || d.h <= 0 || d.boxes.length === 0) return;
    
    let wB = toBase(d.w, d.unit); let hB = toBase(d.h, d.unit); var scale = Math.min((canvas.width-80)/(wB*304.8), (canvas.height/2-80)/(hB*304.8)); var x = 40, y = 80; 
    ctx.strokeStyle = "#0f172a"; ctx.lineWidth = 1.5; ctx.fillStyle = "#0f172a"; ctx.font = "bold 11px Arial"; ctx.textAlign = "center"; let uL = (d.unit==="feet"?" FT":(d.unit==="inch"?"\"":" MM"));
    
    ctx.fillText(d.w.toFixed(2) + uL, x + (wB*304.8*scale)/2, y - 60); ctx.beginPath(); ctx.moveTo(x, y-55); ctx.lineTo(x+(wB*304.8*scale), y-55); ctx.stroke(); drawTick(ctx, x, y-55, false); drawTick(ctx, x+(wB*304.8*scale), y-55, false);
    ctx.save(); ctx.translate(x-30, y+(hB*304.8*scale)/2); ctx.rotate(-Math.PI/2); ctx.fillText(d.h.toFixed(2)+uL,0,0); ctx.restore(); ctx.beginPath(); ctx.moveTo(x-25, y); ctx.lineTo(x-25, y+(hB*304.8*scale)); ctx.stroke(); drawTick(ctx, x-25, y, true); drawTick(ctx, x-25, y+(hB*304.8*scale), true);
    
    let xs = [...new Set(d.boxes.map(b => b.x.toFixed(4)).concat(wB.toFixed(4)))].map(Number).sort((a,b)=>a-b); let ys = [...new Set(d.boxes.map(b => b.y.toFixed(4)).concat(hB.toFixed(4)))].map(Number).sort((a,b)=>a-b);
    if(xs.length > 2) { ctx.beginPath(); ctx.moveTo(x, y-25); ctx.lineTo(x+wB*304.8*scale, y-25); ctx.stroke(); xs.forEach((v,i) => { if(i<xs.length-1){ let sw = fromBase(xs[i+1]-v, d.unit); ctx.fillText(sw.toFixed(2)+uL, x+(v+(xs[i+1]-v)/2)*304.8*scale, y-30); drawTick(ctx, x+v*304.8*scale, y-25, false); } }); drawTick(ctx, x+wB*304.8*scale, y-25, false); }
    if(ys.length > 2) { ctx.beginPath(); ctx.moveTo(x-10, y); ctx.lineTo(x-10, y+hB*304.8*scale); ctx.stroke(); ys.forEach((v,i) => { if(i<ys.length-1){ let sh = fromBase(ys[i+1]-v, d.unit); ctx.save(); ctx.translate(x-15, y+(v+(ys[i+1]-v)/2)*304.8*scale); ctx.rotate(-Math.PI/2); ctx.fillText(sh.toFixed(2)+uL,0,0); ctx.restore(); drawTick(ctx, x-10, y+v*304.8*scale, true); } }); drawTick(ctx, x-10, y+hB*304.8*scale, true); }
    
    d.boxes.forEach(b => {
        let bx = x+b.x*304.8*scale, by = y+b.y*304.8*scale, bw = b.w*304.8*scale, bh = b.h*304.8*scale; ctx.strokeRect(bx, by, bw, bh); let p = parseInt(b.p) || 1, pw = bw/p;
        for(let j=0; j<p; j++) { let pX = bx + j*pw; let gb = b.gBars[j] || {h:0, v:0}; ctx.lineWidth = 0.5; ctx.strokeStyle = "#64748b"; if(gb.h > 0) { for(let k=1; k<=gb.h; k++){ let gy = by+(bh/(gb.h+1))*k; ctx.beginPath(); ctx.moveTo(pX,gy); ctx.lineTo(pX+pw,gy); ctx.stroke(); } } if(gb.v > 0) { for(let k=1; k<=gb.v; k++){ let gx = pX+(pw/(gb.v+1))*k; ctx.beginPath(); ctx.moveTo(gx,by); ctx.lineTo(gx,by+bh); ctx.stroke(); } } } 
        ctx.lineWidth = 1.5; ctx.strokeStyle = "#0f172a"; if (b.type === 'sliding' || b.type === 'fixed') { for(let i=1; i<p; i++){ ctx.beginPath(); ctx.moveTo(bx+pw*i, by); ctx.lineTo(bx+pw*i, by+bh); ctx.stroke(); } if (p > 1) { for(let j=0; j<p; j++) ctx.fillText(fromBase(b.w/p, d.unit).toFixed(2)+uL, bx+pw*j+pw/2, by+bh+15); } }
        if (b.type === 'door') { ctx.setLineDash([5, 5]); ctx.beginPath(); if(b.doorType === 'double') { let gap = 10; let pW = (bw - gap) / 2; ctx.moveTo(bx, by); ctx.lineTo(bx+pW, by+bh/2); ctx.lineTo(bx, by+bh); ctx.moveTo(bx+bw, by); ctx.lineTo(bx+bw-pW, by+bh/2); ctx.lineTo(bx+bw, by+bh); } else if(b.doorType === '1L') { ctx.moveTo(bx, by); ctx.lineTo(bx+bw, by+bh/2); ctx.lineTo(bx, by+bh); } else if(b.doorType === '1R') { ctx.moveTo(bx+bw, by); ctx.lineTo(bx, by+bh/2); ctx.lineTo(bx+bw, by+bh); } else if(b.doorType === 'tophung') { ctx.moveTo(bx, by); ctx.lineTo(bx+bw/2, by+bh); ctx.lineTo(bx+bw, by); } ctx.stroke(); ctx.setLineDash([]); } else if (b.type === 'fan') { let r = Math.min(bw, bh)*0.3; ctx.beginPath(); ctx.arc(bx+bw/2, by+bh/2, r, 0, 2*Math.PI); ctx.stroke(); ctx.moveTo(bx+bw/2-r*0.7, by+bh/2-r*0.7); ctx.lineTo(bx+bw/2+r*0.7, by+bh/2+r*0.7); ctx.moveTo(bx+bw/2+r*0.7, by+bh/2-r*0.7); ctx.lineTo(bx+bw/2-r*0.7, by+bh/2+r*0.7); ctx.stroke(); }
    });
    
    let qty = parseFloat(d.qty) || parseFloat(document.getElementById("qtySpec").value) || 1;
    let area = (wB * hB * qty).toFixed(2);
    let rate = parseFloat(d.rate) || 0;
    let amount = (area * rate).toFixed(2);

    if(isP) {
        document.getElementById("areaSpec").value = area;
    }

    ctx.textAlign="left"; ctx.font="bold 12px Arial"; 
    let sX = 15; let sY = y + hB*304.8*scale + 40; let mW = canvas.width - 30; 
    
    ctx.fillStyle = "#0f172a"; ctx.fillText("TAG NO / S.NO: ", sX, sY); 
    let idLW = ctx.measureText("TAG NO / S.NO: ").width; 
    
    if(!d.tag) { ctx.fillStyle = "#ef4444"; ctx.fillText("PENDING", sX + idLW, sY); 
    } else { ctx.fillStyle = "#4f46e5"; ctx.fillText(String(d.tag).toUpperCase(), sX + idLW, sY); }
    
    sY += 24; ctx.fillStyle = "#0f172a"; ctx.font="bold 11px Arial"; ctx.fillText("ENGINEERING SPECIFICATIONS:", sX, sY); sY += 16;

    let sps = [
        {l:"SERIES SYSTEM: ", v:d.series}, {l:"GLASS: ", v:d.glass}, 
        {l:"COLOR: ", v:d.color}, {l:"MESH OPTION: ", v:d.mesh}, 
        {l:"QUANTITY: ", v:qty}, {l:"AREA (SQ.FT): ", v:area}, 
        {l:"RATE / SQ.FT: ", v:rate}, {l:"TOTAL AMOUNT: ", v: rate > 0 ? "₹ " + amount : ""}
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
    let d = { 
        w: parseFloat(document.getElementById("w").value), h: parseFloat(document.getElementById("h").value), unit: document.getElementById("unit").value, tag: document.getElementById("winTag").value, glass: document.getElementById("glassSpec").value, color: document.getElementById("colorSpec").value, series: (document.getElementById("seriesSpec").value === "MANUAL" ? document.getElementById("seriesManual").value : document.getElementById("seriesSpec").value), 
        qty: document.getElementById("qtySpec").value,
        area: document.getElementById("areaSpec").value, rate: document.getElementById("rateSpec").value, mesh: (document.getElementById("meshSpec").value === "MANUAL" ? document.getElementById("meshManual").value : document.getElementById("meshSpec").value), notes: document.getElementById("notes").value, boxes: JSON.parse(JSON.stringify(currentBoxes)) 
    }; 
    let idx = parseInt(document.getElementById("editIndex").value); 
    if(idx === -1) projectWindows.push(d); else projectWindows[idx] = d; 
    renderProject(); clearAll(); 
    setTimeout(() => { document.getElementById("projectSheet").scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 100);
}

function clearAll() { 
    document.getElementById("w").value = ""; document.getElementById("h").value = ""; document.getElementById("winTag").value = ""; document.getElementById("notes").value = ""; document.getElementById("glassSpec").value = ""; document.getElementById("colorSpec").value = ""; document.getElementById("seriesSpec").value = ""; document.getElementById("seriesManual").value = ""; document.getElementById("seriesManual").classList.add("hidden"); document.getElementById("areaSpec").value = ""; document.getElementById("rateSpec").value = ""; document.getElementById("meshSpec").value = ""; document.getElementById("meshManual").value = ""; document.getElementById("meshManual").classList.add("hidden"); 
    document.getElementById("qtySpec").value = "1";
    currentBoxes = []; historyStack = []; document.getElementById('partsManager').innerHTML = `<div class="empty-state"><div class="empty-icon">📏</div>Input dimensions to initialize structural grid</div>`; document.getElementById("editIndex").value = "-1"; drawPreview(); 
}

function renderProject() {
    let hasW = projectWindows.length > 0;
    document.getElementById("welcomePage").style.display = hasW ? "block" : "none"; 
    document.getElementById("projectSheet").style.display = hasW ? "block" : "none"; 
    document.getElementById("drawingsTable").style.display = hasW ? "table" : "none";
    document.getElementById("printSite").innerText = (document.getElementById("siteLoc").value || "---").toUpperCase(); 
    document.getElementById("printDate").innerText = document.getElementById("projDate").value || "---"; 
    document.getElementById("printClientName").innerText = (document.getElementById("clientName").value || "---").toUpperCase();
    document.getElementById("printWelcomeLetter").innerText = document.getElementById("welcomeText").value.toUpperCase(); 
    document.getElementById("printDisclaimerText").innerText = document.getElementById("disclaimerText").value.toUpperCase();
    let l = document.getElementById("windowList"); l.innerHTML = "";
    projectWindows.forEach((win, i) => {
        let div = document.createElement("div"); div.className = "drawing-container";
        div.innerHTML = `<button class="copy-btn" onclick="copyWindow(${i})">COPY</button><button class="edit-btn-saved" onclick="editWindow(${i})">EDIT</button><button class="del-btn-saved" onclick="deleteSaved(${i})">X</button>`;
        let cvs = document.createElement("canvas"); cvs.width = 346; cvs.height = 650; 
        div.appendChild(cvs); l.appendChild(div); drawIndividual(cvs, win, false);
    }); 
}

function deleteSaved(idx) { if(confirm("DELETE?")) { projectWindows.splice(idx,1); renderProject(); } }

function assignSpecValues(d) {
    let stdS = ["M PLUS 65", "M PLUS 16 SLIM", "M PRIME 55", "M PRIME 20 SLIM", "M PRO 50 TR", "M PRO 15 FB", ""]; 
    if (stdS.includes(d.series)) { document.getElementById("seriesSpec").value = d.series; document.getElementById("seriesManual").classList.add("hidden"); } else { document.getElementById("seriesSpec").value = "MANUAL"; document.getElementById("seriesManual").value = d.series; document.getElementById("seriesManual").classList.remove("hidden"); } 
    let stdM = ["PLEATED INSIDE", "PLEATED OUTSIDE", "REGULAR", "NO MESH", ""]; 
    if (stdM.includes(d.mesh)) { document.getElementById("meshSpec").value = d.mesh; document.getElementById("meshManual").classList.add("hidden"); } else { document.getElementById("meshSpec").value = "MANUAL"; document.getElementById("meshManual").value = d.mesh; document.getElementById("meshManual").classList.remove("hidden"); }
}

function copyWindow(i) { 
    let d = projectWindows[i]; document.getElementById("w").value = d.w; document.getElementById("h").value = d.h; document.getElementById("unit").value = d.unit; document.getElementById("winTag").value = d.tag + " (COPY)"; document.getElementById("glassSpec").value = d.glass || ""; document.getElementById("colorSpec").value = d.color || ""; assignSpecValues(d); document.getElementById("qtySpec").value = d.qty || "1"; document.getElementById("areaSpec").value = d.area || ""; document.getElementById("rateSpec").value = d.rate || ""; document.getElementById("notes").value = d.notes; currentBoxes = JSON.parse(JSON.stringify(d.boxes)); document.getElementById("editIndex").value = "-1"; renderPartsUI(); drawPreview(); window.scrollTo({top: 0, behavior: 'smooth'});
}

function editWindow(i) { 
    let d = projectWindows[i]; document.getElementById("w").value = d.w; document.getElementById("h").value = d.h; document.getElementById("unit").value = d.unit; document.getElementById("winTag").value = d.tag; document.getElementById("glassSpec").value = d.glass || ""; document.getElementById("colorSpec").value = d.color || ""; assignSpecValues(d); document.getElementById("qtySpec").value = d.qty || "1"; document.getElementById("areaSpec").value = d.area || ""; document.getElementById("rateSpec").value = d.rate || ""; document.getElementById("notes").value = d.notes; currentBoxes = JSON.parse(JSON.stringify(d.boxes)); historyStack = []; document.getElementById("editIndex").value = i; renderPartsUI(); drawPreview(); window.scrollTo({top: 0, behavior: 'smooth'});
}