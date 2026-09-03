// --- ESTADO DA APLICAÇÃO ---
let state = {
history: [],
currentWorkout: null,
editingWorkoutId: null,
profile: {
weight: 70,
waterTarget: 2450,
profilePic: ""
},
waterLogs: {},
creatineLogs: {},
customExercises: []
};
let timerInterval = null;
let chartInstance = null;

// --- INICIALIZAÇÃO ---
window.onload = function() {
loadData();
setupDate();
updateWaterUI();
updateCreatineUI();
updateHomeSummary();
renderHistory();
populateChartSelect();
renderCustomExercisesInSelect();
};

function setupDate() {
const now = new Date();
const options = { weekday: 'long', day: 'numeric', month: 'short' };
document.getElementById('headerDate').innerText = now.toLocaleDateString('pt-BR', options);
}

function getTodayKey() {
const today = new Date();
return formatDateKey(today);
}

function formatDateKey(dateObj) {
return `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}-${String(dateObj.getDate()).padStart(2, '0')}`;
}

// --- NAVEGAÇÃO ---
function showPage(pageId, btn) {
document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
const targetPage = document.getElementById(pageId);
if (targetPage) targetPage.classList.add('active');
const navBtns = document.querySelectorAll('.nav-btn');
if (btn) {
btn.classList.add('active');
} else {
if (pageId === 'home' && navBtns[0]) navBtns[0].classList.add('active');
if (pageId === 'workout' && navBtns[1]) navBtns[1].classList.add('active');
}
if (pageId === 'history' && navBtns[2]) navBtns[2].classList.add('active');
if (pageId === 'profile' && navBtns[3]) navBtns[3].classList.add('active');

if (pageId === 'home') {
updateHomeSummary();
updateWaterUI();
updateCreatineUI();
} else if (pageId === 'history') {
renderHistory();
populateChartSelect();
}
}

// --- FOTO DE PERFIL (COM CROPPING QUADRADO SEM ESPREMER) ---
function triggerProfilePicUpload() {
document.getElementById('picInput').click();
}

function handleProfilePicUpload(event) {
const file = event.target.files[0];
if (file) {
const reader = new FileReader();
reader.onload = function(e) {
const img = new Image();
img.onload = function() {
const canvas = document.createElement('canvas');
const ctx = canvas.getContext('2d');
const targetSize = 600; // alta resolução
canvas.width = targetSize;
canvas.height = targetSize;
// Corte centralizado para manter o aspecto sem espremer a foto
const minDim = Math.min(img.width, img.height);
const sx = (img.width - minDim) / 2;
const sy = (img.height - minDim) / 2;
ctx.drawImage(img, sx, sy, minDim, minDim, 0, 0, targetSize, targetSize);
const compressedSrc = canvas.toDataURL('image/jpeg', 0.92);
document.getElementById('headerProfilePic').src = compressedSrc;
state.profile.profilePic = compressedSrc;
saveData();
showToast("Foto de perfil atualizada!");
};
img.src = e.target.result;
};
reader.readAsDataURL(file);
}
}

// --- SUGESTÕES AUTOMÁTICAS ---
function calculateSuggestedMetrics() {
const weightVal = parseFloat(document.getElementById('userWeight').value);
if (!isNaN(weightVal) && weightVal > 0) {
const suggestedWater = Math.round(weightVal * 35);
document.getElementById('waterSuggestionText').innerText = `Sugestão com base no seu peso (${weightVal}kg): ${suggestedWater}ml/dia`;
document.getElementById('waterTarget').value = suggestedWater;
state.profile.waterTarget = suggestedWater;
state.profile.weight = weightVal;
const suggestedCreatine = (weightVal * 0.07).toFixed(1);
document.getElementById('creatineTarget').value = `${suggestedCreatine}g`;
saveData();
updateWaterUI();
updateCreatineUI();
} else {
document.getElementById('waterSuggestionText').innerText = "";
document.getElementById('creatineTarget').value = "";
}
}

// --- SEQUÊNCIA DE DIAS (STREAK DE ÁGUA E CREATINA) ---
function calculateStreak(type) {
let streak = 0;
let d = new Date();
const targetWater = state.profile.waterTarget || 3000;
let key = formatDateKey(d);
let isTodayDone = false;
if (type === 'water') {
isTodayDone = (state.waterLogs[key] || 0) >= targetWater;
} else if (type === 'creatine') {
isTodayDone = !!state.creatineLogs[key];
}
if (isTodayDone) {
streak++;
d.setDate(d.getDate() - 1);
} else {
let yesterday = new Date();
yesterday.setDate(yesterday.getDate() - 1);
let yKey = formatDateKey(yesterday);
let isYesterdayDone = (type === 'water') ? ((state.waterLogs[yKey] || 0) >= targetWater) : !!state.creatineLogs[yKey];
if (!isYesterdayDone) return 0;
d.setDate(d.getDate() - 1);
}
while (true) {
let k = formatDateKey(d);
let done = (type === 'water') ? ((state.waterLogs[k] || 0) >= targetWater) : !!state.creatineLogs[k];
if (done) {
streak++;
d.setDate(d.getDate() - 1);
} else {
break;
}
}
return streak;
}

// --- GERENCIAMENTO DE ÁGUA ---
function addWater(amount) {
const today = getTodayKey();
const current = state.waterLogs[today] || 0;
const target = state.profile.waterTarget || 3000;
if (current >= target) {
showToast("Meta de água já alcançada hoje!");
return;
}
state.waterLogs[today] = current + amount;
saveData();
updateWaterUI();
showToast(`+${amount}ml de água registrados!`);
}

function addCustomWater() {
const input = document.getElementById('customWaterInput');
const val = parseInt(input.value);
if (val && val > 0) {
addWater(val);
input.value = "";
}
}

function resetWater() {
const today = getTodayKey();
state.waterLogs[today] = 0;
saveData();
updateWaterUI();
showToast("Consumo de água zerado!");
}

function updateWaterUI() {
const today = getTodayKey();
const current = state.waterLogs[today] || 0;
const target = state.profile.waterTarget || 3000;
document.getElementById('waterCurrent').innerText = current;
document.getElementById('waterTargetText').innerText = target;
const pct = Math.min(100, Math.round((current / target) * 100));
document.getElementById('waterProgress').style.width = pct + '%';
const actionArea = document.getElementById('waterActionArea');
const reachedMsg = document.getElementById('waterMetaReachedMessage');
if (current >= target && target > 0) {
actionArea.style.display = 'none';
reachedMsg.style.display = 'block';
} else {
actionArea.style.display = 'block';
reachedMsg.style.display = 'none';
}
const streak = calculateStreak('water');
document.getElementById('waterStreak').innerText = `${streak} dia${streak !== 1 ? 's' : ''}`;
}

// --- GERENCIAMENTO DE CREATINA ---
function toggleCreatine() {
const today = getTodayKey();
state.creatineLogs[today] = !state.creatineLogs[today];
saveData();
updateCreatineUI();
}

function updateCreatineUI() {
const today = getTodayKey();
const taken = !!state.creatineLogs[today];
const weight = state.profile.weight || 70;
const dose = (weight * 0.07).toFixed(1);
document.getElementById('homeCreatineTarget').innerText = `${dose}g`;
const statusText = document.getElementById('creatineStatusText');
const btn = document.getElementById('homeCreatineBtn');
if (taken) {
statusText.innerText = "Status de hoje: Tomada!";
statusText.style.color = "var(--green)";
btn.innerText = "Desmarcar Creatina";
btn.className = "full secondary";
} else {
statusText.innerText = "Status de hoje: Pendente";
statusText.style.color = "var(--muted)";
btn.innerText = "Marcar como Tomada";
btn.className = "full green";
}
const streak = calculateStreak('creatine');
document.getElementById('creatineStreak').innerText = `${streak} dia${streak !== 1 ? 's' : ''}`;
}

// --- COMPARATIVO DE EXERCÍCIOS ---
function getExerciseComparisonHTML(exerciseName, currentSets, isCardio) {
if (!state.history || state.history.length === 0 || isCardio) return "";
let prevEx = null;
for (let w of state.history) {
if (state.editingWorkoutId && w.id === state.editingWorkoutId) continue;
let found = (w.exercises || []).find(e => e.name.toLowerCase() === exerciseName.toLowerCase() && e.type !== 'Cardio');
if (found && found.sets && found.sets.length > 0) {
prevEx = found;
break;
}
}
if (!prevEx) {
return '<div style="font-size:11px; color:var(--muted); margin-top:6px;">Primeiro registro deste exercício.</div>';
}
const currMaxW = Math.max(0, ...currentSets.map(s => parseFloat(s.weight) || 0));
const currSetsCount = currentSets.length;
const prevMaxW = Math.max(0, ...prevEx.sets.map(s => parseFloat(s.weight) || 0));
const prevSetsCount = prevEx.sets.length;
const diffW = currMaxW - prevMaxW;
const diffS = currSetsCount - prevSetsCount;
let wText = diffW > 0 ? `+${diffW} kg` : (diffW < 0 ? `${diffW} kg` : 'mesma carga');
let sText = diffS > 0 ? `+${diffS} série(s)` : (diffS < 0 ? `${diffS} série(s)` : 'mesmas séries');
let color = (diffW > 0 || diffS > 0) ? 'var(--green)' : 'var(--accent)';
return `<div style="font-size: 12px; margin-top:8px; padding:6px 10px; background:rgba(124, 92, 255, 0.1); border-radius:8px; border: 1px solid rgba(124,92,255,0.2); color:${color}; font-weight:600;">
vs Último Treino (${prevMaxW}kg / ${prevSetsCount} séries): <strong>Carga: ${wText}</strong> | <strong>Séries: ${sText}</strong>
</div>`;
}

// --- FLUXO DE TREINO ---
function startWorkout() {
const nameInput = document.getElementById('workoutName');
const name = (nameInput ? nameInput.value.trim() : "") || "Treino do Dia";
state.editingWorkoutId = null;
state.currentWorkout = {
id: Date.now(),
name: name,
startTime: new Date().toISOString(),
exercises: []
};
if (nameInput) nameInput.value = "";
const activeNameInput = document.getElementById('activeWorkoutName');
if (activeNameInput) activeNameInput.value = name;
saveData();
renderCurrentWorkout();
showPage('workout');
}

function updateWorkoutTitle(val) {
if (state.currentWorkout) {
state.currentWorkout.name = val || "Treino Sem Nome";
saveData();
}
}

function openExerciseModal() {
document.getElementById('exerciseModal').classList.add('show');
toggleSetsCountVisibility();
}

function closeExerciseModal() {
document.getElementById('exerciseModal').classList.remove('show');
}

function toggleSetsCountVisibility() {
const type = document.getElementById('newExerciseType').value;
const setsField = document.getElementById('setsCountField');
if (setsField) {
setsField.style.display = (type === 'Cardio') ? 'none' : 'block';
}
}

function selectFromLibrary(val) {
if (!val) return;
const parts = val.split('|');
if (parts.length === 2) {
document.getElementById('newExerciseName').value = parts[0];
document.getElementById('newExerciseType').value = parts[1];
toggleSetsCountVisibility();
}
}

function renderCustomExercisesInSelect() {
const optGroup = document.getElementById('customOptGroup');
if (!optGroup) return;
if (!state.customExercises || state.customExercises.length === 0) {
optGroup.innerHTML = '<option disabled value="">Nenhum personalizado salvo</option>';
return;
}
optGroup.innerHTML = state.customExercises.map(item =>
`<option value="${item.name}|${item.type}">${item.name} (${item.type})</option>`
).join('');
}

function addExerciseToWorkout() {
const nameInput = document.getElementById('newExerciseName');
const name = nameInput.value.trim();
const type = document.getElementById('newExerciseType').value;
const setsCount = parseInt(document.getElementById('newExerciseSetsCount').value) || 3;
if (!name) {
showToast("Insira o nome do exercício!");
return;
}
if (!state.customExercises) state.customExercises = [];
const select = document.getElementById('exerciseLibrarySelect');
let existsInSelect = false;
for (let option of select.options) {
if (option.value.toLowerCase().startsWith(name.toLowerCase() + "|")) {
existsInSelect = true;
break;
}
}
if (!existsInSelect) {
state.customExercises.push({ name: name, type: type });
renderCustomExercisesInSelect();
showToast(`"${name}" salvo na biblioteca!`);
}
if (!state.currentWorkout) {
startWorkout();
}
const sets = [];
if (type === 'Cardio') {
sets.push({ time: 20, dist: 0 });
} else {
for (let i = 0; i < setsCount; i++) {
sets.push({ weight: 0, reps: 0 });
}
}
state.currentWorkout.exercises.push({
id: Date.now(),
name: name,
type: type,
collapsed: false,
sets: sets
});
nameInput.value = "";
document.getElementById('exerciseLibrarySelect').value = "";
closeExerciseModal();
saveData();
renderCurrentWorkout();
}

function toggleCollapse(exIndex) {
if (state.currentWorkout && state.currentWorkout.exercises[exIndex]) {
state.currentWorkout.exercises[exIndex].collapsed = !state.currentWorkout.exercises[exIndex].collapsed;
saveData();
renderCurrentWorkout();
}
}

function removeExercise(exIndex) {
if (state.currentWorkout && state.currentWorkout.exercises) {
state.currentWorkout.exercises.splice(exIndex, 1);
saveData();
renderCurrentWorkout();
}
}

function addSet(exIndex) {
if (!state.currentWorkout || !state.currentWorkout.exercises[exIndex]) return;
const ex = state.currentWorkout.exercises[exIndex];
if (ex.type === 'Cardio') return;
const lastSet = ex.sets[ex.sets.length - 1] || { weight: 0, reps: 0 };
ex.sets.push({ ...lastSet });
saveData();
renderCurrentWorkout();
}

function removeSet(exIndex, setIndex) {
if (state.currentWorkout && state.currentWorkout.exercises[exIndex]) {
state.currentWorkout.exercises[exIndex].sets.splice(setIndex, 1);
saveData();
renderCurrentWorkout();
}
}

// Atualização de estado sem reconstrução de DOM (evita fechar teclado e aceita decimais)
function updateSetData(exIndex, setIndex, field, value) {
if (state.currentWorkout && state.currentWorkout.exercises[exIndex] &&
state.currentWorkout.exercises[exIndex].sets[setIndex]) {
const val = parseFloat(value.replace(',', '.'));
state.currentWorkout.exercises[exIndex].sets[setIndex][field] = isNaN(val) ? 0 : val;
saveData();
}
}

function renderCurrentWorkout() {
const container = document.getElementById('exerciseList');
if (!state.currentWorkout || !state.currentWorkout.exercises || state.currentWorkout.exercises.length === 0) {
container.innerHTML = '<div class="empty">Nenhum exercício adicionado ainda.</div>';
return;
}
container.innerHTML = state.currentWorkout.exercises.map((ex, exIdx) => {
const isCollapsed = ex.collapsed ? 'collapsed' : '';
const isCardio = ex.type === 'Cardio';
let setsHTML = (ex.sets || []).map((s, sIdx) => {
if (isCardio) {
return `
<div class="set">
<div class="set-title">Bloco Aeróbico</div>
<div class="row">
<div>
<label>Tempo (min)</label>
<input type="number" step="any" value="${s.time !== undefined && s.time !== 0 ? s.time : ''}" placeholder="Ex: 20" oninput="updateSetData(${exIdx}, ${sIdx}, 'time', this.value)">
</div>
<div>
<label>Distância (km)</label>
<input type="number" step="any" value="${s.dist !== undefined && s.dist !== 0 ? s.dist : ''}" placeholder="Ex: 2.5" oninput="updateSetData(${exIdx}, ${sIdx}, 'dist', this.value)">
</div>
</div>
</div>`;
} else {
return `
<div class="set">
<div class="set-title">Série ${sIdx + 1}</div>
<div class="row">
<div>
<label>Carga (kg)</label>
<input type="number" step="any" value="${s.weight !== undefined && s.weight !== 0 ? s.weight : ''}" placeholder="0" oninput="updateSetData(${exIdx}, ${sIdx}, 'weight', this.value)">
</div>
<div>
<label>Repetições</label>
<input type="number" value="${s.reps !== undefined && s.reps !== 0 ? s.reps : ''}" placeholder="0" oninput="updateSetData(${exIdx}, ${sIdx}, 'reps', this.value)">
</div>
</div>
${ex.sets.length > 1 ? `<button class="danger" style="padding:4px 8px; font-size:11px; margin-top:8px;" onclick="removeSet(${exIdx}, ${sIdx})">Remover Série</button>` : ''}
</div>`;
}
}).join('');
const comparisonHTML = getExerciseComparisonHTML(ex.name, ex.sets || [], isCardio);
const addSetButtonHTML = isCardio ? '' : `<button class="secondary full" style="margin-top:10px;" onclick="addSet(${exIdx})">+ Adicionar Série</button>`;
return `
<div class="exercise ${isCollapsed}">
<div class="exercise-header">
<div>
<span class="exercise-name">${ex.name}</span>
<span class="exercise-type">${ex.type}</span>
</div>
<div class="exercise-header-actions">
<button class="toggle-btn" onclick="toggleCollapse(${exIdx})">${ex.collapsed ? 'Expandir' : 'Recolher'}</button>
<button class="danger" style="padding:8px 10px; font-size:12px;" onclick="removeExercise(${exIdx})">X</button>
</div>
</div>
<div class="exercise-body">
${comparisonHTML}
${setsHTML}
${addSetButtonHTML}
</div>
</div>`;
}).join('');
}

function finishWorkout() {
if (!state.currentWorkout || !state.currentWorkout.exercises || state.currentWorkout.exercises.length === 0) {
showToast("Adicione pelo menos um exercício!");
return;
}
state.currentWorkout.endTime = new Date().toISOString();
if (!Array.isArray(state.history)) {
state.history = [];
}
if (state.editingWorkoutId) {
const idx = state.history.findIndex(w => w.id === state.editingWorkoutId);
if (idx !== -1) {
state.history[idx] = state.currentWorkout;
} else {
state.history.unshift(state.currentWorkout);
}
state.editingWorkoutId = null;
} else {
state.history.unshift(state.currentWorkout);
}
state.currentWorkout = null;
saveData();
renderCurrentWorkout();
showToast("Treino finalizado e salvo!");
showPage('home');
}

function cancelWorkout() {
if (confirm("Deseja cancelar a edição/criação do treino? Dados não salvos serão perdidos.")) {
state.currentWorkout = null;
state.editingWorkoutId = null;
saveData();
renderCurrentWorkout();
showPage('home');
}
}

// --- EDITAR TREINO DO HISTÓRICO ---
function editHistoryItem(idx) {
const workoutToEdit = state.history[idx];
if (!workoutToEdit) return;
state.editingWorkoutId = workoutToEdit.id || (workoutToEdit.id = Date.now());
state.currentWorkout = JSON.parse(JSON.stringify(workoutToEdit));
const activeNameInput = document.getElementById('activeWorkoutName');
if (activeNameInput) activeNameInput.value = state.currentWorkout.name || "Treino do Dia";
saveData();
renderCurrentWorkout();
showPage('workout');
showToast("Modo de edição do treino ativado!");
}

// --- TIMER DE DESCANSO ---
function startTimer(seconds) {
stopTimer();
let left = seconds;
const display = document.getElementById('timerDisplay');
const updateDisplay = () => {
const m = String(Math.floor(left / 60)).padStart(2, '0');
const s = String(left % 60).padStart(2, '0');
display.innerText = `${m}:${s}`;
};
updateDisplay();
timerInterval = setInterval(() => {
left--;
if (left < 0) {
stopTimer();
display.innerText = "FIM!";
showToast("Tempo de descanso terminado!");
if ('vibrate' in navigator) navigator.vibrate([200, 100, 200]);
} else {
updateDisplay();
}
}, 1000);
}

function stopTimer() {
if (timerInterval) clearInterval(timerInterval);
document.getElementById('timerDisplay').innerText = "00:00";
}

// --- RESUMO HOME ---
function updateHomeSummary() {
const todayStr = getTodayKey();
const todayWorkouts = (state.history || []).filter(w => {
if (!w) return false;
const d = new Date(w.endTime || w.startTime || Date.now());
if (isNaN(d.getTime())) return false;
const k = formatDateKey(d);
return k === todayStr;
});
let exCount = 0;
let setsCount = 0;
let volumeTotal = 0;
todayWorkouts.forEach(w => {
(w.exercises || []).forEach(e => {
if (!e) return;
exCount++;
if (e.type !== 'Cardio') {
(e.sets || []).forEach(s => {
if (!s) return;
setsCount++;
volumeTotal += (parseFloat(s.weight) || 0) * (parseFloat(s.reps) || 0);
});
}
});
});
document.getElementById('todayExercises').innerText = exCount;
document.getElementById('todaySets').innerText = setsCount;
document.getElementById('todayVolume').innerText = Math.round(volumeTotal);

// Cardio 7 Dias
const now = new Date();
const sevenDaysAgo = new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000));
let cTime = 0;
let cDist = 0;
let cSessions = 0;
(state.history || []).forEach(w => {
if (!w) return;
const wDate = new Date(w.endTime || w.startTime || Date.now());
if (!isNaN(wDate.getTime()) && wDate >= sevenDaysAgo) {
(w.exercises || []).forEach(e => {
if (e && e.type === 'Cardio') {
(e.sets || []).forEach(s => {
if (!s) return;
cSessions++;
cTime += (parseFloat(s.time) || 0);
cDist += (parseFloat(s.dist) || 0);
});
}
});
}
});
document.getElementById('weeklyCardioTime').innerText = `${cTime} min`;
document.getElementById('weeklyCardioDist').innerText = `${cDist.toFixed(1)} km`;
document.getElementById('weeklyCardioSessions').innerText = cSessions;
}

// --- HISTÓRICO & GRÁFICOS ---
function renderHistory() {
const container = document.getElementById('historyList');
if (!state.history || state.history.length === 0) {
container.innerHTML = '<div class="empty">Nenhum treino no histórico.</div>';
return;
}
container.innerHTML = state.history.map((w, idx) => {
if (!w) return "";
const d = new Date(w.endTime || w.startTime || Date.now());
const dateStr = d.toLocaleDateString('pt-BR') + ' às ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
const exSummary = (w.exercises || []).map(e => `<span class="badge">${e.name}</span>`).join(' ');
return `
<div class="history-item">
<div style="display: flex; justify-content: space-between; align-items:flex-start;">
<div>
<strong>${w.name || 'Treino Sem Nome'}</strong>
<small>${dateStr}</small>
</div>
<div style="display: flex; gap:6px;">
<button class="secondary" style="padding:5px 8px; font-size:11px;" onclick="editHistoryItem(${idx})">Editar</button>
<button class="danger" style="padding:5px 8px; font-size:11px;" onclick="deleteHistoryItem(${idx})">Excluir</button>
</div>
</div>
<div style="margin-top:8px;">${exSummary}</div>
</div>`;
}).join('');
}

function deleteHistoryItem(idx) {
if (confirm("Excluir este treino do histórico?")) {
state.history.splice(idx, 1);
saveData();
renderHistory();
populateChartSelect();
showToast("Treino removido!");
}
}

function populateChartSelect() {
const select = document.getElementById('chartExerciseSelect');
if (!select) return;
const exercisesSet = new Set();
(state.history || []).forEach(w => {
(w.exercises || []).forEach(e => {
if (e && e.type !== 'Cardio') exercisesSet.add(e.name);
});
});
select.innerHTML = '<option value="">Selecione um exercício...</option>' +
Array.from(exercisesSet).map(e => `<option value="${e}">${e}</option>`).join('');
}

function renderProgressChart() {
const select = document.getElementById('chartExerciseSelect');
if (!select) return;
const selectedEx = select.value;
const canvas = document.getElementById('progressChart');
const ctx = canvas.getContext('2d');
if (chartInstance) chartInstance.destroy();
if (!selectedEx) return;
const labels = [];
const dataMaxWeights = [];
[...(state.history || [])].reverse().forEach(w => {
(w.exercises || []).forEach(e => {
if (e && e.name === selectedEx && e.sets && e.sets.length > 0) {
const maxWeight = Math.max(...e.sets.map(s => s.weight || 0));
if (maxWeight > 0) {
const d = new Date(w.endTime || w.startTime || Date.now());
labels.push(`${d.getDate()}/${d.getMonth() + 1}`);
dataMaxWeights.push(maxWeight);
}
}
});
});
chartInstance = new Chart(ctx, {
type: 'line',
data: {
labels: labels,
datasets: [{
label: 'Carga Máxima (kg)',
data: dataMaxWeights,
borderColor: '#7c5cff',
backgroundColor: 'rgba(124, 92, 255, 0.1)',
fill: true,
tension: 0.3
}]
},
options: {
responsive: true,
maintainAspectRatio: false,
scales: {
y: { grid: { color: '#292936' }, ticks: { color: '#9999a8' } },
x: { grid: { color: '#292936' }, ticks: { color: '#9999a8' } }
},
plugins: {
legend: { labels: { color: '#ffffff' } }
}
}
});
}

// --- PERSISTÊNCIA DE DADOS ---
function saveSettings() {
const weightVal = parseFloat(document.getElementById('userWeight').value) || 70;
const waterVal = parseInt(document.getElementById('waterTarget').value) || 3000;
state.profile.weight = weightVal;
state.profile.waterTarget = waterVal;
saveData();
updateWaterUI();
updateCreatineUI();
showToast("Configurações salvas!");
}

function saveData() {
localStorage.setItem('gym_diary_data', JSON.stringify(state));
}

function loadData() {
const saved = localStorage.getItem('gym_diary_data');
if (saved) {
try {
state = JSON.parse(saved);
} catch (e) {
console.error("Erro ao carregar dados", e);
}
}
if (!state.profile) state.profile = { weight: 70, waterTarget: 2450 };
if (!state.waterLogs) state.waterLogs = {};
if (!state.creatineLogs) state.creatineLogs = {};
if (!state.history) state.history = [];
if (!state.customExercises) state.customExercises = [];

document.getElementById('userWeight').value = state.profile.weight || "";
document.getElementById('waterTarget').value = state.profile.waterTarget || 3000;
if (state.profile.profilePic) {
document.getElementById('headerProfilePic').src = state.profile.profilePic;
}
calculateSuggestedMetrics();

// Restauração do Treino Ativo ao carregar o sistema
if (state.currentWorkout) {
const activeNameInput = document.getElementById('activeWorkoutName');
if (activeNameInput) activeNameInput.value = state.currentWorkout.name || "";
renderCurrentWorkout();
}
}

function exportData() {
try {
const jsonStr = JSON.stringify(state, null, 2);
const blob = new Blob([jsonStr], { type: 'application/json' });
const url = URL.createObjectURL(blob);
const downloadAnchor = document.createElement('a');
downloadAnchor.href = url;
downloadAnchor.download = `diario_treino_backup_${getTodayKey()}.json`;
document.body.appendChild(downloadAnchor);
downloadAnchor.click();
document.body.removeChild(downloadAnchor);
URL.revokeObjectURL(url);
showToast("Backup gerado com sucesso!");
} catch (err) {
alert("Erro ao exportar dados: " + err.message);
}
}

function importData() {
const input = document.createElement('input');
input.type = 'file';
input.accept = '.json, application/json';
input.onchange = e => {
const file = e.target.files[0];
if (!file) return;
const reader = new FileReader();
reader.onload = event => {
try {
const importedData = JSON.parse(event.target.result);
if (typeof importedData === 'object' && importedData !== null) {
state = importedData;
saveData();
loadData();
renderCustomExercisesInSelect();
showToast("Dados importados com sucesso!");
} else {
throw new Error("Estrutura do arquivo inválida.");
}
} catch (err) {
alert("Erro ao importar: O arquivo não é um JSON válido de backup.");
}
};
reader.readAsText(file);
};
input.click();
}

function clearAllData() {
if (confirm("ATENÇÃO: Deseja apagar todos os dados registrados permanentemente?")) {
localStorage.removeItem('gym_diary_data');
location.reload();
}
}

// --- UTILITÁRIOS ---
function showToast(msg) {
const toast = document.getElementById('toast');
toast.innerText = msg;
toast.classList.add('show');
setTimeout(() => {
toast.classList.remove('show');
}, 2500);
}
