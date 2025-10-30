#!/usr/bin/env node
// bin/git-sync.js
const { program } = require('commander');
const inquirer = require('inquirer');
const chalk = require('chalk');
const fs = require('fs-extra');
const path = require('path');

const SyncEngine = require('../lib/sync-engine');
const configLoader = require('../lib/config-loader');

program
  .name('git-sync')
  .description('Git多仓库同步工具 - 基于文本配置文件')
  .version('1.0.0');

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
      console.error(chalk.red('创建配置文件失败:'), error.message);
    }
  });

// 显示配置
program
  .command('config')
  .description('显示当前配置')
  .action(() => {
    try {
      const engine = new SyncEngine();
      engine.showConfig();
    } catch (error) {
      console.error(chalk.red('显示配置失败:'), error.message);
    }
  });

// 设置远程仓库
program
  .command('setup')
  .description('根据配置文件设置远程仓库')
  .action(() => {
    try {
      const engine = new SyncEngine();
      engine.setupRemotes();
    } catch (error) {
      console.error(chalk.red('设置远程仓库失败:'), error.message);
    }
  });

// 推送到所有仓库
program
  .command('push')
  .description('推送到所有配置的远程仓库')
  .option('-f, --force', '强制推送')
  .option('-u, --set-upstream', '设置上游分支')
  .action((options) => {
    try {
      const engine = new SyncEngine();
      engine.pushAll(options);
    } catch (error) {
      console.error(chalk.red('推送失败:'), error.message);
    }
  });

// 从所有仓库拉取
program
  .command('pull')
  .description('从所有配置的远程仓库拉取')
  .option('-r, --rebase', '使用rebase方式合并')
  .action((options) => {
    try {
      const engine = new SyncEngine();
      engine.pullAll(options);
    } catch (error) {
      console.error(chalk.red('拉取失败:'), error.message);
    }
  });

// 从所有仓库获取
program
  .command('fetch')
  .description('从所有配置的远程仓库获取更新')
  .action(() => {
    try {
      const engine = new SyncEngine();
      engine.fetchAll();
    } catch (error) {
      console.error(chalk.red('获取失败:'), error.message);
    }
  });

// 状态检查
program
  .command('status')
  .description('检查同步状态')
  .action(() => {
    try {
      const engine = new SyncEngine();
      engine.showConfig();
      
      // 显示Git状态
      console.log(chalk.blue('\n📊 Git状态:'));
      const git = new (require('../lib/git-operator'))();
      git.exec('status', [], { silent: false });
    } catch (error) {
      console.error(chalk.red('状态检查失败:'), error.message);
    }
  });

program.parse(process.argv);