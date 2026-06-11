const BASE = '/v2'

// ── Value helpers ─────────────────────────────────────────────────────────────

// Camunda 8 returns variable values as JSON-serialised strings.
// Also unwraps legacy variables stored as {value: "..."} objects.
function parseVar(raw) {
  try {
    const parsed = JSON.parse(raw)
    if (
      parsed !== null &&
      typeof parsed === 'object' &&
      'value' in parsed &&
      Object.keys(parsed).length === 1
    ) {
      return parsed.value
    }
    return parsed
  } catch {
    return raw
  }
}

// ── Mock data (fallback when Camunda is unreachable) ──────────────────────────

const MOCK_TASKS = [
  { userTaskKey: 'mock-1', name: 'Login geht nicht',        processName: 'Support Ticket', assignee: null,      creationDate: '2026-06-01T08:00:00.000+0200', _mock: true },
  { userTaskKey: 'mock-2', name: 'Drucker reagiert nicht',  processName: 'Support Ticket', assignee: 'support', creationDate: '2026-06-02T10:30:00.000+0200', _mock: true },
  { userTaskKey: 'mock-3', name: 'VPN-Verbindung bricht ab',processName: 'Support Ticket', assignee: null,      creationDate: '2026-06-03T14:15:00.000+0200', _mock: true },
]

const MOCK_VARS = {
  name:    'Max Muster',
  problem: 'Beispielproblem (Camunda offline)',
  status:  'OFFEN',
  loesung: '',
}

// ── Client-side filter for recently completed tasks ───────────────────────────
// Elasticsearch takes 2–4 s to reflect completions; this bridges that gap.

const _completedKeys = new Set()

function markCompleted(key) {
  _completedKeys.add(String(key))
  setTimeout(() => _completedKeys.delete(String(key)), 15000)
}

// ── CSRF (kept for safety, currently disabled server-side) ───────────────────

function readCsrfCookie() {
  return (
    document.cookie
      .split(';')
      .map(c => c.trim())
      .find(c => c.startsWith('XSRF-TOKEN='))
      ?.split('=').slice(1).join('=') ?? null
  )
}

let _csrfInit = null
function ensureCsrf() {
  if (!_csrfInit) _csrfInit = fetch(`${BASE}/topology`).catch(() => {})
  return _csrfInit
}

// ── HTTP helper ───────────────────────────────────────────────────────────────

async function request(path, options = {}) {
  const method = (options.method ?? 'GET').toUpperCase()
  const isWrite = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)

  if (isWrite) await ensureCsrf()

  const csrf = isWrite ? readCsrfCookie() : null
  const res = await fetch(`${BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(csrf ? { 'X-XSRF-TOKEN': csrf } : {}),
      ...options.headers,
    },
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

export async function startProcess(name, problem) {
  return request('/process-instances', {
    method: 'POST',
    body: JSON.stringify({
      processDefinitionId: 'support-ticket',
      variables: { name, problem, status: 'OFFEN', loesung: '' },
    }),
  })
}

export async function fetchTasks() {
  try {
    const data = await request('/user-tasks/search', {
      method: 'POST',
      body: JSON.stringify({
        filter: { state: 'CREATED' },
        page: { from: 0, limit: 50 },
      }),
    })
    const tasks = (data.items ?? []).filter(
      t => !_completedKeys.has(String(t.userTaskKey))
    )
    return { tasks, isMock: false }
  } catch {
    return { tasks: MOCK_TASKS, isMock: true }
  }
}

export async function fetchTask(id) {
  if (String(id).startsWith('mock-')) {
    const task = MOCK_TASKS.find(t => t.userTaskKey === id)
    if (task) return { task, isMock: true }
  }
  const task = await request(`/user-tasks/${id}`)
  return { task, isMock: false }
}

export async function fetchTaskVariables(id) {
  if (String(id).startsWith('mock-')) return { variables: MOCK_VARS, isMock: true }
  try {
    const data = await request(`/user-tasks/${id}/variables/search`, {
      method: 'POST',
      body: JSON.stringify({}),
    })
    const variables = {}
    for (const v of data.items ?? []) {
      variables[v.name] = parseVar(v.value)
    }
    return { variables, isMock: false }
  } catch {
    return { variables: MOCK_VARS, isMock: true }
  }
}

export async function completeTask(taskId, variables = {}) {
  if (String(taskId).startsWith('mock-')) return
  await request(`/user-tasks/${taskId}/completion`, {
    method: 'POST',
    body: JSON.stringify({ variables }),
  })
  markCompleted(taskId)
}
