import cac from 'cac'
import { generateCommit, commit } from './index.ts'

export async function runCLI() {
  const cli = cac('cg')

  cli
    .command('[message]', 'Generate commit message based on git diff. Use as reference if provided.')
    .option('-t, --type <type>', 'Commit type (feat, fix, docs, etc.)')
    .option('-s, --scope <scope>', 'Commit scope')
    .option('-b, --body <body>', 'Commit body')
    .option('-p, --provider <provider>', 'AI provider (e.g., minimax-cn, anthropic, openai)')
    .option('-m, --model <model>', 'AI model (e.g., MiniMax-M2.5-highspeed, claude-3-5-sonnet)')
    .option('--no-generate', 'Skip AI generation, use raw message')
    .option('--dry-run', 'Show commit message without executing git commit')
    .action(async (message: string | undefined, options: Record<string, any>) => {
      try {
        const result = await generateCommit({
          message,
          type: options.type,
          scope: options.scope,
          body: options.body,
          generate: options.generate ?? true,
          provider: options.provider,
          model: options.model,
        })
        if (!result) return

        // Execute git commit by default, unless --dry-run is specified
        if (options.dryRun) {
          process.stdout.write(result + '\n')
        } else {
          commit(result)
          process.stdout.write(`Committed: ${result}\n`)
        }
      } catch (error) {
        process.stderr.write('Error: ' + (error instanceof Error ? error.message : error) + '\n')
        process.exit(1)
      }
    })

  cli.help()

  cli.parse()
}
