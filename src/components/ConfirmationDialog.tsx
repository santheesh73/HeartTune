import { X } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

interface ConfirmationDialogProps {
  isOpen: boolean
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  isDestructive?: boolean
  onConfirm: () => void
  onCancel: () => void
}

export default function ConfirmationDialog({
  isOpen,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  isDestructive = false,
  onConfirm,
  onCancel,
}: ConfirmationDialogProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="modal-backdrop">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="modal-overlay"
            onClick={onCancel}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="modal-content"
          >
            <div className="modal-header">
              <h2 className="modal-title">{title}</h2>
              <button
                onClick={onCancel}
                className="modal-close-btn"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="modal-body">
              <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.875rem', marginBottom: '8px' }}>
                {message}
              </p>
            </div>

            <div className="modal-footer">
              <button
                type="button"
                onClick={onCancel}
                className="btn-secondary"
              >
                {cancelText}
              </button>
              <button
                type="button"
                onClick={onConfirm}
                className="btn-primary"
                style={isDestructive ? { background: 'var(--red-primary)' } : { background: '#fff', color: '#000' }}
              >
                {confirmText}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
