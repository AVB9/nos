/* ==============================
   CUSTOM RESIZABLE IMAGE PLUGIN 
   ============================== */
class ResizableImage extends window.ImageTool {
    constructor(config) {
        super(config);
        this.customWidth = config.data.width || '60%';
    }

    render() {
        const wrapper = super.render();
        wrapper.style.width = this.customWidth;
        wrapper.style.margin = '0 auto';
        wrapper.style.position = 'relative';

        const handle = document.createElement('div');
        handle.className = 'neet-image-resize-handle';
        handle.innerHTML = '⤡'; 
        handle.title = 'Drag to resize';
        handle.style.cursor = 'nwse-resize';

        let startX, startWidth;

        const onMouseMove = (e) => {
            const newWidth = startWidth + (e.clientX - startX);
            const parentWidth = wrapper.parentElement.offsetWidth;
            let percentage = (newWidth / parentWidth) * 100;
            
            if (percentage < 20) percentage = 20;
            if (percentage > 100) percentage = 100;
            
            this.customWidth = percentage + '%';
            wrapper.style.width = this.customWidth;
        };

        const onMouseUp = () => {
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
            document.body.style.cursor = 'default';
        };

        handle.addEventListener('mousedown', (e) => {
            e.preventDefault();
            startX = e.clientX;
            startWidth = wrapper.offsetWidth;
            document.body.style.cursor = 'nwse-resize';
            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
        });

        wrapper.appendChild(handle);
        return wrapper;
    }

    save(blockContent) {
        const data = super.save(blockContent);
        if (data) data.width = this.customWidth;
        return data;
    }
}

const SUBJECT_KEYS = ['phy', 'chem', 'bio'];
const editorInstances = { phy: null, chem: null, bio: null };

const editorTools = {
    header: { class: window.Header, inlineToolbar: ['marker', 'link'], config: { placeholder: 'Enter a heading', levels: [1, 2, 3], defaultLevel: 2 } },
    list: { class: window.EditorjsList || window.List, inlineToolbar: true },
    image: {
        class: ResizableImage,
        config: {
            uploader: {
                uploadByFile(file) {
                    return new Promise((resolve, reject) => {
                        const reader = new FileReader();
                        reader.onload = (e) => resolve({ success: 1, file: { url: e.target.result } });
                        reader.onerror = (e) => reject(e);
                        reader.readAsDataURL(file);
                    });
                }
            }
        }
    },
    table: { class: window.Table, inlineToolbar: true },
    code: window.CodeTool || window.EditorjsCode,
    marker: { class: window.Marker, shortcut: 'CMD+SHIFT+M' },
    inlineCode: { class: window.InlineCode, shortcut: 'CMD+SHIFT+C' }
};

function initInfiniteCanvas() {
    initEditorInstance('phy');
}

function swapCanvas(sub, btn) {
    document.querySelectorAll('.canvas-tab').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    SUBJECT_KEYS.forEach(key => {
        const el = document.getElementById(`editor-${key}`);
        if(el) {
            el.style.display = 'none';
            el.classList.remove('active-box');
        }
    });

    const targetEl = document.getElementById(`editor-${sub}`);
    if (targetEl) {
        targetEl.style.display = 'block';
        setTimeout(() => targetEl.classList.add('active-box'), 10);
    }

    if (editorInstances[sub] === null) {
        initEditorInstance(sub);
    }
}

/* =================================================================
   NEET OS CUSTOM TABLE INJECTION 
   ================================================================= */
(function() {
    document.addEventListener('click', function(e) {
        if (e.target.classList.contains('neet-add-both-btn')) {
            const tableWrap = e.target.closest('.tc-wrap');
            if (tableWrap) {
                const addCol = tableWrap.querySelector('.tc-add-column');
                const addRow = tableWrap.querySelector('.tc-add-row');
                if (addCol) addCol.click();
                if (addRow) addRow.click();
            }
        }
    });

    const observer = new MutationObserver(() => {
        const tables = document.querySelectorAll('.tc-wrap:not(.has-neet-btn)');
        tables.forEach(table => {
            const btn = document.createElement('div');
            btn.className = 'neet-add-both-btn';
            btn.innerHTML = '⤡'; 
            btn.title = 'Add Row & Column';
            table.appendChild(btn);
            table.classList.add('has-neet-btn');
        });
    });

    observer.observe(document.body, { childList: true, subtree: true });
})();

/* =================================================================
   🎬 NEET OS ACTION LOGGER (Google Docs Style Undo/Redo)
   ================================================================= */
const ActionLogger = {
    history: { phy: { stack: [], index: 0 }, chem: { stack: [], index: 0 }, bio: { stack: [], index: 0 } },
    observers: {},
    debounceTimers: {},
    isRestoring: {},

    init: function(subject, initialData) {
        this.history[subject].stack = [JSON.stringify(initialData)];
        this.history[subject].index = 0;
        this.isRestoring[subject] = false;
    },

    startWatching: function(subject) {
        const container = document.getElementById(`editor-${subject}`);
        if (!container) return;

        const observer = new MutationObserver(() => {
            if (this.isRestoring[subject]) return;

            clearTimeout(this.debounceTimers[subject]);
            
            this.debounceTimers[subject] = setTimeout(async () => {
                if (!editorInstances[subject]) return;
                try {
                    const data = await editorInstances[subject].save();
                    const dataStr = JSON.stringify(data);
                    const hist = this.history[subject];
                    
                    if (hist.stack[hist.index] === dataStr) return;

                    if (hist.index < hist.stack.length - 1) {
                        hist.stack = hist.stack.slice(0, hist.index + 1);
                    }

                    hist.stack.push(dataStr);
                    hist.index++;

                    if (hist.stack.length > 50) {
                        hist.stack.shift();
                        hist.index--;
                    }

                    OS.Storage.set(`neetContent_${subject}`, data);

                } catch (e) {
                    console.error("ActionLogger failed:", e);
                }
            }, 300); 
        });

        observer.observe(container, { childList: true, characterData: true, subtree: true });
        this.observers[subject] = observer;
    },

    undo: async function(subject) {
        const hist = this.history[subject];
        if (hist.index > 0) {
            this.isRestoring[subject] = true;
            hist.index--;
            const parsedData = JSON.parse(hist.stack[hist.index]);
            await editorInstances[subject].blocks.render(parsedData);
            OS.Storage.set(`neetContent_${subject}`, parsedData);
            setTimeout(() => { this.isRestoring[subject] = false; }, 100); 
        }
    },

    redo: async function(subject) {
        const hist = this.history[subject];
        if (hist.index < hist.stack.length - 1) {
            this.isRestoring[subject] = true;
            hist.index++;
            const parsedData = JSON.parse(hist.stack[hist.index]);
            await editorInstances[subject].blocks.render(parsedData);
            OS.Storage.set(`neetContent_${subject}`, parsedData);
            setTimeout(() => { this.isRestoring[subject] = false; }, 100);
        }
    }
};

if (!document.getElementById('focus-mode-styles')) {
    const style = document.createElement('style');
    style.id = 'focus-mode-styles';
    style.innerHTML = `
        .neet-focus-btn {
            position: absolute;
            top: 15px;
            right: 15px;
            z-index: 100;
            background: transparent;
            color: var(--color-text-accent);
            border: none;
            border-radius: 5px;
            width: 28px;
            height: 28px;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            font-size: 18px;
            font-weight: 300;
            opacity: 0.6;
            transition: background-color 0.15s ease, color 0.15s ease, opacity 0.15s ease;
        }
        
        .neet-focus-btn:hover {
            background-color: rgba(255, 76, 76, 0.1); 
            color: var(--color-primary); 
            opacity: 1; 
        }

        .editor-focus-mode {
            position: fixed !important;
            top: 0 !important;
            left: 0 !important;
            width: 100vw !important;
            height: 100vh !important;
            z-index: 999999 !important;
            background-color: var(--color-bg-dark) !important;
            padding: 40px 15vw !important; 
            overflow-y: auto !important;
        }
        
        .editor-focus-mode .neet-focus-btn {
            position: fixed;
            top: 20px;
            right: 30px;
            font-size: 20px;
            font-weight: 200; 
        }
    `;
    document.head.appendChild(style);
}

function initEditorInstance(subject) {
    if (editorInstances[subject] !== null) return; 

    const containerId = `editor-${subject}`;
    const storageKey = `neetContent_${subject}`;
    
    const containerEl = document.getElementById(containerId);
    if (!containerEl) return;
    
    containerEl.setAttribute('spellcheck', 'false');

    containerEl.style.position = 'relative'; 
    
    const focusBtn = document.createElement('button');
    focusBtn.className = 'neet-focus-btn';
    focusBtn.innerHTML = '⛶';
    focusBtn.title = 'Enter Focus Mode';

    focusBtn.onclick = () => {
        const isFocus = containerEl.classList.toggle('editor-focus-mode');
        if (isFocus) {
            focusBtn.innerHTML = '✕';
            document.body.style.overflow = 'hidden'; 
        } else {
            focusBtn.innerHTML = '⛶';
            document.body.style.overflow = ''; 
        }
    };
    containerEl.appendChild(focusBtn);

    let initialData = {
        time: Date.now(),
        blocks: [
            { type: "header", data: { text: `${subject.toUpperCase()} NOTES`, level: 2 } },
            { type: "paragraph", data: { text: "Press Tab to open the toolbox..." } }
        ]
    };

    const parsed = OS.Storage.get(storageKey, null);
    if (parsed && parsed.blocks) {
        initialData = parsed;
    }

    ActionLogger.init(subject, initialData);

    editorInstances[subject] = new EditorJS({
        holder: containerId,
        tools: editorTools,
        data: initialData,
        placeholder: 'Press Tab to open the toolbox...',
        
        onReady: () => {
            ActionLogger.startWatching(subject);
        }
    });
}

// 🛡️ KEYBOARD INTERCEPTOR
window.addEventListener('keydown', (e) => {
    const activeTab = document.querySelector('.canvas-tab.active');
    if (!activeTab) return;
    const subject = activeTab.dataset.sub;
    if (!editorInstances[subject]) return;

    const cmdOrCtrl = /(Mac|iPhone|iPod|iPad)/i.test(navigator.platform) ? e.metaKey : e.ctrlKey;

    if (cmdOrCtrl) {
        if (e.key.toLowerCase() === 'z' && !e.shiftKey) {
            e.preventDefault();
            ActionLogger.undo(subject);
        } 
        else if (e.key.toLowerCase() === 'y' || (e.key.toLowerCase() === 'z' && e.shiftKey)) {
            e.preventDefault();
            ActionLogger.redo(subject);
        }
    }
}, true);