import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { createTestRepo, TestGitRepo, aiMocks, credentialsMocks } from '../test/setup.js'

// Mock AI module
vi.mock('../lib/ai.js', () => ({
  generateCommitMessage: vi.fn(aiMocks.generateCommitMessage),
  findTemplate: vi.fn(aiMocks.findTemplate)
}))

// Mock credentials
vi.mock('../lib/credentials.js', () => ({
  resolveProvider: vi.fn(credentialsMocks.resolveProvider),
  getApiKey: vi.fn(credentialsMocks.getApiKey)
}))

import { generateCommitMessage } from '../lib/ai.js'

describe('commit command - git operations', () => {
  let repo: TestGitRepo

  beforeEach(async () => {
    repo = await createTestRepo('commit')
  })

  afterEach(() => {
    repo.cleanup()
    vi.clearAllMocks()
  })

  describe('staged changes detection', () => {
    it('should detect staged changes', async () => {
      repo.writeFile('new-file.ts', 'export const hello = "world";\n')
      await repo.git.add('new-file.ts')

      const status = await repo.git.status()
      expect(status.staged).toContain('new-file.ts')
    })

    it('should detect modified files', async () => {
      repo.writeFile('README.md', '# Test Project\n\nUpdated content.\n')

      const status = await repo.git.status()
      expect(status.modified).toContain('README.md')
    })

    it('should get diff of staged changes', async () => {
      repo.writeFile('feature.ts', 'export function feature() { return true; }\n')
      await repo.git.add('feature.ts')

      const diff = await repo.git.diff(['--cached'])
      expect(diff).toContain('feature.ts')
      expect(diff).toContain('export function feature')
    })
  })

  describe('commit message generation flow', () => {
    it('should call generateCommitMessage with diff', async () => {
      repo.writeFile('utils.ts', 'export const utils = {};\n')
      await repo.git.add('utils.ts')

      const diff = await repo.git.diff(['--cached'])
      expect(diff.length).toBeGreaterThan(0)

      const message = await generateCommitMessage(diff, { provider: 'gemini' })
      expect(message).toBe('feat(test): add new feature')
      expect(generateCommitMessage).toHaveBeenCalledWith(diff, { provider: 'gemini' })
    })
  })

  describe('auto-staging behavior', () => {
    it('should auto-stage when nothing is staged', async () => {
      repo.writeFile('unstaged.ts', 'const x = 1;\n')

      let status = await repo.git.status()
      expect(status.staged).toHaveLength(0)
      expect(status.not_added).toContain('unstaged.ts')

      await repo.git.add('-A')

      status = await repo.git.status()
      expect(status.staged).toContain('unstaged.ts')
    })
  })

  describe('commit execution', () => {
    it('should create a commit with generated message', async () => {
      repo.writeFile('committed.ts', 'export const committed = true;\n')
      await repo.git.add('committed.ts')

      const commitMessage = 'feat(test): add committed file'
      await repo.git.commit(commitMessage)

      const log = await repo.git.log({ maxCount: 1 })
      expect(log.latest?.message).toBe(commitMessage)
    })

    it('should include all staged files in commit', async () => {
      repo.writeFile('file1.ts', 'export const a = 1;\n')
      repo.writeFile('file2.ts', 'export const b = 2;\n')
      repo.writeFile('file3.ts', 'export const c = 3;\n')

      await repo.git.add(['file1.ts', 'file2.ts', 'file3.ts'])
      await repo.git.commit('feat: add multiple files')

      const status = await repo.git.status()
      expect(status.staged).toHaveLength(0)
      expect(status.isClean()).toBe(true)
    })

    it('should preserve commit history', async () => {
      // Make multiple commits
      repo.writeFile('v1.ts', 'v1\n')
      await repo.git.add('v1.ts')
      await repo.git.commit('feat: version 1')

      repo.writeFile('v2.ts', 'v2\n')
      await repo.git.add('v2.ts')
      await repo.git.commit('feat: version 2')

      const log = await repo.git.log({ maxCount: 3 })
      expect(log.all.length).toBe(3) // Including initial commit
      expect(log.all[0].message).toBe('feat: version 2')
      expect(log.all[1].message).toBe('feat: version 1')
    })
  })
})
