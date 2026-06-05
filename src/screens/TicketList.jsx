import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { fetchTasks } from '../api/camunda.js'
import StatusBadge from '../components/StatusBadge.jsx'
import Toast from '../components/Toast.jsx'

export default function TicketList() {
  const navigate = useNavigate()
  const [tasks, setTasks] = useState([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState(null)

  const clearToast = useCallback(() => setToast(null), [])

  useEffect(() => {
    fetchTasks().then(({ tasks, isMock }) => {
      setTasks(tasks)
      if (isMock) {
        setToast({
          message: 'Camunda nicht erreichbar – Mock-Daten werden angezeigt.',
          type: 'warning',
        })
      }
      setLoading(false)
    })
  }, [])

  const filtered = tasks.filter((t) => {
    const q = search.toLowerCase()
    return (
      (t.name ?? '').toLowerCase().includes(q) ||
      t.id.toLowerCase().includes(q)
    )
  })

  function formatDate(iso) {
    if (!iso) return '–'
    return new Date(iso).toLocaleString('de-CH', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <div className="screen">
      <Toast {...(toast ?? { message: null })} onClose={clearToast} />
      <div className="list-header">
        <h1>Offene Tickets</h1>
        <input
          type="search"
          className="form__input search-input"
          placeholder="Suchen nach Titel oder ID…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {loading && <p className="state-msg">Tickets werden geladen…</p>}

      {!loading && filtered.length === 0 && (
        <p className="state-msg">Keine Tickets gefunden.</p>
      )}

      {!loading && filtered.length > 0 && (
        <div className="ticket-grid">
          {filtered.map((task) => (
            <button
              key={task.id}
              className="ticket-card"
              onClick={() => navigate(`/tickets/${task.id}`)}
            >
              <div className="ticket-card__top">
                <span className="ticket-card__title">{task.name ?? '(kein Titel)'}</span>
                <StatusBadge status="OFFEN" />
              </div>
              <div className="ticket-card__meta">
                <span className="ticket-card__id">ID: {task.id}</span>
                <span className="ticket-card__date">{formatDate(task.created)}</span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
