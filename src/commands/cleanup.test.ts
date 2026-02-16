import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// Mock process.exit
const mockExit = vi.spyOn(process, 'exit').mockImplementation(() => {
  throw new Error('process.exit called')
})

// Mock console methods
vi.spyOn(console, 'log').mockImplementation(() => {})
vi.spyOn(console, 'error').mockImplementation(() => {})

// Mock ora spinner
vi.mock('ora', () => ({
  default: vi.fn(() => ({
    start: vi.fn().mockReturnThis(),
    stop: vi.fn().mockReturnThis(),
    fail: vi.fn().mockReturnThis(),
    info: vi.fn().mockReturnThis(),
    warn: vi.fn().mockReturnThis(),
    succeed: vi.fn().mockReturnThis(),
    text: ''
  }))
}))

// Mock readline for prompts
vi.mock('node:readline', () => ({
  createInterface: vi.fn(() => ({
    question: vi.fn((_, cb) => cb('y')),
    close: vi.fn()
  }))
}))

// Mock simple-git
const mockGit = {
  checkIsRepo: vi.fn(() => Promise.resolve(true)),
  fetch: vi.fn(() => Promise.resolve()),
  branch: vi.fn(() =>
    Promise.resolve({
      current: 'main',
      all: ['main', 'feature/merged-branch', 'feature/another']
    })
  ),
  deleteLocalBranch: vi.fn(() => Promise.resolve()),
  push: vi.fn(() => Promise.resolve())
}

vi.mock('simple-git', () => ({
  simpleGit: vi.fn(() => mockGit)
}))

// Import the command after mocks
import { cleanupCommand } from './cleanup.js'

describe('cleanupCommand', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGit.checkIsRepo.mockResolvedValue(true)
    mockGit.branch.mockResolvedValue({
      current: 'main',
      all: ['main', 'feature/merged-branch']
    })
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('merged branch detection', () => {
    it('should detect and list merged branches', async () => {
      mockGit.branch
        .mockResolvedValueOnce({ current: 'main', all: ['main'] }) // First call for current branch
        .mockResolvedValueOnce({ current: 'main', all: ['main', 'feature/merged'] }) // Second call for merged branches

      await cleanupCommand.parseAsync(['--force'], { from: 'user' })

      expect(mockGit.fetch).toHaveBeenCalledWith(['--prune'])
    })

    it('should show message when no merged branches found', async () => {
      mockGit.branch.mockResolvedValue({
        current: 'main',
        all: ['main']
      })

      await cleanupCommand.parseAsync([], { from: 'user' })

      // Should not try to delete anything
      expect(mockGit.deleteLocalBranch).not.toHaveBeenCalled()
    })
  })

  describe('branch deletion', () => {
    it('should delete merged branches with --force', async () => {
      mockGit.branch
        .mockResolvedValueOnce({ current: 'main', all: ['main', 'feature/to-delete'] })
        .mockResolvedValueOnce({ current: 'main', all: ['main', 'feature/to-delete'] })

      await cleanupCommand.parseAsync(['--force'], { from: 'user' })

      expect(mockGit.deleteLocalBranch).toHaveBeenCalled()
    })

    it('should not delete branches in dry-run mode', async () => {
      mockGit.branch
        .mockResolvedValueOnce({ current: 'main', all: ['main', 'feature/merged'] })
        .mockResolvedValueOnce({ current: 'main', all: ['main', 'feature/merged'] })

      await cleanupCommand.parseAsync(['--dry-run'], { from: 'user' })

      expect(mockGit.deleteLocalBranch).not.toHaveBeenCalled()
    })

    it('should handle --remote flag for remote branch deletion', async () => {
      mockGit.branch
        .mockResolvedValueOnce({ current: 'main', all: ['main', 'feature/merged'] })
        .mockResolvedValueOnce({ current: 'main', all: ['main', 'feature/merged'] })

      await cleanupCommand.parseAsync(['--force', '--remote'], { from: 'user' })

      // Command should process without error
      expect(mockGit.fetch).toHaveBeenCalled()
    })
  })

  describe('base branch selection', () => {
    it('should use specified base branch', async () => {
      mockGit.branch
        .mockResolvedValueOnce({ current: 'develop', all: ['develop', 'feature/merged'] })
        .mockResolvedValueOnce({ current: 'develop', all: ['develop', 'feature/merged'] })

      await cleanupCommand.parseAsync(['--base', 'develop', '--dry-run'], { from: 'user' })

      expect(mockGit.branch).toHaveBeenCalledWith(['--merged', 'develop'])
    })
  })

  describe('error handling', () => {
    it('should exit when not in a git repository', async () => {
      mockGit.checkIsRepo.mockResolvedValue(false)

      await expect(cleanupCommand.parseAsync([], { from: 'user' })).rejects.toThrow(
        'process.exit called'
      )

      expect(mockExit).toHaveBeenCalledWith(1)
    })
  })

  describe('protected branches', () => {
    it('should not delete main, master, or develop branches', async () => {
      mockGit.branch
        .mockResolvedValueOnce({ current: 'feature/test', all: ['main', 'master', 'develop'] })
        .mockResolvedValueOnce({
          current: 'feature/test',
          all: ['main', 'master', 'develop', 'feature/merged']
        })

      await cleanupCommand.parseAsync(['--force'], { from: 'user' })

      // Should only delete feature/merged, not protected branches
      const deleteCalls = mockGit.deleteLocalBranch.mock.calls as string[][]
      for (const call of deleteCalls) {
        expect(call[0]).not.toBe('main')
        expect(call[0]).not.toBe('master')
        expect(call[0]).not.toBe('develop')
      }
    })
  })
})
