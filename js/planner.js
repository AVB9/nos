/* ================
   PLANNER LOGIC 
   ================ */

// 1. DATA LOADING & VARIABLES
let currentSyllabus = OS.Storage.get('neetActivePlanData', (typeof ACTIVE_PLAN !== 'undefined') ? ACTIVE_PLAN : []);
let completed = OS.Storage.get('neetCalendarCompleted', []);
let plannerEdits = OS.Storage.get('neetPlannerEdits', {});
let viewDate = new Date();
let scheduleMap = {};

// 2. INITIALIZATION
function initPlannerStart() {
    let savedStart = OS.Storage.get('neetPlanStartDate', null);
    if (!savedStart) {
        savedStart = getLocalDayKey(new Date());
        OS.Storage.set('neetPlanStartDate', savedStart);
    }
    if(typeof setDateInputValue === 'function') {
        setDateInputValue('startDatePicker', 'startDatePickerText', savedStart);
    }
}

function updateStartDate() {
    const picker = document.getElementById('startDatePicker');
    if(picker && picker.value) {
        OS.Storage.set('neetPlanStartDate', picker.value);
        calculateScheduleMap(); 
        renderCalendar(); 
        updatePlannerStats();
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
    const startStr = OS.Storage.get('neetPlanStartDate', null);
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
        const data = scheduleMap[dateKey]; 
        
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
        const savedEdit = plannerEdits[cellId] || plannerEdits[dateKey]; 
        
        let displayTopic = null;
        let displaySub = 'O'; 

        if (savedEdit) {
            displayTopic = (typeof savedEdit === 'string') ? savedEdit : savedEdit.t;
            displaySub = (typeof savedEdit === 'string') ? ((data && data.task)?data.task.s:'O') : savedEdit.s;
        } 
        else if (data) {
            if (data.type === 'task') {
                displayTopic = data.task.t; displaySub = data.task.s;
            } else if (data.type === 'off' || data.type === 'sunday') {
                displayTopic = "Rest"; displaySub = 'O'; 
            }
        }
        else if (dateObj.getDay() === 0) {
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

            const isDone = completed.includes(cellId) || completed.includes(dateKey);
            const isPast = dateObj < realToday;
            
            if (isDone) cell.classList.add('completed');
            else if (isPast && displaySub !== 'O') cell.classList.add('overdue');

            cell.insertAdjacentHTML('beforeend', `<div class="task-content"><span class="subject-tag ${subClass}">${subName}</span><span class="task-topic">${displayTopic}</span></div>`);
            
            const clickId = data ? data.dayId : dateKey;
            cell.onclick = () => toggleTask(clickId);
        } else {
            cell.insertAdjacentHTML('beforeend', `<div class="task-content"><span class="task-topic" style="color:var(--color-border);">-</span></div>`);
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
        else if(sub==='P') document.querySelectorAll('#editModalOverlay .pill-btn')[0].classList.add('active');
    }
}

function saveEditTask() {
    const dayId = document.getElementById('editDayId').value;
    const sub = document.getElementById('editSubjectValue').value || 'P';
    const topicInput = document.getElementById('editTopicInput'); 
    const topic = topicInput.value;
    
    if(!topic.trim()) { 
        topicInput.style.borderColor = 'var(--color-primary)'; 
        topicInput.placeholder = "Topic is required!"; 
        topicInput.focus(); 
        return; 
    }
    
    plannerEdits[dayId] = { s: sub, t: topic };
    OS.Storage.set('neetPlannerEdits', plannerEdits);
    
    calculateScheduleMap(); 
    renderCalendar(); 
    updatePlannerStats();
    closeEditModal(null);
}

function clearEditTask() {
    const dayId = document.getElementById('editDayId').value;
    delete plannerEdits[dayId];
    OS.Storage.set('neetPlannerEdits', plannerEdits);
    calculateScheduleMap(); 
    renderCalendar(); 
    updatePlannerStats();
    closeEditModal(null);
}

// 6. MENU & EXPORT 
function openPlannerMenu() { 
    const overlay = document.getElementById('plannerMenuOverlay');
    overlay.style.display = 'flex'; 
    setTimeout(() => overlay.classList.add('active'), 10);
}

function closePlannerMenu(e) { 
    if (e === null || e.target.id === 'plannerMenuOverlay' || e.target.classList.contains('btn-close-accent')) {
        const overlay = document.getElementById('plannerMenuOverlay');
        overlay.classList.remove('active');
        setTimeout(() => overlay.style.display = 'none', 300); 
    }
}

function processPlannerFile(file) {
    if(!file) return;
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            // Note: We intentionally use JSON.parse here instead of OS.Storage because 
            // we are parsing an external uploaded file, not reading from the browser cache.
            const json = JSON.parse(e.target.result);
            const planData = Array.isArray(json) ? json : json.syllabus;
            
            if(json.edits) {
                plannerEdits = json.edits;
                OS.Storage.set('neetPlannerEdits', plannerEdits);
            }
            if(json.startDate) {
                OS.Storage.set('neetPlanStartDate', json.startDate);
            }
            
            OS.Storage.set('neetActivePlanData', planData);
            currentSyllabus = planData;
            
            calculateScheduleMap(); 
            renderCalendar(); 
            updatePlannerStats();
            
            closePlannerMenu(null); 
        } catch(err) { 
            alert("Error reading plan JSON."); 
        }
    };
    reader.readAsText(file);
}

function handlePlanUpload(input) {
    processPlannerFile(input.files[0]);
    input.value = ''; 
}

/* =========================================
   SETTINGS / THEME HANDLERS
   ========================================= */
function openSettingsModal() {
    let overlay = document.getElementById('settingsModalOverlay');
    if (!overlay) return;
    if (overlay.parentElement !== document.body) document.body.appendChild(overlay);
    overlay.style.zIndex = '99999';
    overlay.style.display = 'flex';
    setTimeout(() => overlay.classList.add('active'), 10);
    try { overlay.tabIndex = -1; overlay.focus(); } catch (e) {}
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
    const valid = ['dark','darkest'];
    if (!valid.includes(mode)) mode = 'dark';

    document.documentElement.setAttribute('data-theme', mode);
    try {
        const meta = document.querySelector('meta[name="theme-color"]');
        if (meta) {
            if (mode === 'light') meta.setAttribute('content', '#ffffff');
            else if (mode === 'darkest') meta.setAttribute('content', '#000000');
            else meta.setAttribute('content', '#1e1e1e');
        }
    } catch (e) {}

    if (!skipSave) OS.Storage.set('neetTheme', mode);
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
        startDate: OS.Storage.get('neetPlanStartDate', null)
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
    OS.Storage.set('neetCalendarCompleted', completed);
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
        let isTask = (item.type === 'task');
        if(plannerEdits[item.dayId] && plannerEdits[item.dayId].s !== 'O') isTask = true;
        
        if(isTask) {
            total++;
            if (completed.includes(item.dayId) || completed.includes(key)) done++;
        }
    }
    
    const pct = total === 0 ? 0 : Math.round((done / total) * 100);
    
    const bar = document.getElementById('progressBar');
    const txt = document.getElementById('progressText');
    
    if(bar) bar.style.width = `${pct}%`;
    if(txt) txt.innerText = `${done} / ${total} Tasks`;

    if (total > 0 && done === total) {
        if (!window.hasCelebrated) {
            triggerCelebration();
            window.hasCelebrated = true; 
        }
    } else {
        window.hasCelebrated = false; 
    }
}

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
        
        confetti(Object.assign({}, defaults, { 
            particleCount, 
            origin: { x: random(0.1, 0.3), y: Math.random() - 0.2 } 
        }));
        
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
        OS.Storage.set('neetCalendarCompleted', completed);
        OS.Storage.set('neetPlannerEdits', plannerEdits);
        renderCalendar(); 
        updatePlannerStats();
    }
}