import { execSync } from 'child_process'

export function getGitDiff(): { staged: string; unstaged: string } {
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

export function execGitCommit(message: string): void {
  try {
    execSync(`git commit -a -m "${message.replace(/"/g, '\\"')}"`, {
      stdio: 'inherit',
    })
  } catch (e) {
    throw new Error(e instanceof Error ? e.message : 'Failed to commit')
  }
}
