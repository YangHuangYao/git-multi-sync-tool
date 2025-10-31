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

  // 获取所有远程分支
  getAllRemoteBranches(remote = 'origin') {
    const result = this.exec('branch', ['-r'], { silent: true });
    if (!result.success) return [];

    const branches = [];
    const prefix = `${remote}/`;
    result.output.split('\n').forEach((line) => {
      const branch = line.trim();
      if (branch && branch.startsWith(prefix) && !branch.includes('HEAD')) {
        // 移除 remote/ 前缀，只保留分支名
        const branchName = branch.replace(prefix, '');
        if (branchName) {
          branches.push(branchName);
        }
      }
    });

    return branches;
  }

  // 获取所有本地分支
  getAllLocalBranches() {
    const result = this.exec('branch', [], { silent: true });
    if (!result.success) return [];

    const branches = [];
    result.output.split('\n').forEach((line) => {
      const branch = line.trim().replace(/^\*\s*/, '');
      if (branch) {
        branches.push(branch);
      }
    });

    return branches;
  }

  // 获取所有tag
  getAllTags() {
    const result = this.exec('tag', ['-l'], { silent: true });
    if (!result.success) return [];

    const tags = [];
    result.output.split('\n').forEach((line) => {
      const tag = line.trim();
      if (tag) {
        tags.push(tag);
      }
    });

    return tags;
  }

  // 推送所有分支到指定URL
  pushAllBranches(url, remote = 'origin', options = {}) {
    const args = [];

    // 推送所有分支: 使用引用规范推送远程分支引用
    if (options.mirror) {
      // 镜像模式：推送所有引用（包括分支和tag）
      if (options.forceWithLease) args.push('--force-with-lease');
      else if (options.force) args.push('--force');
      args.push('--mirror');
      args.push(url);
      return this.exec('push', args);
    } else {
      // 使用引用规范推送远程跟踪分支到目标仓库
      // refs/remotes/<remote>/* 是远程跟踪分支，映射到目标仓库的 refs/heads/*
      // 对于 refspec，force-with-lease 需要通过命令行选项，force 可以使用 + 前缀或命令行选项
      if (options.forceWithLease) {
        args.push('--force-with-lease');
      }

      // 构建 refspec：如果使用 force（不是 force-with-lease），使用 + 前缀
      const prefix = options.force && !options.forceWithLease ? '+' : '';
      const refspec = `${prefix}refs/remotes/${remote}/*:refs/heads/*`;
      args.push(url);
      args.push(refspec);
      return this.exec('push', args);
    }
  }

  // 推送所有tag到指定URL
  pushAllTags(url, options = {}) {
    const args = [];
    if (options.forceWithLease) args.push('--force-with-lease');
    else if (options.force) args.push('--force');

    // 推送所有tag
    args.push('--tags');
    args.push(url);

    return this.exec('push', args);
  }

  // 从远程仓库获取所有分支和tag
  fetchAllFromRemote(remote = 'origin') {
    // 只从指定的远程获取所有分支和tag
    // 使用 --tags 获取所有tag，不指定分支则获取所有分支
    const args = [remote, '--tags'];
    return this.exec('fetch', args);
  }
}

module.exports = GitOperator;
