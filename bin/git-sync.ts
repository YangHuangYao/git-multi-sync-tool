#!/usr/bin/env node
import { program } from 'commander';
import chalk from 'chalk';
import SyncEngine from '../lib/sync-engine';
import configLoader from '../lib/config-loader';
import * as fs from 'fs';
import * as path from 'path';

// 兼容编译前后的路径
// 编译后 __dirname 是 dist/bin，需要向上一级到 dist，再向上一级到根目录
// 开发时 __dirname 是 bin，直接向上一级到根目录
function findPackageJson(): any {
  let currentDir = __dirname;
  // 如果在 dist 目录中，向上两级
  if (currentDir.includes('dist')) {
    currentDir = path.join(currentDir, '..', '..');
  } else {
    // 否则向上一级
    currentDir = path.join(currentDir, '..');
  }
  const packageJsonPath = path.join(currentDir, 'package.json');
  if (!fs.existsSync(packageJsonPath)) {
    // 如果还找不到，尝试当前工作目录
    return JSON.parse(
      fs.readFileSync(path.join(process.cwd(), 'package.json'), 'utf-8'),
    );
  }
  return JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
}

const packageJson = findPackageJson();

program
  .name('git-sync')
  .description('Git多仓库同步工具 - 基于文本配置文件')
  .version(packageJson.version);

// 初始化命令
program
  .command('init')
  .description('创建示例配置文件')
  .action(() => {
    try {
      const configPath = configLoader.createSampleConfig();
      console.log(chalk.green(`✅ 示例配置文件已创建: ${configPath}`));
      console.log(chalk.cyan('\n请编辑该文件，添加您的远程仓库URL'));
    } catch (error) {
      console.error(chalk.red('创建配置文件失败:'), (error as Error).message);
    }
  });

// 配置查看命令
program
  .command('config')
  .description('显示当前配置')
  .action(() => {
    try {
      const engine = new SyncEngine();
      engine.showConfig();
    } catch (error) {
      console.error(chalk.red('显示配置失败:'), (error as Error).message);
    }
  });

// 设置远程仓库命令
program
  .command('setup')
  .description('根据配置文件设置远程仓库')
  .action(() => {
    try {
      const engine = new SyncEngine();
      engine.setupRemotes();
    } catch (error) {
      console.error(chalk.red('设置远程仓库失败:'), (error as Error).message);
    }
  });

// 提交命令 - 修复版本
program
  .command('commit <message>')
  .description('提交代码到所有配置的远程仓库')
  .option('-p, --push', '提交后自动推送')
  .option('-a, --all', '提交所有更改')
  .option('-f, --force', '推送时强制覆盖')
  .option('-u, --set-upstream', '推送时设置上游分支')
  .option('--force-with-lease', '推送时使用更安全的force-with-lease')
  .option('--pull-before-push', '推送前先从各地址获取并快进合并(FETCH_HEAD)')
  .option(
    '--on-non-ff <strategy>',
    '非快进时的处理: skip|rebase|force-with-lease|force',
    'skip',
  )
  .action((message: string, options: any) => {
    try {
      const engine = new SyncEngine();
      engine.syncCommit(message, options);
    } catch (error) {
      console.error(chalk.red('提交失败:'), (error as Error).message);
    }
  });

// 推送命令
program
  .command('push')
  .description('推送到所有配置的远程仓库')
  .option('-f, --force', '强制推送')
  .option('-u, --set-upstream', '设置上游分支')
  .option('--force-with-lease', '使用更安全的force-with-lease')
  .option('--pull-before-push', '推送前先从各地址获取并快进合并(FETCH_HEAD)')
  .option(
    '--on-non-ff <strategy>',
    '非快进时的处理: skip|rebase|force-with-lease|force',
    'skip',
  )
  .action((options: any) => {
    try {
      const engine = new SyncEngine();
      engine.pushAll(options);
    } catch (error) {
      console.error(chalk.red('推送失败:'), (error as Error).message);
    }
  });

// 拉取命令
program
  .command('pull')
  .description('从所有配置的远程仓库拉取')
  .option('-r, --rebase', '使用rebase方式合并')
  .option('--merge-mirrors', '对镜像远程执行合并（默认仅fetch）')
  .action((options: any) => {
    try {
      const engine = new SyncEngine();
      engine.pullAll(options);
    } catch (error) {
      console.error(chalk.red('拉取失败:'), (error as Error).message);
    }
  });

// 获取命令
program
  .command('fetch')
  .description('从所有配置的远程仓库获取更新')
  .action(() => {
    try {
      const engine = new SyncEngine();
      engine.fetchAll();
    } catch (error) {
      console.error(chalk.red('获取失败:'), (error as Error).message);
    }
  });

// 状态命令
program
  .command('status')
  .description('查看同步状态')
  .action(() => {
    try {
      const engine = new SyncEngine();
      engine.showStatus();
    } catch (error) {
      console.error(chalk.red('状态检查失败:'), (error as Error).message);
    }
  });

// 同步所有分支和tag命令
program
  .command('sync-all <target-url>')
  .description('将当前远程仓库的所有分支及tag同步到指定的远程仓库')
  .option('-s, --source <remote>', '源远程仓库名称（默认: origin）', 'origin')
  .option('-f, --force', '强制推送')
  .option('--force-with-lease', '使用更安全的force-with-lease')
  .action((targetUrl: string, options: any) => {
    try {
      const engine = new SyncEngine();
      engine.syncAllToRemote(targetUrl, options.source, options);
    } catch (error) {
      console.error(chalk.red('同步失败:'), (error as Error).message);
    }
  });

// 如果没有子命令，显示帮助
if (process.argv.length <= 2) {
  program.help();
}

program.parse(process.argv);
