import { useEffect, useRef, ReactNode } from 'react'
import { createPortal } from 'react-dom'
import './ModalRoot.css'

interface ModalRootProps {
  isOpen: boolean
  onClose?: () => void
  title: string
  children: ReactNode
  closeOnOverlay?: boolean
  closeOnEsc?: boolean
  showCloseButton?: boolean
  size?: 'small' | 'medium' | 'large'
}

export default function ModalRoot({
  isOpen,
  onClose,
  title,
  children,
  closeOnOverlay = true,
  closeOnEsc = true,
  showCloseButton = true,
  size = 'medium'
}: ModalRootProps) {
  const modalRef = useRef<HTMLDivElement>(null)
  const firstFocusableRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!isOpen) return

    // Focus trap
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && closeOnEsc && onClose) {
        onClose()
      }

      if (e.key === 'Tab') {
        const focusableElements = modalRef.current?.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        )
        if (!focusableElements?.length) return

        const firstElement = focusableElements[0] as HTMLElement
        const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement

        if (e.shiftKey && document.activeElement === firstElement) {
          e.preventDefault()
          lastElement.focus()
        } else if (!e.shiftKey && document.activeElement === lastElement) {
          e.preventDefault()
          firstElement.focus()
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    document.body.style.overflow = 'hidden'

    // Focus first element
    setTimeout(() => {
      firstFocusableRef.current?.focus()
    }, 100)

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = 'unset'
    }
  }, [isOpen, closeOnEsc, onClose])

  if (!isOpen) return null

  const modal = (
    <div className="modal-overlay" onClick={closeOnOverlay && onClose ? onClose : undefined}>
      <div
        ref={modalRef}
        className={`modal-container modal-${size}`}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        <div className="modal-header">
          <h2 id="modal-title" className="modal-title">
            {title}
          </h2>
          {showCloseButton && onClose && (
            <button
              ref={firstFocusableRef}
              className="modal-close-button"
              onClick={onClose}
              aria-label="Bezárás"
            >
              ✕
            </button>
          )}
        </div>

        <div className="modal-content">{children}</div>
      </div>
    </div>
  )

  return createPortal(modal, document.body)
}
