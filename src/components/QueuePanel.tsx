import { useState } from 'react'
import { motion, Reorder, AnimatePresence } from 'framer-motion'
import { X, Trash2, GripVertical, ListMusic } from 'lucide-react'
import { usePlayer } from '../context/PlayerContext'
import type { Song } from '../types'

interface QueuePanelProps {
  isOpen: boolean
  onClose: () => void
}

export default function QueuePanel({ isOpen, onClose }: QueuePanelProps) {
  const { queue, queueIndex, playQueueAt, removeFromQueue, moveInQueue, clearQueue, currentSong } = usePlayer()

  // Track the local queue state for framer-motion Reorder
  // When a drag ends, we'll sync it with the PlayerContext
  const handleReorder = (newQueue: Song[]) => {
    // Reorder gives us the whole new array, but we only have `moveInQueue(from, to)` in our context.
    // However, it's easier to just call a context method that sets the entire queue if we had it.
    // Since we don't have `setQueue` exposed, we can find the moved item and use `moveInQueue`.
    // For a robust UI, we should really expose `setQueue` or just use the drag ends to calculate from/to.
    // As a workaround, we'll just not use Reorder if we don't have setQueue, or we can use Reorder and 
    // compute the diff. 
    // To keep it simple, let's just use standard array mapping here and add a "drag" handle.
    // If Reorder is complex without `setQueue`, we can just list them normally for now or use Reorder with local state.
  }

  // Let's implement a simpler queue list for now, since we only have `moveInQueue` and `removeFromQueue`
  // Actually, we can use `moveInQueue` by tracking drag start and drop.
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index)
    e.dataTransfer.effectAllowed = 'move'
    // For Firefox compatibility
    e.dataTransfer.setData('text/html', e.currentTarget.innerHTML)
  }

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault()
  }

  const handleDrop = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    if (draggedIndex !== null && draggedIndex !== index) {
      moveInQueue(draggedIndex, index)
    }
    setDraggedIndex(null)
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
            onClick={onClose}
          />
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed inset-y-0 right-0 z-50 w-full max-w-sm bg-[#121212] border-l border-white/10 shadow-2xl flex flex-col"
          >
            <div className="flex items-center justify-between p-4 border-b border-white/10">
              <div className="flex items-center gap-2">
                <ListMusic size={20} className="text-white/70" />
                <h2 className="text-lg font-bold">Queue</h2>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={clearQueue}
                  className="p-2 text-white/50 hover:text-white transition"
                  title="Clear Queue"
                >
                  <Trash2 size={18} />
                </button>
                <button
                  onClick={onClose}
                  className="p-2 text-white/50 hover:text-white transition rounded-full hover:bg-white/10"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {queue.length === 0 ? (
                <div className="text-center text-white/50 mt-10">
                  Your queue is empty
                </div>
              ) : (
                queue.map((song, idx) => {
                  const isActive = idx === queueIndex
                  return (
                    <div
                      key={`${song.id}-${idx}`}
                      draggable
                      onDragStart={(e) => handleDragStart(e, idx)}
                      onDragOver={(e) => handleDragOver(e, idx)}
                      onDrop={(e) => handleDrop(e, idx)}
                      className={`flex items-center gap-3 p-2 rounded-lg cursor-grab active:cursor-grabbing transition-colors ${
                        isActive ? 'bg-[var(--color-primary)]/20' : 'hover:bg-white/5'
                      }`}
                    >
                      <div className="text-white/30 cursor-grab">
                        <GripVertical size={16} />
                      </div>
                      <div className="relative w-10 h-10 flex-shrink-0 bg-white/5 rounded overflow-hidden">
                        {song.image && song.image.length > 0 && (
                          <img src={song.image[song.image.length - 1].url} alt="" className="w-full h-full object-cover" />
                        )}
                        {isActive && (
                          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                            <div className="w-4 h-4 flex items-end justify-center gap-[2px]">
                              <motion.div animate={{ height: ['4px', '12px', '4px'] }} transition={{ repeat: Infinity, duration: 0.8 }} className="w-1 bg-[var(--color-primary)]" />
                              <motion.div animate={{ height: ['8px', '4px', '8px'] }} transition={{ repeat: Infinity, duration: 0.8 }} className="w-1 bg-[var(--color-primary)]" />
                              <motion.div animate={{ height: ['6px', '14px', '6px'] }} transition={{ repeat: Infinity, duration: 0.8 }} className="w-1 bg-[var(--color-primary)]" />
                            </div>
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0" onDoubleClick={() => playQueueAt(idx)}>
                        <p className={`text-sm font-medium truncate ${isActive ? 'text-[var(--color-primary)]' : 'text-white'}`}>
                          {song.name}
                        </p>
                        <p className="text-xs text-white/50 truncate">
                          {song.artists?.primary?.map(a => a.name).join(', ')}
                        </p>
                      </div>
                      <button
                        onClick={() => removeFromQueue(idx)}
                        className="p-1.5 text-white/30 hover:text-white transition opacity-0 group-hover:opacity-100 lg:opacity-100"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  )
                })
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
