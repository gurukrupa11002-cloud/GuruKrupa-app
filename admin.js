// --- Supabase Initialization ---
const supabaseUrl = 'https://kqgtomdvgpiuvfuoiyjw.supabase.co'; 
const supabaseKey = 'sb_publishable_nQuk3NkG2oB2zESabijRMA_fGoOxgNT'; 
const supabaseClient = window.supabase.createClient(supabaseUrl, supabaseKey);

document.addEventListener("DOMContentLoaded", () => {
    checkAdminAccess();
});

async function handleAdminLogin() {
    const email = document.getElementById('adminEmail').value;
    const password = document.getElementById('adminPassword').value;
    const msg = document.getElementById('adminAuthMsg');
    
    msg.style.color = "var(--text-muted)";
    msg.innerText = "Authenticating...";

    const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
    
    if (error) {
        msg.style.color = "var(--danger)";
        msg.innerText = error.message;
    } else {
        msg.innerText = "";
        checkAdminAccess(); 
    }
}

async function checkAdminAccess() {
    const { data: { session } } = await supabaseClient.auth.getSession();
    
    if (!session) {
        document.getElementById('adminAuthScreen').style.display = 'flex';
        document.getElementById('adminDashboard').style.display = 'none';
        return;
    }

    const { data: profile } = await supabaseClient
        .from('profiles')
        .select('role')
        .eq('id', session.user.id)
        .single();

    if (!profile || profile.role !== 'admin') {
        await supabaseClient.auth.signOut();
        document.getElementById('adminAuthMsg').innerText = "Access Denied: Administrator privileges required.";
        document.getElementById('adminAuthMsg').style.color = "var(--danger)";
        
        document.getElementById('adminAuthScreen').style.display = 'flex';
        document.getElementById('adminDashboard').style.display = 'none';
        return;
    }

    document.getElementById('adminAuthScreen').style.display = 'none';
    document.getElementById('adminDashboard').style.display = 'block';
    loadUsers();
}

async function loadUsers() {
    const { data: profiles, error } = await supabaseClient
        .from('profiles')
        .select('*');

    const tbody = document.getElementById('userTableBody');
    tbody.innerHTML = '';

    if (error) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--danger); padding: 20px;">Error loading users.</td></tr>`;
        return;
    }

    profiles.forEach(user => {
        const tr = document.createElement('tr');
        tr.style.borderBottom = "1px solid var(--border-color)";

        let statusBadge = user.payment_status === 'cleared'
            ? `<span style="background: #dcfce7; color: #166534; padding: 4px 8px; border-radius: 4px; font-weight: 600; font-size: 11px;">CLEARED</span>`
            : `<span style="background: #fee2e2; color: #991b1b; padding: 4px 8px; border-radius: 4px; font-weight: 600; font-size: 11px;">PENDING</span>`;

        let actionBtn = user.payment_status === 'pending'
            ? `<button class="btn btn-micro" style="background: var(--accent-primary); color: white; border: none;" onclick="updateStatus('${user.id}', 'cleared')">✅ Clear Payment</button>`
            : `<button class="btn btn-micro" onclick="updateStatus('${user.id}', 'pending')">🔒 Revoke Access</button>`;

        // New layout showing User Info + Contact Details
        tr.innerHTML = `
            <td style="padding: 12px;">
                <span style="font-weight: 600; color: var(--brand-dark);">${user.full_name || 'N/A'}</span><br>
                <span style="color: var(--accent-primary); font-size: 11px;">${user.email}</span>
            </td>
            <td style="padding: 12px; color: var(--text-muted); font-size: 12px;">
                📞 ${user.phone || 'No Phone'}<br>
                📍 ${user.address || 'No Address'}
            </td>
            <td style="padding: 12px; color: var(--text-muted);">${user.role}</td>
            <td style="padding: 12px;">${statusBadge}</td>
            <td style="padding: 12px;">${user.role === 'admin' ? '<span style="color: #cbd5e1;">Admin Account</span>' : actionBtn}</td>
        `;
        tbody.appendChild(tr);
    });
}

async function updateStatus(userId, newStatus) {
    const { error } = await supabaseClient
        .from('profiles')
        .update({ payment_status: newStatus })
        .eq('id', userId);

    if (!error) {
        loadUsers(); 
    } else {
        alert("Error updating status: " + error.message);
    }
}

async function adminLogout() {
    await supabaseClient.auth.signOut();
    window.location.reload(); 
}