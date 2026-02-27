
/* =================================================================
   SECTION 4: PLANNER LOGIC (v3.0 - Complete & Verified)
   ================================================================= */

// 1. DATA LOADING & VARIABLES
let currentSyllabus = [];
const savedCustomPlan = localStorage.getItem('neetActivePlanData');

if (savedCustomPlan) {
    try {
        currentSyllabus = JSON.parse(savedCustomPlan);
    } catch(e) {
        currentSyllabus = (typeof ACTIVE_PLAN !== 'undefined') ? ACTIVE_PLAN : [];
    }
} else {
    currentSyllabus = (typeof ACTIVE_PLAN !== 'undefined') ? ACTIVE_PLAN : [];
}

let completed = JSON.parse(localStorage.getItem('neetCalendarCompleted')) || [];
let plannerEdits = JSON.parse(localStorage.getItem('neetPlannerEdits')) || {};
let viewDate = new Date();
let scheduleMap = {};

// 2. INITIALIZATION (The "Keep Existing" parts are here now)
function initPlannerStart() {
    let savedStart = localStorage.getItem('neetPlanStartDate');
    if (!savedStart) {
        savedStart = getLocalDayKey(new Date());
        localStorage.setItem('neetPlanStartDate', savedStart);
    }
    if(typeof setDateInputValue === 'function') {
        setDateInputValue('startDatePicker', 'startDatePickerText', savedStart);
    }
}

function updateStartDate() {
    const picker = document.getElementById('startDatePicker');
    if(picker && picker.value) {
        localStorage.setItem('neetPlanStartDate', picker.value);
        calculateScheduleMap(); renderCalendar(); updatePlannerStats();
    }
}

function getLocalDayKey(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

function changeMonth(delta) {
    viewDate.setMonth(viewDate.getMonth() + delta);
    renderCalendar();
}

// 3. SCHEDULER ENGINE (Smart Push Logic)
function calculateScheduleMap() {
    scheduleMap = {};
    const startStr = localStorage.getItem('neetPlanStartDate');
    if(!startStr) return;

    const parts = startStr.split('-');
    const year = parseInt(parts[0]);
    const month = parseInt(parts[1]) - 1;
    const day = parseInt(parts[2]);
    let current = new Date(year, month, day);
    
    let syllabusIndex = 0;
    let dayCount = 0;
    const targetDate = new Date("2026-05-03");

    while (current <= targetDate) {
        const dateKey = getLocalDayKey(current);
        const dayId = `day-${dayCount}`;
        const isSunday = current.getDay() === 0;
        
        // CHECK FOR BLOCKERS (User Edit: "Day Off")
        const edit = plannerEdits[dayId];
        const isUserOff = (edit && typeof edit === 'object' && edit.s === 'O');

        if (isSunday || isUserOff) {
            // PAUSE SYLLABUS (Push tasks forward)
            scheduleMap[dateKey] = { type: 'off', dayId: dayId, isSunday: isSunday };
        } 
        else if (syllabusIndex < currentSyllabus.length) {
            // ASSIGN TASK
            scheduleMap[dateKey] = { type: 'task', task: currentSyllabus[syllabusIndex], dayId: dayId };
            syllabusIndex++;
        } 
        else {
            // FINISHED / EMPTY
            scheduleMap[dateKey] = { type: 'empty', dayId: dayId }; 
        }
        
        current.setDate(current.getDate() + 1);
        dayCount++;
    }
}

// 4. RENDERER (Calendar UI - Now with Infinite Sundays)
function renderCalendar() {
    const grid = document.getElementById('calendarGrid');
    if(!grid) return;
    grid.innerHTML = '';

    // Headers
    ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].forEach((d,i) => {
        const div = document.createElement('div');
        div.className = i===6 ? 'weekday sun' : 'weekday';
        div.innerText = d;
        grid.appendChild(div);
    });

    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    document.getElementById('currentMonthLabel').innerText = `${monthNames[viewDate.getMonth()]} ${viewDate.getFullYear()}`;

    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    let startDay = new Date(year, month, 1).getDay(); 
    if (startDay === 0) startDay = 7; 
    
    for(let i=1; i < startDay; i++) {
        const empty = document.createElement('div');
        empty.className = 'day-cell empty';
        grid.appendChild(empty);
    }

    const todayStr = getLocalDayKey(new Date());
    const realToday = new Date();
    realToday.setHours(0,0,0,0);

    for (let d = 1; d <= daysInMonth; d++) {
        const dateObj = new Date(year, month, d);
        const dateKey = getLocalDayKey(dateObj);
        const data = scheduleMap[dateKey]; // Data from Scheduler
        
        const cell = document.createElement('div');
        cell.className = 'day-cell';

        // Add Date Number
        const numDiv = document.createElement('div');
        numDiv.className = 'date-num';
        numDiv.innerText = d;
        cell.appendChild(numDiv);

        if (dateKey === todayStr) cell.classList.add('today');

        // --- CORE LOGIC START ---
        const cellId = data ? data.dayId : dateKey;
        const savedEdit = plannerEdits[cellId] || plannerEdits[dateKey]; // Check both IDs
        
        let displayTopic = null;
        let displaySub = 'O'; // Default to Off/Rest

        // Priority 1: User Manual Edit
        if (savedEdit) {
            displayTopic = (typeof savedEdit === 'string') ? savedEdit : savedEdit.t;
            displaySub = (typeof savedEdit === 'string') ? ((data && data.task)?data.task.s:'O') : savedEdit.s;
        } 
        // Priority 2: Scheduler Data (Tasks)
        else if (data) {
            if (data.type === 'task') {
                displayTopic = data.task.t; displaySub = data.task.s;
            } else if (data.type === 'off' || data.type === 'sunday') {
                displayTopic = "Rest"; displaySub = 'O'; 
            }
        }
        // Priority 3: INFINITE SUNDAY FALLBACK (The Smart Logic)
        else if (dateObj.getDay() === 0) {
            // If no data exists, but it IS a Sunday, treat it as Rest.
            displayTopic = "Rest"; 
            displaySub = 'O';
        }
        // --- CORE LOGIC END ---

        // DRAW CONTENT
        if (displayTopic) {
            let subClass = 'tag-rest', subName = '';
            if (displaySub === 'P') { subClass = 'tag-phy'; subName = 'PHYSICS'; }
            else if (displaySub === 'C') { subClass = 'tag-chem'; subName = 'CHEMISTRY'; }
            else if (displaySub === 'B') { subClass = 'tag-bio'; subName = 'BIOLOGY'; }
            else if (displaySub === 'M') { subClass = 'tag-math'; subName = 'MATH'; }
            else { subClass = 'tag-rest'; subName = 'DAY OFF'; }

            // Check completion status (support both ID formats)
            const isDone = completed.includes(cellId) || completed.includes(dateKey);
            const isPast = dateObj < realToday;
            
            if (isDone) cell.classList.add('completed');
            else if (isPast && displaySub !== 'O') cell.classList.add('overdue');

            cell.insertAdjacentHTML('beforeend', `<div class="task-content"><span class="subject-tag ${subClass}">${subName}</span><span class="task-topic">${displayTopic}</span></div>`);
            
            // Use dateKey as fallback ID for infinite Sundays so they can be checked off too
            const clickId = data ? data.dayId : dateKey;
            cell.onclick = () => toggleTask(clickId);
        } else {
            cell.insertAdjacentHTML('beforeend', `<div class="task-content"><span class="task-topic" style="color:#333;">-</span></div>`);
        }

        // EDIT BUTTON
        const editId = data ? data.dayId : dateKey;
        const editBtn = document.createElement('div');
        editBtn.className = 'day-edit-btn';
        editBtn.innerHTML = '✎';
        editBtn.onclick = (e) => { e.stopPropagation(); openEditModal(editId, displaySub || 'P', displayTopic || ''); };
        cell.appendChild(editBtn);

        grid.appendChild(cell);
    }
}
// 5. EDITING LOGIC
function openEditModal(dayId, currentSub, currentTopic) {
    document.getElementById('editDayId').value = dayId;
    document.getElementById('editTopicInput').value = currentTopic;
    setEditSubject(currentSub);
    const overlay = document.getElementById('editModalOverlay');
    overlay.style.display = 'flex'; setTimeout(() => overlay.classList.add('active'), 10);
}

function closeEditModal(e) {
    if (e === null || e.target.id === 'editModalOverlay' || e.target.classList.contains('btn-close-accent')) {
        const overlay = document.getElementById('editModalOverlay');
        overlay.classList.remove('active');
        setTimeout(() => overlay.style.display = 'none', 300);
    }
}

function setEditSubject(sub, btn) {
    document.getElementById('editSubjectValue').value = sub;
    document.querySelectorAll('#editModalOverlay .pill-btn').forEach(b => b.classList.remove('active'));
    if(btn) btn.classList.add('active');
    else {
        const match = document.querySelector(`#editModalOverlay .pill-btn[data-type="${sub}"]`);
        if(match) match.classList.add('active');
        // Fallback for old letter matching
        else if(sub==='P') document.querySelectorAll('#editModalOverlay .pill-btn')[0].classList.add('active');
    }
}

function saveEditTask() {
    const dayId = document.getElementById('editDayId').value;
    const sub = document.getElementById('editSubjectValue').value || 'P';
    const topicInput = document.getElementById('editTopicInput'); 
    const topic = topicInput.value;
    
    // VALIDATION: Red border if empty
    if(!topic.trim()) { 
        topicInput.style.borderColor = '#ff3b3b'; 
        topicInput.placeholder = "Topic is required!"; 
        topicInput.focus(); 
        return; 
    }
    
    plannerEdits[dayId] = { s: sub, t: topic };
    localStorage.setItem('neetPlannerEdits', JSON.stringify(plannerEdits));
    
    calculateScheduleMap(); 
    renderCalendar(); 
    updatePlannerStats();
    closeEditModal(null);
}

function clearEditTask() {
    const dayId = document.getElementById('editDayId').value;
    delete plannerEdits[dayId];
    localStorage.setItem('neetPlannerEdits', JSON.stringify(plannerEdits));
    calculateScheduleMap(); renderCalendar(); updatePlannerStats();
    closeEditModal(null);
}

// 6. MENU & EXPORT (Updated with Animation)
function openPlannerMenu() { 
    const overlay = document.getElementById('plannerMenuOverlay');
    overlay.style.display = 'flex'; 
    // Small delay to trigger CSS transition
    setTimeout(() => overlay.classList.add('active'), 10);
}

function closePlannerMenu(e) { 
    // Close if clicked on Overlay OR Close Button
    if (e === null || e.target.id === 'plannerMenuOverlay' || e.target.classList.contains('btn-close-accent')) {
        const overlay = document.getElementById('plannerMenuOverlay');
        overlay.classList.remove('active');
        setTimeout(() => overlay.style.display = 'none', 300); 
    }
}
        // NEW: Core logic to process planner file silently
        function processPlannerFile(file) {
            if(!file) return;
            const reader = new FileReader();
            reader.onload = function(e) {
                try {
                    const json = JSON.parse(e.target.result);
                    const planData = Array.isArray(json) ? json : json.syllabus;
                    
                    if(json.edits) {
                        plannerEdits = json.edits;
                        localStorage.setItem('neetPlannerEdits', JSON.stringify(plannerEdits));
                    }
                    if(json.startDate) {
                        localStorage.setItem('neetPlanStartDate', json.startDate);
                    }
                    
                    localStorage.setItem('neetActivePlanData', JSON.stringify(planData));
                    currentSyllabus = planData;
                    
                    calculateScheduleMap(); 
                    renderCalendar(); 
                    updatePlannerStats();
                    
                    closePlannerMenu(null); // Close menu instantly if open
                } catch(err) { 
                    alert("Error reading plan JSON."); 
                }
            };
            reader.readAsText(file);
        }

        // Updated input handler for manual clicks
        function handlePlanUpload(input) {
            processPlannerFile(input.files[0]);
            input.value = ''; // Reset input
        }

/* =========================================
   DEBUG CONTEXT MENU LOGIC
   ========================================= */


/* =========================================
   SETTINGS / THEME HANDLERS
   ========================================= */
function openSettingsModal() {
    let overlay = document.getElementById('settingsModalOverlay');
    if (!overlay) return;
    // Ensure the overlay is a direct child of body so it's not clipped by other containers
    if (overlay.parentElement !== document.body) document.body.appendChild(overlay);
    // Ensure it's above everything else
    overlay.style.zIndex = '99999';
    overlay.style.display = 'flex';
    // Slight delay to allow layout then fade in via .active
    setTimeout(() => overlay.classList.add('active'), 10);
    // Try to focus overlay for accessibility
    try { overlay.tabIndex = -1; overlay.focus(); } catch (e) {}
    // Mark the active button
    updateSettingsModalButtons();
}

function closeSettingsModal(e) {
    if (e === null || e.target.id === 'settingsModalOverlay') {
        const overlay = document.getElementById('settingsModalOverlay');
        overlay.classList.remove('active');
        setTimeout(() => overlay.style.display = 'none', 300);
    }
}

function setTheme(mode, skipSave = false) {
    if (!mode) return;
    // Accept only 'dark' and 'darkest' - default to dark for unknown
    const valid = ['dark','darkest'];
    if (!valid.includes(mode)) mode = 'dark';

    // Apply data-theme attribute on the root element
    document.documentElement.setAttribute('data-theme', mode);
    // Update meta theme-color for UI chrome
    try {
        const meta = document.querySelector('meta[name="theme-color"]');
        if (meta) {
            if (mode === 'light') meta.setAttribute('content', '#ffffff');
            else if (mode === 'darkest') meta.setAttribute('content', '#000000');
            else meta.setAttribute('content', '#1e1e1e');
        }
    } catch (e) {}

    if (!skipSave) localStorage.setItem('neetTheme', mode);
    updateSettingsModalButtons();
}

function updateSettingsModalButtons() {
    const current = document.documentElement.getAttribute('data-theme') || 'dark';
    const btnDark = document.getElementById('themeDarkBtn');
    const btnDarkest = document.getElementById('themeDarkestBtn');
    if (btnDark) btnDark.classList.toggle('active', current === 'dark');
    if (btnDarkest) btnDarkest.classList.toggle('active', current === 'darkest');
}

function exportPlannerData() {
    const data = {
        syllabus: currentSyllabus,
        edits: plannerEdits,
        startDate: localStorage.getItem('neetPlanStartDate')
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], {type: 'application/json'});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'NEET_Plan_Export.json';
    a.click();
}


// 7. UTILS & STATS
function toggleTask(dayId) {
    if (completed.includes(dayId)) completed = completed.filter(id => id !== dayId);
    else completed.push(dayId);
    localStorage.setItem('neetCalendarCompleted', JSON.stringify(completed));
    renderCalendar(); updatePlannerStats();
}

function updatePlannerStats() {
    const footer = document.getElementById('plannerStats');
    if(!footer) return;
    
    if(currentSyllabus.length === 0) {
        footer.classList.remove('active');
        return;
    }
    footer.classList.add('active');

    let total = 0, done = 0;
    for (let key in scheduleMap) {
        const item = scheduleMap[key];
        // Count actionable items
        let isTask = (item.type === 'task');
        if(plannerEdits[item.dayId] && plannerEdits[item.dayId].s !== 'O') isTask = true;
        
        if(isTask) {
            total++;
            if (completed.includes(item.dayId) || completed.includes(key)) done++;
        }
    }
    
    // Calculate percentage for bar width
    const pct = total === 0 ? 0 : Math.round((done / total) * 100);
    
    const bar = document.getElementById('progressBar');
    const txt = document.getElementById('progressText');
    
    if(bar) bar.style.width = `${pct}%`;
    if(txt) txt.innerText = `${done} / ${total} Tasks`;

    // --- NEW: CONFETTI TRIGGER ---
    if (total > 0 && done === total) {
        // Check if we haven't celebrated yet to prevent infinite loops while browsing
        if (!window.hasCelebrated) {
            triggerCelebration();
            window.hasCelebrated = true; // Mark as done so it doesn't fire on every reload
        }
    } else {
        window.hasCelebrated = false; // Reset flag if they uncheck a box
    }
}

// THE CONFETTI EFFECT (Cannons from Left & Right)
function triggerCelebration() {
    var duration = 3 * 1000;
    var animationEnd = Date.now() + duration;
    var defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 9999 };

    var random = function(min, max) { return Math.random() * (max - min) + min; }

    var interval = setInterval(function() {
        var timeLeft = animationEnd - Date.now();

        if (timeLeft <= 0) {
            return clearInterval(interval);
        }

        var particleCount = 50 * (timeLeft / duration);
        
        // Fire from left edge
        confetti(Object.assign({}, defaults, { 
            particleCount, 
            origin: { x: random(0.1, 0.3), y: Math.random() - 0.2 } 
        }));
        
        // Fire from right edge
        confetti(Object.assign({}, defaults, { 
            particleCount, 
            origin: { x: random(0.7, 0.9), y: Math.random() - 0.2 } 
        }));
    }, 250);
}
function resetPlannerData() {
    if(confirm("Reset all progress and edits?")) {
        completed = [];
        plannerEdits = {}; 
        localStorage.setItem('neetCalendarCompleted', JSON.stringify(completed));
        localStorage.setItem('neetPlannerEdits', JSON.stringify(plannerEdits));
        renderCalendar(); updatePlannerStats();
    }
}