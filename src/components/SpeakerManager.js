export class SpeakerManager {
  constructor({ selectRoot, listRoot }) {
    this.selectRoot = selectRoot;
    this.listRoot = listRoot;
    this.speakers = [];
    this.activeSpeakerId = null;
    this.onChange = null;
  }

  setSpeakers(speakers) {
    this.speakers = [...speakers];
    this.activeSpeakerId = speakers.find(item => item.active)?.id || speakers[0]?.id || null;
    this.render();
  }

  setChangeHandler(handler) {
    this.onChange = handler;
  }

  addSpeaker(name) {
    const trimmedName = name.trim();
    if (!trimmedName) return null;

    const speaker = {
      id: crypto.randomUUID(),
      name: trimmedName,
      role: 'speaker',
      ownerId: 'local-owner',
      allowedUserIds: ['local-owner'],
      createdAt: new Date().toISOString().slice(0, 10),
      active: false
    };

    this.speakers.push(speaker);
    this.activeSpeakerId = speaker.id;
    this.render();
    this.onChange?.(speaker);
    return speaker;
  }

  getSpeakers() {
    return [...this.speakers];
  }

  getActiveSpeaker() {
    return this.speakers.find(item => item.id === this.activeSpeakerId) || null;
  }

  setActiveSpeaker(id) {
    if (!this.speakers.some(item => item.id === id)) return;

    this.activeSpeakerId = id;
    this.render();
    this.onChange?.(this.getActiveSpeaker());
  }

  render() {
    this.selectRoot.innerHTML = '';
    this.listRoot.innerHTML = '';

    this.speakers.forEach(speaker => {
      const option = document.createElement('option');
      option.value = speaker.id;
      option.textContent = speaker.name;
      option.selected = speaker.id === this.activeSpeakerId;
      this.selectRoot.appendChild(option);

      const card = document.createElement('article');
      card.className = `speaker-card${speaker.id === this.activeSpeakerId ? ' active' : ''}`;
      card.innerHTML = `
        <div class="speaker-avatar" aria-hidden="true">人</div>
        <div>
          <strong>${speaker.name}</strong>
          <span>建立日期：${speaker.createdAt}</span>
        </div>
      `;
      card.addEventListener('click', () => this.setActiveSpeaker(speaker.id));
      this.listRoot.appendChild(card);
    });

    this.selectRoot.onchange = () => this.setActiveSpeaker(this.selectRoot.value);
  }
}
