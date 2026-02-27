/* =========================================
   TIMER LOGIC & AMBIENT SOUND
   ========================================= */
let timerInterval;
let seconds = 0;
let isRunning = false;
let startTime = null;
let isFocusMode = false;

// Pill Selection Logic
function selectSubject(subject, btn) {
    if(isRunning) return; 
    document.getElementById('selectedSubject').value = subject;
    
    // Update UI
    document.querySelectorAll('.pill-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    
    // Update Ring Color based on subject 
    const ring = document.getElementById('timerProgress');
    if(ring) {
        if(subject === 'Physics') ring.style.stroke = 'var(--color-physics)';
        else if(subject === 'Chemistry') ring.style.stroke = 'var(--color-chemistry)';
        else if(subject === 'Biology') ring.style.stroke = 'var(--color-biology)';
        else if(subject === 'Other') ring.style.stroke = 'var(--color-grey)'; 
        else ring.style.stroke = 'var(--color-primary)';
    }
}

function formatTime(totalSeconds) {
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    return `${pad(h)}:${pad(m)}`;
}

function pad(val) { return val < 10 ? '0' + val : val; }

function startTimer(focusMode = false, isResuming = false) {
    if (isRunning) return;
    isRunning = true;
    isFocusMode = focusMode;
    
    if (isResuming) {
        const state = OS.Storage.get('neetTimerState', {});
        if (!state.start) return; // Safety fallback
        
        startTime = new Date(state.start);
        
        // Restore inputs
        const subj = state.subject || 'Physics';
        const topic = state.topic || '';
        document.getElementById('selectedSubject').value = subj;
        document.getElementById('topicInput').value = topic;
        
        // Restore Pill UI
        document.querySelectorAll('.pill-btn').forEach(b => b.classList.remove('active'));
        const activeBtn = document.querySelector(`.pill-btn[data-sub="${subj}"]`);
        if(activeBtn) activeBtn.classList.add('active');
        
        // Ring Color
        const ring = document.getElementById('timerProgress');
        if(ring) {
            if(subj === 'Physics') ring.style.stroke = 'var(--color-physics)';
            else if(subj === 'Chemistry') ring.style.stroke = 'var(--color-chemistry)';
            else if(subj === 'Biology') ring.style.stroke = 'var(--color-biology)';
            else if(subj === 'Other') ring.style.stroke = 'var(--color-grey)'; 
            else ring.style.stroke = 'var(--color-primary)';
        }

        // Restore Exam details
        examSessionType = state.examType || '';
        examSessionNo = state.examNo || '';

    } else {
        startTime = new Date();
        // Save State via Kernel
        const state = {
            start: startTime.getTime(),
            focus: isFocusMode,
            subject: document.getElementById('selectedSubject').value,
            topic: document.getElementById('topicInput').value,
            examType: examSessionType, 
            examNo: examSessionNo
        };
        OS.Storage.set('neetTimerState', state);
    }
    
    // UI updates
    document.getElementById('startBtn').style.display = 'none'; 
    document.getElementById('startFocusBtn').style.display = 'none';
    document.getElementById('stopBtn').style.display = 'block';
    document.getElementById('timerDisplay').classList.add('timer-active');
    
    // Show Live Indicator on Dashboard
    const liveDot = document.getElementById('liveStreakDot');
    if(liveDot) liveDot.style.display = 'inline-block';

    // Trigger Expand Animation
    document.querySelector('.circular-timer-wrapper').classList.add('active');
    document.querySelector('.timer-main-panel').classList.add('timer-running');
    
    // Disable inputs
    document.querySelectorAll('#section-timer .pill-btn').forEach(b => b.style.pointerEvents = 'none');
    
    // Check Topic Input & Default to "Self Study"
    const topicInput = document.getElementById('topicInput');
    if (topicInput) {
        if (!topicInput.value.trim()) {
            topicInput.value = "Self Study"; 
        }
        topicInput.disabled = true;
    }
    
    if (isFocusMode) {
        document.getElementById('mainSidebar').style.display = 'none';
        document.getElementById('mainContent').style.display = 'none';
        document.getElementById('examModeOverlay').style.display = 'flex';
        if (document.documentElement.requestFullscreen) {
            document.documentElement.requestFullscreen().catch((e) => {});
        }
    }
    
    timerInterval = setInterval(() => {
        const now = new Date();
        seconds = Math.floor((now - startTime) / 1000); 
        
        document.getElementById('timerDisplay').innerText = formatTime(seconds);
        document.title = `(${formatTime(seconds)}) Studying...`;
        
        // Update Circular Ring
        const ring = document.getElementById('timerProgress');
        if (ring) {
            const circumference = 855; 
            const currentSec = seconds % 60;
            
            if (currentSec === 0) {
                ring.style.transition = 'stroke-dashoffset 1s linear, opacity 0.5s ease';
                ring.style.strokeDashoffset = '0';
                ring.style.opacity = '1';
                
                setTimeout(() => { ring.style.opacity = '0'; }, 750); 
                setTimeout(() => {
                    ring.style.transition = 'none';
                    ring.style.strokeDashoffset = circumference;
                }, 950); 
            } else {
                ring.style.transition = 'stroke-dashoffset 1s linear, opacity 0.5s ease';
                ring.style.opacity = '1';
                const offset = circumference - (currentSec / 60) * circumference;
                ring.style.strokeDashoffset = offset;
            }
        }
    }, 1000);
}

// Direct Focus Session
function startFocusSession() {
    examSessionType = '';
    examSessionNo = '';
    startTimer(true);
}

function exitExamMode() {
    stopTimer(); 
    document.getElementById('mainSidebar').style.display = 'flex';
    document.getElementById('mainContent').style.display = 'block';
    document.getElementById('examModeOverlay').style.display = 'none';
    if (document.exitFullscreen) document.exitFullscreen().catch((e) => {});
    showSection('timer', document.querySelectorAll('.nav-btn')[1]);
}

function stopTimer() {
    if (!isRunning) return;
    clearInterval(timerInterval);
    isRunning = false;
    const endTime = new Date();
    
    // Clear Timer State via Kernel
    OS.Storage.remove('neetTimerState');

    // Hide Live Indicator
    const liveDot = document.getElementById('liveStreakDot');
    if(liveDot) liveDot.style.display = 'none';

    // Collapse Animation
    document.querySelector('.circular-timer-wrapper').classList.remove('active');
    document.querySelector('.timer-main-panel').classList.remove('timer-running');
    
    let subject = 'Self Study';
    let finalTopic = 'Self Study';
    
    // LOGGING LOGIC
    if (isFocusMode && examSessionType) {
         subject = "Mock Test";
         finalTopic = `${examSessionType} - Test ${examSessionNo}`;
         examSessionType = '';
         examSessionNo = '';
    } else {
        const subjectEl = document.getElementById('selectedSubject');
        subject = subjectEl ? subjectEl.value : 'Self Study';
        
        const topicEl = document.getElementById('topicInput');
        let topicRaw = topicEl ? topicEl.value.trim() : '';
        finalTopic = topicRaw || "Self Study";
    }
    
    saveTimerLog(subject, finalTopic, startTime, endTime, seconds);
    
    seconds = 0; 
    document.getElementById('timerDisplay').innerText = "00:00"; 
    document.title = "NEET OS";
    document.getElementById('timerDisplay').classList.remove('timer-active');
    document.getElementById('startBtn').style.display = 'block'; 
    document.getElementById('startFocusBtn').style.display = 'block';
    document.getElementById('stopBtn').style.display = 'none';
    
    // Re-enable inputs
    document.querySelectorAll('.pill-btn').forEach(b => b.style.pointerEvents = 'auto');
    const topicEl = document.getElementById('topicInput');
    if (topicEl) {
        topicEl.disabled = false;
        topicEl.value = ''; 
    }
    
    // Reset Ring
    const ring = document.getElementById('timerProgress');
    if (ring) {
        ring.style.transition = '0.5s ease-out';
        ring.style.strokeDashoffset = 855;
    }

    if(isFocusMode) {
        stopAmbientSound();
    }
    isFocusMode = false;
}

/* =========================================
   AMBIENT SOUND (Brown Noise Generator)
   ========================================= */
let audioCtx = null;
let soundSource = null;
let isSoundOn = false;

function toggleAmbientSound() {
    const btn = document.getElementById('soundBtn');
    if (isSoundOn) {
        stopAmbientSound();
        if(btn) btn.classList.remove('sound-active');
    } else {
        startAmbientSound();
        if(btn) btn.classList.add('sound-active');
    }
}

function startAmbientSound() {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    
    const bufferSize = audioCtx.sampleRate * 2; 
    const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
    const data = buffer.getChannelData(0);
    
    let lastOut = 0;
    for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        let brown = (lastOut + (0.02 * white)) / 1.02;
        lastOut = brown;
        brown *= 3.5; 
        data[i] = brown;
    }

    soundSource = audioCtx.createBufferSource();
    soundSource.buffer = buffer;
    soundSource.loop = true;
    
    const filter = audioCtx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 400; 

    const gainNode = audioCtx.createGain();
    gainNode.gain.value = 0.5; 

    soundSource.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    
    soundSource.start();
    isSoundOn = true;
}

function stopAmbientSound() {
    if (soundSource) {
        try { soundSource.stop(); } catch(e) {}
        soundSource = null;
    }
    isSoundOn = false;
    const btn = document.getElementById('soundBtn');
    if(btn) btn.classList.remove('sound-active');
}

function saveTimerLog(subject, topic, start, end, duration) {
    const log = { id: Date.now(), subject: subject, topic: topic, startTime: start.toISOString(), endTime: end.toISOString(), duration: duration };
    const logs = OS.Storage.get('studyLogs', []);
    logs.unshift(log); 
    OS.Storage.set('studyLogs', logs);
    renderTimerLogs();
}

function handleSubjectChange() {
     const val = document.getElementById('subjectSelect').value;
     document.getElementById('testTypeSelect').style.display = (val === 'Mock Test') ? 'block' : 'none';
}

function renderTimerLogs() {
    const logs = OS.Storage.get('studyLogs', []);
    const container = document.getElementById('logContainer');
    if (container) {
        container.innerHTML = '';
        
        const picker = document.getElementById('timerHistoryDate');
        if(!picker.value) picker.valueAsDate = new Date(); 
        const selectedDateStr = picker.value; 
        
        const dayLogs = logs.filter(l => {
            const lDate = new Date(l.startTime);
            const y = lDate.getFullYear();
            const m = String(lDate.getMonth()+1).padStart(2,'0');
            const d = String(lDate.getDate()).padStart(2,'0');
            return `${y}-${m}-${d}` === selectedDateStr;
        });
        
        const totalSec = dayLogs.reduce((acc, l) => acc + l.duration, 0);
        const h = Math.floor(totalSec/3600);
        const m = Math.floor((totalSec%3600)/60);
        const dayTotal = document.getElementById('dayTotalTime');
        if(dayTotal) dayTotal.innerText = `Total: ${h}h ${m}m`;

        if(dayLogs.length === 0) {
            container.innerHTML = '<div style="text-align:center; color:var(--color-text-muted); padding:20px;">No sessions recorded for this date.</div>';
        } else {
            dayLogs.forEach(log => {
                const row = document.createElement('div');
                row.className = 'session-row';
                const timeStr = new Date(log.startTime).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'});
                const durH = Math.floor(log.duration/3600);
                const durM = Math.floor((log.duration%3600)/60);
                const durStr = durH > 0 ? `${durH}h ${durM}m` : `${durM}m`;
                
                let badgeClass = 'badge-other';
                if(log.subject==='Physics') badgeClass='badge-phy';
                if(log.subject==='Chemistry') badgeClass='badge-chem';
                if(log.subject==='Biology') badgeClass='badge-bio';
                if(log.subject==='Mock Test' || log.subject==='Focus Session') badgeClass='badge-test';

                row.innerHTML = `
                    <div style="display:flex; flex-direction:column;">
                        <span style="color:var(--color-text-muted); font-size:0.8rem;">${timeStr}</span>
                        <div><span class="badge ${badgeClass}">${log.subject}</span> <span style="color:var(--color-text-default);">${log.topic}</span></div>
                    </div>
                    <div style="display:flex; align-items:center;">
                        <span style="color:var(--color-primary); font-weight:bold; margin-right:10px;">${durStr}</span>
                        <button class="delete-btn" onclick="deleteTimerLog(${log.id})" title="Delete Entry">×</button>
                    </div>
                `;
                container.appendChild(row);
            });
        }
    }
    
    if(typeof updateDashboard === 'function') updateDashboard();
}

function deleteTimerLog(id) {
    let logs = OS.Storage.get('studyLogs', []);
    logs = logs.filter(l => l.id !== id);
    OS.Storage.set('studyLogs', logs);
    renderTimerLogs();
}