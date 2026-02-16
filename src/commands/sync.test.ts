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

// Mock simple-git
const mockGit = {
  checkIsRepo: vi.fn(() => Promise.resolve(true)),
  status: vi.fn(() =>
    Promise.resolve({
      isClean: (() => true) as () => boolean,
      current: 'main',
      tracking: 'origin/main' as string | null,
      ahead: 0,
      behind: 0,
      modified: [] as string[],
      not_added: [] as string[]
    })
  ),
  fetch: vi.fn(() => Promise.resolve()),
  rebase: vi.fn(() => Promise.resolve()),
  merge: vi.fn(() => Promise.resolve()),
  push: vi.fn(() => Promise.resolve()),
  stash: vi.fn(() => Promise.resolve())
}

vi.mock('simple-git', () => ({
  simpleGit: vi.fn(() => mockGit)
}))

// Import the command after mocks
import { syncCommand } from './sync.js'

describe('syncCommand', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGit.checkIsRepo.mockResolvedValue(true)
    mockGit.status.mockResolvedValue({
      isClean: (() => true) as () => boolean,
      current: 'main',
      tracking: 'origin/main' as string | null,
      ahead: 0,
      behind: 0,
      modified: [] as string[],
      not_added: [] as string[]
    })
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('basic sync', () => {
    it('should fetch and rebase by default', async () => {
      await syncCommand.parseAsync([], { from: 'user' })

      expect(mockGit.fetch).toHaveBeenCalledWith(['--all', '--prune'])
      expect(mockGit.rebase).toHaveBeenCalledWith(['origin/main'])
    })

    it('should use merge with --merge flag', async () => {
      await syncCommand.parseAsync(['--merge'], { from: 'user' })

      expect(mockGit.fetch).toHaveBeenCalled()
      expect(mockGit.merge).toHaveBeenCalledWith(['origin/main'])
    })
  })

  describe('uncommitted changes handling', () => {
    it('should exit when there are uncommitted changes without --stash or --force', async () => {
      mockGit.status.mockResolvedValue({
        isClean: (() => false) as () => boolean,
        current: 'main',
        tracking: 'origin/main' as string | null,
        ahead: 0,
        behind: 0,
        modified: ['file.ts'],
        not_added: [] as string[]
      })

      await expect(syncCommand.parseAsync([], { from: 'user' })).rejects.toThrow(
        'process.exit called'
      )

      expect(mockExit).toHaveBeenCalledWith(1)
    })

    it('should stash changes with --stash flag', async () => {
      mockGit.status
        .mockResolvedValueOnce({
          isClean: (() => false) as () => boolean,
          current: 'main',
          tracking: 'origin/main' as string | null,
          ahead: 0,
          behind: 0,
          modified: ['file.ts'],
          not_added: [] as string[]
        })
        .mockResolvedValue({
          isClean: (() => true) as () => boolean,
          current: 'main',
          tracking: 'origin/main' as string | null,
          ahead: 0,
          behind: 0,
          modified: [] as string[],
          not_added: [] as string[]
        })

      await syncCommand.parseAsync(['--stash'], { from: 'user' })

      expect(mockGit.stash).toHaveBeenCalledWith(['push', '-m', 'gut-sync: auto-stash before sync'])
    })

    it('should proceed with --force flag despite uncommitted changes', async () => {
      mockGit.status.mockResolvedValue({
        isClean: (() => false) as () => boolean,
        current: 'main',
        tracking: 'origin/main' as string | null,
        ahead: 0,
        behind: 0,
        modified: ['file.ts'],
        not_added: [] as string[]
      })

      await syncCommand.parseAsync(['--force'], { from: 'user' })

      expect(mockGit.fetch).toHaveBeenCalled()
    })
  })

  describe('push behavior', () => {
    it('should push when ahead of remote', async () => {
      mockGit.status
        .mockResolvedValueOnce({
          isClean: (() => true) as () => boolean,
          current: 'main',
          tracking: 'origin/main' as string | null,
          ahead: 0,
          behind: 0,
          modified: [] as string[],
          not_added: [] as string[]
        })
        .mockResolvedValue({
          isClean: (() => true) as () => boolean,
          current: 'main',
          tracking: 'origin/main' as string | null,
          ahead: 2,
          behind: 0,
          modified: [] as string[],
          not_added: [] as string[]
        })

      await syncCommand.parseAsync([], { from: 'user' })

      expect(mockGit.push).toHaveBeenCalled()
    })

    it('should not push with --no-push flag', async () => {
      mockGit.status
        .mockResolvedValueOnce({
          isClean: (() => true) as () => boolean,
          current: 'main',
          tracking: 'origin/main' as string | null,
          ahead: 0,
          behind: 0,
          modified: [] as string[],
          not_added: [] as string[]
        })
        .mockResolvedValue({
          isClean: (() => true) as () => boolean,
          current: 'main',
          tracking: 'origin/main' as string | null,
          ahead: 2,
          behind: 0,
          modified: [] as string[],
          not_added: [] as string[]
        })

      await syncCommand.parseAsync(['--no-push'], { from: 'user' })

      expect(mockGit.push).not.toHaveBeenCalled()
    })
  })

  describe('no upstream branch', () => {
    it('should warn when branch has no upstream', async () => {
      mockGit.status.mockResolvedValue({
        isClean: (() => true) as () => boolean,
        current: 'feature/new',
        tracking: null as string | null,
        ahead: 0,
        behind: 0,
        modified: [] as string[],
        not_added: [] as string[]
      })

      await syncCommand.parseAsync([], { from: 'user' })

      // Should not try to rebase or merge without tracking branch
      expect(mockGit.rebase).not.toHaveBeenCalled()
      expect(mockGit.merge).not.toHaveBeenCalled()
    })
  })

  describe('error handling', () => {
    it('should exit when not in a git repository', async () => {
      mockGit.checkIsRepo.mockResolvedValue(false)

      await expect(syncCommand.parseAsync([], { from: 'user' })).rejects.toThrow(
        'process.exit called'
      )

      expect(mockExit).toHaveBeenCalledWith(1)
    })
  })
})
