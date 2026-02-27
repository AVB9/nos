/* ===============
   EXAM LOG LOGIC
   =============== */
let editIndex = -1;
let myChart = null;

function calcPhy() {
    const left = parseInt(document.getElementById('phyLeft').value) || 0;
    const wrong = parseInt(document.getElementById('phyWrong').value) || 0;
    let marks = 180 - (wrong * 5) - (left * 4);
    if (marks < -45) marks = -45;
    document.getElementById('phyMarks').value = marks;
    calcGrandTotal();
}
function calcChem() {
    const left = parseInt(document.getElementById('chemLeft').value) || 0;
    const wrong = parseInt(document.getElementById('chemWrong').value) || 0;
    let marks = 180 - (wrong * 5) - (left * 4);
    if (marks < -45) marks = -45;
    document.getElementById('chemMarks').value = marks;
    calcGrandTotal();
}
function calcBio() {
    const left = parseInt(document.getElementById('bioLeft').value) || 0;
    const wrong = parseInt(document.getElementById('bioWrong').value) || 0;
    let marks = 360 - (wrong * 5) - (left * 4);
    if (marks < -90) marks = -90; 
    document.getElementById('bioMarks').value = marks;
    calcGrandTotal();
}
function calcGrandTotal() {
    const p = parseInt(document.getElementById('phyMarks').value) || 0;
    const c = parseInt(document.getElementById('chemMarks').value) || 0;
    const b = parseInt(document.getElementById('bioMarks').value) || 0;
    document.getElementById('grandTotal').value = p + c + b;
}

function loadLogs() {
    const logs = OS.Storage.get('examLogs', []);
    const tbody = document.querySelector('#logTable tbody');
    if(!tbody) return;
    tbody.innerHTML = ''; 

    logs.forEach((log, index) => {
        const row = document.createElement('tr');
        const displayDate = log.date ? new Date(log.date).toLocaleDateString() : '-';
        row.innerHTML = `
            <td class="log-td date-col">${displayDate}</td>
            <td class="log-td text-bold">${log.testNo}</td>
            <td class="log-td sub-col">${log.phy.left}</td><td class="log-td sub-col">${log.phy.wrong}</td><td class="log-td main-mark">${log.phy.marks}</td>
            <td class="log-td sub-col">${log.chem.left}</td><td class="log-td sub-col">${log.chem.wrong}</td><td class="log-td main-mark">${log.chem.marks}</td>
            <td class="log-td sub-col">${log.bio.left}</td><td class="log-td sub-col">${log.bio.wrong}</td><td class="log-td main-mark">${log.bio.marks}</td>
            <td class="log-td total-col">${log.total}</td>
            <td class="log-td"><div class="action-cell">
                <button class="btn-mini edit-btn" onclick="startEdit(${index})">✎</button>
                <button class="btn-mini delete-btn" onclick="deleteExamLog(${index})">X</button>
            </div></td>
        `;
        tbody.appendChild(row);
    });
    updateChart(logs);
}

function handleLogSubmit() {
    const form = document.querySelector('.log-form');
    const formData = new FormData(form);
    
    const testNo = formData.get('testNo');
    const testInput = document.getElementById('testNoLog');

    // VALIDATION
    if(!testNo) { 
        testInput.classList.add('input-error');
        testInput.focus();
        return; 
    }
    
    calcPhy(); calcChem(); calcBio();

    const logData = {
        date: formData.get('exam_date'),
        testNo: testNo,
        phy: { 
            left: formData.get('phy_left') || 0, 
            wrong: formData.get('phy_wrong') || 0, 
            marks: formData.get('phy_marks') || 0 
        },
        chem: { 
            left: formData.get('chem_left') || 0, 
            wrong: formData.get('chem_wrong') || 0, 
            marks: formData.get('chem_marks') || 0 
        },
        bio: { 
            left: formData.get('bio_left') || 0, 
            wrong: formData.get('bio_wrong') || 0, 
            marks: formData.get('bio_marks') || 0 
        },
        total: formData.get('total') || 0
    };

    const logs = OS.Storage.get('examLogs', []);
    if (editIndex === -1) { 
        logs.push(logData); 
    } else { 
        logs[editIndex] = logData; 
        editIndex = -1; 
        toggleEditModeStyles(false); 
    }
    
    OS.Storage.set('examLogs', logs);
    clearForm(); 
    loadLogs(); 
    
    if(typeof updateDashboard === 'function') updateDashboard();
}

function startEdit(index) {
    const logs = OS.Storage.get('examLogs', []);
    const log = logs[index];
    if (!log) return;
    editIndex = index;
    toggleEditModeStyles(true);
    
    if(typeof setDateInputValue === 'function') {
        setDateInputValue('examDateLog', 'examDateLogText', log.date);
    }
    
    document.getElementById('testNoLog').value = log.testNo;
    document.getElementById('phyLeft').value = log.phy.left; document.getElementById('phyWrong').value = log.phy.wrong;
    document.getElementById('chemLeft').value = log.chem.left; document.getElementById('chemWrong').value = log.chem.wrong;
    document.getElementById('bioLeft').value = log.bio.left; document.getElementById('bioWrong').value = log.bio.wrong;
    calcPhy(); calcChem(); calcBio();
}

function cancelEdit() { 
    editIndex = -1; 
    toggleEditModeStyles(false); 
    clearForm(); 
}

function toggleEditModeStyles(isEditing) {
    const mainBtn = document.getElementById('mainBtn'); 
    const cancelBtn = document.getElementById('cancelBtn');
    if (isEditing) { 
        mainBtn.innerText = "UPDATE LOG"; 
        cancelBtn.style.display = 'flex'; 
    } else { 
        mainBtn.innerText = "ADD LOG"; 
        cancelBtn.style.display = 'none'; 
    }
}

function deleteExamLog(index) {
    const logs = OS.Storage.get('examLogs', []);
    logs.splice(index, 1);
    OS.Storage.set('examLogs', logs);
    
    if (editIndex === index) cancelEdit();
    loadLogs(); 
    
    if(typeof updateDashboard === 'function') updateDashboard();
}

function clearForm() {
    document.querySelectorAll('.log-form input').forEach(input => {
        if(input.type !== 'date') input.value = '';
        if(input.id === 'testNoLog') input.classList.remove('input-error');
    });
    
    const getTodayString = () => {
        const now = new Date();
        const offset = now.getTimezoneOffset();
        const local = new Date(now.getTime() - (offset*60*1000));
        return local.toISOString().split('T')[0];
    };
    
    if(typeof setDateInputValue === 'function') {
        setDateInputValue('examDateLog', 'examDateLogText', getTodayString());
    }
}

function exportToCSV() {
    const logs = OS.Storage.get('examLogs', []);
    if (logs.length === 0) { alert("No data to export!"); return; }
    let csvContent = "Date,Test No,Phy Left,Phy Wrong,Phy Marks,Chem Left,Chem Wrong,Chem Marks,Bio Left,Bio Wrong,Bio Marks,Total\n";
    logs.forEach(log => {
        const row = [ log.date, log.testNo, log.phy.left, log.phy.wrong, log.phy.marks, log.chem.left, log.chem.wrong, log.chem.marks, log.bio.left, log.bio.wrong, log.bio.marks, log.total ].join(",");
        csvContent += row + "\n";
    });
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url); link.setAttribute("download", "neet_logs.csv");
    link.style.visibility = 'hidden'; document.body.appendChild(link); link.click(); document.body.removeChild(link);
}

function updateChart(logs) {
    const ctx = document.getElementById('scoreChart').getContext('2d');
    if(myChart) myChart.destroy();
    
    // Dynamically fetch theme colors from CSS variables to ensure the chart is Theme-Aware
    const styles = getComputedStyle(document.documentElement);
    const colorPrimary = styles.getPropertyValue('--color-primary').trim() || '#ff3b3b';
    const colorPhy = styles.getPropertyValue('--color-physics').trim() || '#4a90e2';
    const colorChem = styles.getPropertyValue('--color-chemistry').trim() || '#f5a623';
    const colorBio = styles.getPropertyValue('--color-biology').trim() || '#7ed321';

    // Parse the primary color to RGBA for the background gradient
    const gradientTotal = ctx.createLinearGradient(0, 0, 0, 400);
    gradientTotal.addColorStop(0, 'rgba(255, 59, 59, 0.5)'); 
    gradientTotal.addColorStop(1, 'rgba(255, 59, 59, 0)');
    
    myChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: logs.map(l=>l.testNo),
            datasets: [
                { label: 'Total', data: logs.map(l=>l.total), borderColor: colorPrimary, backgroundColor: gradientTotal, borderWidth: 3, fill: true, tension: 0.3 },
                { label: 'Phy', data: logs.map(l=>l.phy.marks), borderColor: colorPhy, borderWidth: 2, borderDash:[5,5], tension:0.3 },
                { label: 'Chem', data: logs.map(l=>l.chem.marks), borderColor: colorChem, borderWidth: 2, borderDash:[5,5], tension:0.3 },
                { label: 'Bio', data: logs.map(l=>l.bio.marks), borderColor: colorBio, borderWidth: 2, borderDash:[5,5], tension:0.3 }
            ]
        },
        options: { responsive: true, interaction: { mode:'index', intersect:false }, scales: { y: { beginAtZero: true } } }
    });
}