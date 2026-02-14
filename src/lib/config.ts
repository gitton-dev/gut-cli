import { homedir } from 'os'
import { join } from 'path'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs'
import { execSync } from 'child_process'

export type Language = 'en' | 'ja'

export interface GutConfig {
  lang: Language
}

const DEFAULT_CONFIG: GutConfig = {
  lang: 'en'
}

function getGlobalConfigPath(): string {
  const configDir = join(homedir(), '.config', 'gut')
  return join(configDir, 'config.json')
}

function getRepoRoot(): string | null {
  try {
    return execSync('git rev-parse --show-toplevel', { encoding: 'utf-8' }).trim()
  } catch {
    return null
  }
}

function getLocalConfigPath(): string | null {
  const repoRoot = getRepoRoot()
  if (!repoRoot) return null
  return join(repoRoot, '.gut', 'config.json')
}

function ensureGlobalConfigDir(): void {
  const configDir = join(homedir(), '.config', 'gut')
  if (!existsSync(configDir)) {
    mkdirSync(configDir, { recursive: true })
  }
}

function ensureLocalConfigDir(): void {
  const repoRoot = getRepoRoot()
  if (!repoRoot) return
  const gutDir = join(repoRoot, '.gut')
  if (!existsSync(gutDir)) {
    mkdirSync(gutDir, { recursive: true })
  }
}

function readConfigFile(path: string): Partial<GutConfig> {
  if (!existsSync(path)) return {}
  try {
    return JSON.parse(readFileSync(path, 'utf-8'))
  } catch {
    return {}
  }
}

export function getGlobalConfig(): GutConfig {
  const globalPath = getGlobalConfigPath()
  return { ...DEFAULT_CONFIG, ...readConfigFile(globalPath) }
}

export function getLocalConfig(): Partial<GutConfig> {
  const localPath = getLocalConfigPath()
  if (!localPath) return {}
  return readConfigFile(localPath)
}

export function getConfig(): GutConfig {
  // Local config overrides global config
  const globalConfig = getGlobalConfig()
  const localConfig = getLocalConfig()
  return { ...globalConfig, ...localConfig }
}

export function setGlobalConfig<K extends keyof GutConfig>(key: K, value: GutConfig[K]): void {
  ensureGlobalConfigDir()
  const config = getGlobalConfig()
  config[key] = value
  writeFileSync(getGlobalConfigPath(), JSON.stringify(config, null, 2))
}

export function setLocalConfig<K extends keyof GutConfig>(key: K, value: GutConfig[K]): void {
  const localPath = getLocalConfigPath()
  if (!localPath) {
    throw new Error('Not in a git repository')
  }
  ensureLocalConfigDir()
  const config = getLocalConfig()
  config[key] = value
  writeFileSync(localPath, JSON.stringify(config, null, 2))
}

export function getLanguage(): Language {
  return getConfig().lang
}

export function setLanguage(lang: Language, local: boolean = false): void {
  if (local) {
    setLocalConfig('lang', lang)
  } else {
    setGlobalConfig('lang', lang)
  }
}

export function getLanguageInstruction(lang: Language): string {
  switch (lang) {
    case 'ja':
      return '\n\nIMPORTANT: Respond in Japanese (日本語で回答してください).'
    case 'en':
    default:
      return ''
  }
}

export const VALID_LANGUAGES: Language[] = ['en', 'ja']

export function isValidLanguage(lang: string): lang is Language {
  return VALID_LANGUAGES.includes(lang as Language)
}
