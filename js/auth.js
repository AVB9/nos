/* =========================================
   NEET OS: AUTHENTICATION MANAGER (SPA)
   ========================================= */

window.switchAuthDeck = function(deckName) {
    const decks = ['couch', 'login', 'register', 'forgot'];
    decks.forEach(d => {
        const el = document.getElementById('deck-' + d);
        if (el) el.style.display = 'none';
    });
    const target = document.getElementById('deck-' + deckName);
    if (target) target.style.display = 'block';
};

window.AuthManager = {
    async init() {
        const authGate = document.getElementById('os-auth-gate');
        const bootStartTime = Date.now();
        const isReload = sessionStorage.getItem('neet_os_booted');

        try {
            if (!window._supabase) {
                window._supabase = supabase.createClient('https://qsaxixaqeyjvnjcwsbxh.supabase.co', 'sb_publishable_g_Bw2UyJrPB-r10cRlbi7Q_KJ9Ai7Ib');
            }

            const { data: { session }, error } = await window._supabase.auth.getSession();
            if (error) throw error;

            if (session) {
                authGate.style.display = 'none'; 
                
                const profileEmailEl = document.getElementById('os-profile-email');
                if (profileEmailEl) profileEmailEl.innerText = session.user.email;
                
                if (typeof SyncEngine !== 'undefined') {
                    await SyncEngine.init(); 
                }
            } else {
                switchAuthDeck('couch');
                authGate.style.display = 'flex'; 
            }
        } catch (err) {
            console.error("[AuthManager] Init error:", err.message);
            switchAuthDeck('couch');
            authGate.style.display = 'flex';
        } finally {
            const minimumBootTime = isReload ? 400 : 2500; 
            const timeElapsed = Date.now() - bootStartTime;
            const delayNeeded = Math.max(0, minimumBootTime - timeElapsed);

            setTimeout(() => {
                sessionStorage.setItem('neet_os_booted', 'true');
                if (typeof window.dismissNeetPreloader === 'function') {
                    window.dismissNeetPreloader();
                }
            }, delayNeeded);
        }
    },

    async login() {
        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;
        if (!email || !password) return alert("Email and Password required.");

        try {
            const { error } = await window._supabase.auth.signInWithPassword({ email, password });
            if (error) throw error;
            window.location.reload(); 
        } catch (err) {
            alert("Login failed: " + err.message);
        }
    },

    async register() {
        const email = document.getElementById('regEmail').value;
        const password = document.getElementById('regPassword').value;
        if (!email || !password) return alert("Email and Password required.");

        try {
            const { error } = await window._supabase.auth.signUp({ email, password });
            if (error) throw error;
            alert("Account registered successfully. You may now log in.");
            switchAuthDeck('login');
        } catch (err) {
            alert("Registration failed: " + err.message);
        }
    },

    async resetPassword() {
        const email = document.getElementById('forgotEmail').value;
        if (!email) return alert("Please enter your account email.");

        try {
            const { error } = await window._supabase.auth.resetPasswordForEmail(email);
            if (error) throw error;
            alert("If an account exists, a password reset link has been sent to that email.");
            switchAuthDeck('login');
        } catch (err) {
            alert("Error: " + err.message);
        }
    },

    async updatePassword() {
        const newPassword = document.getElementById('profileNewPassword').value;
        if (!newPassword || newPassword.length < 6) return alert("Password must be at least 6 characters.");

        try {
            const { error } = await window._supabase.auth.updateUser({ password: newPassword });
            if (error) throw error;
            alert("Password updated successfully.");
            document.getElementById('profileNewPassword').value = '';
        } catch (err) {
            alert("Update failed: " + err.message);
        }
    },

    async logout() {
        try {
            document.getElementById('profileModalOverlay').style.display = 'none';
            if (typeof window.resetNeetPreloader === 'function') {
                window.resetNeetPreloader();
            }
            await window._supabase.auth.signOut();
            
            localStorage.clear();
            sessionStorage.removeItem('neet_os_booted');
            
            setTimeout(() => { window.location.reload(); }, 500);
        } catch (err) {
            console.error("Logout error:", err.message);
        }
    }
};

document.addEventListener('DOMContentLoaded', () => {
    AuthManager.init();
});