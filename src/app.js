import { phonetics } from './data/phonetics.js';
import { StateMachine } from './stateMachine.js';

const machine = new StateMachine('idle');

machine.register('idle', {});
machine.register('speaker_select', {});
machine.register('phonetic_select', {});
machine.register('recording', {});
machine.register('record_preview', {});
machine.register('delete_mode', {});
machine.register('pending_save', {});
machine.register('saving', {});
machine.register('loading', {});
machine.register('error', {});

const grid = document.getElementById('phoneticGrid');

phonetics.forEach(symbol => {
  const card = document.createElement('button');
  card.className = 'phonetic-card';
  card.innerHTML = `
    <div class="symbol">${symbol}</div>
    <div class="counter">0/10</div>
    <div class="mic">🎤</div>
  `;

  card.addEventListener('click', () => {
    document.getElementById('currentSymbol').textContent = symbol;
    machine.change('phonetic_select');
  });

  grid.appendChild(card);
});

const speakers = ['預設錄音者'];
const select = document.getElementById('speakerSelect');

speakers.forEach(name => {
  const option = document.createElement('option');
  option.textContent = name;
  select.appendChild(option);
});
