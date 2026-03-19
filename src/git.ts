import { x } from 'tinyexec'

async function runGitCommand(cmd: string): Promise<string> {
  try {
    const result = await x(cmd)
    return result.stdout
  } catch {
    return ''
  }
}

export async function getGitDiff(): Promise<{ staged: string; unstaged: string; untracked: string }> {
  const [staged, unstaged, untracked] = await Promise.all([
    runGitCommand('git diff --cached'),
    runGitCommand('git diff'),
    runGitCommand('git ls-files --others --exclude-standard'),
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
