import { useEffect } from 'react'
import './Toast.css'

interface ToastProps {
  message: string
  type?: 'success' | 'error' | 'info'
  icon?: string
  duration?: number
  onClose: () => void
}

export default function Toast({
  message,
  type = 'info',
  icon,
  duration = 5000, // Increased from 3000 to 5000
  onClose
}: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose()
    }, duration)

    return () => clearTimeout(timer)
  }, [duration, onClose])

  const defaultIcons = {
    success: '✓',
    error: '✗',
    info: 'ℹ'
  }

  return (
    <div className={`toast toast-${type}`}>
      <span className="toast-icon">{icon || defaultIcons[type]}</span>
      <span className="toast-message">{message}</span>
    </div>
  )
}
