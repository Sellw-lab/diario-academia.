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
renderCurrentWorkout();
renderHistory();
populateChartSelect();
renderCustomExercisesInSelect();
expandExerciseLibrary();
initCoach();
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
const set = state.currentWorkout.exercises[exIndex].sets[setIndex];
set[field] = isNaN(val) ? 0 : val;
if (set.loadType === 'per_side' && (field === 'leftWeight' || field === 'rightWeight')) {
set.weight = (Number(set.leftWeight) || 0) + (Number(set.rightWeight) || 0);
const totalElement = document.getElementById(`load-total-${exIndex}-${setIndex}`);
if (totalElement) totalElement.textContent = `${set.weight} kg`;
}
saveData();
}
}

function updateLoadType(exIndex, setIndex, loadType) {
if (state.currentWorkout && state.currentWorkout.exercises[exIndex] &&
state.currentWorkout.exercises[exIndex].sets[setIndex]) {
const set = state.currentWorkout.exercises[exIndex].sets[setIndex];
set.loadType = loadType;
if (loadType === 'per_side') {
set.leftWeight = Number(set.leftWeight) || 0;
set.rightWeight = Number(set.rightWeight) || 0;
set.weight = set.leftWeight + set.rightWeight;
} else {
set.weight = Number(set.weight) || 0;
}
saveData();
renderCurrentWorkout();
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
	const loadType = s.loadType || 'total';
	const isPerSide = loadType === 'per_side';
return `
	<div class="set">
	<div class="set-title">Série ${sIdx + 1}</div>
	<div class="load-type-field">
	<label>Tipo de carga</label>
	<div class="load-type-options">
	<label><input type="radio" name="loadType-${exIdx}-${sIdx}" value="total" ${!isPerSide ? 'checked' : ''} onchange="updateLoadType(${exIdx}, ${sIdx}, this.value)"> Carga total</label>
	<label><input type="radio" name="loadType-${exIdx}-${sIdx}" value="per_side" ${isPerSide ? 'checked' : ''} onchange="updateLoadType(${exIdx}, ${sIdx}, this.value)"> Carga por lado</label>
	</div>
	</div>
	${isPerSide ? `<div class="row">
	<div><label>Esquerdo (kg)</label><input type="number" step="any" value="${s.leftWeight !== undefined && s.leftWeight !== 0 ? s.leftWeight : ''}" placeholder="0" oninput="updateSetData(${exIdx}, ${sIdx}, 'leftWeight', this.value)"></div>
	<div><label>Direito (kg)</label><input type="number" step="any" value="${s.rightWeight !== undefined && s.rightWeight !== 0 ? s.rightWeight : ''}" placeholder="0" oninput="updateSetData(${exIdx}, ${sIdx}, 'rightWeight', this.value)"></div>
	</div><div class="load-total"><span>Total</span><strong id="load-total-${exIdx}-${sIdx}">${Number(s.weight) || 0} kg</strong><span aria-label="calculado automaticamente">🔒 automático</span></div>` : `<div>
	<label>Carga (kg)</label>
	<input type="number" step="any" value="${s.weight !== undefined && s.weight !== 0 ? s.weight : ''}" placeholder="0" oninput="updateSetData(${exIdx}, ${sIdx}, 'weight', this.value)">
	</div>`}
	<div class="row">
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
const exSummary = (w.exercises || []).map(e => {
const loadSummary = e.type !== 'Cardio' ? (e.sets || []).map(s => s.loadType === 'per_side' ? `por lado: ${Number(s.leftWeight) || 0} + ${Number(s.rightWeight) || 0} = ${Number(s.weight) || 0} kg` : `${Number(s.weight) || 0} kg`).join(' · ') : '';
return `<span class="badge">${e.name}${loadSummary ? ` · ${loadSummary}` : ''}</span>`;
}).join(' ');
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
const themeStyles = getComputedStyle(document.body);
const chartMuted = themeStyles.getPropertyValue('--muted').trim() || '#9999a8';
const chartBorder = themeStyles.getPropertyValue('--border').trim() || '#292936';
const chartText = themeStyles.getPropertyValue('--text').trim() || '#ffffff';
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
borderColor: themeStyles.getPropertyValue('--accent').trim() || '#8b7cff',
backgroundColor: themeStyles.getPropertyValue('--soft-accent').trim() || 'rgba(139, 124, 255, 0.14)',
pointBackgroundColor: themeStyles.getPropertyValue('--accent2').trim() || '#b8afff',
pointBorderColor: chartText,
pointBorderWidth: 2,
pointRadius: 4,
pointHoverRadius: 6,
fill: true,
tension: 0.38
}]
},
options: {
responsive: true,
maintainAspectRatio: false,
interaction: { mode: 'index', intersect: false },
scales: {
y: { beginAtZero: true, grid: { color: chartBorder }, ticks: { color: chartMuted, padding: 8 } },
x: { grid: { color: chartBorder }, ticks: { color: chartMuted, padding: 8 } }
},
plugins: {
legend: { labels: { color: chartText, usePointStyle: true, pointStyle: 'circle', padding: 18 } },
tooltip: { backgroundColor: chartText, titleColor: themeStyles.getPropertyValue('--bg').trim(), bodyColor: themeStyles.getPropertyValue('--bg').trim(), padding: 10, cornerRadius: 9, displayColors: false }
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


// --- EVOLUÇÃO 6.0: modelos, metas, saúde, métricas e preferências ---
const enhancementDefaults = { templates: [], goals: [], healthLogs: {}, bodyMetrics: [], supplements: [], preferences: { theme: 'dark', largeText: false, reminder: '' } };
function todayISO() { return formatDateKey(new Date()); }
function mergeEnhancementState() { Object.keys(enhancementDefaults).forEach(k => { if (state[k] === undefined) state[k] = JSON.parse(JSON.stringify(enhancementDefaults[k])); }); }
function initEnhancements() {
  mergeEnhancementState();
  const date = document.getElementById('healthDate'); if (date) date.value = todayISO();
  const pref = state.preferences || enhancementDefaults.preferences;
  document.documentElement.classList.remove('light-theme-preload');
  document.body.classList.toggle('light-theme', pref.theme === 'light'); document.body.classList.toggle('large-text', !!pref.largeText);
  const light = document.getElementById('lightThemeToggle'); if (light) light.checked = pref.theme === 'light';
  const large = document.getElementById('largeTextToggle'); if (large) large.checked = !!pref.largeText;
  const reminder = document.getElementById('reminderTime'); if (reminder) reminder.value = pref.reminder || '';
  renderTemplateSelect(); renderProgress(); renderHealth(); checkReminder(); saveData();
}
window.addEventListener('load', initEnhancements);
function showPage(pageId, btn) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active')); document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  const page = document.getElementById(pageId); if (page) page.classList.add('active');
  const buttons = [...document.querySelectorAll('.nav-btn')]; const index = ['home','workout','history','progress','health','profile'].indexOf(pageId); if (btn) btn.classList.add('active'); else if (buttons[index]) buttons[index].classList.add('active');
  if (pageId === 'workout') renderCurrentWorkout();
  if (pageId === 'home') { updateHomeSummary(); updateWaterUI(); updateCreatineUI(); }
  if (pageId === 'history') { renderHistory(); populateChartSelect(); }
  if (pageId === 'progress') renderProgress(); if (pageId === 'health') renderHealth();
}
function saveCurrentTemplate() { const name = prompt('Nome do modelo de treino:'); if (!name) return; const source = state.currentWorkout && state.currentWorkout.exercises?.length ? state.currentWorkout.exercises : null; if (!source) { showToast('Comece um treino e adicione exercícios primeiro.'); return; } state.templates.push({ name, exercises: JSON.parse(JSON.stringify(source)).map(e => ({ name:e.name, type:e.type, group:e.group||'', superset:e.superset||'', sets:e.sets?.length||3 })) }); saveData(); renderTemplateSelect(); showToast('Modelo salvo!'); }
function renderTemplateSelect() { const s=document.getElementById('workoutTemplateSelect'); if(!s) return; s.innerHTML='<option value="">Começar treino vazio</option>'+state.templates.map((t,i)=>`<option value="${i}">${t.name}</option>`).join(''); }
function selectedTemplate() { const s=document.getElementById('workoutTemplateSelect'); return s && s.value !== '' ? state.templates[Number(s.value)] : null; }
function startWorkout() { const input=document.getElementById('workoutName'); const template=selectedTemplate(); const name=(input?.value.trim()) || template?.name || 'Treino do Dia'; state.editingWorkoutId=null; state.currentWorkout={id:Date.now(),name,startTime:new Date().toISOString(),exercises:template?JSON.parse(JSON.stringify(template.exercises)).map(e=>({...e,id:Date.now()+Math.random(),collapsed:false,sets:e.type==='Cardio'?[{time:20,dist:0}]:Array.from({length:e.sets||3},()=>({weight:0,reps:0}))})):[]}; if(input) input.value=''; const active=document.getElementById('activeWorkoutName'); if(active) active.value=name; saveData(); renderCurrentWorkout(); showPage('workout'); }
function addExerciseToWorkout() { const nameInput=document.getElementById('newExerciseName'), name=nameInput.value.trim(), type=document.getElementById('newExerciseType').value, setsCount=parseInt(document.getElementById('newExerciseSetsCount').value)||3; if(!name){showToast('Insira o nome do exercício!');return;} if(!state.currentWorkout) startWorkout(); const group=document.getElementById('newExerciseGroup')?.value||'', superset=document.getElementById('newExerciseSuperset')?.value.trim()||''; const sets=type==='Cardio'?[{time:20,dist:0}]:Array.from({length:setsCount},()=>({weight:0,reps:0})); state.currentWorkout.exercises.push({id:Date.now(),name,type,group,superset,collapsed:false,sets}); nameInput.value=''; document.getElementById('exerciseLibrarySelect').value=''; document.getElementById('newExerciseGroup').value=''; document.getElementById('newExerciseSuperset').value=''; closeExerciseModal(); saveData(); renderCurrentWorkout(); }

function finishWorkout() { if(!state.currentWorkout?.exercises?.length){showToast('Adicione pelo menos um exercício!');return;} state.currentWorkout.endTime=new Date().toISOString(); state.currentWorkout.rpe=Number(document.getElementById('workoutRpe')?.value)||0; state.currentWorkout.energy=Number(document.getElementById('workoutEnergy')?.value)||0; state.currentWorkout.notes=document.getElementById('workoutNotes')?.value.trim()||''; if(state.editingWorkoutId){const i=state.history.findIndex(w=>w.id===state.editingWorkoutId); if(i>=0)state.history[i]=state.currentWorkout;else state.history.unshift(state.currentWorkout);}else state.history.unshift(state.currentWorkout); state.currentWorkout=null; state.editingWorkoutId=null; saveData(); renderCurrentWorkout(); renderProgress(); showToast('Treino finalizado e salvo!'); showPage('home'); }
function addGoal(){const name=document.getElementById('goalName').value.trim(), target=Number(document.getElementById('goalTarget').value), type=document.getElementById('goalType').value, deadline=document.getElementById('goalDeadline').value;if(!name||!target){showToast('Informe nome e valor da meta.');return;}state.goals.push({id:Date.now(),name,target,type,deadline,created:todayISO()});saveData();document.getElementById('goalName').value='';document.getElementById('goalTarget').value='';renderProgress();showToast('Meta adicionada!');}
function goalValue(g){
  if(g.type==='workouts') return state.history.length;
  if(g.type==='volume') {
    let volume = 0;
    state.history.forEach(w => (w.exercises||[]).forEach(e => (e.sets||[]).forEach(s => { volume += (Number(s.weight)||0) * (Number(s.reps)||0); })));
    return Math.round(volume);
  }
  if(g.type==='water') return state.waterLogs[todayISO()]||0;
  if(g.type==='weight_body') return Number((state.bodyMetrics||[]).at(-1)?.weight)||0;
  const values=[]; state.history.forEach(w=>(w.exercises||[]).forEach(e=>(e.sets||[]).forEach(s=>values.push(Number(s.weight)||0))));
  return Math.max(0,...values);
}
function renderProgress(){mergeEnhancementState();const goals=document.getElementById('goalsList');if(!goals)return;goals.innerHTML=state.goals.length?state.goals.map(g=>{const value=goalValue(g),pct=Math.min(100,Math.round(value/g.target*100));return `<div class="goal"><div class="goal-head"><strong>${g.name}</strong><span>${value} / ${g.target}</span></div><progress max="100" value="${pct}"></progress><small>${pct}%${g.deadline?' · prazo '+new Date(g.deadline+'T12:00:00').toLocaleDateString('pt-BR'):''}</small></div>`}).join(''):'<div class="empty">Nenhuma meta cadastrada.</div>';const records={};state.history.forEach(w=>(w.exercises||[]).forEach(e=>{if(e.type!=='Cardio')records[e.name]=Math.max(records[e.name]||0,...(e.sets||[]).map(s=>Number(s.weight)||0));}));document.getElementById('recordsList').innerHTML=Object.keys(records).length?Object.entries(records).sort((a,b)=>b[1]-a[1]).slice(0,12).map(([n,v])=>`<div class="record"><strong>${v} kg</strong><span>${n}</span></div>`).join(''):'<div class="empty">Seus recordes aparecerão após os treinos.</div>';const h=document.getElementById('progressHighlights');h.innerHTML=`<div class="highlight"><strong>${state.history.length}</strong><span>Treinos registrados</span></div><div class="highlight"><strong>${calculateStreak('water')}</strong><span>Dias de água</span></div><div class="highlight"><strong>${state.history.reduce((a,w)=>a+(w.exercises||[]).length,0)}</strong><span>Exercícios feitos</span></div>`;renderCalendar();renderWeeklyChart();}
function renderCalendar(){const el=document.getElementById('activityCalendar');if(!el)return;const now=new Date(), y=now.getFullYear(),m=now.getMonth(), days=new Date(y,m+1,0).getDate(), first=new Date(y,m,1).getDay();let out='';for(let i=0;i<first;i++)out+='<span></span>';for(let d=1;d<=days;d++){const key=`${y}-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`,done=state.history.some(w=>formatDateKey(new Date(w.endTime||w.startTime))===key)||((state.waterLogs[key]||0)>0);out+=`<div class="calendar-day ${done?'done':''} ${key===todayISO()?'today':''}">${d}</div>`;}el.innerHTML=out;}
	function renderWeeklyChart(){const canvas=document.getElementById('weeklyChart');if(!canvas||typeof Chart==='undefined')return;const labels=[],data=[];for(let i=6;i>=0;i--){const d=new Date();d.setDate(d.getDate()-i);const k=formatDateKey(d);labels.push(d.toLocaleDateString('pt-BR',{weekday:'short'}));data.push(state.history.filter(w=>formatDateKey(new Date(w.endTime||w.startTime))===k).length);}if(window.weeklyChart&&typeof window.weeklyChart.destroy==='function')window.weeklyChart.destroy();window.weeklyChart=new Chart(canvas,{type:'bar',data:{labels,datasets:[{label:'Treinos',data,backgroundColor:'#7c5cff',borderRadius:6}]},options:{responsive:true,maintainAspectRatio:false,scales:{y:{beginAtZero:true,ticks:{stepSize:1,color:'#9999a8'},grid:{color:'#292936'}},x:{ticks:{color:'#9999a8'},grid:{display:false}}},plugins:{legend:{labels:{color:'#fff'}}}}});}
function saveHealthLog(){const k=document.getElementById('healthDate').value||todayISO();state.healthLogs[k]={sleep:Number(document.getElementById('sleepHours').value)||0,quality:Number(document.getElementById('sleepQuality').value)||0,recovery:Number(document.getElementById('recoveryScore').value)||0,notes:document.getElementById('healthNotes').value};saveData();showToast('Registro de recuperação salvo!');renderHealth();}
function saveBodyMetrics(){const item={date:todayISO(),weight:Number(document.getElementById('bodyWeight').value)||0,bodyFat:Number(document.getElementById('bodyFat').value)||0,waist:Number(document.getElementById('measureWaist').value)||0,arm:Number(document.getElementById('measureArm').value)||0,chest:Number(document.getElementById('measureChest').value)||0,thigh:Number(document.getElementById('measureThigh').value)||0};if(!item.weight&&!item.waist){showToast('Informe ao menos peso ou uma medida.');return;}state.bodyMetrics=(state.bodyMetrics||[]).filter(x=>x.date!==item.date);state.bodyMetrics.push(item);saveData();showToast('Medidas salvas!');renderHealth();}
function renderHealth(){const list=document.getElementById('bodyMetricsHistory');if(!list)return;const latest=(state.bodyMetrics||[]).slice(-5).reverse();list.innerHTML=latest.length?latest.map(x=>`<div class="metric-line"><span class="metric-chip">${new Date(x.date+'T12:00:00').toLocaleDateString('pt-BR')}</span>${x.weight?`<span class="metric-chip">${x.weight} kg</span>`:''}${x.waist?`<span class="metric-chip">Cintura ${x.waist} cm</span>`:''}${x.arm?`<span class="metric-chip">Braço ${x.arm} cm</span>`:''}</div>`).join(''):'<p class="muted">Nenhuma medida registrada.</p>';const s=document.getElementById('supplementsList');if(s)s.innerHTML=(state.supplements||[]).length?state.supplements.map((x,i)=>`<div class="supplement-item"><div><strong>${x.name}</strong><small>${x.dose||'Sem dose/horário'}</small></div><button class="secondary compact-button" onclick="toggleSupplement(${i})">${x.taken===todayISO()?'Tomado hoje':'Marcar tomado'}</button></div>`).join(''):'<p class="muted">Cadastre suplementos além da creatina.</p>';}
function addSupplement(){const name=document.getElementById('supplementName').value.trim();if(!name){showToast('Informe o nome do suplemento.');return;}state.supplements.push({name,dose:document.getElementById('supplementDose').value.trim(),taken:''});saveData();document.getElementById('supplementName').value='';document.getElementById('supplementDose').value='';renderHealth();}
function toggleSupplement(i){state.supplements[i].taken=state.supplements[i].taken===todayISO()?'':todayISO();saveData();renderHealth();}
function toggleTheme(light){mergeEnhancementState();state.preferences.theme=light?'light':'dark';document.documentElement.classList.remove('light-theme-preload');document.body.classList.toggle('light-theme',light);saveData();if(typeof renderProgressChart==='function')renderProgressChart();if(typeof renderWeeklyChart==='function')renderWeeklyChart();}
function toggleLargeText(on){mergeEnhancementState();state.preferences.largeText=on;document.body.classList.toggle('large-text',on);saveData();}
function saveReminder(value){mergeEnhancementState();state.preferences.reminder=value;saveData();showToast(value?'Lembrete salvo.':'Lembrete removido.');}
function checkReminder(){const r=state.preferences?.reminder;if(!r)return;const now=new Date(), time=`${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;if(r===time&&localStorage.getItem('gym_reminder_shown')!==todayISO()){localStorage.setItem('gym_reminder_shown',todayISO());setTimeout(()=>showToast('Lembrete: hora de cuidar do seu treino!'),300);}}
function exportCSV(){const rows=[['Treino','Data','Exercício','Grupo','Tipo','Série','Carga kg','Repetições','Tempo min','Distância km','RPE','Observações']];state.history.forEach(w=>(w.exercises||[]).forEach(e=>(e.sets||[]).forEach((s,i)=>rows.push([w.name,formatDateKey(new Date(w.endTime||w.startTime)),e.name,e.group||'',e.type,i+1,s.weight||'',s.reps||'',s.time||'',s.dist||'',w.rpe||'',w.notes||'']))));const csv=rows.map(r=>r.map(v=>`"${String(v).replaceAll('"','""')}"`).join(';')).join('\n');const a=document.createElement('a');a.href=URL.createObjectURL(new Blob(['\ufeff'+csv],{type:'text/csv;charset=utf-8'}));a.download=`diario-treino-${todayISO()}.csv`;a.click();URL.revokeObjectURL(a.href);showToast('CSV exportado!');}
function renderHistory(){
  const container=document.getElementById('historyList'); if(!container)return;
  const query=(document.getElementById('historySearch')?.value||'').trim().toLowerCase(); const month=document.getElementById('historyMonth')?.value||'';
  const filtered=state.history.map((w,idx)=>({w,idx})).filter(({w})=>{const date=new Date(w.endTime||w.startTime||Date.now()), dateKey=formatDateKey(date), text=`${w.name||''} ${(w.exercises||[]).map(e=>e.name).join(' ')}`.toLowerCase(); return (!query||text.includes(query))&&(!month||dateKey.startsWith(month));});
  if(!filtered.length){container.innerHTML='<div class="empty">Nenhum treino encontrado para estes filtros.</div>';return;}
  container.innerHTML=filtered.map(({w,idx})=>{const d=new Date(w.endTime||w.startTime||Date.now()), dateStr=d.toLocaleDateString('pt-BR')+' às '+d.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'}), exSummary=(w.exercises||[]).map(e=>`<span class="badge">${e.name}</span>`).join(' '); return `<div class="history-item"><div style="display:flex;justify-content:space-between;align-items:flex-start;"><div><strong>${w.name||'Treino Sem Nome'}</strong><small>${dateStr}${w.rpe?' · Esforço '+w.rpe+'/10':''}</small></div><div style="display:flex;gap:6px;"><button class="secondary compact-button" onclick="editHistoryItem(${idx})">Editar</button><button class="danger compact-button" onclick="deleteHistoryItem(${idx})">Excluir</button></div></div><div style="margin-top:8px;">${exSummary}</div>${w.notes?`<small class="muted">${w.notes}</small>`:''}</div>`;}).join('');
}


// --- Assistente adaptativa baseada na biblioteca existente ---
function initCoach() {
  const greeting = document.getElementById('coachGreeting');
  if (!greeting) return;
  const hour = new Date().getHours();
  const welcome = hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite';
  const hasHistory = Array.isArray(state.history) && state.history.length > 0;
  greeting.textContent = `${welcome}! Eu sou sua assistente. ${hasHistory ? 'Já conheço um pouco do seu ritmo. ' : ''}Quanto tempo você tem hoje? Eu preparo uma sessão que cabe na sua rotina.`;
}

function coachNormalize(value) {
  return String(value || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function getCoachKnowledge(name) {
  const search = coachNormalize(name);
  const rules = [
    { words: ['supino', 'agachamento', 'leg press', 'remada', 'puxada', 'levantamento', 'stiff', 'desenvolvimento'], role: 'movimento principal', priority: 3 },
    { words: ['crucifixo', 'elevacao lateral', 'rosca', 'triceps', 'extensora', 'flexora', 'abdutora', 'adutora'], role: 'complementar', priority: 1 },
    { words: ['hip thrust', 'elevacao pelvica', 'passada', 'afundo', 'step up'], role: 'unilateral / glúteos', priority: 2 }
  ];
  const match = rules.find(rule => rule.words.some(word => search.includes(word)));
  return match || { role: 'complementar', priority: 1 };
}

const expandedExerciseLibrary = [
  ['Supino Inclinado na Máquina Convergente', 'Máquina', 'Peito'],
  ['Chest Press com Pegada Neutra', 'Máquina', 'Peito'],
  ['Remada Cavalinho com Apoio no Peito', 'Máquina', 'Costas / Dorsal'],
  ['Remada Unilateral no Banco Inclinado', 'Livre', 'Costas / Dorsal'],
  ['Puxada com Pegada Neutra Fechada', 'Polia', 'Costas / Dorsal'],
  ['Desenvolvimento na Máquina com Pegada Neutra', 'Máquina', 'Ombros & Trapézio'],
  ['Elevação Lateral na Polia Baixa', 'Polia', 'Ombros & Trapézio'],
  ['Rosca Bayesian na Polia', 'Polia', 'Biceps & Antebraço'],
  ['Rosca Zottman com Halteres', 'Livre', 'Biceps & Antebraço'],
  ['Tríceps Coice na Polia', 'Polia', 'Tríceps'],
  ['Agachamento Hack com Pés Altos', 'Máquina', 'Quadriceps & Posterior (Pernas)'],
  ['Agachamento no Belt Squat', 'Máquina', 'Quadriceps & Posterior (Pernas)'],
  ['Passada Reversa no Smith', 'Máquina', 'Quadriceps & Posterior (Pernas)'],
  ['Cadeira Extensora com 1 e 1/2 Repetição', 'Máquina', 'Quadriceps & Posterior (Pernas)'],
  ['Flexora Sentada com 1 e 1/2 Repetição', 'Máquina', 'Quadriceps & Posterior (Pernas)'],
  ['Elevação Pélvica com Barra', 'Livre', 'Glúteos & Adutores/Abdutores'],
  ['Coice de Glúteo na Polia', 'Polia', 'Glúteos & Adutores/Abdutores'],
  ['Abdução de Quadril na Polia', 'Polia', 'Glúteos & Adutores/Abdutores'],
  ['Panturrilha no Leg Press', 'Máquina', 'Panturrilha'],
  ['Panturrilha Sentado', 'Máquina', 'Panturrilha'],
  ['Prancha com Apoio nos Cotovelos', 'Peso Corporal', 'Abdômen'],
  ['Abdominal na Polia Alta com Corda', 'Polia', 'Abdômen'],
  ['Pallof Press na Polia', 'Polia', 'Abdômen'],
  ['Farmer Walk', 'Livre', 'Cardio / Condicionamento']
];

function expandExerciseLibrary() {
  const select = document.getElementById('exerciseLibrarySelect');
  if (!select) return;
  expandedExerciseLibrary.forEach(([name, type, group]) => {
    const exists = [...select.options].some(option => coachNormalize(option.value.split('|')[0]) === coachNormalize(name));
    if (exists) return;
    let optGroup = [...select.querySelectorAll('optgroup')].find(item => coachNormalize(item.label) === coachNormalize(group));
    if (!optGroup) { optGroup = document.createElement('optgroup'); optGroup.label = group; select.appendChild(optGroup); }
    const option = document.createElement('option'); option.value = `${name}|${type}`; option.textContent = name; optGroup.appendChild(option);
  });
}

function getExerciseCatalogForCoach() {
  const select = document.getElementById('exerciseLibrarySelect');
  if (!select) return [];
  return [...select.options].filter(o => o.value && o.value.includes('|')).map(option => {
    const [name, type] = option.value.split('|');
    const group = option.parentElement?.label || '';
    return { name: name.trim(), type: type || 'Livre', group, search: coachNormalize(`${name} ${group}`), ...getCoachKnowledge(name) };
  });
}

function getRequestedExercises(rawText, catalog) {
  const cleaned = coachNormalize(rawText)
    .replace(/\b(monte|montar|crie|criar|faca|fazer|um|uma|treino|sessao|com|para|de|hoje|por favor|especificos?|em|ate|so|apenas|consigo fazer)\b/g, ' ')
    .replace(/\d+\s*(min|minuto|minutos|h|hora|horas|exercicios?|movimentos?)/g, ' ');
  const parts = cleaned.split(/,|;|\s+e\s+|\s+\+\s+|\s+\/\s+/).map(part => part.trim()).filter(Boolean);
  const generic = new Set(['pernas', 'perna', 'peito', 'costas', 'ombros', 'biceps', 'triceps', 'abdomen', 'cardio', 'academia', 'maquina', 'maquinas', 'halteres', 'barra', 'polia', 'posterior', 'gluteo', 'quadriceps', 'coxa', 'adutor', 'abdutor', 'pouco', 'tempo']);
  const matches = [];
  const unmatched = [];
  parts.forEach(part => {
    const words = part.split(/\s+/).filter(word => word.length > 2 && !generic.has(word));
    if (!words.length) return;
    let best = null;
    catalog.forEach(exercise => {
      const exWords = exercise.search.split(/\s+/);
      const overlap = words.filter(word => exWords.some(exWord => exWord === word || (word.length > 4 && exWord.includes(word))));
      const exactName = exercise.search.includes(part);
      const score = overlap.length + (exactName ? 4 : 0);
      if (score >= 1 && (!best || score > best.score)) best = { exercise, score };
    });
    if (best && !matches.some(item => item.name === best.exercise.name)) matches.push(best.exercise);
    else if (!best) unmatched.push(part.replace(/[:]/g, '').trim());
  });
  return { matches, unmatched };
}

function getCoachRequest(rawText) {
  const text = coachNormalize(rawText);
  const timeMatch = text.match(/(\d+)\s*(min|minuto|minutos|h|hora|horas)/);
  let minutes = timeMatch ? Number(timeMatch[1]) : 45;
  if (timeMatch && /h|hora/.test(timeMatch[2])) minutes *= 60;
  minutes = Math.max(10, Math.min(120, minutes));
  const countMatch = text.match(/(?:so|apenas|somente|consigo fazer|com)?\s*(\d+|um|uma|dois|duas|tres|quatro|cinco|seis|sete|oito)\s*(?:exercicios|exerc|movimentos)/);
  const numberWords = { um: 1, uma: 1, dois: 2, duas: 2, tres: 3, quatro: 4, cinco: 5, seis: 6, sete: 7, oito: 8 };
  const countValue = countMatch ? (Number(countMatch[1]) || numberWords[countMatch[1]]) : null;
  const count = countValue ? Math.max(1, Math.min(8, countValue)) : null;
  const groupRules = [
    ['pernas', ['perna', 'quadriceps', 'posterior', 'gluteo', 'coxa', 'adutor', 'abdutor']],
    ['peito', ['peito', 'peitoral', 'supino', 'crucifixo']],
    ['costas', ['costas', 'dorsal', 'remada', 'puxada']],
    ['ombros', ['ombro', 'deltoide', 'trapezio']],
    ['biceps', ['biceps', 'braco']],
    ['triceps', ['triceps']],
    ['abdômen', ['abdomen', 'abdominal', 'core']],
    ['cardio', ['cardio', 'corrida', 'esteira', 'bike', 'bicicleta']]
  ];
  const match = groupRules.find(([, words]) => words.some(word => text.includes(word)));
  const focusWords = ['posterior', 'gluteo', 'quadriceps', 'coxa', 'adutor', 'abdutor', 'peito', 'costas', 'ombro', 'biceps', 'triceps'];
  const focuses = focusWords.filter(word => text.includes(word));
  const group = match ? match[0] : 'corpo inteiro';
  const level = /iniciante|começando|comecando|primeira vez|nunca treinei/.test(text) ? 'iniciante' : /avancad|experiente|alto nivel/.test(text) ? 'avançado' : /intermediari/.test(text) ? 'intermediário' : 'intermediário';
  const useOwnWorkout = /meu treino|treino proprio|treino próprio|repetir.*treino|ultimo treino|último treino|template|ficha que eu/.test(rawText.toLowerCase());
  const tired = /cansad|pouca energia|leve|sem disposicao|dificil hoje/.test(text);
  const noMachines = /sem maquina|sem maquinas|academia cheia|maquinas ocupadas|sem equipamento/.test(text);
  const catalog = getExerciseCatalogForCoach();
  const exerciseRequest = useOwnWorkout ? { matches: [], unmatched: [] } : getRequestedExercises(rawText, catalog);
  const requested = exerciseRequest.matches;
  return { text, minutes, count: requested.length || count || (minutes <= 20 ? 2 : minutes <= 35 ? 3 : minutes <= 55 ? 4 : 5), group, focuses, level, useOwnWorkout, tired, noMachines, requested, unmatched: exerciseRequest.unmatched };
}

function getPersonalWorkoutExercises() {
  const source = state.currentWorkout?.exercises?.length ? state.currentWorkout.exercises : selectedTemplate()?.exercises?.length ? selectedTemplate().exercises : state.history?.[0]?.exercises;
  return (source || []).map(exercise => ({ name: exercise.name, type: exercise.type || 'Livre', group: exercise.group || 'Meu treino', search: coachNormalize(`${exercise.name} ${exercise.group || ''}`), custom: !!exercise.custom, priority: 3, role: 'treino do usuário', sourceSets: exercise.sets?.length || exercise.sets || 3 }));
}

function coachExerciseMatches(exercise, request) {
  const group = coachNormalize(request.group);
  if (group === 'corpo inteiro') return true;
  const aliases = {
    pernas: ['perna', 'quadriceps', 'posterior', 'gluteo', 'coxa', 'adutor', 'abdutor'],
    peito: ['peito', 'peitoral'], costas: ['costas', 'dorsal'], ombros: ['ombro', 'trapezio'],
    biceps: ['biceps'], triceps: ['triceps'], 'abdômen': ['abdomen', 'core'], cardio: ['cardio']
  };
  return (aliases[group] || [group]).some(word => exercise.search.includes(word));
}

function coachExercisePriority(exercise, request) {
  const n = exercise.search;
  const compound = ['supino', 'agachamento', 'leg press', 'remada', 'puxada', 'desenvolvimento', 'levantamento', 'stiff', 'hip thrust', 'elevacao pelvica'];
  const isolation = ['extensora', 'flexora', 'crucifixo', 'elevacao lateral', 'rosca', 'triceps', 'abdutora', 'adutora'];
  let score = exercise.priority * 7 + (compound.some(word => n.includes(word)) ? 30 : isolation.some(word => n.includes(word)) ? 10 : 20);
  if (request.noMachines && /maquina|polia/.test(n)) score -= 25;
  const personalNames = new Set((state.history || []).slice(0, 8).flatMap(w => (w.exercises || []).map(e => coachNormalize(e.name))));
  if (personalNames.has(coachNormalize(exercise.name))) score += 12;
  if (request.tired && /maquina|halter/.test(n)) score += 3;
  return score;
}

function buildCoachPlan(request) {
  const catalog = request.useOwnWorkout ? getPersonalWorkoutExercises() : getExerciseCatalogForCoach();
  if (request.useOwnWorkout && catalog.length) {
    const selected = catalog.slice(0, request.count || catalog.length);
    const sets = selected[0]?.sourceSets || (request.level === 'iniciante' ? 2 : 3);
    return { ...request, selected, sets, rest: request.level === 'avançado' ? '90–120s' : '60–90s', repRange: request.level === 'iniciante' ? '8–12 repetições' : '6–12 repetições', exerciseMinutes: Math.max(4, Math.round((request.minutes - 4) / Math.max(1, selected.length))), estimated: Math.min(request.minutes, 4 + selected.length * 7), exactRequest: true, personalPlan: true };
  }
  let candidates = catalog.filter(exercise => coachExerciseMatches(exercise, request));
  if (candidates.length < request.count) {
    const fallback = catalog.filter(exercise => !candidates.some(item => item.name === exercise.name));
    candidates = candidates.concat(fallback.slice(0, request.count - candidates.length));
  }
  const requested = request.requested || [];
  const requestedNames = new Set(requested.map(exercise => exercise.name));
  const orderedRequested = requested.slice(0, request.count);
  const fill = candidates
    .filter(exercise => !requestedNames.has(exercise.name))
    .sort((a, b) => coachExercisePriority(b, request) - coachExercisePriority(a, request))
    .slice(0, Math.max(0, request.count - orderedRequested.length));
  const selected = orderedRequested.concat(fill).slice(0, request.count);
  const sets = request.tired ? 2 : request.level === 'iniciante' ? 2 : request.level === 'avançado' ? 4 : 3;
  const rest = request.tired ? '45–60s' : request.level === 'avançado' ? '90–120s' : request.level === 'iniciante' ? '60–90s' : request.minutes <= 30 ? '60–75s' : '75–90s';
  const repRange = request.level === 'iniciante' ? '8–12 repetições' : request.level === 'avançado' ? '6–12 repetições' : '8–12 repetições';
  const exerciseMinutes = Math.max(4, Math.round((request.minutes - 4) / Math.max(1, selected.length)));
  return { ...request, selected, sets, rest, repRange, exerciseMinutes, estimated: Math.min(request.minutes, 4 + selected.length * exerciseMinutes), exactRequest: orderedRequested.length > 0 };
}

let coachWebCache = null;

function webExerciseMatches(item, request) {
  const search = coachNormalize(`${item.name} ${item.group} ${(item.muscles || []).join(' ')}`);
  const focus = request.focuses?.length ? request.focuses : [request.group];
  const aliases = { posterior: ['hamstring', 'posterior', 'biceps femoris'], gluteo: ['glute', 'gluteus'], quadriceps: ['quadriceps'], coxa: ['quadriceps', 'leg'], pernas: ['leg', 'quadriceps', 'hamstring', 'glute'], peito: ['chest', 'pectoral'], costas: ['back', 'lat', 'lats', 'middle back'], ombro: ['shoulder', 'deltoid'], biceps: ['biceps'], triceps: ['triceps'], adutor: ['adductor'], abdutor: ['abductor'] };
  return focus.some(part => (aliases[part] || [part]).some(alias => search.includes(alias)));
}

async function fetchCoachWebSuggestions(request) {
  try {
    if (!coachWebCache) {
      const response = await fetch('/api/exercise-suggestions?limit=160');
      if (!response.ok) throw new Error('web-source');
      const payload = await response.json();
      coachWebCache = payload.results || [];
    }
    const localNames = new Set(getExerciseCatalogForCoach().map(item => coachNormalize(item.name)));
    return coachWebCache.filter(item => webExerciseMatches(item, request) && !localNames.has(coachNormalize(item.name))).slice(0, 12).map(item => ({ ...item, web: true, custom: true, type: 'Web' }));
  } catch (_) {
    return [];
  }
}

function mergeWebSuggestionsIntoPlan(plan, suggestions) {
  if (!suggestions.length) return plan;
  const needed = Math.max(0, plan.count - plan.selected.length);
  plan.webSuggestions = suggestions;
  if (needed > 0) plan.selected = plan.selected.concat(suggestions.slice(0, needed));
  plan.estimated = Math.min(plan.minutes, 4 + plan.selected.length * plan.exerciseMinutes);
  return plan;
}

function renderCoachPlan(plan) {
  const target = document.getElementById('coachPlan');
  if (!target) return;
  const tone = plan.personalPlan ? 'preservei o seu treino e apenas organizei a sessão' : plan.exactRequest ? 'mantive os exercícios que você pediu, na mesma ordem' : plan.webSuggestions?.length ? 'completei com sugestões encontradas online' : plan.tired ? 'reduzi o volume para respeitar sua energia' : 'priorizei os movimentos mais completos primeiro';
  const missingHTML = (plan.unmatched || []).length ? `<div class="coach-missing"><strong>Não encontrei na biblioteca</strong><span>Você pode salvar como exercício personalizado e completar os detalhes depois.</span>${plan.unmatched.map((name, index) => `<div class="coach-missing-row"><span>${name}</span><button class="secondary" onclick="createCoachCustomExercise(${index})">Salvar personalizado</button></div>`).join('')}</div>` : '';
  target.hidden = false;
  target.innerHTML = `<div class="coach-plan-head"><div><strong>${plan.group[0].toUpperCase() + plan.group.slice(1)} · ${plan.minutes} min</strong><span>${plan.level} · ${plan.selected.length} exercícios · ${tone}</span></div><span class="coach-time">~${plan.estimated} min</span></div><div class="coach-plan-list">${plan.selected.map((exercise, index) => `<div class="coach-exercise-row"><span class="coach-number">${index + 1}</span><div><strong>${exercise.name}</strong><small>${plan.sets} séries · ${plan.rest} descanso · ${plan.repRange || 'registro livre'} · ${exercise.type}${exercise.web ? ' · sugestão online' : exercise.custom ? ' · personalizado' : ''}</small></div>${exercise.custom && !exercise.web ? `<button class="coach-edit-mini" onclick="editCoachCustomExercise(${index})" aria-label="Editar exercício personalizado">Editar</button>` : ''}</div>`).join('')}</div>${missingHTML}<div class="coach-plan-note">A biblioteca local continua sendo a fonte principal. Sugestões online só entram quando ajudam a completar o pedido.</div><div class="coach-plan-actions"><button onclick="startWorkoutFromCoach()">Começar este treino</button><button class="secondary" onclick="editCoachRequest()">Ajustar pedido</button></div>`;
  window.lastCoachPlan = plan;
}

async function askCoach(text) {
  const input = document.getElementById('coachInput');
  const requestText = String(text || input?.value || '').trim();
  if (!requestText) {
    if (input) input.focus();
    return;
  }
  if (input) input.value = '';
  const greeting = document.getElementById('coachGreeting');
  if (greeting) greeting.textContent = `Entendi: “${requestText}”. Vou organizar uma sessão realista para você.`;
  const request = getCoachRequest(requestText);
  const plan = buildCoachPlan(request);
  renderCoachPlan(plan);
  showToast('A assistente está cruzando sua biblioteca com sugestões online.');
  const webSuggestions = request.useOwnWorkout ? [] : await fetchCoachWebSuggestions(request);
  mergeWebSuggestionsIntoPlan(plan, webSuggestions);
  renderCoachPlan(plan);
}

function startWorkoutFromCoach() {
  const plan = window.lastCoachPlan;
  if (!plan || !plan.selected?.length) return;
  if (!state.customExercises) state.customExercises = [];
  plan.selected.filter(exercise => exercise.web).forEach(exercise => {
    if (!state.customExercises.some(item => coachNormalize(item.name) === coachNormalize(exercise.name))) {
      state.customExercises.push({ id: Date.now() + Math.random(), name: exercise.name, type: 'Web', group: exercise.group || plan.group, notes: exercise.instructions || '', custom: true, source: 'wger', createdAt: new Date().toISOString() });
    }
  });
  renderCustomExercisesInSelect();
  state.editingWorkoutId = null;
  state.currentWorkout = { id: Date.now(), name: `${plan.group[0].toUpperCase() + plan.group.slice(1)} · ${plan.minutes} min`, startTime: new Date().toISOString(), exercises: plan.selected.map((exercise, index) => ({ id: Date.now() + index + Math.random(), name: exercise.name, type: exercise.type, group: exercise.group, collapsed: false, sets: Array.from({ length: plan.sets }, () => ({ weight: 0, reps: 0 })) })) };
  saveData();
  const activeName = document.getElementById('activeWorkoutName');
  if (activeName) activeName.value = state.currentWorkout.name;
  renderCurrentWorkout();
  showPage('workout');
  showToast('Treino iniciado pela assistente. Bom treino!');
}

function editCoachRequest() {
  const input = document.getElementById('coachInput');
  if (input) { input.value = `${window.lastCoachPlan?.group || 'treino'} em ${window.lastCoachPlan?.minutes || 45} minutos`; input.focus(); }
}


function createCoachCustomExercise(index) {
  const plan = window.lastCoachPlan;
  const name = plan?.unmatched?.[index]?.trim();
  if (!name) return;
  if (!state.customExercises) state.customExercises = [];
  let custom = state.customExercises.find(item => coachNormalize(item.name) === coachNormalize(name));
  if (!custom) {
    custom = { id: Date.now(), name, type: 'Livre', group: plan.group || '', notes: '', custom: true, createdAt: new Date().toISOString() };
    state.customExercises.push(custom);
  }
  const exercise = { name: custom.name, type: custom.type, group: custom.group || plan.group || 'Personalizado', search: coachNormalize(`${custom.name} ${custom.group || ''}`), custom: true, priority: 1, role: 'personalizado' };
  if (!plan.selected.some(item => coachNormalize(item.name) === coachNormalize(exercise.name))) plan.selected.push(exercise);
  plan.unmatched.splice(index, 1);
  plan.count = plan.selected.length;
  saveData();
  renderCustomExercisesInSelect();
  renderCoachPlan(plan);
  showToast(`"${custom.name}" salvo nos seus exercícios pessoais.`);
}

function editCoachCustomExercise(index) {
  const plan = window.lastCoachPlan;
  const exercise = plan?.selected?.[index];
  if (!exercise?.custom) return;
  const custom = (state.customExercises || []).find(item => coachNormalize(item.name) === coachNormalize(exercise.name));
  if (!custom) return;
  const newName = prompt('Nome do exercício personalizado:', custom.name);
  if (!newName?.trim()) return;
  custom.name = newName.trim();
  custom.type = prompt('Tipo (Livre, Máquina, Polia, Cardio ou Peso Corporal):', custom.type) || custom.type;
  exercise.name = custom.name;
  exercise.type = custom.type;
  exercise.search = coachNormalize(`${custom.name} ${custom.group || ''}`);
  saveData();
  renderCustomExercisesInSelect();
  renderCoachPlan(plan);
  showToast('Exercício personalizado atualizado.');
}
