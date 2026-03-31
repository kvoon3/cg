import { describe, it, expect, vi, beforeEach } from 'vitest'
import * as settingsModule from './settings.ts'
import * as fs from 'fs'

// Mock fs module
vi.mock('fs', () => ({
  existsSync: vi.fn(),
  readFileSync: vi.fn(),
  writeFileSync: vi.fn(),
}))

describe('loadSettingsFromFile', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return empty object when settings file does not exist', () => {
    vi.mocked(fs.existsSync).mockReturnValue(false)

    const result = settingsModule.loadSettingsFromFile()

    expect(result).toEqual({})
  })

  it('should return parsed settings when file exists', () => {
    vi.mocked(fs.existsSync).mockReturnValue(true)
    vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify({
      provider: 'openai',
      model: 'gpt-4',
      lang: 'English',
    }))

    const result = settingsModule.loadSettingsFromFile()

    expect(result).toEqual({
      provider: 'openai',
      model: 'gpt-4',
      lang: 'English',
    })
  })

  it('should return empty object when file is invalid JSON', () => {
    vi.mocked(fs.existsSync).mockReturnValue(true)
    vi.mocked(fs.readFileSync).mockReturnValue('invalid json')

    const result = settingsModule.loadSettingsFromFile()

    expect(result).toEqual({})
  })

  it('should return empty object when reading file fails', () => {
    vi.mocked(fs.existsSync).mockReturnValue(true)
    vi.mocked(fs.readFileSync).mockImplementation(() => {
      throw new Error('Read error')
    })

    const result = settingsModule.loadSettingsFromFile()

    expect(result).toEqual({})
  })
})

describe('COMMON_LANGS', () => {
  it('should contain common languages', () => {
    expect(settingsModule.COMMON_LANGS).toContain('English')
    expect(settingsModule.COMMON_LANGS).toContain('Chinese')
  })
})

describe('DEFAULT constants', () => {
  it('should have correct default values', () => {
    expect(settingsModule.DEFAULT_PROVIDER).toBe('minimax-cn')
    expect(settingsModule.DEFAULT_MODEL).toBe('MiniMax-M2.5-highspeed')
    expect(settingsModule.DEFAULT_LANG).toBe('English')
  })
})
