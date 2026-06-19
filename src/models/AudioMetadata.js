export function createAudioMetadata({ speakerId, phonetic, blob, duration = 0 }) {
  const now = new Date();
  const safePhonetic = phonetic.replaceAll('ˉ', 'tone1').replaceAll('ˊ', 'tone2').replaceAll('ˇ', 'tone3').replaceAll('ˋ', 'tone4').replaceAll('˙', 'tone5');

  return {
    id: crypto.randomUUID(),
    speakerId,
    phonetic,
    fileName: `${speakerId}_${safePhonetic}_${now.getTime()}.webm`,
    mimeType: blob?.type || 'audio/webm',
    size: blob?.size || 0,
    duration,
    createdAt: now.toISOString(),
    pendingDelete: false,
    synced: false,
    blob
  };
}
