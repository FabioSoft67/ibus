const BASE = '/engine-rest'

// ── Mock data (used when Camunda is unreachable) ──────────────────────────────

const MOCK_TASKS = [
  {
    id: 'mock-1',
    name: 'Login geht nicht',
    assignee: null,
    created: '2026-06-01T08:00:00.000+0200',
    _mock: true,
  },
  {
    id: 'mock-2',
    name: 'Drucker reagiert nicht',
    assignee: 'support',
    created: '2026-06-02T10:30:00.000+0200',
    _mock: true,
  },
  {
    id: 'mock-3',
    name: 'VPN-Verbindung bricht ab',
    assignee: null,
    created: '2026-06-03T14:15:00.000+0200',
    _mock: true,
  },
]

const MOCK_VARS = {
  name: { value: 'Max Muster', type: 'String' },
  problem: { value: 'Beispielproblem (Camunda offline)', type: 'String' },
  status: { value: 'OFFEN', type: 'String' },
  loesung: { value: '', type: 'String' },
}

// ── Helpers ───────────────────────────────────────────────────────────────────

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  })
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText)
    throw new Error(`${res.status} ${text}`)
  }
  const text = await res.text()
  return text ? JSON.parse(text) : null
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Startet eine neue Prozessinstanz im Ticketsystem-Prozess.
 * @returns {{ id: string, definitionId: string, ... }}
 */
export async function startProcess(name, problem) {
  return request('/process-definition/key/ticketsystem/start', {
    method: 'POST',
    body: JSON.stringify({
      variables: {
        name: { value: name, type: 'String' },
        problem: { value: problem, type: 'String' },
        status: { value: 'OFFEN', type: 'String' },
        loesung: { value: '', type: 'String' },
      },
    }),
  })
}

/**
 * Lädt alle offenen Tasks.
 * Bei Verbindungsfehler: Mock-Daten + isMock-Flag.
 */
export async function fetchTasks() {
  try {
    const tasks = await request('/task')
    return { tasks, isMock: false }
  } catch {
    return { tasks: MOCK_TASKS, isMock: true }
  }
}

/**
 * Lädt einen einzelnen Task.
 */
export async function fetchTask(id) {
  if (id.startsWith('mock-')) {
    const task = MOCK_TASKS.find((t) => t.id === id)
    if (task) return { task, isMock: true }
  }
  const task = await request(`/task/${id}`)
  return { task, isMock: false }
}

/**
 * Lädt alle Variablen eines Tasks.
 */
export async function fetchTaskVariables(id) {
  if (id.startsWith('mock-')) return { variables: MOCK_VARS, isMock: true }
  try {
    const variables = await request(`/task/${id}/variables`)
    return { variables, isMock: false }
  } catch {
    return { variables: MOCK_VARS, isMock: true }
  }
}

/**
 * Setzt eine einzelne Variable an einem Task.
 */
export async function setTaskVariable(taskId, varName, value, type = 'String') {
  if (taskId.startsWith('mock-')) return
  await request(`/task/${taskId}/variables/${varName}`, {
    method: 'PUT',
    body: JSON.stringify({ value, type }),
  })
}

/**
 * Schliesst einen Task ab (= "Lösen").
 */
export async function completeTask(taskId, kundeGeklaert = true) {
  if (taskId.startsWith('mock-')) return
  await request(`/task/${taskId}/complete`, {
    method: 'POST',
    body: JSON.stringify({
      variables: {
        kundeGeklaert: { value: kundeGeklaert, type: 'Boolean' },
      },
    }),
  })
}
