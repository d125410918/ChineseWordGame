export class SpeakerManager {
  constructor({ selectRoot, listRoot }) {
    this.selectRoot = selectRoot;
    this.listRoot = listRoot;
    this.speakers = [];
    this.activeSpeakerId = null;
  }

  setSpeakers(speakers) {
    this.speakers = speakers;
    this.activeSpeakerId = speakers.find(item => item.active)?.id || speakers[0]?.id || null;
    this.render();
  }

  getActiveSpeaker() {
    return this.speakers.find(item => item.id === this.activeSpeakerId) || null;
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
      card.addEventListener('click', () => {
        this.activeSpeakerId = speaker.id;
        this.render();
      });
      this.listRoot.appendChild(card);
    });

    this.selectRoot.onchange = () => {
      this.activeSpeakerId = this.selectRoot.value;
      this.render();
    };
  }
}
