export interface CommitOptions {
  message?: string
  type?: string
  scope?: string
  body?: string
  generate?: boolean
}

export function generateCommit(options: CommitOptions = {}) {
  const { message, type, scope, body, generate = true } = options

  // TODO: Implement AI generation
  if (generate && !message) {
    return `feat: Generated commit message`
  }

  const parts: string[] = []

  if (type) parts.push(type)
  if (scope) parts.push(`(${scope})`)
  if (parts.length > 0) parts.push(': ')
  if (message) parts.push(message)
  if (body) parts.push(`\n\n${body}`)

  return parts.join('') || 'No commit message provided'
}

export function fn() {
  return 'Hello, tsdown!'
}
