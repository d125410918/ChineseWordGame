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
const helpDialog = document.getElementById('helpDialog');
const currentSymbol = document.getElementById('currentSymbol');
const recordCount = document.getElementById('recordCount');

const recorder = new RecorderService();
const player = new AudioPlayerService();
const storage = new IndexedDBService();
const recordsByKey = new Map();
let selectedPhonetic = 'ㄅ';
let isRecording = false;

const recordList = new RecordList(document.getElementById('recordList'));
const speakerManager = new SpeakerManager({
  selectRoot: document.getElementById('speakerSelect'),
  listRoot: document.getElementById('speakerList')
});

const context = {
  appRoot,
  stateLabel,
  deleteHint,
  recordList
};

const machine = new StateMachine('idle');
machine.register('idle', {
  enter() {
    stateLabel.textContent = '狀態：待命';
    appRoot.dataset.state = 'idle';
  }
});
machine.register('speaker_select', {});
machine.register('phonetic_select', {
  enter() {
    stateLabel.textContent = '狀態：選擇注音';
    appRoot.dataset.state = 'phonetic_select';
  }
});
machine.register('recording', new RecordingState(context));
machine.register('record_preview', {});
machine.register('delete_mode', new DeleteModeState(context));
machine.register('pending_save', {
  enter() {
    stateLabel.textContent = '狀態：有未保存變更';
    appRoot.dataset.state = 'pending_save';
  }
});
machine.register('saving', {
  enter() {
    stateLabel.textContent = '狀態：保存中';
    appRoot.dataset.state = 'saving';
  }
});
machine.register('loading', {
  enter() {
    stateLabel.textContent = '狀態：載入中';
    appRoot.dataset.state = 'loading';
  }
});
machine.register('error', {
  enter(payload) {
    stateLabel.textContent = `狀態：錯誤 ${payload?.message || ''}`;
    appRoot.dataset.state = 'error';
  }
});

speakerManager.setSpeakers(defaultSpeakers);
recordList.setHandlers({
  onPlay: record => player.playBlob(record.blob),
  onToggleDelete: () => machine.change('pending_save')
});
machine.change('idle');

await initializeStorage();
await loadCurrentRecords();

phonetics.forEach(symbol => {
  const card = document.createElement('button');
  card.className = 'phonetic-card';
  card.type = 'button';
  card.dataset.symbol = symbol;
  card.innerHTML = `
    <div class="symbol">${symbol}</div>
    <div class="counter" data-counter="${symbol}">0/10</div>
    <div class="mic">🎤</div>
  `;

  card.addEventListener('click', async () => {
    selectedPhonetic = symbol;
    currentSymbol.textContent = symbol;
    machine.change('phonetic_select');
    await loadCurrentRecords();
  });

  grid.appendChild(card);
});

recordButton.addEventListener('click', async () => {
  try {
    if (!isRecording) {
      const currentRecords = getCurrentRecords();
      if (currentRecords.length >= 10) {
        machine.change('error', { message: '此注音已達 10 個錄音上限' });
        return;
      }

      await recorder.initialize();
      recorder.start();
      isRecording = true;
      recordButton.textContent = '停止錄音';
      machine.change('recording');
      return;
    }

    const blob = await recorder.stop();
    const speaker = speakerManager.getActiveSpeaker();
    const metadata = createAudioMetadata({
      speakerId: speaker.id,
      phonetic: selectedPhonetic,
      blob
    });

    const currentRecords = getCurrentRecords();
    currentRecords.push(metadata);
    setCurrentRecords(currentRecords);
    isRecording = false;
    recordButton.textContent = '開始錄音';
    machine.change('pending_save');
  } catch (error) {
    isRecording = false;
    recordButton.textContent = '開始錄音';
    machine.change('error', { message: error.message });
  }
});

playAllButton.addEventListener('click', async () => {
  await player.playQueue(getCurrentRecords().filter(record => !record.pendingDelete));
});

deleteModeButton.addEventListener('click', () => {
  const enabled = machine.currentState !== 'delete_mode';
  recordList.setDeleteMode(enabled);
  machine.change(enabled ? 'delete_mode' : 'idle');
});

saveButton.addEventListener('click', async () => {
  machine.change('saving');
  const records = getCurrentRecords();

  for (const record of records) {
    if (record.pendingDelete) {
      await storage.delete('recordings', record.id);
    } else {
      await storage.put('recordings', record);
    }
  }

  setCurrentRecords(records.filter(record => !record.pendingDelete));
  machine.change('idle');
});

cancelButton.addEventListener('click', async () => {
  recordList.setDeleteMode(false);
  machine.change('idle');
  await loadCurrentRecords();
});

document.getElementById('helpButton').addEventListener('click', () => helpDialog.showModal());
document.getElementById('closeHelpButton').addEventListener('click', () => helpDialog.close());

async function initializeStorage() {
  machine.change('loading');
  await storage.initialize();

  for (const speaker of defaultSpeakers) {
    await storage.put('speakers', speaker);
  }
}

async function loadCurrentRecords() {
  const speaker = speakerManager.getActiveSpeaker();
  if (!speaker) return;

  const records = await storage.getRecordingsBySpeakerAndPhonetic(speaker.id, selectedPhonetic);
  setCurrentRecords(records);
  machine.change('idle');
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
  recordCount.textContent = `${records.filter(record => !record.pendingDelete).length}/10`;
}
