import { phonetics } from './data/phonetics.js';
import { defaultSpeakers } from './data/speakers.js';
import { StateMachine } from './stateMachine.js';
import { RecordList } from './components/RecordList.js';
import { SpeakerManager } from './components/SpeakerManager.js';
import { DeleteModeState } from './states/DeleteModeState.js';
import { RecordingState } from './states/RecordingState.js';
import { RecorderService } from './services/RecorderService.js';
import { AudioPlayerService } from './services/AudioPlayerService.js';
import { IndexedDBService } from './services/IndexedDBService.js';
import { createAudioMetadata } from './models/AudioMetadata.js';

const appRoot = document.getElementById('app');
const stateLabel = document.getElementById('stateBadge');
const grid = document.getElementById('phoneticGrid');
const deleteHint = document.getElementById('deleteHint');
const deleteModeButton = document.getElementById('deleteModeButton');
const recordButton = document.getElementById('recordButton');
const playAllButton = document.getElementById('playAllButton');
const saveButton = document.getElementById('saveButton');
const cancelButton = document.getElementById('cancelButton');
const addSpeakerButton = document.getElementById('addSpeakerButton');
const helpDialog = document.getElementById('helpDialog');
const currentSymbol = document.getElementById('currentSymbol');
const recordCount = document.getElementById('recordCount');

const mobile = {
  speakerCard: document.getElementById('mobileSpeakerCard'),
  speakerName: document.getElementById('mobileSpeakerName'),
  speakerDate: document.getElementById('mobileSpeakerDate'),
  currentSymbol: document.getElementById('mobileCurrentSymbol'),
  recordCountLarge: document.getElementById('mobileRecordCountLarge'),
  remainCount: document.getElementById('mobileRemainCount'),
  progressBar: document.getElementById('mobileProgressBar'),
  recordListCount: document.getElementById('mobileRecordListCount'),
  recordList: document.getElementById('mobileRecordList'),
  phoneticList: document.getElementById('mobilePhoneticList'),
  recordButton: document.getElementById('mobileRecordButton'),
  recordHint: document.getElementById('mobileRecordHint'),
  recordTimer: document.getElementById('mobileRecordTimer'),
  saveButton: document.getElementById('mobileSaveButton'),
  cancelButton: document.getElementById('mobileCancelButton'),
  deleteModeButton: document.getElementById('mobileDeleteModeButton'),
  helpButton: document.getElementById('mobileHelpButton'),
  changeCount: document.getElementById('mobileChangeCount')
};

const recorder = new RecorderService();
const player = new AudioPlayerService();
const storage = new IndexedDBService();
const recordsByKey = new Map();
let selectedPhonetic = 'ㄅ';
let isRecording = false;
let changedCount = 0;
let recordStartTime = 0;
let recordTimerId = 0;

const recordList = new RecordList(document.getElementById('recordList'));
const speakerManager = new SpeakerManager({
  selectRoot: document.getElementById('speakerSelect'),
  listRoot: document.getElementById('speakerList')
});

const context = { appRoot, stateLabel, deleteHint, recordList };
const machine = new StateMachine('idle');

machine.register('idle', { enter() { setStateText('狀態：待命', 'idle'); } });
machine.register('speaker_select', { enter() { setStateText('狀態：切換錄音者', 'speaker_select'); } });
machine.register('phonetic_select', { enter() { setStateText('狀態：選擇注音', 'phonetic_select'); } });
machine.register('recording', new RecordingState(context));
machine.register('record_preview', { enter() { setStateText('狀態：可播放檢查', 'record_preview'); } });
machine.register('delete_mode', new DeleteModeState(context));
machine.register('pending_save', { enter() { setStateText('狀態：有未保存變更', 'pending_save'); } });
machine.register('saving', { enter() { setStateText('狀態：保存中', 'saving'); } });
machine.register('loading', { enter() { setStateText('狀態：載入中', 'loading'); } });
machine.register('error', { enter(payload) { setStateText(`狀態：錯誤 ${payload?.message || ''}`, 'error'); } });

speakerManager.setSpeakers(defaultSpeakers);
speakerManager.setChangeHandler(async speaker => {
  if (speaker) await storage.put('speakers', speaker);
  await loadCurrentRecords();
  syncMobileSpeaker();
});

recordList.setHandlers({
  onPlay: playRecord,
  onToggleDelete: () => markChanged()
});

machine.change('idle');
await initializeStorage();
createPhoneticButtons();
createMobilePhoneticButtons();
await loadCurrentRecords();
syncMobileSpeaker();

recordButton.addEventListener('click', toggleRecording);
mobile.recordButton.addEventListener('click', toggleRecording);
playAllButton.addEventListener('click', playAllRecords);
deleteModeButton.addEventListener('click', toggleDeleteMode);
mobile.deleteModeButton.addEventListener('click', toggleDeleteMode);
saveButton.addEventListener('click', saveChanges);
mobile.saveButton.addEventListener('click', saveChanges);
cancelButton.addEventListener('click', cancelChanges);
mobile.cancelButton.addEventListener('click', cancelChanges);
addSpeakerButton.addEventListener('click', addSpeaker);
mobile.speakerCard.addEventListener('click', addSpeaker);
document.getElementById('helpButton').addEventListener('click', () => helpDialog.showModal());
mobile.helpButton.addEventListener('click', () => helpDialog.showModal());
document.getElementById('closeHelpButton').addEventListener('click', () => helpDialog.close());

async function toggleRecording() {
  try {
    setRecordButtonsDisabled(true);

    if (!isRecording) {
      const currentRecords = getCurrentRecords().filter(record => !record.pendingDelete);
      if (currentRecords.length >= 10) {
        machine.change('error', { message: '此注音已達 10 個錄音上限' });
        return;
      }

      await recorder.initialize();
      recorder.start();
      isRecording = true;
      recordStartTime = Date.now();
      startRecordTimer();
      setRecordingUi(true);
      machine.change('recording');
      return;
    }

    const blob = await recorder.stop();
    const speaker = speakerManager.getActiveSpeaker();
    if (!speaker) throw new Error('尚未選擇錄音者');

    const metadata = createAudioMetadata({ speakerId: speaker.id, phonetic: selectedPhonetic, blob });
    const currentRecords = getCurrentRecords();
    currentRecords.push(metadata);
    setCurrentRecords(currentRecords);
    markChanged();
    setRecordingUi(false);
    machine.change('record_preview');
  } catch (error) {
    setRecordingUi(false);
    machine.change('error', { message: error.message });
  } finally {
    setRecordButtonsDisabled(false);
  }
}

async function playRecord(record) {
  try {
    if (!record.blob) {
      machine.change('error', { message: '此錄音沒有可播放的音檔資料' });
      return;
    }
    await player.playBlob(record.blob);
    machine.change('record_preview');
  } catch (error) {
    machine.change('error', { message: error.message });
  }
}

async function playAllRecords() {
  try {
    const playableRecords = getCurrentRecords().filter(record => !record.pendingDelete && record.blob);
    if (playableRecords.length === 0) {
      machine.change('error', { message: '目前沒有可播放的錄音' });
      return;
    }
    await player.playQueue(playableRecords);
    machine.change('record_preview');
  } catch (error) {
    machine.change('error', { message: error.message });
  }
}

function toggleDeleteMode() {
  const enabled = machine.currentState !== 'delete_mode';
  recordList.setDeleteMode(enabled);
  mobile.deleteModeButton.textContent = enabled ? '完成' : '編輯';
  renderMobileRecords(getCurrentRecords());
  machine.change(enabled ? 'delete_mode' : 'idle');
}

async function saveChanges() {
  try {
    machine.change('saving');
    const records = getCurrentRecords();

    for (const record of records) {
      if (record.pendingDelete) await storage.delete('recordings', record.id);
      else await storage.put('recordings', record);
    }

    changedCount = 0;
    setCurrentRecords(records.filter(record => !record.pendingDelete));
    recordList.setDeleteMode(false);
    mobile.deleteModeButton.textContent = '編輯';
    syncChangedCount();
    machine.change('idle');
  } catch (error) {
    machine.change('error', { message: error.message });
  }
}

async function cancelChanges() {
  changedCount = 0;
  recordList.setDeleteMode(false);
  mobile.deleteModeButton.textContent = '編輯';
  syncChangedCount();
  machine.change('idle');
  await loadCurrentRecords();
}

async function addSpeaker() {
  const name = prompt('請輸入新增錄音者名稱');
  if (name === null) return;

  const speaker = speakerManager.addSpeaker(name);
  if (!speaker) {
    machine.change('error', { message: '錄音者名稱不能空白' });
    return;
  }

  await storage.put('speakers', speaker);
  await loadCurrentRecords();
  syncMobileSpeaker();
  machine.change('speaker_select');
}

async function initializeStorage() {
  machine.change('loading');
  await storage.initialize();
  const storedSpeakers = await storage.getAll('speakers');

  if (storedSpeakers.length > 0) speakerManager.setSpeakers(storedSpeakers);
  else {
    for (const speaker of defaultSpeakers) await storage.put('speakers', speaker);
    speakerManager.setSpeakers(defaultSpeakers);
  }
}

async function loadCurrentRecords() {
  const speaker = speakerManager.getActiveSpeaker();
  if (!speaker) return;

  const records = await storage.getRecordingsBySpeakerAndPhonetic(speaker.id, selectedPhonetic);
  setCurrentRecords(records.map(record => ({ ...record, pendingDelete: false })));
  machine.change('idle');
}

function createPhoneticButtons() {
  grid.innerHTML = '';
  phonetics.forEach(symbol => {
    const card = document.createElement('button');
    card.className = 'phonetic-card';
    card.type = 'button';
    card.dataset.symbol = symbol;
    card.innerHTML = `<div class="symbol">${symbol}</div><div class="counter" data-counter="${symbol}">0/10</div><div class="mic">🎤</div>`;
    card.addEventListener('click', () => selectPhonetic(symbol));
    grid.appendChild(card);
  });
}

function createMobilePhoneticButtons() {
  mobile.phoneticList.innerHTML = '';
  phonetics.forEach(symbol => {
    const item = document.createElement('button');
    item.className = 'mobile-phonetic-item';
    item.type = 'button';
    item.dataset.mobileSymbol = symbol;
    item.innerHTML = `<span class="mobile-phonetic-symbol">${symbol}</span><span class="mobile-phonetic-count" data-mobile-counter="${symbol}">0/10</span><span class="mobile-dot"></span>`;
    item.addEventListener('click', () => selectPhonetic(symbol));
    mobile.phoneticList.appendChild(item);
  });
}

async function selectPhonetic(symbol) {
  selectedPhonetic = symbol;
  currentSymbol.textContent = symbol;
  mobile.currentSymbol.textContent = symbol;
  machine.change('phonetic_select');
  await loadCurrentRecords();
  setActivePhoneticUi(symbol);
}

function getCurrentKey() {
  const speaker = speakerManager.getActiveSpeaker();
  return `${speaker?.id || 'none'}::${selectedPhonetic}`;
}

function getCurrentRecords() {
  return recordsByKey.get(getCurrentKey()) || [];
}

function setCurrentRecords(records) {
  recordsByKey.set(getCurrentKey(), records);
  recordList.setRecords(records);
  renderMobileRecords(records);
  const activeCount = records.filter(record => !record.pendingDelete).length;
  recordCount.textContent = `${activeCount}/10`;
  mobile.recordCountLarge.textContent = `${activeCount} / 10`;
  mobile.remainCount.textContent = String(10 - activeCount);
  mobile.recordListCount.textContent = `(${activeCount})`;
  mobile.progressBar.style.width = `${activeCount * 10}%`;
  updateCurrentCounter(records);
}

function renderMobileRecords(records) {
  mobile.recordList.innerHTML = '';
  if (records.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'empty-records';
    empty.textContent = '目前沒有錄音';
    mobile.recordList.appendChild(empty);
    return;
  }

  records.forEach((record, index) => {
    const item = document.createElement('article');
    item.className = `record-item${record.pendingDelete ? ' pending-delete' : ''}`;
    item.innerHTML = `<span class="record-index">${index + 1}</span><button class="play-button" type="button">▶</button><div class="record-meta"><strong>${record.fileName}</strong><span>${new Date(record.createdAt).toLocaleString('zh-TW')}</span></div>`;
    item.querySelector('.play-button').addEventListener('click', event => {
      event.stopPropagation();
      playRecord(record);
    });
    if (machine.currentState === 'delete_mode') {
      item.addEventListener('click', () => {
        record.pendingDelete = !record.pendingDelete;
        markChanged();
        setCurrentRecords(records);
      });
    }
    mobile.recordList.appendChild(item);
  });
}

function updateCurrentCounter(records) {
  const activeCount = records.filter(record => !record.pendingDelete).length;
  const desktopCounter = document.querySelector(`[data-counter="${selectedPhonetic}"]`);
  const mobileCounter = document.querySelector(`[data-mobile-counter="${selectedPhonetic}"]`);
  const mobileItem = document.querySelector(`[data-mobile-symbol="${selectedPhonetic}"]`);
  if (desktopCounter) desktopCounter.textContent = `${activeCount}/10`;
  if (mobileCounter) mobileCounter.textContent = `${activeCount}/10`;
  if (mobileItem) {
    const dot = mobileItem.querySelector('.mobile-dot');
    dot.className = 'mobile-dot';
    if (activeCount >= 10) dot.classList.add('full');
    else if (activeCount >= 3) dot.classList.add('good');
    else if (activeCount > 0) dot.classList.add('warn');
  }
  setActivePhoneticUi(selectedPhonetic);
}

function setActivePhoneticUi(symbol) {
  document.querySelectorAll('[data-mobile-symbol]').forEach(item => item.classList.toggle('active', item.dataset.mobileSymbol === symbol));
}

function syncMobileSpeaker() {
  const speaker = speakerManager.getActiveSpeaker();
  if (!speaker) return;
  mobile.speakerName.textContent = speaker.name;
  mobile.speakerDate.textContent = `${speaker.createdAt.replaceAll('-', '/')} 建立`;
}

function markChanged() {
  changedCount += 1;
  syncChangedCount();
  machine.change('pending_save');
}

function syncChangedCount() {
  mobile.changeCount.textContent = `已修改 ${changedCount} 筆資料`;
}

function setRecordingUi(recording) {
  isRecording = recording;
  recordButton.textContent = recording ? '停止錄音' : '開始錄音';
  mobile.recordButton.classList.toggle('recording', recording);
  mobile.recordButton.textContent = recording ? '■' : '🎙';
  mobile.recordHint.textContent = recording ? '錄音中，點擊停止' : '點擊開始錄音';
  if (!recording) stopRecordTimer();
}

function setRecordButtonsDisabled(disabled) {
  recordButton.disabled = disabled;
  mobile.recordButton.disabled = disabled;
}

function startRecordTimer() {
  stopRecordTimer();
  recordTimerId = window.setInterval(() => {
    const seconds = Math.floor((Date.now() - recordStartTime) / 1000);
    const mm = String(Math.floor(seconds / 60)).padStart(2, '0');
    const ss = String(seconds % 60).padStart(2, '0');
    mobile.recordTimer.textContent = `${mm}:${ss}`;
  }, 250);
}

function stopRecordTimer() {
  if (recordTimerId) window.clearInterval(recordTimerId);
  recordTimerId = 0;
  mobile.recordTimer.textContent = '00:00';
}

function setStateText(text, state) {
  stateLabel.textContent = text;
  appRoot.dataset.state = state;
}
