import { Command } from 'commander'
import chalk from 'chalk'
import ora from 'ora'
import { simpleGit } from 'simple-git'

export const conflictCommand = new Command('conflict')
  .description('Preview potential merge conflicts before merging')
  .argument('[branch]', 'Branch to check conflicts against (default: main or master)')
  .option('--target <branch>', 'Target branch to merge into (default: current branch)')
  .action(async (branch, options) => {
    const git = simpleGit()

    // Check if we're in a git repository
    const isRepo = await git.checkIsRepo()
    if (!isRepo) {
      console.error(chalk.red('Error: Not a git repository'))
      process.exit(1)
    }

    const spinner = ora('Analyzing potential conflicts...').start()

    try {
      // Get current branch info
      const branchInfo = await git.branch()
      const currentBranch = branchInfo.current
      const targetBranch = options.target || (await detectBaseBranch(git))
      const sourceBranch = branch || currentBranch

      if (sourceBranch === targetBranch) {
        spinner.fail('Source and target branches are the same')
        process.exit(1)
      }

      spinner.text = `Checking conflicts: ${chalk.cyan(sourceBranch)} → ${chalk.cyan(targetBranch)}`

      // Fetch latest
      await git.fetch(['--all'])

      // Get merge base
      const mergeBase = await git.raw(['merge-base', targetBranch, sourceBranch])
      const mergeBaseCommit = mergeBase.trim()

      // Try a dry-run merge to detect conflicts
      const status = await git.status()
      if (status.modified.length > 0 || status.staged.length > 0) {
        spinner.warn('Working directory has uncommitted changes')
        console.log(chalk.yellow('Please commit or stash changes before checking conflicts'))
        process.exit(1)
      }

      // Get list of files changed in both branches since merge base
      const [sourceChanges, targetChanges] = await Promise.all([
        git.diff(['--name-only', mergeBaseCommit, sourceBranch]),
        git.diff(['--name-only', mergeBaseCommit, targetBranch])
      ])

      const sourceFiles = new Set(sourceChanges.split('\n').filter(Boolean))
      const targetFiles = new Set(targetChanges.split('\n').filter(Boolean))

      // Find files changed in both branches
      const potentialConflicts: string[] = []
      for (const file of sourceFiles) {
        if (targetFiles.has(file)) {
          potentialConflicts.push(file)
        }
      }

      spinner.stop()

      // Display results
      console.log(
        chalk.bold(`\nConflict analysis: ${chalk.cyan(sourceBranch)} → ${chalk.cyan(targetBranch)}\n`)
      )

      if (potentialConflicts.length === 0) {
        console.log(chalk.green('✓ No potential conflicts detected!'))
        console.log(chalk.gray('  The branches modify different files\n'))
      } else {
        console.log(
          chalk.yellow(`⚠ ${potentialConflicts.length} file(s) modified in both branches:\n`)
        )

        for (const file of potentialConflicts) {
          // Get more details about the changes
          const sourceStats = await git.diff(['--stat', `${mergeBaseCommit}..${sourceBranch}`, '--', file])
          const targetStats = await git.diff(['--stat', `${mergeBaseCommit}..${targetBranch}`, '--', file])

          console.log(`  ${chalk.red('•')} ${chalk.bold(file)}`)

          // Parse and display stats
          const sourceMatch = sourceStats.match(/(\d+) insertion.*?(\d+) deletion/s)
          const targetMatch = targetStats.match(/(\d+) insertion.*?(\d+) deletion/s)

          if (sourceMatch) {
            console.log(chalk.gray(`      ${sourceBranch}: +${sourceMatch[1]} -${sourceMatch[2]}`))
          }
          if (targetMatch) {
            console.log(chalk.gray(`      ${targetBranch}: +${targetMatch[1]} -${targetMatch[2]}`))
          }
        }

        console.log(chalk.yellow('\nThese files may have conflicts when merged.'))
        console.log(chalk.gray('Run `gut conflict-diff <file>` to see detailed differences.\n'))
      }

      // Show summary stats
      console.log(chalk.bold('Summary:'))
      console.log(`  Files changed in ${chalk.cyan(sourceBranch)}: ${sourceFiles.size}`)
      console.log(`  Files changed in ${chalk.cyan(targetBranch)}: ${targetFiles.size}`)
      console.log(`  Potential conflicts: ${potentialConflicts.length}`)
    } catch (error) {
      spinner.fail('Failed to analyze conflicts')
      console.error(chalk.red(error instanceof Error ? error.message : 'Unknown error'))
      process.exit(1)
    }
  })

async function detectBaseBranch(git: ReturnType<typeof simpleGit>): Promise<string> {
  const branches = await git.branch()
  if (branches.all.includes('main')) return 'main'
  if (branches.all.includes('master')) return 'master'
  return 'main'
}
