const { spawnSync } = require('child_process');
const path = require('path');
const chalk = require('chalk');

class GitOperator {
  constructor(projectPath = process.cwd()) {
    this.projectPath = projectPath;
  }

  // 执行Git命令 - 使用 spawnSync 避免注入问题
  exec(command, args = [], options = {}) {
    const argv = [command, ...args];

    const spawnOptions = {
      cwd: this.projectPath,
      stdio: options.silent ? 'pipe' : 'inherit',
      encoding: 'utf-8',
    };

    if (!options.silent) {
      console.log(chalk.blue(`$ git ${argv.join(' ')}`));
    }

    const child = spawnSync('git', argv, spawnOptions);

    const success = child.status === 0;
    const output = (child.stdout || '').toString().trim();
    const errorOutput = (child.stderr || '').toString().trim();

    return success
      ? { success: true, output, command: `git ${argv.join(' ')}` }
      : {
          success: false,
          error: errorOutput || 'Unknown error',
          command: `git ${argv.join(' ')}`,
        };
  }

  // 检查是否是Git仓库
  isGitRepo() {
    const result = this.exec('rev-parse', ['--is-inside-work-tree'], {
      silent: true,
    });
    if (!result.success) return false;
    const normalized = (result.output || '').trim().toLowerCase();
    return normalized === 'true';
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

  // 设置远程的fetch URL（不影响push urls）
  setFetchUrl(name, url) {
    return this.exec('remote', ['set-url', name, url]);
  }

  // 为远程追加一个push URL
  addPushUrl(name, url) {
    return this.exec('remote', ['set-url', '--add', '--push', name, url]);
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
    if (!result.success) return null;
    const branch = (result.output || '').trim();
    return branch || null;
  }

  // 获取所有远程仓库
  getRemotes() {
    const result = this.exec('remote', ['-v'], { silent: true });
    if (!result.success) return [];

    const remotes = {};
    result.output.split('\n').forEach((line) => {
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
    const args = [];
    if (options.forceWithLease) args.push('--force-with-lease');
    else if (options.force) args.push('--force');
    if (options.setUpstream) args.push('--set-upstream');

    args.push(remote);
    args.push(branch);

    return this.exec('push', args);
  }

  // 直接推送到 URL（独立推送不依赖远程名）
  pushToUrl(url, branch, options = {}) {
    const args = [];
    if (options.forceWithLease) args.push('--force-with-lease');
    else if (options.force) args.push('--force');
    if (options.setUpstream) args.push('--set-upstream');

    args.push(url);
    args.push(branch);

    return this.exec('push', args);
  }

  // 拉取代码
  pull(remote, branch, options = {}) {
    const args = [remote, branch];
    if (options.rebase) args.push('--rebase');

    return this.exec('pull', args);
  }

  // 获取更新
  fetch(remote, branch) {
    const args = [remote];
    if (branch) args.push(branch);

    return this.exec('fetch', args);
  }

  // 直接从 URL 获取（FETCH_HEAD）
  fetchFromUrl(url, branch) {
    const args = [url];
    if (branch) args.push(branch);
    return this.exec('fetch', args);
  }

  // 添加文件 - 修复版本
  add(options = {}) {
    const args = [];

    if (options.all) {
      args.push('--all');
    } else {
      // 默认添加当前目录所有文件
      args.push('.');
    }

    return this.exec('add', args);
  }

  // 提交代码 - 修复版本
  commit(message, options = {}) {
    const args = ['-m', message];

    if (options.amend) {
      args.push('--amend');
    }
    if (options.all) {
      args.push('--all');
    }

    return this.exec('commit', args);
  }

  // 切换分支
  checkout(branch, options = {}) {
    const args = [];
    if (options.newBranch) args.push('-b');
    args.push(branch);

    return this.exec('checkout', args);
  }

  // 合并分支
  merge(branch, options = {}) {
    const args = [branch];
    if (options.ffOnly) args.push('--ff-only');

    return this.exec('merge', args);
  }

  // 合并 FETCH_HEAD（配合 fetchFromUrl 使用）
  mergeFetchHead(options = {}) {
    const args = ['FETCH_HEAD'];
    if (options.ffOnly) args.push('--ff-only');
    return this.exec('merge', args);
  }

  // 变基到指定提交/引用
  rebase(onto) {
    return this.exec('rebase', [onto]);
  }

  // 终止变基
  rebaseAbort() {
    return this.exec('rebase', ['--abort']);
  }

  // 显示状态
  status() {
    return this.exec('status');
  }

  // 是否存在需要提交的更改（工作区或暂存区）
  hasChanges() {
    const result = this.exec('status', ['--porcelain'], { silent: true });
    if (!result.success) return false;
    return (result.output || '').trim().length > 0;
  }

  // 显示日志
  log(options = {}) {
    const args = ['--oneline', '--graph'];
    if (options.number) args.push(`-${options.number}`);

    return this.exec('log', args);
  }
}

module.exports = GitOperator;
