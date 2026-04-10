import { useState } from 'react'
import ChatPanel from './ChatPanel'

export default function FloatingChat() {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div className="floating-chat">
      {isOpen && <ChatPanel onClose={() => setIsOpen(false)} />}
      <button
        className="chat-bubble"
        onClick={() => setIsOpen(o => !o)}
        aria-label={isOpen ? 'Cerrar asesor' : 'Abrir asesor financiero'}
        title="Asesor Financiero IA"
      >
        {isOpen ? '✕' : '💬'}
      </button>
    </div>
  )
}
