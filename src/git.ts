import { execSync } from 'child_process'

function runGitCommand(cmd: string): string {
  try {
    return execSync(cmd, { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'ignore'] })
  } catch {
    return ''
  }
}

export function getGitDiff(): { staged: string; unstaged: string; untracked: string } {
  const staged = runGitCommand('git diff --cached')
  const unstaged = runGitCommand('git diff')
  const untracked = runGitCommand('git ls-files --others --exclude-standard')

  return { staged, unstaged, untracked }
}

export function execGitCommit(message: string): void {
  try {
    execSync(`git commit -a -m "${message.replace(/"/g, '\\"')}"`, {
      stdio: 'inherit',
    })
  } catch (e) {
    throw new Error(e instanceof Error ? e.message : 'Failed to commit')
  }
}
