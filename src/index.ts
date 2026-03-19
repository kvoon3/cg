import { Agent } from '@mariozechner/pi-agent-core'
import { getModel } from '@mariozechner/pi-ai'
import { confirm, text, isCancel, cancel, spinner } from '@clack/prompts'
import { loadSettings, setupSettings, DEFAULT_LANG } from './settings.ts'
import { getGitDiff, execGitCommit } from './git.ts'
import type { CommitOptions } from './types.ts'

// Re-export for CLI convenience
export { setupSettings } from './settings.ts'

export async function commit(message: string): Promise<void> {
  await execGitCommit(message)
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
    lang: langOption,
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
  const { staged, unstaged, untracked } = await getGitDiff()

  if (!staged && !unstaged && !untracked) {
    return 'No changes to commit'
  }

  const diffContent = `Staged changes:\n${staged}\n\nUnstaged changes:\n${unstaged}${untracked ? `\n\nUntracked files:\n${untracked}` : ''}`

  // Resolve provider and model: CLI option > saved settings > interactive setup
  let settings = loadSettings()
  if (!providerOption && !modelOption && (!settings.provider || !settings.model)) {
    settings = await setupSettings()
  }
  if (providerOption) settings.provider = providerOption
  if (modelOption) settings.model = modelOption
  if (langOption) settings.lang = langOption

  const selectedModel = getModel(settings.provider as any, settings.model as any)
  const lang = settings.lang || DEFAULT_LANG

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
          `3. Always output the commit message in ${lang}`,
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
