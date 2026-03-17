import cac from 'cac'
import { generateCommit } from './index.ts'

const cli = cac('cg')

cli
  .option('-m, --message <msg>', 'Commit message')
  .option('-t, --type <type>', 'Commit type (feat, fix, docs, etc.)')
  .option('-s, --scope <scope>', 'Commit scope')
  .option('-b, --body <body>', 'Commit body')
  .option('--no-generate', 'Skip AI generation, use raw message')

cli.help()

const { options } = cli.parse()

export async function runCLI() {
  try {
    const result = generateCommit({
      message: options.message,
      type: options.type,
      scope: options.scope,
      body: options.body,
      generate: options.generate ?? true,
    })
    console.log(result)
  } catch (error) {
    console.error('Error:', error instanceof Error ? error.message : error)
    process.exit(1)
  }
}
