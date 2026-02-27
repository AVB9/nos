/* =========================================
   DASHBOARD LOGIC
   ========================================= */
let biasChartInstance = null;

const RANKS = [
    { name: "NOVICE", threshold: 0 },
    { name: "APPRENTICE", threshold: 10 },
    { name: "ADEPT", threshold: 50 },
    { name: "SCHOLAR", threshold: 100 },
    { name: "EXPERT", threshold: 250 },
    { name: "MASTER", threshold: 500 },
    { name: "LEGEND", threshold: 1000 }
];

function openRankModal() {
    const overlay = document.getElementById('rankModalOverlay');
    const list = document.getElementById('rankListContainer');
    
    const logs = OS.Storage.get('studyLogs', []);
    const totalSeconds = logs.reduce((acc, log) => acc + log.duration, 0);
    const totalHours = totalSeconds / 3600;

    let currentIndex = 0;
    for (let i = 0; i < RANKS.length; i++) {
        if (totalHours >= RANKS[i].threshold) {
            currentIndex = i;
        } else {
            break;
        }
    }

    list.innerHTML = '';
    RANKS.forEach((r, i) => {
        const div = document.createElement('div');
        let className = 'rank-item';
        let statusIcon = ''; 
        
        if (i < currentIndex) {
            className += ' achieved';
            statusIcon = '✓';
        } else if (i === currentIndex) {
            className += ' current';
            statusIcon = '★';
        } else {
            className += ' locked';
            statusIcon = '🔒';
        }
        
        div.className = className;
        div.innerHTML = `
            <div class="rank-name-text">
                <span>${statusIcon}</span>
                <span>${r.name}</span>
            </div>
            <span class="rank-threshold">Requires ${r.threshold} Hours</span>
        `;
        list.appendChild(div);
    });
    
    setTimeout(() => {
        const currentEl = list.querySelector('.current');
        if(currentEl) currentEl.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }, 300); 

    const nextRank = RANKS[currentIndex + 1];
    const progressBar = document.getElementById('rankProgressFill');
    const nextInfo = document.getElementById('rankNextInfo');
    
    if (nextRank) {
        const prevThreshold = RANKS[currentIndex].threshold;
        const gap = nextRank.threshold - prevThreshold;
        const progress = totalHours - prevThreshold;
        
        let pct = 0;
        if (gap > 0) pct = Math.min(100, Math.max(0, (progress / gap) * 100));
        
        progressBar.style.width = `${pct}%`;
        const hoursLeft = (nextRank.threshold - totalHours).toFixed(1);
        nextInfo.innerHTML = `
            <span style="color:#fff">${totalHours.toFixed(1)}h</span>
            <span>To ${nextRank.name}: <span style="color:var(--color-primary)">${hoursLeft}h</span> left</span>
        `;
    } else {
        progressBar.style.width = '100%';
        nextInfo.innerHTML = `
            <span style="color:#fff">${totalHours.toFixed(1)}h</span>
            <span style="color:var(--color-biology)">MAX RANK ACHIEVED</span>
        `;
    }

    overlay.style.display = 'flex';
    setTimeout(() => overlay.classList.add('active'), 10);
}

function scrollRank(direction) {
    const container = document.getElementById('rankListContainer');
    const scrollAmount = container.clientWidth * 0.8; 
    container.scrollBy({ left: direction * scrollAmount, behavior: 'smooth' });
}

function closeRankModal(e) {
    if (e === null || e.target.id === 'rankModalOverlay') {
        const overlay = document.getElementById('rankModalOverlay');
        overlay.classList.remove('active');
        setTimeout(() => overlay.style.display = 'none', 300);
    }
}

let selectedExamType = 'FST';

function selectExamType(type) {
    selectedExamType = type;
    document.getElementById('btnFST').classList.toggle('active', type === 'FST');
    document.getElementById('btnPT').classList.toggle('active', type === 'PT');
}

function closeExamModal(e) {
     if (e === null || e.target.id === 'examSetupModalOverlay') {
        const overlay = document.getElementById('examSetupModalOverlay');
        overlay.classList.remove('active');
        setTimeout(() => overlay.style.display = 'none', 300);
    }
}

let examSessionType = '';
let examSessionNo = '';

function confirmExamStart() {
    const testInput = document.getElementById('modalTestNo');
    const testNo = parseInt(testInput.value);
    if (!testInput.value || testNo < 1) {
        testInput.classList.add('input-error');
        return;
    }

    examSessionType = selectedExamType;
    examSessionNo = testInput.value; 
    
    closeExamModal(null);
    startTimer(true);
}

function openExamSetup() { 
    const overlay = document.getElementById('examSetupModalOverlay');
    overlay.style.display = 'flex';
    setTimeout(() => overlay.classList.add('active'), 10);
    document.getElementById('modalTestNo').value = '';
}

function openAverageScoreModal() {
    const logs = OS.Storage.get('examLogs', []);
    let totalPhy = 0, totalChem = 0, totalBio = 0;
    let phyL = 0, phyW = 0;
    let chemL = 0, chemW = 0;
    let bioL = 0, bioW = 0;

    const count = logs.length;

    if (count > 0) {
        logs.forEach(log => {
            totalPhy += parseInt(log.phy.marks) || 0;
            phyL += parseInt(log.phy.left) || 0;
            phyW += parseInt(log.phy.wrong) || 0;

            totalChem += parseInt(log.chem.marks) || 0;
            chemL += parseInt(log.chem.left) || 0;
            chemW += parseInt(log.chem.wrong) || 0;

            totalBio += parseInt(log.bio.marks) || 0;
            bioL += parseInt(log.bio.left) || 0;
            bioW += parseInt(log.bio.wrong) || 0;
        });
        
        document.getElementById('modalAvgPhy').innerText = Math.round(totalPhy / count);
        document.getElementById('modalStatsPhy').innerText = `L: ${Math.round(phyL/count)} | W: ${Math.round(phyW/count)}`;

        document.getElementById('modalAvgChem').innerText = Math.round(totalChem / count);
        document.getElementById('modalStatsChem').innerText = `L: ${Math.round(chemL/count)} | W: ${Math.round(chemW/count)}`;

        document.getElementById('modalAvgBio').innerText = Math.round(totalBio / count);
        document.getElementById('modalStatsBio').innerText = `L: ${Math.round(bioL/count)} | W: ${Math.round(bioW/count)}`;
    } else {
        document.getElementById('modalAvgPhy').innerText = "0";
        document.getElementById('modalStatsPhy').innerText = "L: 0 | W: 0";
        
        document.getElementById('modalAvgChem').innerText = "0";
        document.getElementById('modalStatsChem').innerText = "L: 0 | W: 0";

        document.getElementById('modalAvgBio').innerText = "0";
        document.getElementById('modalStatsBio').innerText = "L: 0 | W: 0";
    }

    const overlay = document.getElementById('avgScoreModalOverlay');
    overlay.style.display = 'flex';
    setTimeout(() => overlay.classList.add('active'), 10);
}

function closeAverageScoreModal(e) {
    if (e === null || e.target.id === 'avgScoreModalOverlay') {
        const overlay = document.getElementById('avgScoreModalOverlay');
        overlay.classList.remove('active');
        setTimeout(() => overlay.style.display = 'none', 300);
    }
}

function goToExamLogsFromModal() {
     closeAverageScoreModal(null);
     const logsBtn = document.querySelectorAll('.nav-btn')[3];
     showSection('logs', logsBtn);
}

let pendingLinkCanvas = null;
let pendingLinkRange = null;

function openLinkModal(canvas, range) {
    pendingLinkCanvas = canvas;
    pendingLinkRange = range;
    
    const input = document.getElementById('modalLinkUrl');
    input.value = '';
    input.classList.remove('input-error'); 
    
    const overlay = document.getElementById('linkModalOverlay');
    overlay.style.display = 'flex';
    setTimeout(() => overlay.classList.add('active'), 10);
    setTimeout(() => input.focus(), 50); 
}

function closeLinkModal(e) {
    if (e === null || e.target.id === 'linkModalOverlay' || e.target.classList.contains('btn-close-accent')) {
        const overlay = document.getElementById('linkModalOverlay');
        overlay.classList.remove('active');
        setTimeout(() => overlay.style.display = 'none', 300);
    }
}

function confirmAddLink() {
    const input = document.getElementById('modalLinkUrl');
    let url = input.value.trim();
    
    if (!url) {
        input.classList.add('input-error');
        return;
    }
    
    if (!/^https?:\/\//i.test(url)) {
        url = 'https://' + url;
    }
    
    if (pendingLinkCanvas) {
        pendingLinkCanvas.focus();
        const sel = window.getSelection();
        sel.removeAllRanges();
        if (pendingLinkRange) sel.addRange(pendingLinkRange);
        
        document.execCommand('createLink', false, url);
        pendingLinkCanvas.dispatchEvent(new Event('input')); 
    }
    
    closeLinkModal(null);
}

/* =========================================
   JOURNAL & DASHBOARD TODO LOGIC
   ========================================= */
let currentScratchPage = 1;
let scratchDate = ''; 
let journalData = {}; 
let allTodoData = {}; 

function initScratchpad() {
    const now = new Date();
    const offset = now.getTimezoneOffset();
    const local = new Date(now.getTime() - (offset * 60 * 1000));
    scratchDate = local.toISOString().split('T')[0];
    
    journalData = OS.Storage.get('neetJournalData', {});

    const savedTodos = OS.Storage.get('neetDashboardTodos', {});
    if (Array.isArray(savedTodos)) {
        allTodoData = {};
        allTodoData[scratchDate] = savedTodos;
        OS.Storage.set('neetDashboardTodos', allTodoData);
    } else {
        allTodoData = savedTodos;
    }

    setDateInputValue('journalDatePicker', 'journalDateText', scratchDate);
    const pickerText = document.getElementById('journalDateText');
    if(pickerText && scratchDate === local.toISOString().split('T')[0]) pickerText.innerText = "Today";

    const firstBtn = document.querySelector('.scratchpad-pages .page-btn');
    if(firstBtn) switchScratchpad(1, firstBtn);

    const area = document.getElementById('dashScratchpad');
    if(area) {
        const newArea = area.cloneNode(true);
        area.parentNode.replaceChild(newArea, area);
        newArea.addEventListener('input', (e) => {
            if (!journalData[scratchDate]) journalData[scratchDate] = { 1: "", 2: "" };
            journalData[scratchDate][currentScratchPage] = e.target.value;
            OS.Storage.set('neetJournalData', journalData);
        });
    }
}

function updateScratchDate(newDate) {
    if (!newDate) return;
    scratchDate = newDate;
    
    const now = new Date();
    const offset = now.getTimezoneOffset();
    const today = new Date(now.getTime() - (offset * 60 * 1000)).toISOString().split('T')[0];
    
    const txt = document.getElementById('journalDateText');
    if (txt) {
        txt.innerText = (newDate === today) ? "Today" : "Selected Date";
        updateCustomDateDisplay(document.getElementById('journalDatePicker'), 'journalDateText');
    }
    
    if (currentScratchPage === 'todo') {
        renderDashboardTodos(); 
    } else {
        switchScratchpad(currentScratchPage, null); 
    }
}

function switchScratchpad(mode, btnElement) {
    currentScratchPage = mode;
    const textArea = document.getElementById('dashScratchpad');
    const todoContainer = document.getElementById('dashTodoContainer');
    
    if (btnElement) {
        document.querySelectorAll('.scratchpad-pages .page-btn').forEach(b => b.classList.remove('active'));
        btnElement.classList.add('active');
    }

    if (mode === 'todo') {
        textArea.style.display = 'none';
        todoContainer.style.display = 'block';
        renderDashboardTodos();
    } else {
        todoContainer.style.display = 'none';
        textArea.style.display = 'block';
        
        const dayData = journalData[scratchDate] || { 1: "", 2: "" };
        textArea.value = dayData[mode] || "";
        textArea.placeholder = `Start journaling your thoughts.....`;
    }
}

function renderDashboardTodos() {
    const container = document.getElementById('dashTodoContainer');
    if (!container) return;
    container.innerHTML = '';

    const dayTasks = allTodoData[scratchDate] || [];

    dayTasks.forEach((task, index) => {
        const item = document.createElement('div');
        item.className = `dash-todo-item ${task.done ? 'completed' : ''}`;
        
        item.innerHTML = `
            <div class="todo-checkbox" onclick="toggleDashTodo(${index})" role="button" tabindex="0" onkeydown="if(event.key==='Enter') this.click()"></div>
            <div class="todo-text" onclick="toggleDashTodo(${index})" role="button" tabindex="0" onkeydown="if(event.key==='Enter') this.click()">${task.text}</div>
            <button class="todo-delete" onclick="deleteDashTodo(${index})">×</button>
        `;
        container.appendChild(item);
    });

    const addRow = document.createElement('div');
    addRow.className = 'todo-add-row';
    addRow.innerHTML = `
        <button class="todo-add-btn" onclick="addDashTodoFromInput()">+</button>
        <input type="text" id="dashTodoInput" class="todo-add-input" placeholder="Add a task for this day" onkeypress="handleTodoKey(event)">
    `;
    container.appendChild(addRow);
}

function addDashTodoFromInput() {
    const input = document.getElementById('dashTodoInput');
    const text = input.value.trim();
    if (!text) return;

    if (!allTodoData[scratchDate]) allTodoData[scratchDate] = [];

    allTodoData[scratchDate].push({ text: text, done: false });
    saveDashTodos();
    renderDashboardTodos();
    
    setTimeout(() => {
        const newInput = document.getElementById('dashTodoInput');
        if(newInput) newInput.focus();
    }, 50);
}

function handleTodoKey(e) {
    if (e.key === 'Enter') addDashTodoFromInput();
}

function toggleDashTodo(index) {
    if (allTodoData[scratchDate] && allTodoData[scratchDate][index]) {
        allTodoData[scratchDate][index].done = !allTodoData[scratchDate][index].done;
        saveDashTodos();
        renderDashboardTodos();
    }
}

function deleteDashTodo(index) {
    if (allTodoData[scratchDate]) {
        allTodoData[scratchDate].splice(index, 1);
        saveDashTodos();
        renderDashboardTodos();
    }
}

function saveDashTodos() {
    OS.Storage.set('neetDashboardTodos', allTodoData);
}

/* =========================================
   FLASHCARD LOGIC
   ========================================= */
const STARTER_FLASHCARDS = [];

let flashcardHistory = [];
let historyIndex = -1;
let isRevealed = false;
let initFlashcardsCalled = false;

function initFlashcards() {
    if (initFlashcardsCalled) return;
    initFlashcardsCalled = true;

    const deck = OS.Storage.get('neetFlashcards', []);
    const textEl = document.getElementById('flashcardText');
    const subEl = document.getElementById('flashcardSub');

    if (!deck || deck.length === 0) {
        if (textEl) textEl.innerText = 'Load Flashcard JSON Deck.';
        if (subEl) subEl.innerText = 'Click the folder icon to import flashcards.';
    } else {
        nextFlashcard();
    }

    document.addEventListener('keydown', (e) => {
        const dash = document.getElementById('section-dashboard');
        if(!dash || !dash.classList.contains('active')) return;
        if(e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable) return;

        if (e.key === 'ArrowRight') {
            e.preventDefault();
            nextFlashcard();
        } else if (e.key === 'ArrowLeft') {
            e.preventDefault();
            prevFlashcard();
        } else if (e.key === ' ' || e.key === 'ArrowUp' || e.key === 'ArrowDown') {
            e.preventDefault();
            toggleFlashcard();
        }
    });
}

function getShuffledIndices(count) {
    const indices = Array.from({length: count}, (_, i) => i);
    for (let i = indices.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [indices[i], indices[j]] = [indices[j], indices[i]];
    }
    return indices;
}

function nextFlashcard() {
    const deck = OS.Storage.get('neetFlashcards', []);
    if (!deck || deck.length === 0) return;

    if (historyIndex < flashcardHistory.length - 1) {
        historyIndex++;
        renderFlashcard(flashcardHistory[historyIndex]);
        return;
    }

    let queue = OS.Storage.get('neetFlashcardQueue', []);

    if (queue.length === 0) {
         queue = getShuffledIndices(deck.length);
    }

    const nextIndex = queue.pop();
    
    OS.Storage.set('neetFlashcardQueue', queue);

    const newCard = deck[nextIndex];

    if (!newCard) {
        OS.Storage.remove('neetFlashcardQueue');
        return nextFlashcard();
    }

    flashcardHistory.push(newCard);
    historyIndex++;
    renderFlashcard(newCard);
}

function prevFlashcard() {
    if (historyIndex > 0) {
        historyIndex--;
        renderFlashcard(flashcardHistory[historyIndex]);
    }
}

function renderFlashcard(card) {
    isRevealed = false;
    const textEl = document.getElementById('flashcardText');
    const subEl = document.getElementById('flashcardSub');
    
    if(textEl && subEl) {
        textEl.style.color = '#fff';
        textEl.innerText = card.q;
        subEl.innerText = "Use Keyboard Navigation";
        
        if (typeof renderMathInElement === 'function') {
            renderMathInElement(textEl, {
                delimiters: [
                    {left: '$$', right: '$$', display: true},
                    {left: '$', right: '$', display: false}
                ]
            });
        }
    }
}

function toggleFlashcard() {
    if(historyIndex === -1 || !flashcardHistory[historyIndex]) return;
    isRevealed = !isRevealed;
    const currentCard = flashcardHistory[historyIndex];
    const textEl = document.getElementById('flashcardText');
    
    if(isRevealed) {
        textEl.innerText = currentCard.a;
        textEl.style.color = 'var(--color-biology)';
    } else {
        textEl.innerText = currentCard.q;
        textEl.style.color = '#fff';
    }

    if (typeof renderMathInElement === 'function') {
        renderMathInElement(textEl, {
            delimiters: [
                {left: '$$', right: '$$', display: true},
                {left: '$', right: '$', display: false}
            ]
        });
    }
}

function processFlashcardFile(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const newDeck = JSON.parse(e.target.result);
            if (Array.isArray(newDeck) && newDeck.length > 0 && newDeck[0].hasOwnProperty('q') && newDeck[0].hasOwnProperty('a')) {
                OS.Storage.set('neetFlashcards', newDeck);
                OS.Storage.remove('neetFlashcardQueue'); 
                flashcardHistory = []; 
                historyIndex = -1;
                nextFlashcard(); 
            } else {
                alert("Invalid File Format. Please upload a valid JSON deck.");
            }
        } catch (err) {
            alert("Error parsing file. Please ensure it is a valid JSON.");
            console.error(err);
        }
    };
    reader.readAsText(file);
}

function uploadFlashcards(input) {
    processFlashcardFile(input.files[0]);
    input.value = ''; 
}

function addNewFlashcard() {
    const q = prompt("Enter Question:");
    if(!q) return;
    const a = prompt("Enter Answer:");
    if(!a) return;
    
    const deck = OS.Storage.get('neetFlashcards', STARTER_FLASHCARDS);
    deck.push({ q: q, a: a });
    OS.Storage.set('neetFlashcards', deck);
    OS.Storage.remove('neetFlashcardQueue'); 
    alert("Card Added!");
}

function updateDashboard() {
    const safeSetText = (id, text) => {
        const el = document.getElementById(id);
        if (el) el.innerText = text;
    };

    const targetDate = new Date("2026-05-03"); 
    const today = new Date();
    const diffDays = Math.ceil((targetDate - today) / (1000 * 60 * 60 * 24)); 
    safeSetText('daysRemaining', diffDays > 0 ? diffDays : "0");

    const logs = OS.Storage.get('studyLogs', []);
    const totalSeconds = logs.reduce((acc, log) => acc + log.duration, 0);
    const totalHours = (totalSeconds / 3600).toFixed(1);
    safeSetText('dashHours', `${totalHours} Hours Total`);
    
    let rank = "NOVICE";
    for (let i = RANKS.length - 1; i >= 0; i--) {
        if (totalHours >= RANKS[i].threshold) {
            rank = RANKS[i].name;
            break;
        }
    }
    safeSetText('dashRank', rank);

    const examLogs = OS.Storage.get('examLogs', []);
    let avgText = "N/A";
    let labelText = "No Previous Data";
    
    if (examLogs.length > 0) {
        const totalScore = examLogs.reduce((sum, log) => sum + (parseInt(log.total) || 0), 0);
        const avg = Math.round(totalScore / examLogs.length);
        avgText = avg + "/720";
        
        const lastLog = examLogs[examLogs.length - 1];
        const lastScore = lastLog.total || 0;
        labelText = `Previous Exam Score ${lastScore}/720`;
    }
    
    safeSetText('dashAvgScore', avgText);
    safeSetText('dashAvgLabel', labelText);

    const uniqueDates = [...new Set(logs.map(l => new Date(l.startTime).toLocaleDateString()))];
    let streak = 0;
    let checkDate = new Date();
    while (true) {
        const checkStr = checkDate.toLocaleDateString();
        if (uniqueDates.includes(checkStr)) {
            streak++;
            checkDate.setDate(checkDate.getDate() - 1);
        } else {
            if(checkDate.toDateString() === new Date().toDateString()) {
                 checkDate.setDate(checkDate.getDate() - 1);
                 continue;
            }
            break;
        }
    }
    safeSetText('dashStreak', `${streak} Days`);

    const dotContainer = document.getElementById('streakDots');
    if (dotContainer) {
        dotContainer.innerHTML = '';
        for (let i = 0; i < 7; i++) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const dStr = d.toLocaleDateString();
            const dot = document.createElement('div');
            dot.className = 'streak-dot' + (uniqueDates.includes(dStr) ? ' active' : '');
            dot.title = dStr + (i === 0 ? " (Today)" : "");
            dotContainer.appendChild(dot);
        }
    }

    const todayKey = getLocalDayKey(new Date());
    if (Object.keys(scheduleMap).length === 0 && typeof calculateScheduleMap === 'function') {
        calculateScheduleMap();
    }
    const taskData = scheduleMap[todayKey];
    const taskContainer = document.getElementById('dashTaskContainer');
    if (taskContainer) {
        if(taskData && taskData.type === 'task') {
            let subName = taskData.task.s === 'P' ? 'Physics' : (taskData.task.s === 'C' ? 'Chemistry' : 'Biology');
            taskContainer.innerHTML = `
                <div class="task-preview">
                    <div class="task-preview-subject">${subName}</div>
                    <div class="task-preview-topic">${taskData.task.t}</div>
                </div>`;
        } else if (taskData && taskData.type === 'sunday') {
            taskContainer.innerHTML = `<div class="task-preview" style="border-color:var(--color-biology)"><div class="task-preview-subject" style="color:var(--color-biology)">SUNDAY</div><div class="task-preview-topic">Rest / Mock Test</div></div>`;
        } else {
            taskContainer.innerHTML = `<div style="color:var(--color-text-muted); margin-top:10px;">No task scheduled for today.</div>`;
        }
    }
}