export function frameToTimecode(frame: number, fps: number): string {
  const totalSeconds = Math.floor(frame / fps);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const frames = frame % fps;
  return [hours, minutes, seconds, frames]
    .map(n => String(n).padStart(2, '0'))
    .join(':');
}

export function timecodeToFrame(tc: string, fps: number): number {
  const parts = tc.split(':').map(Number);
  if (parts.length !== 4 || parts.some(isNaN)) return 0;
  const [hours, minutes, seconds, frames] = parts;
  return hours * 3600 * fps + minutes * 60 * fps + seconds * fps + frames;
}

export function generateId(): string {
  return `evt-${Math.random().toString(36).slice(2, 9)}`;
}
