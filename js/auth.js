/* =========================================
   NEET OS: AUTHENTICATION MANAGER (SPA)
   ========================================= */

window.switchAuthDeck = function(deckName) {
    const decks = ['couch', 'login', 'register', 'forgot', 'recovery'];
    
    decks.forEach(d => {
        const el = document.getElementById('deck-' + d);
        if (el) el.style.display = 'none';
    });
    
    const target = document.getElementById('deck-' + deckName);
    if (target) target.style.display = 'block';

    const glassLogo = document.querySelector('.couch-glass-logo');
    if (glassLogo) {
        if (deckName === 'couch') {
            glassLogo.classList.remove('glass-exit');
            glassLogo.style.animation = 'none';
            void glassLogo.offsetWidth; 
            glassLogo.style.animation = '';
        } else {
            glassLogo.classList.add('glass-exit');
        }
    }
};

window.AuthManager = {
    async init() {
        const authGate = document.getElementById('os-auth-gate');
        const bootStartTime = Date.now();
        const isReload = sessionStorage.getItem('neet_os_booted');
        const isRecovery = window.location.hash.includes('type=recovery');

        try {
            if (!window._supabase) {
                window._supabase = supabase.createClient(
                    'https://qsaxixaqeyjvnjcwsbxh.supabase.co', 
                    'sb_publishable_g_Bw2UyJrPB-r10cRlbi7Q_KJ9Ai7Ib'
                );
            }

            const { data: { session }, error } = await window._supabase.auth.getSession();
            if (error) throw error;

            if (session) {
                if (isRecovery) {
                    authGate.style.display = 'flex';
                    switchAuthDeck('recovery');
                    window.history.replaceState(null, '', window.location.pathname);
                } else {
                    authGate.style.display = 'none'; 
                    
                    const profileNameEl = document.getElementById('os-profile-name');
                    const profileEmailEl = document.getElementById('os-profile-email');
                    
                    if (profileNameEl) profileNameEl.innerText = session.user.user_metadata?.display_name || 'NEET User';
                    if (profileEmailEl) profileEmailEl.innerText = session.user.email;
                    
                    if (typeof SyncEngine !== 'undefined') {
                        await SyncEngine.init(); 
                    }
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
                
                if (window.location.search.includes('boot=')) {
                    window.history.replaceState(null, '', window.location.pathname);
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
            const preloader = document.getElementById('neet-preloader');
            if (preloader) preloader.classList.add('hidden');
            
            alert("Login failed: " + err.message);
        }
    },

    async register() {
        const name = document.getElementById('regName').value;
        const email = document.getElementById('regEmail').value;
        const password = document.getElementById('regPassword').value;
        
        if (!name || !email || !password) return alert("Name, Email, and Password required.");

        try {
            const { error } = await window._supabase.auth.signUp({ 
                email, 
                password,
                options: { data: { display_name: name } }
            });
            if (error) throw error;
            
            alert("Account registered! You may now log in.");
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
            
            alert("Reset link sent to your email.");
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
            
            // SMART WIPE: Rescue the theme before logging out
            const savedTheme = localStorage.getItem('neetTheme');
            localStorage.clear();
            if (savedTheme) localStorage.setItem('neetTheme', savedTheme);
            
            sessionStorage.removeItem('neet_os_booted');
            
            setTimeout(() => { 
                window.location.href = window.location.pathname + '?logout=' + Date.now(); 
            }, 500);
        } catch (err) {
            console.error("Logout error:", err.message);
        }
    }
};

document.addEventListener('DOMContentLoaded', () => {
    AuthManager.init();
});