        /* =========================================
           SECTION 2: DASHBOARD LOGIC
           ========================================= */
        let biasChartInstance = null;
        
        // NEW: Rank Definitions
        const RANKS = [
            { name: "NOVICE", threshold: 0 },
            { name: "APPRENTICE", threshold: 10 },
            { name: "ADEPT", threshold: 50 },
            { name: "SCHOLAR", threshold: 100 },
            { name: "EXPERT", threshold: 250 },
            { name: "MASTER", threshold: 500 },
            { name: "LEGEND", threshold: 1000 }
        ];

        // NEW: Rank Modal Logic
        function openRankModal() {
            const overlay = document.getElementById('rankModalOverlay');
            const list = document.getElementById('rankListContainer');
            
            // Calculate Hours
            const logs = JSON.parse(localStorage.getItem('studyLogs')) || [];
            const totalSeconds = logs.reduce((acc, log) => acc + log.duration, 0);
            const totalHours = totalSeconds / 3600;

            // Determine Current Rank Index
            let currentIndex = 0;
            for (let i = 0; i < RANKS.length; i++) {
                if (totalHours >= RANKS[i].threshold) {
                    currentIndex = i;
                } else {
                    break;
                }
            }

            // Render List
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
            
            // Scroll current into view (Horizontal Center)
            setTimeout(() => {
                const currentEl = list.querySelector('.current');
                // UPDATED: Horizontal scroll behavior
                if(currentEl) currentEl.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
            }, 300); // Slight delay to allow modal render

            // Update Progress Bar
            const nextRank = RANKS[currentIndex + 1];
            const progressBar = document.getElementById('rankProgressFill');
            const nextInfo = document.getElementById('rankNextInfo');
            
            if (nextRank) {
                const prevThreshold = RANKS[currentIndex].threshold;
                const gap = nextRank.threshold - prevThreshold;
                const progress = totalHours - prevThreshold;
                
                // Calculate percentage of the WAY to the next rank
                let pct = 0;
                if (gap > 0) pct = Math.min(100, Math.max(0, (progress / gap) * 100));
                
                progressBar.style.width = `${pct}%`;
                const hoursLeft = (nextRank.threshold - totalHours).toFixed(1);
                nextInfo.innerHTML = `
                    <span style="color:#fff">${totalHours.toFixed(1)}h</span>
                    <span>To ${nextRank.name}: <span style="color:#ff3b3b">${hoursLeft}h</span> left</span>
                `;
            } else {
                progressBar.style.width = '100%';
                nextInfo.innerHTML = `
                    <span style="color:#fff">${totalHours.toFixed(1)}h</span>
                    <span style="color:#7ed321">MAX RANK ACHIEVED</span>
                `;
            }

            // Show Modal
            overlay.style.display = 'flex';
            setTimeout(() => overlay.classList.add('active'), 10);
        }

        // NEW: Rank Scroll Function
        function scrollRank(direction) {
            const container = document.getElementById('rankListContainer');
            // Scroll by width of container so it slides one 'page' or item width
            const scrollAmount = container.clientWidth * 0.8; 
            container.scrollBy({ left: direction * scrollAmount, behavior: 'smooth' });
        }

        function closeRankModal(e) {
            // Close if clicked directly on overlay OR if passed null (button click)
            if (e === null || e.target.id === 'rankModalOverlay') {
                const overlay = document.getElementById('rankModalOverlay');
                overlay.classList.remove('active');
                setTimeout(() => overlay.style.display = 'none', 300);
            }
        }

        // NEW: Exam Setup Modal Logic
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
                testInput.style.borderColor = '#ff3b3b';
                return;
            }

            examSessionType = selectedExamType;
            examSessionNo = testInput.value; 
            
            closeExamModal(null);
            startTimer(true);
        }

        // UPDATED: Renamed to distinguish from direct Focus Session
        function openExamSetup() { 
            const overlay = document.getElementById('examSetupModalOverlay');
            overlay.style.display = 'flex';
            setTimeout(() => overlay.classList.add('active'), 10);
            
            // Clear previous input if needed
            document.getElementById('modalTestNo').value = '';
        }

        // NEW: AVERAGE SCORE MODAL FUNCTIONS
        function openAverageScoreModal() {
            const logs = JSON.parse(localStorage.getItem('examLogs')) || [];
            let totalPhy = 0, totalChem = 0, totalBio = 0;
            // New counters
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
                // UPDATED: Rounding off L/W numbers
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
             // Find Logs button index (4th button, index 3)
             const logsBtn = document.querySelectorAll('.nav-btn')[3];
             showSection('logs', logsBtn);
        }

        // NEW: Add Hyperlink Modal Logic
        let pendingLinkCanvas = null;
        let pendingLinkRange = null;

        function openLinkModal(canvas, range) {
            pendingLinkCanvas = canvas;
            pendingLinkRange = range;
            
            const input = document.getElementById('modalLinkUrl');
            input.value = '';
            input.style.borderColor = ''; // Reset error borders
            
            const overlay = document.getElementById('linkModalOverlay');
            overlay.style.display = 'flex';
            setTimeout(() => overlay.classList.add('active'), 10);
            setTimeout(() => input.focus(), 50); // Auto-focus the input box
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
            
            // ERROR HANDLING: Red border if empty
            if (!url) {
                input.style.borderColor = 'var(--color-primary)';
                return;
            }
            
            // QoL Feature: Auto-append https:// if the user forgets it
            if (!/^https?:\/\//i.test(url)) {
                url = 'https://' + url;
            }
            
            if (pendingLinkCanvas) {
                pendingLinkCanvas.focus();
                const sel = window.getSelection();
                sel.removeAllRanges();
                if (pendingLinkRange) sel.addRange(pendingLinkRange);
                
                // Preserve native Undo history!
                document.execCommand('createLink', false, url);
                pendingLinkCanvas.dispatchEvent(new Event('input')); // Trigger auto-save
            }
            
            closeLinkModal(null);
        }
        
        /* =========================================
   JOURNAL & DASHBOARD TODO LOGIC (Date-Specific Fix)
   ========================================= */
let currentScratchPage = 1;
let scratchDate = ''; 
let journalData = {}; 
// NEW: Data is now an Object { "2025-10-27": [tasks], ... } instead of a flat array
let allTodoData = {}; 

function initScratchpad() {
    // 1. Set Date (Local Time)
    const now = new Date();
    const offset = now.getTimezoneOffset();
    const local = new Date(now.getTime() - (offset * 60 * 1000));
    scratchDate = local.toISOString().split('T')[0];
    
    // 2. Load Journal Data
    try {
        const savedJournal = localStorage.getItem('neetJournalData');
        if (savedJournal) journalData = JSON.parse(savedJournal) || {};
    } catch (e) { journalData = {}; }

    // 3. Load Todo Data (With Migration Fix)
    try {
        const savedTodos = JSON.parse(localStorage.getItem('neetDashboardTodos'));
        // Safety Check: If user has old "Array" data, move it to "Today" to prevent crash
        if (Array.isArray(savedTodos)) {
            allTodoData = {};
            allTodoData[scratchDate] = savedTodos;
            localStorage.setItem('neetDashboardTodos', JSON.stringify(allTodoData));
        } else {
            allTodoData = savedTodos || {};
        }
    } catch (e) { allTodoData = {}; }

    // 4. Init UI
    setDateInputValue('journalDatePicker', 'journalDateText', scratchDate);
    const pickerText = document.getElementById('journalDateText');
    if(pickerText && scratchDate === local.toISOString().split('T')[0]) pickerText.innerText = "Today";

    // 5. Set Default View
    const firstBtn = document.querySelector('.scratchpad-pages .page-btn');
    if(firstBtn) switchScratchpad(1, firstBtn);

    // 6. Setup Journal Auto-save
    const area = document.getElementById('dashScratchpad');
    if(area) {
        const newArea = area.cloneNode(true);
        area.parentNode.replaceChild(newArea, area);
        newArea.addEventListener('input', (e) => {
            if (!journalData[scratchDate]) journalData[scratchDate] = { 1: "", 2: "" };
            journalData[scratchDate][currentScratchPage] = e.target.value;
            localStorage.setItem('neetJournalData', JSON.stringify(journalData));
        });
    }
}

function updateScratchDate(newDate) {
    if (!newDate) return;
    scratchDate = newDate;
    
    // Check "Today"
    const now = new Date();
    const offset = now.getTimezoneOffset();
    const today = new Date(now.getTime() - (offset * 60 * 1000)).toISOString().split('T')[0];
    
    const txt = document.getElementById('journalDateText');
    if (txt) {
        txt.innerText = (newDate === today) ? "Today" : "Selected Date";
        // Re-run the display helper to format it nicely (DD/MM/YYYY)
        updateCustomDateDisplay(document.getElementById('journalDatePicker'), 'journalDateText');
    }
    
    // Refresh Current View (Crucial for Todo List update)
    if (currentScratchPage === 'todo') {
        renderDashboardTodos(); // This will now pull data for the NEW scratchDate
    } else {
        switchScratchpad(currentScratchPage, null); 
    }
}

// --- SWITCHER LOGIC ---
function switchScratchpad(mode, btnElement) {
    currentScratchPage = mode;
    const textArea = document.getElementById('dashScratchpad');
    const todoContainer = document.getElementById('dashTodoContainer');
    
    // 1. Handle Button States
    if (btnElement) {
        document.querySelectorAll('.scratchpad-pages .page-btn').forEach(b => b.classList.remove('active'));
        btnElement.classList.add('active');
    }

    // 2. Switch Content
    if (mode === 'todo') {
        textArea.style.display = 'none';
        todoContainer.style.display = 'block';
        renderDashboardTodos();
    } else {
        todoContainer.style.display = 'none';
        textArea.style.display = 'block';
        
        // Load text for page 1 or 2
        const dayData = journalData[scratchDate] || { 1: "", 2: "" };
        textArea.value = dayData[mode] || "";
        textArea.placeholder = `Start journaling your thoughts.....`;
    }
}

// --- TODOIST-STYLE LIST LOGIC ---
function renderDashboardTodos() {
    const container = document.getElementById('dashTodoContainer');
    if (!container) return;
    container.innerHTML = '';

    // 1. Get Tasks SPECIFIC to the selected Date
    // If no tasks exist for this day, default to empty array []
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

    // 2. Render "Add Task" Row
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

    // Ensure bucket exists for this day
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
    // Toggle specifically in today's bucket
    if (allTodoData[scratchDate] && allTodoData[scratchDate][index]) {
        allTodoData[scratchDate][index].done = !allTodoData[scratchDate][index].done;
        saveDashTodos();
        renderDashboardTodos();
    }
}

function deleteDashTodo(index) {
    if (allTodoData[scratchDate]) {
        allTodoData[scratchDate].splice(index, 1);
        // Cleanup: If array is empty, we could delete the key, but keeping [] is safer for now
        saveDashTodos();
        renderDashboardTodos();
    }
}

function saveDashTodos() {
    localStorage.setItem('neetDashboardTodos', JSON.stringify(allTodoData));
}

        // NEW: Flashcard Logic
        // STARTER_FLASHCARDS removed — user must load a JSON deck via the UI
        const STARTER_FLASHCARDS = [];

        let flashcardHistory = [];
        let historyIndex = -1;
        let isRevealed = false;
        let initFlashcardsCalled = false;

        function initFlashcards() {
            // Prevent double-init
            if (initFlashcardsCalled) return;
            initFlashcardsCalled = true;

            const deck = JSON.parse(localStorage.getItem('neetFlashcards')) || [];
            const textEl = document.getElementById('flashcardText');
            const subEl = document.getElementById('flashcardSub');

            if (!deck || deck.length === 0) {
                // Display an instruction for users to load their deck
                if (textEl) textEl.innerText = 'Load Flashcard JSON Deck.';
                if (subEl) subEl.innerText = 'Click the folder icon to import flashcards.';
            } else {
                // Initialize first card only when deck is present
                nextFlashcard();
            }

            // KEYBOARD NAVIGATION LISTENER
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

        // Helper: Generate shuffled list of indices [0, 1, 2, ... n]
        function getShuffledIndices(count) {
            const indices = Array.from({length: count}, (_, i) => i);
            for (let i = indices.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [indices[i], indices[j]] = [indices[j], indices[i]];
            }
            return indices;
        }

        function nextFlashcard() {
            const deck = JSON.parse(localStorage.getItem('neetFlashcards')) || [];
            if (!deck || deck.length === 0) return;

            // 1. If browsing history (user went back), just go forward in history
            if (historyIndex < flashcardHistory.length - 1) {
                historyIndex++;
                renderFlashcard(flashcardHistory[historyIndex]);
                return;
            }

            // 2. Logic for New Card (Non-Repeating)
            let queue = JSON.parse(localStorage.getItem('neetFlashcardQueue')) || [];

            // If queue is empty, create a new shuffled order
            if (queue.length === 0) {
                 queue = getShuffledIndices(deck.length);
            }

            // Get the next card index from the queue
            const nextIndex = queue.pop();
            
            // Save the updated queue
            localStorage.setItem('neetFlashcardQueue', JSON.stringify(queue));

            const newCard = deck[nextIndex];

            // Safety fallback if index is invalid (e.g. deck changed)
            if (!newCard) {
                localStorage.removeItem('neetFlashcardQueue');
                return nextFlashcard();
            }

            flashcardHistory.push(newCard);
            historyIndex++;
            renderFlashcard(newCard);
        }

        function prevFlashcard() {
            // Only go back if there is history
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
                
                // NEW: Tell KaTeX to render the new symbols
                renderMathInElement(textEl, {
                    delimiters: [
                        {left: '$$', right: '$$', display: true},
                        {left: '$', right: '$', display: false}
                    ]
                });
            }
        }

        function toggleFlashcard() {
            if(historyIndex === -1 || !flashcardHistory[historyIndex]) return;
            isRevealed = !isRevealed;
            const currentCard = flashcardHistory[historyIndex];
            const textEl = document.getElementById('flashcardText');
            
            if(isRevealed) {
                textEl.innerText = currentCard.a;
                textEl.style.color = '#7ed321';
            } else {
                textEl.innerText = currentCard.q;
                textEl.style.color = '#fff';
            }

            // NEW: Re-render math every time you flip
            renderMathInElement(textEl, {
                delimiters: [
                    {left: '$$', right: '$$', display: true},
                    {left: '$', right: '$', display: false}
                ]
            });
        }

        // NEW: Core logic to process flashcard file silently
        function processFlashcardFile(file) {
            if (!file) return;
            const reader = new FileReader();
            reader.onload = function(e) {
                try {
                    const newDeck = JSON.parse(e.target.result);
                    if (Array.isArray(newDeck) && newDeck.length > 0 && newDeck[0].hasOwnProperty('q') && newDeck[0].hasOwnProperty('a')) {
                        // Directly load and save - NO ALERTS!
                        localStorage.setItem('neetFlashcards', JSON.stringify(newDeck));
                        localStorage.removeItem('neetFlashcardQueue'); 
                        flashcardHistory = []; 
                        historyIndex = -1;
                        nextFlashcard(); // Refresh view instantly
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

        // Updated input handler for manual clicks
        function uploadFlashcards(input) {
            processFlashcardFile(input.files[0]);
            input.value = ''; // Reset input
        }

        function addNewFlashcard() {
            const q = prompt("Enter Question:");
            if(!q) return;
            const a = prompt("Enter Answer:");
            if(!a) return;
            
            const deck = JSON.parse(localStorage.getItem('neetFlashcards')) || STARTER_FLASHCARDS;
            deck.push({ q: q, a: a });
            localStorage.setItem('neetFlashcards', JSON.stringify(deck));
            localStorage.removeItem('neetFlashcardQueue'); // Reset queue to include new card
            alert("Card Added!");
        }

        function updateDashboard() {
            // Safety Helper
            const safeSetText = (id, text) => {
                const el = document.getElementById(id);
                if (el) el.innerText = text;
            };

            // 1. Countdown
            const targetDate = new Date("2026-05-03"); 
            const today = new Date();
            const diffDays = Math.ceil((targetDate - today) / (1000 * 60 * 60 * 24)); 
            safeSetText('daysRemaining', diffDays > 0 ? diffDays : "0");

            // 2. Rank & Hours
            const logs = JSON.parse(localStorage.getItem('studyLogs')) || [];
            const totalSeconds = logs.reduce((acc, log) => acc + log.duration, 0);
            const totalHours = (totalSeconds / 3600).toFixed(1);
            safeSetText('dashHours', `${totalHours} Hours Total`);
            
            // UPDATED: Use RANKS constant for consistency
            let rank = "NOVICE";
            // Simple loop to find current rank based on totalHours
            for (let i = RANKS.length - 1; i >= 0; i--) {
                if (totalHours >= RANKS[i].threshold) {
                    rank = RANKS[i].name;
                    break;
                }
            }
            safeSetText('dashRank', rank);

            // 3. Average Exam Score Widget Logic
            const examLogs = JSON.parse(localStorage.getItem('examLogs')) || [];
            let avgText = "N/A";
            let labelText = "No Previous Data";
            
            if (examLogs.length > 0) {
                const totalScore = examLogs.reduce((sum, log) => sum + (parseInt(log.total) || 0), 0);
                const avg = Math.round(totalScore / examLogs.length);
                avgText = avg + "/720";
                
                // NEW: Get last exam score for subtitle
                const lastLog = examLogs[examLogs.length - 1];
                const lastScore = lastLog.total || 0;
                labelText = `Previous Exam Score ${lastScore}/720`;
            }
            
            safeSetText('dashAvgScore', avgText);
            safeSetText('dashAvgLabel', labelText);


            // 4. Consistency Streak
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

            // 4b. Streak Dots
            const dotContainer = document.getElementById('streakDots');
            if (dotContainer) {
                dotContainer.innerHTML = '';
                // FIX: Iterate 0 to 6 (0=Today) so it fills from Left to Right
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

            // 5. Today's Task
            const todayKey = getLocalDayKey(new Date());
            // Ensure scheduleMap is populated before accessing (in case called early)
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
                    taskContainer.innerHTML = `<div class="task-preview" style="border-color:#7ed321"><div class="task-preview-subject" style="color:#7ed321">SUNDAY</div><div class="task-preview-topic">Rest / Mock Test</div></div>`;
                } else {
                    taskContainer.innerHTML = `<div style="color:#666; margin-top:10px;">No task scheduled for today.</div>`;
                }
            }
            
            // REMOVED: Old Chart logic
        }
