/* ===================
   SHELL & NAVIGATION
   =================== */
function showSection(sectionId, btn) {
    OS.Storage.set('neetActiveSection', sectionId);

    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    
    if(btn) {
        btn.classList.add('active');
    } else {
        const targetBtn = document.querySelector(`.nav-btn[onclick*="'${sectionId}'"]`);
        if(targetBtn) targetBtn.classList.add('active');
    }

    document.querySelectorAll('.tool-section').forEach(s => s.classList.remove('active'));
    
    const targetSection = document.getElementById('section-' + sectionId);
    if(targetSection) targetSection.classList.add('active');
    
    if(sectionId === 'dashboard' && typeof updateDashboard === 'function') {
        updateDashboard();
    }
}

function toggleSidebar() {
    const sb = document.getElementById('mainSidebar');
    if(!sb) return;
    
    sb.classList.toggle('collapsed');
    const toggleBtn = sb.querySelector('.sidebar-toggle');
    
    if(sb.classList.contains('collapsed')) {
        if(toggleBtn) toggleBtn.innerText = '›';
        OS.Storage.set('neetSidebarState', 'collapsed');
    } else {
        if(toggleBtn) toggleBtn.innerText = '‹';
        OS.Storage.set('neetSidebarState', 'expanded');
    }
}

function updateCustomDateDisplay(input, textId) {
    if(!input) return;
    const dateVal = input.value; 
    const textEl = document.getElementById(textId);
    if(!textEl) return;
     
    const now = new Date();
    const offset = now.getTimezoneOffset();
    const local = new Date(now.getTime() - (offset * 60 * 1000));
    const todayStr = local.toISOString().split('T')[0];

    if(dateVal) {
        if (dateVal === todayStr) {
            textEl.innerText = "Today";
            textEl.style.color = "var(--color-primary)"; 
            textEl.style.fontWeight = "bold";
        } else {
            const [year, month, day] = dateVal.split('-');
            textEl.innerText = `${day}/${month}/${year}`;
            textEl.style.color = ""; 
            textEl.style.fontWeight = "";
        }
    } else {
        textEl.innerText = "Select Date";
    }
}

function setDateInputValue(inputId, textId, dateStr) {
    const input = document.getElementById(inputId);
    if(input) {
        input.value = dateStr;
        updateCustomDateDisplay(input, textId);
    }
}

function openDataModal() { 
    const overlay = document.getElementById('dataModalOverlay');
    if(!overlay) return;
    overlay.style.display = 'flex';
    setTimeout(() => overlay.classList.add('active'), 10);
}

function closeDataModal(e) {
    if (e === null || e.target.id === 'dataModalOverlay') {
        const overlay = document.getElementById('dataModalOverlay');
        if(overlay) {
            overlay.classList.remove('active');
            setTimeout(() => overlay.style.display = 'none', 300);
        }
    }
}

/* =================================================================
   DATA MANAGEMENT V4 (THE OS LOG ARCHITECTURE)
   ================================================================= */

function exportData() {
    const timestamp = new Date().getTime();

    // 1. Build the Master OS Log seamlessly using the Kernel
    const masterData = {
        version: "4.0.0",
        timestamp: timestamp,
        oslog: {
            canvaslog: {
                phy: OS.Storage.get('neetContent_phy', {blocks:[]}),
                chem: OS.Storage.get('neetContent_chem', {blocks:[]}),
                bio: OS.Storage.get('neetContent_bio', {blocks:[]}),
                infinite: OS.Storage.get('neetInfiniteCanvasContent', {blocks:[]})
            },
            timerlog: {
                stopwatch: OS.Storage.get('studyLogs', [])
            },
            plannerlog: {
                startDate: OS.Storage.get('neetPlanStartDate', ''),
                completed: OS.Storage.get('neetCalendarCompleted', []),
                edits: OS.Storage.get('neetPlannerEdits', {})
            },
            examlog: OS.Storage.get('examLogs', []),
            journallog: OS.Storage.get('neetJournalData', {}),
            dashboardlog: {
                todos: OS.Storage.get('neetDashboardTodos', {})
            },
            configlog: {
                activeSection: OS.Storage.get('neetActiveSection', 'dashboard'),
                sidebarState: OS.Storage.get('neetSidebarState', 'expanded'),
                theme: OS.Storage.get('neetTheme', 'darkest')
            }
        }
    };

    const now = new Date();
    const d = String(now.getDate()).padStart(2, '0');
    const m = String(now.getMonth() + 1).padStart(2, '0'); 
    const y = String(now.getFullYear()).slice(-2); 
    const filename = `neetos_${d}-${m}-${y}.json`;

    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(masterData, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", filename);
    
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();

    OS.Storage.set('neetLastBackup', new Date().toDateString());
    const overlay = document.getElementById('dataModalOverlay');
    if(overlay && overlay.style.display === 'flex') {
        if(typeof closeDataModal === 'function') closeDataModal(null);
    }
}

async function importData(event) {
    const file = event.target.files[0];
    if (!file) {
        event.target.value = ''; 
        return;
    }
    
    const reader = new FileReader();
    reader.onload = async function(e) {
        try {
            const data = JSON.parse(e.target.result);
            const editors = typeof editorInstances !== 'undefined' ? editorInstances : {};

            const tryLiveRender = async (editorInstance, newBlockData) => {
                if (!editorInstance) return false; 
                try {
                    await editorInstance.render(newBlockData);
                    return true; 
                } catch(err) { 
                    console.error("Live render error:", err); 
                    return false; 
                }
            };

            if (data.blocks && Array.isArray(data.blocks)) {
                const activeTab = document.querySelector('.canvas-tab.active');
                const subject = activeTab ? activeTab.dataset.sub : 'phy';
                
                OS.Storage.set(`neetContent_${subject}`, data);
                
                const rendered = await tryLiveRender(editors[subject], data);
                if (rendered) {
                    alert(`Data injected live into ${subject.toUpperCase()}!`);
                } else {
                    alert(`Data saved to ${subject.toUpperCase()}! It will appear when you open the tab.`);
                }
                
                if(typeof closeDataModal === 'function') closeDataModal(null);
                return;
            }

            if (data.oslog) {
                const log = data.oslog;
                let needsReboot = false;
                let liveUpdates = [];
                
                if (log.canvaslog) {
                    if (log.canvaslog.phy) {
                        OS.Storage.set('neetContent_phy', log.canvaslog.phy);
                        if (await tryLiveRender(editors.phy, log.canvaslog.phy)) liveUpdates.push('Physics');
                    }
                    if (log.canvaslog.chem) {
                        OS.Storage.set('neetContent_chem', log.canvaslog.chem);
                        if (await tryLiveRender(editors.chem, log.canvaslog.chem)) liveUpdates.push('Chemistry');
                    }
                    if (log.canvaslog.bio) {
                        OS.Storage.set('neetContent_bio', log.canvaslog.bio);
                        if (await tryLiveRender(editors.bio, log.canvaslog.bio)) liveUpdates.push('Biology');
                    }
                    if (log.canvaslog.infinite) OS.Storage.set('neetInfiniteCanvasContent', log.canvaslog.infinite);
                }
                
                if (log.timerlog || log.plannerlog || log.examlog || log.journallog || log.dashboardlog || log.configlog) {
                    needsReboot = true;
                    if (!confirm("V4 OS Log contains System/Timer data. This will overwrite memory and reboot. Continue?")) {
                        event.target.value = '';
                        return;
                    }
                    
                    if (log.timerlog && log.timerlog.stopwatch) OS.Storage.set('studyLogs', log.timerlog.stopwatch);
                    if (log.plannerlog) {
                        if (log.plannerlog.startDate) OS.Storage.set('neetPlanStartDate', log.plannerlog.startDate);
                        if (log.plannerlog.completed) OS.Storage.set('neetCalendarCompleted', log.plannerlog.completed);
                        if (log.plannerlog.edits) OS.Storage.set('neetPlannerEdits', log.plannerlog.edits);
                    }
                    if (log.examlog) OS.Storage.set('examLogs', log.examlog);
                    if (log.journallog) OS.Storage.set('neetJournalData', log.journallog);
                    if (log.dashboardlog && log.dashboardlog.todos) OS.Storage.set('neetDashboardTodos', log.dashboardlog.todos);
                    if (log.configlog) {
                        if (log.configlog.activeSection) OS.Storage.set('neetActiveSection', log.configlog.activeSection);
                        if (log.configlog.sidebarState) OS.Storage.set('neetSidebarState', log.configlog.sidebarState);
                        if (log.configlog.theme) OS.Storage.set('neetTheme', log.configlog.theme);
                    }
                }

                if (needsReboot) {
                    try {
                        if (editors.phy && editors.phy.destroy) editors.phy.destroy();
                        if (editors.chem && editors.chem.destroy) editors.chem.destroy();
                        if (editors.bio && editors.bio.destroy) editors.bio.destroy();
                    } catch(e) {}
                    
                    alert("System Data Restored! Rebooting...");
                    location.reload();
                } else {
                    alert(`Canvas Data Updated Successfully!\nLive updated tabs: ${liveUpdates.length > 0 ? liveUpdates.join(', ') : 'None'}\n(Unopened tabs will load data when you click them)`);
                    if(typeof closeDataModal === 'function') closeDataModal(null);
                }
                return;
            }

            if (data.studyLogs || data.neetCanvas || data.examLogs || data.neetJournalData) {
                if (confirm("Legacy V3 Backup detected. This requires a system reboot. Restore data?")) {
                     Object.keys(data).forEach(key => {
                        if (key === 'neetCanvas') {
                            if(data.neetCanvas.phy) OS.Storage.set('neetContent_phy', typeof data.neetCanvas.phy === 'string' ? JSON.parse(data.neetCanvas.phy) : data.neetCanvas.phy);
                            if(data.neetCanvas.chem) OS.Storage.set('neetContent_chem', typeof data.neetCanvas.chem === 'string' ? JSON.parse(data.neetCanvas.chem) : data.neetCanvas.chem);
                            if(data.neetCanvas.bio) OS.Storage.set('neetContent_bio', typeof data.neetCanvas.bio === 'string' ? JSON.parse(data.neetCanvas.bio) : data.neetCanvas.bio);
                        } else {
                            OS.Storage.set(key, data[key]);
                        }
                    });
                    alert("Legacy System Restored! Reloading...");
                    location.reload();
                }
                return;
            }

            alert("Unrecognized File Format. Please upload a valid OS Log.");

        } catch(err) {
            alert("Corrupted File: Could not read JSON.");
            console.error(err);
        }
    };
    reader.readAsText(file);
    event.target.value = ''; 
}

/* =========================================
   INIT & APP MOUNT
   ========================================= */
function setupDragAndDrop() {
    const flashcardWidget = document.querySelector('.flashcard-widget');
    if (flashcardWidget) {
        flashcardWidget.addEventListener('dragenter', (e) => {
            e.preventDefault();
            flashcardWidget.classList.add('drag-over');
        });

        flashcardWidget.addEventListener('dragover', (e) => { e.preventDefault(); });
        
        flashcardWidget.addEventListener('dragleave', (e) => {
            e.preventDefault();
            const rect = flashcardWidget.getBoundingClientRect();
            const leftWindow = e.clientX === 0 && e.clientY === 0;
            const leftBox = e.clientX <= rect.left || e.clientX >= rect.right || 
                            e.clientY <= rect.top || e.clientY >= rect.bottom;

            if (leftWindow || leftBox) {
                flashcardWidget.classList.remove('drag-over');
            }
        });
        
        flashcardWidget.addEventListener('drop', (e) => {
            e.preventDefault();
            flashcardWidget.classList.remove('drag-over');
            if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                if (typeof processFlashcardFile === 'function') processFlashcardFile(e.dataTransfer.files[0]);
            }
        });
    }

    const plannerSection = document.getElementById('section-planner');
    if (plannerSection) {
        plannerSection.addEventListener('dragenter', (e) => {
            e.preventDefault();
            plannerSection.classList.add('drag-over');
        });

        plannerSection.addEventListener('dragover', (e) => { e.preventDefault(); });
        
        plannerSection.addEventListener('dragleave', (e) => {
            e.preventDefault();
            const rect = plannerSection.getBoundingClientRect();
            const leftWindow = e.clientX === 0 && e.clientY === 0;
            const leftBox = e.clientX <= rect.left || e.clientX >= rect.right || 
                            e.clientY <= rect.top || e.clientY >= rect.bottom;

            if (leftWindow || leftBox) {
                plannerSection.classList.remove('drag-over');
            }
        });
        
        plannerSection.addEventListener('drop', (e) => {
            e.preventDefault();
            plannerSection.classList.remove('drag-over');
            if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                if (typeof processPlannerFile === 'function') processPlannerFile(e.dataTransfer.files[0]);
            }
        });
    }

    document.addEventListener('click', () => {
        document.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            document.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
        }
    });
}

document.addEventListener('DOMContentLoaded', () => {
     if (typeof initScratchpad === 'function') initScratchpad();
     if (typeof initPlannerStart === 'function') initPlannerStart(); 
     if (typeof calculateScheduleMap === 'function') calculateScheduleMap(); 
     if (typeof initInfiniteCanvas === 'function') initInfiniteCanvas(); 
     if (typeof initFlashcards === 'function') initFlashcards(); 
     setupDragAndDrop();

     const ring = document.getElementById('timerProgress');
     if(ring) ring.style.stroke = 'var(--color-physics)';

     let savedTheme = OS.Storage.get('neetTheme', 'dark');
     if (typeof setTheme === 'function') setTheme(savedTheme, true);

     const getTodayString = () => {
        const now = new Date();
        const offset = now.getTimezoneOffset();
        const local = new Date(now.getTime() - (offset*60*1000));
        return local.toISOString().split('T')[0];
    };
    const todayStr = getTodayString();
    
    setDateInputValue('timerHistoryDate', 'timerHistoryDateText', todayStr);
    setDateInputValue('examDateLog', 'examDateLogText', todayStr);

     const activeSection = OS.Storage.get('neetActiveSection', 'dashboard');
     showSection(activeSection);
     
     if (typeof renderTimerLogs === 'function') renderTimerLogs();
     if (typeof renderCalendar === 'function') renderCalendar();
     if (typeof updatePlannerStats === 'function') updatePlannerStats();
     if (typeof loadLogs === 'function') loadLogs();
     if (typeof updateDashboard === 'function') updateDashboard();
     
     const topicInput = document.getElementById('topicInput');
     if(topicInput) topicInput.value = '';
     
     const physicsBtn = document.querySelector('.pill-btn[data-sub="Physics"]');
     if(physicsBtn && typeof selectSubject === 'function') selectSubject('Physics', physicsBtn);
     
     document.querySelectorAll('.log-form input:not([type="date"])').forEach(input => input.value = '');
     
     const state = OS.Storage.get('neetTimerState', null);
     if(state) {
         if(state.focus) {
            const sidebar = document.getElementById('mainSidebar');
            const mainContent = document.getElementById('mainContent');
            const overlay = document.getElementById('examModeOverlay');
            if (sidebar) sidebar.style.display = 'none';
            if (mainContent) mainContent.style.display = 'none';
            if (overlay) overlay.style.display = 'flex';
         }
         if (typeof startTimer === 'function') startTimer(state.focus, true);
     }
});

window.onload = function() {
    const clock = document.getElementById('clock');
    if (clock) {
        for(let i=1; i<=12; i++) {
            const div = document.createElement('div'); div.className='clock-number'; div.innerText=i;
            const angle=i*30; div.style.transform=`rotate(${angle}deg) translate(0,-260px) rotate(-${angle}deg)`;
            clock.appendChild(div);
        }
        for(let i=0; i<60; i++) {
            const div=document.createElement('div'); div.className=i%5===0?'clock-tick major':'clock-tick';
            div.style.transform=`rotate(${i*6}deg)`; clock.appendChild(div);
        }
    }

    document.querySelectorAll('input[type="date"]').forEach(input => {
        input.addEventListener('click', function(e) {
            try { this.showPicker(); } catch (error) {}
        });
        
        let scrollAccumulator = 0;
        const SCROLL_THRESHOLD = 600; 

        input.addEventListener('wheel', function(e) {
            if(document.activeElement === this) return; 
            e.preventDefault();
            
            scrollAccumulator += e.deltaY;

            if (scrollAccumulator <= -SCROLL_THRESHOLD) {
                try { this.stepUp(); } catch(e){}
                this.dispatchEvent(new Event('change'));
                scrollAccumulator = 0; 
            } else if (scrollAccumulator >= SCROLL_THRESHOLD) {
                try { this.stepDown(); } catch(e){}
                this.dispatchEvent(new Event('change'));
                scrollAccumulator = 0;
            }
        }, { passive: false });
        
        input.addEventListener('mouseleave', () => {
            scrollAccumulator = 0;
        });
    });

    requestAnimationFrame(setClock);
}

/* =========================================
   CLOCK ANIMATION
   ========================================= */
function setClock() {
    const now = new Date();
    const ms = now.getMilliseconds();
    const s = now.getSeconds();
    const m = now.getMinutes();
    const h = now.getHours();

    const sDeg = ((s + ms / 1000) / 60) * 360;
    const mDeg = ((m + s / 60) / 60) * 360;
    const hDeg = ((h + m / 60) / 12) * 360;

    const secondHand = document.getElementById('second-hand');
    if (secondHand) secondHand.style.transform = `translateX(-50%) rotate(${sDeg}deg)`;
    const minuteHand = document.getElementById('minute-hand');
    if (minuteHand) minuteHand.style.transform = `translateX(-50%) rotate(${mDeg}deg)`;
    const hourHand = document.getElementById('hour-hand');
    if (hourHand) hourHand.style.transform = `translateX(-50%) rotate(${hDeg}deg)`;
    
    requestAnimationFrame(setClock);
}

/* =========================================
   SAFETY CHECK: 9PM REMINDER
   ========================================= */
window.addEventListener('beforeunload', function (e) {
    const now = new Date();
    if (now.getHours() >= 21) {
        const lastBackup = OS.Storage.get('neetLastBackup', '');
        const today = now.toDateString();
        
        if (lastBackup !== today) {
            e.preventDefault(); 
            e.returnValue = 'Click the icon to save your progress'; 
            return 'Click the icon to save your progress';
        }
    }
});