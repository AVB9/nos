// =================================================================
// SYSTEM KERNEL (Hybrid Storage: Local-First + Shadow Sync)
// =================================================================
window.OS = {
    Storage: {
        get: function(key, defaultValue = null) {
            try {
                // Always read from local storage for 0ms latency
                const item = localStorage.getItem(key);
                if (item === null) return defaultValue;
                
                try { return JSON.parse(item); } catch (e) { return item; }
            } catch (e) {
                console.error(`[OS Kernel Error] Failed to read key: ${key}`, e);
                return defaultValue;
            }
        },
        
        set: function(key, value) {
            try {
                const valueToSave = typeof value === 'object' ? JSON.stringify(value) : value;
                
                // 1. SYNCHRONOUS LOCAL SAVE (Instant, offline-proof)
                localStorage.setItem(key, valueToSave);

                // 2. ASYNCHRONOUS SHADOW SYNC (Cloud backup, non-blocking)
                if (typeof SyncEngine !== 'undefined' && SyncEngine.isReady) {
                    SyncEngine.pushShadow(key, valueToSave);
                }

                return true;
            } catch (e) {
                console.error(`[OS Kernel Error] Failed to write key: ${key}`, e);
                return false;
            }
        },
        
        remove: function(key) {
            try {
                localStorage.removeItem(key);
                
                if (typeof SyncEngine !== 'undefined' && SyncEngine.isReady) {
                    SyncEngine.removeShadow(key);
                }
            } catch (e) {
                console.error(`[OS Kernel Error] Failed to delete key: ${key}`, e);
            }
        }
    }
};