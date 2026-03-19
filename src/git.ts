import { x } from 'tinyexec'

export async function getGitDiff(): Promise<{ staged: string; unstaged: string; untracked: string }> {
  const run = (args: string[]) => Promise.resolve(x('git', args)).then(r => r.stdout).catch(() => '')

  const [staged, unstaged, untracked] = await Promise.all([
    run(['diff', '--cached']),
    run(['diff']),
    run(['ls-files', '--others', '--exclude-standard']),
  ])

  return { staged, unstaged, untracked }
}

export async function execGitCommit(message: string): Promise<void> {
  try {
    const escaped = message.replace(/"/g, '\\"')
    await x('git', ['commit', '-a', '-m', `"${escaped}"`], { nodeOptions: { stdio: 'inherit' } })
  } catch (e) {
    throw new Error(e instanceof Error ? e.message : 'Failed to commit')
  }
}
