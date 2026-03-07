/* =========================================
   NEET OS: SHADOW SYNC ENGINE (Nuclear Patch)
   ========================================= */

window.SyncEngine = {
    isReady: false,
    session: null,
    syncTimer: null,

    async init() {
        try {
            const { data: { session }, error } = await window._supabase.auth.getSession();
            if (error) throw error;

            if (session) {
                this.session = session;
                this.isReady = true;
                await this.pullCloudData(); 
            }
        } catch (err) {
            console.error("[SyncEngine] Initialization failed:", err.message);
        }
    },

    async pullCloudData() {
        if (!this.session) return;

        try {
            console.log("[SyncEngine] Pulling cloud state...");
            const { data, error } = await window._supabase
                .from('user_data')
                .select('payload')
                .eq('user_id', this.session.user.id)
                .single();

            if (error && error.code !== 'PGRST116') throw error; 

            if (data && data.payload) {
                Object.keys(data.payload).forEach(key => {
                    // NUCLEAR SECURITY FIX: Block ALL ghost auth keys from the cloud
                    if (key.startsWith('sb-') || key.includes('supabase') || key.includes('auth')) return; 
                    localStorage.setItem(key, data.payload[key]);
                });
                console.log("[SyncEngine] LocalStorage updated from Cloud.");
            }
        } catch (err) {
            console.error("[SyncEngine] Pull failed:", err.message);
        }
    },

    pushShadow() {
        if (!this.isReady || !this.session) return;

        clearTimeout(this.syncTimer);
        
        this.syncTimer = setTimeout(async () => {
            try {
                const snapshot = {};
                for (let i = 0; i < localStorage.length; i++) {
                    const k = localStorage.key(i);
                    // NUCLEAR SECURITY FIX: Never upload auth keys to the cloud
                    if (k.startsWith('sb-') || k.includes('supabase') || k.includes('auth')) continue; 
                    snapshot[k] = localStorage.getItem(k);
                }

                const { error } = await window._supabase
                    .from('user_data')
                    .upsert({ 
                        user_id: this.session.user.id, 
                        payload: snapshot 
                    });

                if (error) throw error;
                console.log("[SyncEngine] Shadow sync complete.");
                
            } catch (err) {
                console.error("[SyncEngine] Push failed:", err.message);
            }
        }, 2000); 
    },

    removeShadow(key) {
        this.pushShadow();
    }
};