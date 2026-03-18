import cac from 'cac'
import { generateCommit, commit, setupSettings } from './index.ts'
import pkg from '../package.json' with { type: 'json' }

export async function runCLI() {
  const cli = cac('cg')

  cli.help().version(pkg.version)

  // Define settings command first (before [message] to avoid conflict)
  cli
    .command('settings', 'Configure default provider, model, and language')
    .option('-f, --force', 'Force reconfigure even if settings exist')
    .action(async () => {
      try {
        await setupSettings(true)
      } catch (error) {
        process.stderr.write('Error: ' + (error instanceof Error ? error.message : error) + '\n')
        process.exit(1)
      }
    })

  cli
    .command(
      '[message]',
      'Generate commit message based on git diff. Use as reference if provided.',
    )
    .option('-t, --type <type>', 'Commit type (feat, fix, docs, etc.)')
    .option('-s, --scope <scope>', 'Commit scope')
    .option('-b, --body <body>', 'Commit body')
    .option('-l, --lang <lang>', 'Commit message language')
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
          lang: options.lang,
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
