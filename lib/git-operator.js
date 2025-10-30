// lib/git-operator.js
const { execSync, spawnSync } = require('child_process');
const path = require('path');
const chalk = require('chalk');

class GitOperator {
  constructor(projectPath = process.cwd()) {
    this.projectPath = projectPath;
  }

  // 执行Git命令
  exec(command, args = [], options = {}) {
    const fullCommand = ['git', command, ...args].join(' ');
    
    const defaultOptions = {
      cwd: this.projectPath,
      stdio: options.silent ? 'pipe' : 'inherit',
      encoding: 'utf-8'
    };

    try {
      console.log(chalk.blue(`$ ${fullCommand}`));
      const result = execSync(fullCommand, { ...defaultOptions, ...options });
      return {
        success: true,
        output: result ? result.trim() : '',
        command: fullCommand
      };
    } catch (error) {
      if (!options.silent) {
        console.error(chalk.red(`命令执行失败: ${fullCommand}`));
      }
      return {
        success: false,
        error: error.message,
        command: fullCommand
      };
    }
  }

  // 检查是否是Git仓库
  isGitRepo() {
    try {
      this.exec('status', [], { silent: true });
      return true;
    } catch {
      return false;
    }
  }

  // 初始化Git仓库
  init() {
    if (!this.isGitRepo()) {
      console.log(chalk.blue('初始化Git仓库...'));
      return this.exec('init');
    }
    return { success: true };
  }

  // 设置远程仓库
  setupRemote(name, url) {
    const existing = this.getRemoteUrl(name);
    
    if (existing) {
      if (existing === url) {
        console.log(chalk.gray(`远程仓库 ${name} 已存在且配置正确`));
        return { success: true };
      } else {
        console.log(chalk.blue(`更新远程仓库 ${name}: ${url}`));
        return this.exec('remote', ['set-url', name, url]);
      }
    } else {
      console.log(chalk.blue(`添加远程仓库 ${name}: ${url}`));
      return this.exec('remote', ['add', name, url]);
    }
  }

  // 获取远程仓库URL
  getRemoteUrl(name) {
    try {
      const result = this.exec('remote', ['get-url', name], { silent: true });
      return result.success ? result.output : null;
    } catch {
      return null;
    }
  }

  // 获取当前分支
  getCurrentBranch() {
    const result = this.exec('branch', ['--show-current'], { silent: true });
    return result.success ? result.output : 'main';
  }

  // 获取所有远程仓库
  getRemotes() {
    const result = this.exec('remote', ['-v'], { silent: true });
    if (!result.success) return [];
    
    const remotes = {};
    result.output.split('\n').forEach(line => {
      const [name, urlAndType] = line.split('\t');
      if (name && urlAndType) {
        const url = urlAndType.split(' ')[0];
        if (!remotes[name]) {
          remotes[name] = url;
        }
      }
    });
    
    return remotes;
  }

  // 推送代码
  push(remote, branch, options = {}) {
    const args = ['push'];
    if (options.force) args.push('--force');
    if (options.setUpstream) args.push('--set-upstream');
    args.push(remote, branch);
    
    return this.exec('push', args);
  }

  // 拉取代码
  pull(remote, branch, options = {}) {
    const args = ['pull', remote, branch];
    if (options.rebase) args.push('--rebase');
    
    return this.exec('pull', args);
  }

  // 获取更新
  fetch(remote, branch) {
    const args = ['fetch', remote];
    if (branch) args.push(branch);
    
    return this.exec('fetch', args);
  }
}

module.exports = GitOperator;