import { Command } from 'commander'
import chalk from 'chalk'
import ora from 'ora'
import { simpleGit } from 'simple-git'
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { generateText } from 'ai'
import { createGoogleGenerativeAI } from '@ai-sdk/google'
import { createOpenAI } from '@ai-sdk/openai'
import { createAnthropic } from '@ai-sdk/anthropic'
import { getApiKey, Provider } from '../lib/credentials.js'
import { getLanguage } from '../lib/config.js'

// Get gut's root directory
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const GUT_ROOT = join(__dirname, '..')

const TEMPLATE_FILES = [
  'branch.md',
  'changelog.md',
  'checkout.md',
  'commit.md',
  'explain.md',
  'explain-file.md',
  'find.md',
  'merge.md',
  'pr.md',
  'review.md',
  'stash.md',
  'summary.md'
]

async function translateTemplate(
  content: string,
  targetLang: string,
  provider: Provider
): Promise<string> {
  const apiKey = await getApiKey(provider)
  if (!apiKey) {
    throw new Error(`No API key found for ${provider}`)
  }

  const modelName = provider === 'gemini' ? 'gemini-2.0-flash' :
                    provider === 'openai' ? 'gpt-4o-mini' : 'claude-sonnet-4-20250514'

  let model
  switch (provider) {
    case 'gemini': {
      const google = createGoogleGenerativeAI({ apiKey })
      model = google(modelName)
      break
    }
    case 'openai': {
      const openai = createOpenAI({ apiKey })
      model = openai(modelName)
      break
    }
    case 'anthropic': {
      const anthropic = createAnthropic({ apiKey })
      model = anthropic(modelName)
      break
    }
  }

  const langNames: Record<string, string> = {
    ja: 'Japanese',
    en: 'English',
    zh: 'Chinese',
    ko: 'Korean',
    es: 'Spanish',
    fr: 'French',
    de: 'German'
  }

  const targetLangName = langNames[targetLang] || targetLang

  const { text } = await generateText({
    model,
    prompt: `Translate the following prompt template to ${targetLangName}.
Keep all {{variable}} placeholders exactly as they are - do not translate them.
Keep the markdown formatting intact.
Only translate the instructional text.

Template to translate:
${content}

Translated template:`
  })

  return text.trim()
}

export const initCommand = new Command('init')
  .description('Initialize .gut/ templates in your project')
  .option('-p, --provider <provider>', 'AI provider for translation (gemini, openai, anthropic)', 'gemini')
  .option('-f, --force', 'Overwrite existing templates')
  .option('--no-translate', 'Skip translation even if language is not English')
  .action(async (options) => {
    const git = simpleGit()

    const isRepo = await git.checkIsRepo()
    if (!isRepo) {
      console.error(chalk.red('Error: Not a git repository'))
      process.exit(1)
    }

    const repoRoot = await git.revparse(['--show-toplevel']).catch(() => process.cwd())
    const targetDir = join(repoRoot.trim(), '.gut')
    const sourceDir = join(GUT_ROOT, '.gut')

    // Create .gut directory if it doesn't exist
    if (!existsSync(targetDir)) {
      mkdirSync(targetDir, { recursive: true })
      console.log(chalk.green(`Created ${targetDir}`))
    }

    const lang = getLanguage()
    const needsTranslation = options.translate !== false && lang !== 'en'
    const provider = options.provider.toLowerCase() as Provider

    if (needsTranslation) {
      console.log(chalk.gray(`Language: ${lang} - templates will be translated\n`))
    }

    const spinner = ora()
    let copied = 0
    let skipped = 0

    for (const filename of TEMPLATE_FILES) {
      const sourcePath = join(sourceDir, filename)
      const targetPath = join(targetDir, filename)

      if (!existsSync(sourcePath)) {
        continue
      }

      if (existsSync(targetPath) && !options.force) {
        console.log(chalk.gray(`  Skipped: ${filename} (already exists)`))
        skipped++
        continue
      }

      let content = readFileSync(sourcePath, 'utf-8')

      if (needsTranslation) {
        spinner.start(`Translating ${filename}...`)
        try {
          content = await translateTemplate(content, lang, provider)
          spinner.succeed(`Translated: ${filename}`)
        } catch (error) {
          spinner.fail(`Failed to translate ${filename}`)
          console.error(chalk.red(`  ${error instanceof Error ? error.message : 'Unknown error'}`))
          // Fall back to original content
          console.log(chalk.gray(`  Using original English template`))
        }
      } else {
        console.log(chalk.green(`  Copied: ${filename}`))
      }

      writeFileSync(targetPath, content)
      copied++
    }

    console.log()
    if (copied > 0) {
      console.log(chalk.green(`✓ ${copied} template(s) initialized in .gut/`))
    }
    if (skipped > 0) {
      console.log(chalk.gray(`  ${skipped} template(s) skipped (use --force to overwrite)`))
    }

    console.log(chalk.gray('\nYou can now customize these templates for your project.'))
  })
