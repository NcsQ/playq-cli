import chalk from 'chalk';
import ora from 'ora';

export const spinner = ora({ color: 'cyan' });
export const log = {
  info:  (m) => console.log(chalk.cyan(m)),
  ok:    (m) => console.log(chalk.green(m)),
  warn:  (m) => console.log(chalk.yellow(m)),
  error: (m) => console.log(chalk.red(m)),
};