import { useEffect, useRef } from 'react'

export default function ChatMessages({ messages, loading }) {
  const endRef = useRef(null)

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  return (
    <div className="chat-messages">
      {messages.length === 0 && !loading && (
        <div className="chat-empty">
          Hola! Soy tu asesor financiero. Pregúntame sobre tus gastos, ahorros o cualquier duda financiera.
        </div>
      )}
      {messages.map((msg) => (
        <div key={msg.timestamp.getTime()} className={`message ${msg.role}`}>
          {msg.content}
        </div>
      ))}
      {loading && (
        <div className="message assistant typing">Asesor escribiendo...</div>
      )}
      <div ref={endRef} />
    </div>
  )
}
