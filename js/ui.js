(function() {
    // 1. ADD STYLES (Includes Context Menu AND Custom Modal styles)
    const style = document.createElement('style');
    style.innerHTML = `
        /* Hyperlink styling - Subject Specific Colors & Selection Restored */
        #box-phy a { color: var(--color-physics); text-decoration: none !important; cursor: pointer; user-select: text; -webkit-user-select: text; }
        #box-chem a { color: var(--color-chemistry); text-decoration: none !important; cursor: pointer; user-select: text; -webkit-user-select: text; }
        #box-bio a { color: var(--color-biology); text-decoration: none !important; cursor: pointer; user-select: text; -webkit-user-select: text; }
        
        /* Fallbacks for Scratchpad and global areas */
        .infinite-canvas a, .scratchpad-area a { color: var(--color-text-accent); text-decoration: none !important; cursor: text; user-select: text; -webkit-user-select: text; }

        /* Universal Hover - Snaps to Primary Red/Cyan */
        .infinite-canvas a:hover, .scratchpad-area a:hover {
            color: var(--color-primary) !important;
            text-decoration: underline !important;
        }

        /* Custom Modal Styling - NOW THEME AWARE */
        .os-modal-overlay {
            position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
            background: rgba(0,0,0,0.6); backdrop-filter: blur(2px);
            z-index: 2147483647; display: none; align-items: center; justify-content: center;
        }
        .os-modal {
            background: var(--color-bg-dark); 
            border: 1px solid var(--color-border); 
            border-radius: 8px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.8); width: 300px; padding: 20px;
            font-family: 'Nova Flat', sans-serif; color: var(--color-text-bright);
        }
        .os-modal-title { margin-top: 0; margin-bottom: 15px; font-size: 15px; }
        .os-modal-input {
            width: 100%; padding: 10px; background: var(--color-bg-medium); 
            border: 1px solid var(--color-border-light);
            color: var(--color-text-bright); border-radius: 4px; box-sizing: border-box; margin-bottom: 15px;
            outline: none; font-size: 14px; font-family: 'Nova Flat', sans-serif;
        }
        .os-modal-input:focus { border-color: var(--color-primary); }
        .os-modal-buttons { display: flex; justify-content: flex-end; gap: 10px; }
        .os-btn {
            background: transparent; color: var(--color-text-default); border: 1px solid var(--color-border-light);
            padding: 8px 16px; border-radius: 4px; cursor: pointer; font-size: 14px; font-family: 'Nova Flat', sans-serif;
        }
        .os-btn:hover { background: var(--color-bg-medium); color: var(--color-text-bright); border-color: var(--color-border);}
        .os-btn-primary { background: var(--color-primary); color: var(--color-black); border: none; font-weight: bold; }
        .os-btn-primary:hover { background: var(--color-primary-light); box-shadow: 0 0 10px var(--color-primary); }
    `;
    document.head.appendChild(style);

    // 2. BUILD CUSTOM MODAL SYSTEM
    const modalOverlay = document.createElement('div');
    modalOverlay.className = 'os-modal-overlay';
    modalOverlay.innerHTML = `
        <div class="os-modal">
            <div class="os-modal-title" id="os-modal-title"></div>
            <input type="text" class="os-modal-input" id="os-modal-input" autocomplete="off" spellcheck="false" />
            <div class="os-modal-buttons">
                <button class="os-btn" id="os-modal-cancel">Cancel</button>
                <button class="os-btn os-btn-primary" id="os-modal-ok">OK</button>
            </div>
        </div>
    `;
    document.body.appendChild(modalOverlay);

    const modalTitle = document.getElementById('os-modal-title');
    const modalInput = document.getElementById('os-modal-input');
    const btnCancel = document.getElementById('os-modal-cancel');
    const btnOk = document.getElementById('os-modal-ok');
    let modalCallback = null;

    // Attach to global window object so other files can use it!
    window.showCustomModal = function(text, isAlert, callback) {
        modalTitle.innerText = text;
        modalCallback = callback;
        modalOverlay.style.display = 'flex';
        
        if (isAlert) {
            modalInput.style.display = 'none';
            btnCancel.style.display = 'none';
            btnOk.focus();
        } else {
            modalInput.style.display = 'block';
            modalInput.value = '';
            btnCancel.style.display = 'inline-block';
            modalInput.focus();
        }
    }

    function closeModal(val) {
        modalOverlay.style.display = 'none';
        if (modalCallback) modalCallback(val);
        modalCallback = null;
    }

    btnCancel.addEventListener('click', () => closeModal(null));
    btnOk.addEventListener('click', () => closeModal(modalInput.style.display === 'none' ? true : modalInput.value));
    modalInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') closeModal(modalInput.value);
        if (e.key === 'Escape') closeModal(null);
    });

    // 3. BUILD CONTEXT MENU - NOW THEME AWARE
    const menu = document.createElement('div');
    menu.id = "os-smart-menu";
    menu.style.cssText = `
        display: none; position: fixed; z-index: 2147483646; width: 220px;
        background: var(--color-bg-dark); border: 1px solid var(--color-border); border-radius: 8px;
        box-shadow: 0 4px 20px rgba(0,0,0,0.8); padding: 6px 0;
        font-family: 'Nova Flat', sans-serif; flex-direction: column;
    `;
    document.body.appendChild(menu);

    let activeCanvas = null;
    let savedRange = null;
    let currentLink = null; 
    let activeTodoText = null;
    let activeUploadZone = null;

    function renderMenu(isLink, hasSelection, isRichText, isTodoContext = false, uploadZone = null) {
        menu.innerHTML = '';
        let items = [];

        if (uploadZone) {
            let label = uploadZone === 'flashcard' ? 'Upload Flashcard Deck' : 'Upload Planner JSON';
            items.push(`<div class="ctx-btn" data-cmd="upload-json" style="color:var(--color-primary);">📂 ${label}</div>`);
        } else if (isTodoContext) {
            items.push(`<div class="ctx-btn" data-cmd="start-timer" style="color:var(--color-primary);">⏱️ Start Timer</div>`);
        } else {
            if (hasSelection) items.push(`<div class="ctx-btn" data-cmd="copy">📄 Copy</div>`);
            
            if (isRichText) {
                if (isLink) {
                    items.push(`<div class="ctx-btn" data-cmd="open-link" style="color:var(--color-biology);">↗ Open Link</div>`);
                    items.push(`<div class="ctx-btn" data-cmd="unlink" style="color:var(--color-text-accent);">🔗 Remove Link</div>`);
                } else if (hasSelection) {
                    items.push(`<div class="ctx-btn" data-cmd="create-link" style="color:var(--color-text-accent);">🔗 Add Hyperlink</div>`);
                }
            }

            if (hasSelection) items.push(`<div class="ctx-btn" data-cmd="todo">📌 Extract to To-Do</div>`);
            items.push(`<div class="ctx-btn" data-cmd="clear" style="color:#ff3b3b;">🗑️ Clear</div>`);
        }

        menu.innerHTML = items.join('<div style="height:1px; background:var(--color-border); margin:4px 0;"></div>');
        
        menu.querySelectorAll('.ctx-btn').forEach(btn => {
            btn.style.padding = '10px 16px';
            btn.style.cursor = 'pointer';
            btn.style.fontSize = '14px';
            btn.style.color = btn.style.color || 'var(--color-text-bright)';
            btn.addEventListener('mouseenter', () => btn.style.background = 'var(--color-bg-medium)');
            btn.addEventListener('mouseleave', () => btn.style.background = 'transparent');
        });
    }

    function showAndPositionMenu(e) {
        menu.style.display = 'flex';
        const menuWidth = menu.offsetWidth;
        const menuHeight = menu.offsetHeight;
        let x = e.clientX;
        let y = e.clientY;
        
        if (x + menuWidth > window.innerWidth) x = e.clientX - menuWidth;
        if (y + menuHeight > window.innerHeight) y = e.clientY - menuHeight;
        if (x < 0) x = 0;
        if (y < 0) y = 0;
        
        menu.style.left = x + 'px';
        menu.style.top = y + 'px';
    }

    // 4. RIGHT CLICK LISTENER
    window.addEventListener('contextmenu', function(e) {
        activeCanvas = null;
        activeTodoText = null;
        activeUploadZone = null;

        const isFlashcard = e.target.closest('.flashcard-widget');
        const isPlanner = e.target.closest('#section-planner');
        
        if (isFlashcard) {
            e.preventDefault();
            activeUploadZone = 'flashcard';
            renderMenu(false, false, false, false, activeUploadZone);
            showAndPositionMenu(e);
            return;
        } else if (isPlanner && document.getElementById('section-planner').classList.contains('active')) {
             const isTopArea = e.target.closest('.top-bar, .calendar-header');
             if (isTopArea) {
                 e.preventDefault();
                 activeUploadZone = 'planner';
                 renderMenu(false, false, false, false, activeUploadZone);
                 showAndPositionMenu(e);
                 return;
             }
        }

        const todoItem = e.target.closest('.dash-todo-item, [class*="todo-item"], li'); 
        if (todoItem) {
            e.preventDefault();
            const textElement = todoItem.querySelector('.dash-todo-text, [class*="todo-text"]');
            activeTodoText = textElement ? textElement.innerText.trim() : (e.target.innerText.trim() || todoItem.innerText.trim());
            renderMenu(false, false, false, true, null); 
            showAndPositionMenu(e);
            return;
        }

        const validNativeInput = e.target.tagName === 'INPUT' && ['text', 'number', 'password', 'search', 'url', 'email'].includes(e.target.type);
        const isNativeTextArea = e.target.tagName === 'TEXTAREA';
        const editor = e.target.closest('[contenteditable="true"], .scratchpad-area') || (validNativeInput || isNativeTextArea ? e.target : null);

        if (editor) {
            e.preventDefault();
            activeCanvas = editor;
            
            const isRichText = editor.isContentEditable;
            currentLink = isRichText ? e.target.closest('a') : null;
            
            let hasSelection = false;
            if (isRichText) {
                const sel = window.getSelection();
                hasSelection = sel.rangeCount > 0 && !sel.isCollapsed;
                if (hasSelection) savedRange = sel.getRangeAt(0).cloneRange();
                else savedRange = null;
            } else {
                hasSelection = editor.selectionStart !== editor.selectionEnd;
                savedRange = null; 
            }

            renderMenu(!!currentLink, hasSelection, isRichText, false, null);
            showAndPositionMenu(e);
        } else {
            menu.style.display = 'none';
        }
    }, true);

    // 5. CLICK LISTENER
    window.addEventListener('click', function(e) {
        if (e.target.closest('.os-modal-overlay')) return;

        const link = e.target.closest('a');
        if (link && (e.ctrlKey || e.metaKey)) {
            e.preventDefault();
            window.open(link.href, '_blank');
            return;
        }

        if (!e.target.closest('#os-smart-menu')) {
            menu.style.display = 'none';
            return;
        }

        const btn = e.target.closest('.ctx-btn');
        if (btn) {
            const cmd = btn.getAttribute('data-cmd');
            menu.style.display = 'none';
            
            if (cmd === 'upload-json') {
                if (activeUploadZone === 'flashcard') {
                    const fileInput = document.getElementById('flashcardFile');
                    if (fileInput) fileInput.click();
                } else if (activeUploadZone === 'planner') {
                    const fileInput = document.getElementById('planUploader');
                    if (fileInput) fileInput.click();
                }
                return;
            }
            
            if (cmd === 'start-timer') {
                if (!activeTodoText) {
                    if (typeof showCustomModal === 'function') showCustomModal("Error: Could not extract task text.", true, null);
                    return;
                }

                try {
                    if (typeof showSection === 'function') showSection('timer', document.querySelectorAll('.nav-btn')[1]);
                    else {
                        const timerBtn = document.querySelector('[onclick*="timer" i]');
                        if (timerBtn) timerBtn.click();
                    }
                } catch(err) {
                    console.log("Tab switch error:", err);
                }
                
                setTimeout(() => {
                    const timerInput = document.getElementById('topicInput');
                    if (timerInput) {
                        timerInput.value = activeTodoText;
                        timerInput.focus();
                        timerInput.dispatchEvent(new Event('input')); 
                    } else {
                        if (typeof showCustomModal === 'function') showCustomModal("Error: Could not locate the Timer input field.", true, null);
                    }
                }, 100); 
                return;
            }

            if (activeCanvas) activeCanvas.focus();

            const isRichText = activeCanvas.isContentEditable;

            if (isRichText && savedRange && cmd !== 'open-link') {
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(savedRange);
}
            
            let selectedText = "";
            if (isRichText) {
                selectedText = window.getSelection().toString();
            } else {
                selectedText = activeCanvas.value.substring(activeCanvas.selectionStart, activeCanvas.selectionEnd);
            }

            if (cmd === 'copy') document.execCommand('copy');
            
            if (cmd === 'create-link' && isRichText) {
                if(typeof openLinkModal === 'function') openLinkModal(activeCanvas, savedRange);
                return;
            }

            if (cmd === 'open-link' && currentLink) window.open(currentLink.href, '_blank');
            
            if (cmd === 'unlink' && isRichText) {
                if (currentLink) {
                    const selection = window.getSelection();
                    const range = document.createRange();
                    range.selectNodeContents(currentLink);
                    selection.removeAllRanges();
                    selection.addRange(range);
                }
                document.execCommand('unlink', false, null);
            }
            
            if (cmd === 'todo') {
                if (selectedText) {
                    if (typeof allTodoData !== 'undefined' && typeof scratchDate !== 'undefined') {
                        if (!allTodoData[scratchDate]) allTodoData[scratchDate] = [];
                        allTodoData[scratchDate].push({ text: selectedText, done: false });
                        if (typeof saveDashTodos === 'function') saveDashTodos();
                        if (typeof renderDashboardTodos === 'function') renderDashboardTodos();
                        
                        const originalBg = activeCanvas.style.backgroundColor;
                        activeCanvas.style.transition = "background 0.3s";
                        activeCanvas.style.backgroundColor = "rgba(126, 211, 33, 0.1)"; 
                        setTimeout(() => activeCanvas.style.backgroundColor = originalBg, 300);
                    }
                } else {
                    if (typeof showCustomModal === 'function') showCustomModal("Please highlight text first.", true, null);
                }
            }
            
            if (cmd === 'clear') {
                if (isRichText) {
                    if (selectedText.length > 0) {
                        // PATH 1: Text is highlighted. Just backspace the selection!
                        document.execCommand('delete', false, null);
                    } else {
                        // PATH 2: Nothing highlighted. Nuke the whole block!
                        activeCanvas.innerHTML = '';
                        activeCanvas.dispatchEvent(new KeyboardEvent('keydown', {
                            key: 'Backspace', code: 'Backspace', keyCode: 8, which: 8, bubbles: true
                        }));
                    }
                } else {
                    if (selectedText.length > 0) {
                        // PATH 3: Journal text highlighted. Backspace the selection!
                        document.execCommand('delete', false, null);
                    } else {
                        // PATH 4: Journal is active but nothing highlighted. Wipe the whole Journal!
                        activeCanvas.value = '';
                    }
                }
                
                if (activeCanvas) activeCanvas.dispatchEvent(new Event('input', { bubbles: true })); 
            }
        }
    });

    // 6. KEYBOARD SHORTCUT INTERCEPTOR
    window.addEventListener('keydown', function(e) {
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
            const activeEl = document.activeElement;
            if (activeEl && activeEl.isContentEditable) {
                const selection = window.getSelection();
                if (selection.rangeCount > 0 && !selection.isCollapsed) {
                    e.preventDefault(); 
                    const savedRange = selection.getRangeAt(0).cloneRange();
                    if(typeof openLinkModal === 'function') openLinkModal(activeEl, savedRange);
                }
            }
        }
    });

    // 7. GLOBAL ENTER KEY HANDLER FOR INPUTS
    window.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
            const activeEl = document.activeElement;
            if (activeEl && activeEl.tagName === 'INPUT' && activeEl.type !== 'file') {
                const modal = activeEl.closest('[id$="ModalOverlay"]');
                if (modal) {
                    e.preventDefault(); 
                    const primaryBtn = modal.querySelector('.btn-focus');
                    if (primaryBtn) primaryBtn.click();
                    return;
                }
                if (activeEl.id === 'topicInput') {
                    e.preventDefault();
                    activeEl.blur(); 
                    return;
                }
            }
        }
    });
})();