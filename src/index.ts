import { execSync } from 'child_process'
import { Agent } from '@mariozechner/pi-agent-core'
import { getModel, getProviders, getModels } from '@mariozechner/pi-ai'
import { confirm, text, isCancel, cancel, spinner, select } from '@clack/prompts'
import { homedir } from 'os'
import { join } from 'path'
import { readFileSync, writeFileSync, existsSync } from 'fs'
import type { Settings } from './types.ts'

// Get all available providers
const AVAILABLE_PROVIDERS = getProviders()

// Default provider and model
const DEFAULT_PROVIDER = 'minimax-cn'
const DEFAULT_MODEL = 'MiniMax-M2.5-highspeed'

// Settings file path
const SETTINGS_FILE = join(homedir(), '.cgrc.json')

// Load settings from file
function loadSettingsFromFile(): Settings {
  try {
    if (existsSync(SETTINGS_FILE)) {
      const content = readFileSync(SETTINGS_FILE, 'utf-8')
      return JSON.parse(content)
    }
  } catch {
    // Ignore errors, return defaults
  }
  return {}
}

// Setup function: loads, prompts, saves, and returns settings
export async function setupSettings(): Promise<Settings> {
  // 1. Load existing settings
  const current = loadSettingsFromFile()

  // 2. Prompt for provider
  let provider = current.provider
  if (!provider) {
    const selected = await select({
      message: 'Select AI provider:',
      options: AVAILABLE_PROVIDERS.map((p) => ({
        value: p,
        label: p,
      })),
      initialValue: DEFAULT_PROVIDER,
    })

    if (isCancel(selected)) {
      cancel('Setup cancelled.')
      process.exit(0)
    }
    provider = selected as string
  }

  // 3. Prompt for model
  const availableModels = getModels(provider as any).map((m) => m.id)
  let model = current.model && availableModels.includes(current.model) ? current.model : undefined

  if (!model) {
    const selected = await select({
      message: `Select model for ${provider}:`,
      options: availableModels.map((m) => ({
        value: m,
        label: m,
      })),
      initialValue: DEFAULT_MODEL,
    })

    if (isCancel(selected)) {
      cancel('Setup cancelled.')
      process.exit(0)
    }
    model = selected as string
  }

  // 4. Save to file
  const settings: Settings = { provider, model }
  writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2))
  process.stdout.write(`Settings saved to ${SETTINGS_FILE}\n`)
  process.stdout.write(`Provider: ${provider}\n`)
  process.stdout.write(`Model: ${model}\n`)

  // 5. Return settings
  return settings
}

// Load settings (for use in generateCommit)
export function loadSettings(): Settings {
  return loadSettingsFromFile()
}

// Try to load settings, if not exist run setup and save
export async function trySetupSettings(): Promise<Settings> {
  const settings = loadSettingsFromFile()
  if (!settings.provider || !settings.model) {
    return await setupSettings()
  }
  return settings
}

function execGitCommit(message: string): void {
  try {
    execSync(`git commit -a -m "${message.replace(/"/g, '\\"')}"`, {
      stdio: 'inherit',
    })
  } catch (e) {
    throw new Error(e instanceof Error ? e.message : 'Failed to commit')
  }
}

// Suppress console.log/warn/error from dependencies to prevent leaking internal messages
// const noop = () => {}
// console.log = noop
// console.warn = noop
// console.error = noop

export interface CommitOptions {
  message?: string
  type?: string
  scope?: string
  body?: string
  generate?: boolean
  execute?: boolean
  provider?: string
  model?: string
}

export function commit(message: string): void {
  execGitCommit(message)
}

function getGitDiff(): { staged: string; unstaged: string } {
  try {
    const staged = execSync('git diff --cached', {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'ignore'],
    })

    const unstaged = execSync('git diff', {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'ignore'],
    })

    return { staged, unstaged }
  } catch {
    return { staged: '', unstaged: '' }
  }
}

export async function generateCommit(options: CommitOptions = {}): Promise<string> {
  const {
    message,
    type,
    scope,
    body,
    generate = true,
    provider: providerOption,
    model: modelOption,
  } = options

  // Manual mode or no generation
  if (!generate) {
    const parts: string[] = []

    if (type) parts.push(type)
    if (scope) parts.push(`(${scope})`)
    if (parts.length > 0) parts.push(': ')
    if (message) parts.push(message)
    if (body) parts.push(`\n\n${body}`)

    return parts.join('') || 'No commit message provided'
  }

  // AI generation path
  const { staged, unstaged } = getGitDiff()

  if (!staged && !unstaged) {
    return 'No changes to commit'
  }

  const diffContent = `Staged changes:\n${staged}\n\nUnstaged changes:\n${unstaged}`

  // Resolve provider and model - use option, saved settings, or run setup
  let settings = loadSettings()
  if (!settings.provider || !settings.model) {
    // No saved settings, run setup to prompt and save
    settings = await setupSettings()
  }
  // Override with CLI options if provided
  if (providerOption) settings.provider = providerOption
  if (modelOption) settings.model = modelOption

  const selectedModel = getModel(settings.provider as any, settings.model as any)

  let userFeedback = message // Start with user's message as reference if provided

  // Loop until user accepts the commit message
  while (true) {
    const agent = new Agent({
      initialState: {
        model: selectedModel,
        systemPrompt: [
          'You are a helpful assistant that generates git commit messages.',
          'Analyze the provided git diff and generate a concise, conventional commit message.',
          'Follow the conventional commits format: <type>(<scope>): <description>',
          '',
          'Types: feat, fix, docs, style, refactor, perf, test, chore, ci, build, revert',
          '',
          'Important requirements:',
          '1. If the user provides a reference message, use it as inspiration but generate a better commit message',
          "2. Correct any grammar or spelling errors in the user's input",
          '3. Always output the commit message in English, regardless of the input language',
          '4. Provide only the commit message, no explanations.',
          '5. Only add a commit body when there are significant changes (e.g., multiple files changed, complex refactoring, or many logical changes). Keep it simple otherwise.',
          '6. When adding a body, use bullet points to list each change.',
          '7. Format: Use blank line between subject and body. Use hyphen (-) for bullet points in the body.',
        ].join('\n'),
      },
    })

    let commitMessage = ''

    const unsubscribe = agent.subscribe((event) => {
      if (event.type === 'message_update') {
        const msgEvent = (event as any).assistantMessageEvent
        if (msgEvent?.type === 'text_delta') {
          commitMessage += msgEvent.delta
        }
      }
    })

    // Build the prompt with user feedback if provided
    let promptContent = diffContent
    if (userFeedback) {
      promptContent = `${diffContent}\n\nUser's reference message: "${userFeedback}"`
    }

    const s = spinner()
    s.start('Analyzing changes and generating commit message...')

    try {
      await agent.prompt(promptContent)
      s.stop('Done!')
    } catch (e) {
      s.stop('Error!')
      return `Error: ${e instanceof Error ? e.message : 'Failed to generate commit message'}`
    }

    unsubscribe()

    if (!commitMessage.trim()) {
      if (agent.state.error) {
        return `Error: ${agent.state.error}`
      }
      return 'Error: Failed to generate commit message'
    }

    const finalMessage = commitMessage.trim()

    // confirm
    const shouldAccept = await confirm({
      message: `Generated commit message:\n\n${finalMessage}\n\nDo you accept this message?`,
      active: 'Accept',
      inactive: 'Modify',
      initialValue: true,
    })

    if (isCancel(shouldAccept)) {
      cancel('Commit message generation cancelled.')
      process.exit(0)
    }

    if (shouldAccept) {
      return finalMessage
    }

    // User wants to modify, ask for feedback
    const feedback = await text({
      message: 'Please provide your modification suggestions:',
      placeholder: 'e.g., make it shorter, focus on X, etc.',
    })

    if (isCancel(feedback)) {
      cancel('Commit message generation cancelled.')
      process.exit(0)
    }

    userFeedback = feedback as string
  }
}
