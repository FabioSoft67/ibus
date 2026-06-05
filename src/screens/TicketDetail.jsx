import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  fetchTask,
  fetchTaskVariables,
  setTaskVariable,
  completeTask,
} from '../api/camunda.js'
import StatusBadge from '../components/StatusBadge.jsx'
import Toast from '../components/Toast.jsx'

const STATUS_OPTIONS = ['OFFEN', 'IN_BEARBEITUNG', 'GESCHLOSSEN']

export default function TicketDetail() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [task, setTask] = useState(null)
  const [vars, setVars] = useState({})
  const [status, setStatus] = useState('OFFEN')
  const [loesung, setLoesung] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [completing, setCompleting] = useState(false)
  const [toast, setToast] = useState(null)
  const [isMock, setIsMock] = useState(false)

  const clearToast = useCallback(() => setToast(null), [])

  useEffect(() => {
    async function load() {
      try {
        const { task, isMock: mock1 } = await fetchTask(id)
        const { variables, isMock: mock2 } = await fetchTaskVariables(id)
        setTask(task)
        setVars(variables)
        setStatus(variables.status?.value ?? 'OFFEN')
        setLoesung(variables.loesung?.value ?? '')
        setIsMock(mock1 || mock2)
        if (mock1 || mock2) {
          setToast({
            message: 'Camunda nicht erreichbar – Mock-Daten werden angezeigt.',
            type: 'warning',
          })
        }
      } catch (err) {
        setToast({ message: `Laden fehlgeschlagen: ${err.message}`, type: 'error' })
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [id])

  async function handleSave() {
    setSaving(true)
    try {
      if (!isMock) {
        await setTaskVariable(id, 'status', status, 'String')
        await setTaskVariable(id, 'loesung', loesung, 'String')
      }
      setToast({ message: 'Änderungen gespeichert.', type: 'success' })
    } catch (err) {
      setToast({ message: `Speichern fehlgeschlagen: ${err.message}`, type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  async function handleComplete() {
    if (!window.confirm('Task wirklich abschliessen?')) return
    setCompleting(true)
    try {
      await completeTask(id)
      setToast({ message: 'Task erfolgreich abgeschlossen.', type: 'success' })
      setTimeout(() => navigate('/tickets'), 1500)
    } catch (err) {
      setToast({ message: `Abschliessen fehlgeschlagen: ${err.message}`, type: 'error' })
      setCompleting(false)
    }
  }

  if (loading) return <p className="state-msg screen">Ticket wird geladen…</p>
  if (!task) return <p className="state-msg screen">Ticket nicht gefunden.</p>

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

        <p className="ticket-id">Task-ID: {task.id}</p>

        {vars.name?.value && (
          <div className="form__group">
            <label className="form__label">Erstellt von</label>
            <input className="form__input" value={vars.name.value} readOnly />
          </div>
        )}

        {vars.problem?.value && (
          <div className="form__group">
            <label className="form__label">Problem</label>
            <textarea
              className="form__textarea"
              value={vars.problem.value}
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
            onChange={(e) => setStatus(e.target.value)}
            disabled={saving || completing}
          >
            {STATUS_OPTIONS.map((s) => (
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
            onChange={(e) => setLoesung(e.target.value)}
            disabled={saving || completing}
          />
        </div>

        <div className="action-row">
          <button
            className="btn btn--primary"
            onClick={handleSave}
            disabled={saving || completing}
          >
            {saving ? 'Wird gespeichert…' : 'Speichern'}
          </button>
          <button
            className="btn btn--danger"
            onClick={handleComplete}
            disabled={saving || completing}
          >
            {completing ? 'Wird abgeschlossen…' : 'Schliessen'}
          </button>
        </div>
      </div>
    </div>
  )
}
