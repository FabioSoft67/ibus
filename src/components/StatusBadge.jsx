export default function StatusBadge({ status }) {
  const map = {
    OFFEN: 'badge--open',
    IN_BEARBEITUNG: 'badge--progress',
    GESCHLOSSEN: 'badge--closed',
  }
  const cls = map[status] ?? 'badge--open'
  const label = status ?? 'OFFEN'

  return <span className={`badge ${cls}`}>{label}</span>
}
