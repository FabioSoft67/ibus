import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { startProcess } from '../api/camunda.js'
import Toast from '../components/Toast.jsx'

export default function NewTicket() {
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [problem, setProblem] = useState('')
  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState(null)

  const clearToast = useCallback(() => setToast(null), [])

  async function handleSubmit(e) {
    e.preventDefault()
    if (!name.trim() || !problem.trim()) {
      setToast({ message: 'Bitte alle Felder ausfüllen.', type: 'error' })
      return
    }
    setLoading(true)
    try {
      await startProcess(name.trim(), problem.trim())
      // Wait 2 s so Elasticsearch indexes the new task before the list loads.
      await new Promise(r => setTimeout(r, 2000))
      navigate('/tickets')
    } catch (err) {
      setToast({ message: `Fehler: ${err.message}`, type: 'error' })
      setLoading(false)
    }
  }

  return (
    <div className="screen">
      <Toast {...(toast ?? { message: null })} onClose={clearToast} />
      <div className="card">
        <h1 className="card__title">Neues Ticket erstellen</h1>
        <form onSubmit={handleSubmit} className="form" noValidate>
          <div className="form__group">
            <label htmlFor="name" className="form__label">Name</label>
            <input
              id="name"
              type="text"
              className="form__input"
              placeholder="Vor- und Nachname"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={loading}
              required
            />
          </div>
          <div className="form__group">
            <label htmlFor="problem" className="form__label">Problem</label>
            <textarea
              id="problem"
              className="form__textarea"
              placeholder="Beschreibe das Problem möglichst genau…"
              rows={5}
              value={problem}
              onChange={(e) => setProblem(e.target.value)}
              disabled={loading}
              required
            />
          </div>
          <button type="submit" className="btn btn--primary" disabled={loading}>
            {loading ? 'Ticket wird erstellt…' : 'Senden'}
          </button>
        </form>
      </div>
    </div>
  )
}
