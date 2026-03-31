import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getGitDiff, execGitCommit } from './git.ts'

// Mock tinyexec
vi.mock('tinyexec', () => ({
  x: vi.fn(),
}))

import { x } from 'tinyexec'

const mockX = x as ReturnType<typeof vi.fn>

describe('getGitDiff', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return staged, unstaged, and untracked diffs', async () => {
    mockX.mockResolvedValue({ stdout: 'staged diff content', stderr: '', code: 0, signal: null })

    const result = await getGitDiff()

    expect(mockX).toHaveBeenCalledTimes(3)
    expect(mockX).toHaveBeenNthCalledWith(1, 'git', ['diff', '--cached'])
    expect(mockX).toHaveBeenNthCalledWith(2, 'git', ['diff'])
    expect(mockX).toHaveBeenNthCalledWith(3, 'git', ['ls-files', '--others', '--exclude-standard'])
    expect(result.staged).toBe('staged diff content')
  })

  it('should return empty strings when git commands fail', async () => {
    mockX.mockRejectedValue(new Error('git not found'))

    const result = await getGitDiff()

    expect(result.staged).toBe('')
    expect(result.unstaged).toBe('')
    expect(result.untracked).toBe('')
  })
})

describe('execGitCommit', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should call git commit with escaped message', async () => {
    mockX.mockResolvedValue({ stdout: '', stderr: '', code: 0, signal: null })

    await execGitCommit('feat: add new feature')

    expect(mockX).toHaveBeenCalledWith('git', ['commit', '-m', '"feat: add new feature"'], expect.any(Object))
  })

  it('should call git add -A when all option is true', async () => {
    mockX.mockResolvedValue({ stdout: '', stderr: '', code: 0, signal: null })

    await execGitCommit('fix: bug fix', { all: true })

    expect(mockX).toHaveBeenCalledWith('git', ['add', '-A'], expect.any(Object))
    expect(mockX).toHaveBeenCalledWith('git', ['commit', '-m', '"fix: bug fix"'], expect.any(Object))
  })

  it('should throw error when commit fails', async () => {
    mockX.mockRejectedValue(new Error('Commit failed'))

    await expect(execGitCommit('test: message')).rejects.toThrow('Commit failed')
  })
})
