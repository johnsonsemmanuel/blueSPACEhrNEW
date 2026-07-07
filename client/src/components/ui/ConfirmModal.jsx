import Modal from './Modal'
import Button from './Button'

export default function ConfirmModal({ open, title, message, confirmText = 'Confirm', variant = 'danger', onConfirm, onClose }) {
  return (
    <Modal open={open} onClose={onClose} title={title} size="sm">
      <p className="text-sm text-gray-600">{message}</p>
      <div className="flex gap-3 pt-4">
        <Button type="button" variant="outline" onClick={onClose} className="flex-1">
          Cancel
        </Button>
        <Button type="button" variant={variant} onClick={onConfirm} className="flex-1">
          {confirmText}
        </Button>
      </div>
    </Modal>
  )
}
