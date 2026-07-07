export interface SyncedLyricLine {
  time: number; // time in seconds
  text: string;
}

export function parseLrc(lrcText: string): SyncedLyricLine[] {
  const lines = lrcText.split('\n');
  const result: SyncedLyricLine[] = [];

  const timeRegex = /\[(\d{2}):(\d{2})\.(\d{2,3})\]/;

  for (const line of lines) {
    const match = line.match(timeRegex);
    if (match) {
      const minutes = parseInt(match[1], 10);
      const seconds = parseInt(match[2], 10);
      const milliseconds = parseInt(match[3].padEnd(3, '0'), 10);
      const timeInSeconds = minutes * 60 + seconds + milliseconds / 1000;
      
      const text = line.replace(timeRegex, '').trim();
      
      result.push({
        time: timeInSeconds,
        text: text,
      });
    }
  }

  // Ensure sorted by time
  return result.sort((a, b) => a.time - b.time);
}
