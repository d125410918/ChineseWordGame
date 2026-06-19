export const SpeakerRole = Object.freeze({
  Owner: 'owner',
  Speaker: 'speaker',
  Viewer: 'viewer'
});

export function canRecord(currentUserId, speaker) {
  if (!speaker) return false;
  return speaker.ownerId === currentUserId || speaker.allowedUserIds?.includes(currentUserId);
}

export function canManage(currentUserId, speaker) {
  if (!speaker) return false;
  return speaker.ownerId === currentUserId || speaker.role === SpeakerRole.Owner;
}
