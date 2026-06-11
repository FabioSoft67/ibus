import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { fetchTask, fetchTaskVariables, completeTask } from '../api/camunda.js'
import StatusBadge from '../components/StatusBadge.jsx'
import Toast from '../components/Toast.jsx'

const STATUS_OPTIONS = ['OFFEN', 'IN_BEARBEITUNG', 'GESCHLOSSEN']

export default function TicketDetail() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [task, setTask]         = useState(null)
  const [vars, setVars]         = useState({})
  const [status, setStatus]     = useState('OFFEN')
  const [loesung, setLoesung]   = useState('')
  const [loading, setLoading]   = useState(true)
  const [completing, setCompleting] = useState(false)
  const [toast, setToast]       = useState(null)

  const clearToast = useCallback(() => setToast(null), [])

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const [{ task, isMock: m1 }, { variables, isMock: m2 }] = await Promise.all([
          fetchTask(id),
          fetchTaskVariables(id),
        ])
        if (cancelled) return
        setTask(task)
        setVars(variables)
        setStatus(variables.status ?? 'OFFEN')
        setLoesung(variables.loesung ?? '')
        if (m1 || m2) {
          setToast({
            message: 'Camunda nicht erreichbar – Mock-Daten werden angezeigt.',
            type: 'warning',
          })
        }
      } catch (err) {
        if (!cancelled) {
          setToast({ message: `Laden fehlgeschlagen: ${err.message}`, type: 'error' })
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [id])

  function handleSave() {
    setToast({
      message: 'Änderungen gespeichert – werden beim Schliessen übermittelt.',
      type: 'success',
    })
  }

  async function handleComplete() {
    if (!window.confirm('Task wirklich abschliessen?')) return
    setCompleting(true)
    try {
      await completeTask(id, { status, loesung, kundeGeklaert: true })
      setToast({ message: 'Task erfolgreich abgeschlossen.', type: 'success' })
      setTimeout(() => navigate('/tickets'), 1500)
    } catch (err) {
      setToast({ message: `Abschliessen fehlgeschlagen: ${err.message}`, type: 'error' })
      setCompleting(false)
    }
  }

  if (loading) return <p className="state-msg screen">Ticket wird geladen…</p>
  if (!task)   return <p className="state-msg screen">Ticket nicht gefunden.</p>

  return (
    <div className="screen">
      <Toast {...(toast ?? { message: null })} onClose={clearToast} />

      <button className="btn btn--ghost back-btn" onClick={() => navigate('/tickets')}>
        ← Zurück zur Liste
      </button>

      <div className="card">
        <div className="card__head">
          <h1 className="card__title">{task.name ?? '(kein Titel)'}</h1>
          <StatusBadge status={status} />
        </div>

        <p className="ticket-id">
          Task-ID: {task.userTaskKey}
          {task.processName && (
            <span className="ticket-process"> · {task.processName}</span>
          )}
        </p>

        {vars.name && (
          <div className="form__group">
            <label className="form__label">Erstellt von</label>
            <input className="form__input" value={String(vars.name)} readOnly />
          </div>
        )}

        {vars.problem && (
          <div className="form__group">
            <label className="form__label">Problem</label>
            <textarea
              className="form__textarea"
              value={String(vars.problem)}
              readOnly
              rows={4}
            />
          </div>
        )}

        <div className="form__group">
          <label htmlFor="status" className="form__label">Status</label>
          <select
            id="status"
            className="form__select"
            value={status}
            onChange={e => setStatus(e.target.value)}
            disabled={completing}
          >
            {STATUS_OPTIONS.map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>

        <div className="form__group">
          <label htmlFor="loesung" className="form__label">Lösung</label>
          <textarea
            id="loesung"
            className="form__textarea"
            placeholder="Lösungsbeschreibung…"
            rows={5}
            value={loesung}
            onChange={e => setLoesung(e.target.value)}
            disabled={completing}
          />
        </div>

        <div className="action-row">
          <button
            className="btn btn--primary"
            onClick={handleSave}
            disabled={completing}
          >
            Speichern
          </button>
          <button
            className="btn btn--danger"
            onClick={handleComplete}
            disabled={completing}
          >
            {completing ? 'Wird abgeschlossen…' : 'Schliessen'}
          </button>
        </div>
      </div>
    </div>
  )
}
