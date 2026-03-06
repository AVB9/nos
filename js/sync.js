/* =========================================
   NEET OS: SHADOW SYNC ENGINE
   ========================================= */

window.SyncEngine = {
    isReady: false,
    session: null,
    syncTimer: null,

    async init() {
        try {
            // FIX: Added window. prefix
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
            // FIX: Added window. prefix
            const { data, error } = await window._supabase
                .from('user_data')
                .select('payload')
                .eq('user_id', this.session.user.id)
                .single();

            if (error && error.code !== 'PGRST116') throw error; 

            if (data && data.payload) {
                Object.keys(data.payload).forEach(key => {
                    localStorage.setItem(key, data.payload[key]);
                });
                console.log("[SyncEngine] LocalStorage updated from Cloud.");
            }
        } catch (err) {
            console.error("[SyncEngine] Pull failed:", err.message);
        }
    },

    pushShadow(key, value) {
        if (!this.isReady || !this.session) return;

        clearTimeout(this.syncTimer);
        
        this.syncTimer = setTimeout(async () => {
            try {
                const snapshot = {};
                for (let i = 0; i < localStorage.length; i++) {
                    const k = localStorage.key(i);
                    snapshot[k] = localStorage.getItem(k);
                }

                // FIX: Added window. prefix
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
