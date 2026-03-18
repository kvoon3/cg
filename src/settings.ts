import { homedir } from 'os'
import { join } from 'path'
import { readFileSync, writeFileSync, existsSync } from 'fs'
import { getProviders, getModels } from '@mariozechner/pi-ai'
import { select, text, isCancel, cancel } from '@clack/prompts'
import type { Settings } from './types.ts'

// Get all available providers
export const AVAILABLE_PROVIDERS = getProviders()

// Default provider and model
export const DEFAULT_PROVIDER = 'minimax-cn'
export const DEFAULT_MODEL = 'MiniMax-M2.5-highspeed'
export const DEFAULT_LANG = 'English'

// Common language list
export const COMMON_LANGS = [
  'English',
  'Chinese',
  'Japanese',
  'Korean',
  'Spanish',
  'French',
  'German',
  'Portuguese',
  'Russian',
  'Arabic',
  'Hindi',
  'Vietnamese',
  'Thai',
  'Indonesian',
]

// Settings file path
export const SETTINGS_FILE = join(homedir(), '.cgrc.json')

// Load settings from file
export function loadSettingsFromFile(): Settings {
  try {
    if (existsSync(SETTINGS_FILE)) {
      const content = readFileSync(SETTINGS_FILE, 'utf-8')
      return JSON.parse(content)
    }
  } catch {
    // Ignore errors, return defaults
  }
  return {}
}

// Setup function: prompts for each setting that is missing (or all if force=true), then saves.
export async function setupSettings(force: boolean = false): Promise<Settings> {
  const current = loadSettingsFromFile()

  // Provider
  let provider = current.provider
  if (!provider || force) {
    const selected = await select({
      message: 'Select AI provider:',
      options: AVAILABLE_PROVIDERS.map((p) => ({ value: p, label: p })),
      initialValue: provider || DEFAULT_PROVIDER,
    })
    if (isCancel(selected)) {
      cancel('Setup cancelled.')
      process.exit(0)
    }
    provider = selected as string
  }

  // Model
  const availableModels = getModels(provider as any).map((m) => m.id)
  let model = force
    ? undefined
    : availableModels.includes(current.model ?? '')
      ? current.model
      : undefined
  if (!model) {
    const selected = await select({
      message: `Select model for ${provider}:`,
      options: availableModels.map((m) => ({ value: m, label: m })),
      initialValue: DEFAULT_MODEL,
    })
    if (isCancel(selected)) {
      cancel('Setup cancelled.')
      process.exit(0)
    }
    model = selected as string
  }

  // Language
  let lang = force ? undefined : current.lang
  if (!lang) {
    const selected = await select({
      message: 'Select commit message language:',
      options: [
        ...COMMON_LANGS.map((l) => ({ value: l, label: l })),
        { value: '__custom__', label: 'Custom...' },
      ],
      initialValue: current.lang || DEFAULT_LANG,
    })
    if (isCancel(selected)) {
      cancel('Setup cancelled.')
      process.exit(0)
    }

    if (selected === '__custom__') {
      const customLang = await text({
        message: 'Enter custom language:',
        placeholder: 'e.g., Italian, Dutch, etc.',
      })
      if (isCancel(customLang)) {
        cancel('Setup cancelled.')
        process.exit(0)
      }
      lang = customLang as string
    } else {
      lang = selected as string
    }
  }

  const settings: Settings = { provider, model, lang }
  writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2))
  process.stdout.write(`Settings saved to ${SETTINGS_FILE}\n`)
  process.stdout.write(`Provider: ${provider}\n`)
  process.stdout.write(`Model: ${model}\n`)
  process.stdout.write(`Language: ${lang}\n`)

  return settings
}

export function loadSettings(): Settings {
  return loadSettingsFromFile()
}
