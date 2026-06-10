// --- Supabase Initialization ---
const supabaseUrl = 'https://kqgtomdvgpiuvfuoiyjw.supabase.co'; 
const supabaseKey = 'sb_publishable_nQuk3NkG2oB2zESabijRMA_fGoOxgNT'; 
const supabaseClient = window.supabase.createClient(supabaseUrl, supabaseKey);

document.addEventListener("DOMContentLoaded", () => {
    checkAdminAccess();
    setupSearch(); // Initialize the search bar listener
});

// --- NEW: Live Search Filter ---
function setupSearch() {
    const searchInput = document.getElementById('searchInput');
    if(searchInput) {
        searchInput.addEventListener('input', function(e) {
            const searchTerm = e.target.value.toLowerCase();
            const rows = document.querySelectorAll('#userTableBody tr');
            
            rows.forEach(row => {
                const textContent = row.innerText.toLowerCase();
                if (textContent.includes(searchTerm)) {
                    row.style.display = ''; // Show row
                } else {
                    row.style.display = 'none'; // Hide row
                }
            });
        });
    }
}

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

// 3. Fetch and Display Users
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

        let dueDateStr = user.subscription_end_date ? new Date(user.subscription_end_date).toLocaleDateString() : '<span style="color:var(--text-muted)">Not Set</span>';

        // NEW: Grab the extra details (with fallbacks just in case you have old test accounts)
        let name = user.full_name || "Unknown Name";
        let phone = user.phone || "No Phone Provided";
        let address = user.address || "No Address Provided";

        tr.innerHTML = `
            <td style="padding: 12px;">
                <div style="font-weight: 600; color: var(--brand-dark); font-size: 14px;">${name}</div>
                <div style="font-size: 11px; color: var(--text-muted); margin-top: 4px; line-height: 1.4;">
                    ✉️ ${user.email}<br>
                    📞 ${phone}<br>
                    📍 ${address}
                </div>
            </td>
            <td style="padding: 12px; color: var(--text-muted);">${user.role}</td>
            <td style="padding: 12px;">${statusBadge}</td>
            <td style="padding: 12px;">${dueDateStr}</td> 
            <td style="padding: 12px;">
                ${user.role === 'admin' ? '<span style="color: #cbd5e1;">Admin Account</span>' : actionBtn}
                ${user.role !== 'admin' ? `<button class="btn btn-micro btn-micro-danger" style="margin-top: 5px; display: block;" onclick="deleteUserProfile('${user.id}')">🗑️ Delete</button>` : ''}
            </td>
        `;
        tbody.appendChild(tr);
    });
}

async function updateStatus(userId, newStatus) {
    let updatePayload = { payment_status: newStatus };

    // If clearing payment, ask for subscription length
    if (newStatus === 'cleared') {
        let duration = prompt("Extend subscription for 1 Month or 1 Year?\nType 'M' for Month, 'Y' for Year.", "M");
        if (duration) {
            let endDate = new Date();
            if (duration.toUpperCase() === 'Y') {
                endDate.setFullYear(endDate.getFullYear() + 1); // Add 1 Year
            } else {
                endDate.setMonth(endDate.getMonth() + 1); // Add 1 Month
            }
            // Format to YYYY-MM-DD for database
            updatePayload.subscription_end_date = endDate.toISOString().split('T')[0]; 
        } else {
            return; // Cancelled by admin
        }
    } else {
        // If revoking access, remove the end date
        updatePayload.subscription_end_date = null;
    }

    const { error } = await supabaseClient
        .from('profiles')
        .update(updatePayload)
        .eq('id', userId);
        
    if (!error) {
        loadUsers(); 
    } else {
        alert("Error updating status: " + error.message);
    }
}

// --- NEW: Delete Profile Function ---
async function deleteUserProfile(userId) {
    if(confirm("⚠️ Are you sure you want to delete this user's profile data? This will permanently remove them from this list.")) {
        const { error } = await supabaseClient
            .from('profiles')
            .delete()
            .eq('id', userId);

        if (error) {
            alert("Error deleting profile: " + error.message);
        } else {
            alert("User profile deleted successfully.\n\nNote: To completely erase their login capabilities, delete their email from the Authentication tab in your Supabase Dashboard.");
            loadUsers(); // Refresh the table
        }
    }
}

async function adminLogout() {
    await supabaseClient.auth.signOut();
    window.location.reload(); 
}