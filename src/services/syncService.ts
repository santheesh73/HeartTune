import { isOffline } from './serviceUtils'

const SYNC_QUEUE_KEY = 'hearttune_sync_queue'

export interface SyncItem {
  id: string
  type: 'like' | 'unlike' | 'recently_played' | 'download_metadata' | 'remove_download_metadata'
  userId: string
  payload: any
  timestamp: number
}

export function getSyncQueue(): SyncItem[] {
  if (typeof window === 'undefined') return []
  try {
    return JSON.parse(localStorage.getItem(SYNC_QUEUE_KEY) || '[]')
  } catch {
    return []
  }
}

export function saveSyncQueue(queue: SyncItem[]) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(queue))
  } catch (err) {
    console.warn('Failed to save sync queue', err)
  }
}

export function addToSyncQueue(item: Omit<SyncItem, 'id' | 'timestamp'>) {
  const queue = getSyncQueue()
  const newItem: SyncItem = {
    ...item,
    id: `${item.type}-${Date.now()}-${Math.random()}`,
    timestamp: Date.now()
  }

  let nextQueue = [...queue]
  if (item.type === 'like' || item.type === 'unlike') {
    const songId = item.payload.id
    nextQueue = nextQueue.filter(
      (x) => !((x.type === 'like' || x.type === 'unlike') && x.payload.id === songId)
    )
  } else if (item.type === 'download_metadata' || item.type === 'remove_download_metadata') {
    const songId = item.payload.id
    nextQueue = nextQueue.filter(
      (x) => !((x.type === 'download_metadata' || x.type === 'remove_download_metadata') && x.payload.id === songId)
    )
  }

  nextQueue.push(newItem)
  saveSyncQueue(nextQueue)
}

let isSyncing = false

export async function processSyncQueue() {
  if (isSyncing || typeof window === 'undefined' || isOffline()) return
  const queue = getSyncQueue()
  if (queue.length === 0) return

  isSyncing = true
  console.log(`Starting background sync of ${queue.length} items...`)

  try {
    const { likeSong, unlikeSong } = await import('./likedSongsService')
    const { addRecentlyPlayed } = await import('./recentlyPlayedService')
    const { saveDownloadMetadata, removeDownloadMetadata } = await import('./downloadService')

    const nextQueue = [...queue]
    for (const item of queue) {
      if (isOffline()) {
        break
      }

      try {
        if (item.type === 'like') {
          await likeSong(item.userId, item.payload, true)
        } else if (item.type === 'unlike') {
          await unlikeSong(item.userId, item.payload.id, true)
        } else if (item.type === 'recently_played') {
          await addRecentlyPlayed(item.userId, item.payload, true)
        } else if (item.type === 'download_metadata') {
          await saveDownloadMetadata(item.userId, item.payload, true)
        } else if (item.type === 'remove_download_metadata') {
          await removeDownloadMetadata(item.userId, item.payload.id, true)
        }

        const idx = nextQueue.findIndex((x) => x.id === item.id)
        if (idx !== -1) nextQueue.splice(idx, 1)
        saveSyncQueue(nextQueue)
      } catch (err: any) {
        console.warn(`Sync failed for item ${item.type}:`, err)
        const msg = (err?.message || '').toLowerCase()
        const isNetErr = msg.includes('fetch') || msg.includes('network') || msg.includes('supabase')
        if (isOffline() || isNetErr) {
          break
        }
        const idx = nextQueue.findIndex((x) => x.id === item.id)
        if (idx !== -1) nextQueue.splice(idx, 1)
        saveSyncQueue(nextQueue)
      }
    }
  } catch (err) {
    console.error('Error during import or sync queue processing:', err)
  } finally {
    isSyncing = false
  }
}

// Register window listener for online status
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    void processSyncQueue()
  })
}
