import { phonetics } from './data/phonetics.js';
import { defaultSpeakers } from './data/speakers.js';
import { StateMachine } from './stateMachine.js';
import { RecordList } from './components/RecordList.js';
import { SpeakerManager } from './components/SpeakerManager.js';
import { DeleteModeState } from './states/DeleteModeState.js';
import { RecordingState } from './states/RecordingState.js';

const appRoot = document.getElementById('app');
const stateLabel = document.getElementById('stateBadge');
const grid = document.getElementById('phoneticGrid');
const deleteHint = document.getElementById('deleteHint');
const deleteModeButton = document.getElementById('deleteModeButton');
const helpDialog = document.getElementById('helpDialog');
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
machine.register('pending_save', {});
machine.register('saving', {});
machine.register('loading', {});
machine.register('error', {});

speakerManager.setSpeakers(defaultSpeakers);
recordList.setRecords([]);
machine.change('idle');

phonetics.forEach(symbol => {
  const card = document.createElement('button');
  card.className = 'phonetic-card';
  card.type = 'button';
  card.innerHTML = `
    <div class="symbol">${symbol}</div>
    <div class="counter">0/10</div>
    <div class="mic">🎤</div>
  `;

  card.addEventListener('click', () => {
    document.getElementById('currentSymbol').textContent = symbol;
    document.getElementById('recordCount').textContent = '0/10';
    recordList.setRecords([]);
    machine.change('phonetic_select');
  });

  grid.appendChild(card);
});

deleteModeButton.addEventListener('click', () => {
  const enabled = machine.currentState !== 'delete_mode';
  recordList.setDeleteMode(enabled);
  machine.change(enabled ? 'delete_mode' : 'idle');
});

document.getElementById('helpButton').addEventListener('click', () => helpDialog.showModal());
document.getElementById('closeHelpButton').addEventListener('click', () => helpDialog.close());
