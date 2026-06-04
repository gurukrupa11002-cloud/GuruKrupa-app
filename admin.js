// --- Supabase Initialization ---
const supabaseUrl = 'https://kqgtomdvgpiuvfuoiyjw.supabase.co'; 
const supabaseKey = 'sb_publishable_nQuk3NkG2oB2zESabijRMA_fGoOxgNT'; 
const supabaseClient = window.supabase.createClient(supabaseUrl, supabaseKey);

document.addEventListener("DOMContentLoaded", () => {
    checkAdminAccess();
});

// 1. Security Check
async function checkAdminAccess() {
    const { data: { session } } = await supabaseClient.auth.getSession();
    
    if (!session) {
        window.location.href = 'index.html'; // Kick out if not logged in
        return;
    }

    const { data: profile } = await supabaseClient
        .from('profiles')
        .select('role')
        .eq('id', session.user.id)
        .single();

    if (!profile || profile.role !== 'admin') {
        alert("Access Denied: You do not have administrator privileges.");
        window.location.href = 'index.html'; // Kick out if not an admin
        return;
    }

    // If they are an admin, load the table!
    loadUsers();
}

// 2. Fetch and Display Users
async function loadUsers() {
    const { data: profiles, error } = await supabaseClient
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false }); // Newest first

    const tbody = document.getElementById('userTableBody');
    tbody.innerHTML = '';

    profiles.forEach(user => {
        const tr = document.createElement('tr');
        tr.style.borderBottom = "1px solid var(--border-color)";

        // Style the status pill
        let statusBadge = user.payment_status === 'cleared'
            ? `<span style="background: #dcfce7; color: #166534; padding: 4px 8px; border-radius: 4px; font-weight: 600; font-size: 11px;">CLEARED</span>`
            : `<span style="background: #fee2e2; color: #991b1b; padding: 4px 8px; border-radius: 4px; font-weight: 600; font-size: 11px;">PENDING</span>`;

        // Create the action button
        let actionBtn = user.payment_status === 'pending'
            ? `<button class="btn btn-micro" style="background: var(--accent-primary); color: white; border: none;" onclick="updateStatus('${user.id}', 'cleared')">✅ Clear Payment</button>`
            : `<button class="btn btn-micro" onclick="updateStatus('${user.id}', 'pending')">🔒 Revoke Access</button>`;

        tr.innerHTML = `
            <td style="padding: 12px; font-weight: 500;">${user.email}</td>
            <td style="padding: 12px; color: var(--text-muted);">${user.role}</td>
            <td style="padding: 12px;">${statusBadge}</td>
            <td style="padding: 12px;">${user.role === 'admin' ? '<span style="color: #cbd5e1;">Admin Account</span>' : actionBtn}</td>
        `;
        tbody.appendChild(tr);
    });
}

// 3. Handle Button Clicks
async function updateStatus(userId, newStatus) {
    const { error } = await supabaseClient
        .from('profiles')
        .update({ payment_status: newStatus })
        .eq('id', userId);

    if (!error) {
        loadUsers(); // Refresh the table automatically
    } else {
        alert("Error updating status: " + error.message);
    }
}