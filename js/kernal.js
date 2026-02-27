// =================================================================
// SYSTEM KERNEL (Global Storage & Utility Wrapper)
// =================================================================
window.OS = {
    Storage: {
        get: function(key, defaultValue = null) {
            try {
                const item = localStorage.getItem(key);
                if (item === null) return defaultValue;
                
                try {
                    return JSON.parse(item);
                } catch (e) {
                    return item; 
                }
            } catch (e) {
                console.error(`[OS Kernel Error] Failed to read key: ${key}`, e);
                return defaultValue;
            }
        },
        
        set: function(key, value) {
            try {
                const valueToSave = typeof value === 'object' ? JSON.stringify(value) : value;
                localStorage.setItem(key, valueToSave);
                return true;
            } catch (e) {
                console.error(`[OS Kernel Error] Failed to write key: ${key}`, e);
                if (typeof showCustomModal === 'function') {
                    showCustomModal("Storage Error! Please export your data and clear space.", true, null);
                }
                return false;
            }
        },
        
        remove: function(key) {
            try {
                localStorage.removeItem(key);
            } catch (e) {
                console.error(`[OS Kernel Error] Failed to delete key: ${key}`, e);
            }
        }
    }
};
