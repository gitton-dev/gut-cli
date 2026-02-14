import { Command } from 'commander'
import { cleanupCommand } from './commands/cleanup.js'
import { conflictCommand } from './commands/conflict.js'

const program = new Command()

program
  .name('gut')
  .description('Git Utility Tool - A collection of handy git commands')
  .version('0.1.0')

program.addCommand(cleanupCommand)
program.addCommand(conflictCommand)

program.parse()
