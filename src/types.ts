export interface Settings {
  provider?: string
  model?: string
  lang?: string
}

export interface CommitOptions {
  message?: string
  type?: string
  scope?: string
  body?: string
  generate?: boolean
  execute?: boolean
  provider?: string
  model?: string
  lang?: string
}
