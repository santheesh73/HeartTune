export interface LyricsData {
  plainLyrics: string | null;
  syncedLyrics: string | null;
}

function cleanTrackName(name: string) {
  // Remove content inside parentheses and brackets like "(From "Aashiqui 2")"
  return name.replace(/\s*\(.*?\)\s*/g, '').replace(/\s*\[.*?\]\s*/g, '').trim();
}

export async function getLyrics(trackName: string, artistName: string): Promise<LyricsData | null> {
  try {
    const url = new URL('https://lrclib.net/api/search');
    url.searchParams.append('track_name', cleanTrackName(trackName));
    url.searchParams.append('artist_name', artistName);

    const res = await fetch(url.toString(), {
      headers: {
        'User-Agent': 'HeartTune/1.0 (https://github.com/HeartTune)',
      }
    });
    
    if (!res.ok) return null;

    const data = await res.json();
    if (Array.isArray(data) && data.length > 0) {
      // LRCLIB sometimes returns multiple results. We just take the best match (first one).
      const topResult = data[0];
      return {
        plainLyrics: topResult.plainLyrics || null,
        syncedLyrics: topResult.syncedLyrics || null,
      };
    }
    return null;
  } catch (error) {
    console.error('Failed to fetch lyrics from lrclib:', error);
    return null;
  }
}
