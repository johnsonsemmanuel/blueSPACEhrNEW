import { useEffect, useRef } from 'react'
import { X } from 'lucide-react'

export default function Modal({ open, onClose, title, children, size = 'md' }) {
  const overlay = useRef()
  const panel = useRef()

  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden'
    else document.body.style.overflow = ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    if (open) window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, onClose])

  if (!open) return null

  const sizes = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
  }

  return (
    <div
      ref={overlay}
      className="fixed inset-0 z-50 flex items-start sm:items-center justify-center p-2 sm:p-4 bg-black/40 backdrop-blur-[2px] overflow-y-auto animate-fade-in"
      onClick={(e) => { if (e.target === overlay.current) onClose() }}
    >
      <div
        ref={panel}
        className={`w-full ${sizes[size]} bg-white rounded-xl shadow-xl my-2 sm:my-0 animate-scale-in`}
      >
        <div className="flex items-center justify-between px-4 sm:px-5 py-3 sm:py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-deep-600 truncate">{title}</h2>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 rounded-md transition-colors duration-150 ease-out-expo shrink-0 ml-2 active:scale-95"
          >
            <X size={16} />
          </button>
        </div>
        <div className="p-4 sm:p-5 max-h-[70vh] overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  )
}
