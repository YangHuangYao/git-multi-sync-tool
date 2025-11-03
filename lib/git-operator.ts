import { spawnSync, SpawnSyncReturns } from 'child_process';
import * as path from 'path';
import chalk from 'chalk';

export interface GitExecOptions {
  silent?: boolean;
}

export interface GitExecResult {
  success: boolean;
  output?: string;
  error?: string;
  command: string;
}

export interface PushOptions {
  force?: boolean;
  forceWithLease?: boolean;
  setUpstream?: boolean;
}

export interface PullOptions {
  rebase?: boolean;
}

export interface MergeOptions {
  ffOnly?: boolean;
}

export interface AddOptions {
  all?: boolean;
}

export interface CommitOptions {
  amend?: boolean;
  all?: boolean;
}

export interface CheckoutOptions {
  newBranch?: boolean;
}

export interface LogOptions {
  number?: number;
}

export interface PushAllBranchesOptions {
  force?: boolean;
  forceWithLease?: boolean;
  mirror?: boolean;
}

class GitOperator {
  private projectPath: string;

  constructor(projectPath: string = process.cwd()) {
    this.projectPath = projectPath;
  }

  // 执行Git命令 - 使用 spawnSync 避免注入问题
  exec(
    command: string,
    args: string[] = [],
    options: GitExecOptions = {},
  ): GitExecResult {
    const argv = [command, ...args];

    const spawnOptions = {
      cwd: this.projectPath,
      stdio: options.silent ? ('pipe' as const) : ('inherit' as const),
      encoding: 'utf-8' as const,
    };

    if (!options.silent) {
      console.log(chalk.blue(`$ git ${argv.join(' ')}`));
    }

    const child: SpawnSyncReturns<string> = spawnSync(
      'git',
      argv,
      spawnOptions,
    );

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
  isGitRepo(): boolean {
    const result = this.exec('rev-parse', ['--is-inside-work-tree'], {
      silent: true,
    });
    if (!result.success) return false;
    const normalized = (result.output || '').trim().toLowerCase();
    return normalized === 'true';
  }

  // 初始化Git仓库
  init(): GitExecResult {
    if (!this.isGitRepo()) {
      console.log(chalk.blue('初始化Git仓库...'));
      return this.exec('init');
    }
    return { success: true, command: 'git init' };
  }

  // 设置远程仓库
  setupRemote(name: string, url: string): GitExecResult {
    const existing = this.getRemoteUrl(name);

    if (existing) {
      if (existing === url) {
        console.log(chalk.gray(`远程仓库 ${name} 已存在且配置正确`));
        return { success: true, command: `git remote set-url ${name} ${url}` };
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
  setFetchUrl(name: string, url: string): GitExecResult {
    return this.exec('remote', ['set-url', name, url]);
  }

  // 为远程追加一个push URL
  addPushUrl(name: string, url: string): GitExecResult {
    return this.exec('remote', ['set-url', '--add', '--push', name, url]);
  }

  // 获取远程仓库URL
  getRemoteUrl(name: string): string | null {
    try {
      const result = this.exec('remote', ['get-url', name], { silent: true });
      return result.success ? result.output || null : null;
    } catch {
      return null;
    }
  }

  // 获取当前分支
  getCurrentBranch(): string | null {
    const result = this.exec('branch', ['--show-current'], { silent: true });
    if (!result.success) return null;
    const branch = (result.output || '').trim();
    return branch || null;
  }

  // 获取所有远程仓库
  getRemotes(): Record<string, string> {
    const result = this.exec('remote', ['-v'], { silent: true });
    if (!result.success) return {};

    const remotes: Record<string, string> = {};
    result.output?.split('\n').forEach((line) => {
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
  push(
    remote: string,
    branch: string,
    options: PushOptions = {},
  ): GitExecResult {
    const args: string[] = [];
    if (options.forceWithLease) args.push('--force-with-lease');
    else if (options.force) args.push('--force');
    if (options.setUpstream) args.push('--set-upstream');

    args.push(remote);
    args.push(branch);

    return this.exec('push', args);
  }

  // 直接推送到 URL（独立推送不依赖远程名）
  pushToUrl(
    url: string,
    branch: string,
    options: PushOptions = {},
  ): GitExecResult {
    const args: string[] = [];
    if (options.forceWithLease) args.push('--force-with-lease');
    else if (options.force) args.push('--force');
    if (options.setUpstream) args.push('--set-upstream');

    args.push(url);
    args.push(branch);

    return this.exec('push', args);
  }

  // 拉取代码
  pull(
    remote: string,
    branch: string,
    options: PullOptions = {},
  ): GitExecResult {
    const args = [remote, branch];
    if (options.rebase) args.push('--rebase');

    return this.exec('pull', args);
  }

  // 获取更新
  fetch(remote: string, branch?: string): GitExecResult {
    const args = [remote];
    if (branch) args.push(branch);

    return this.exec('fetch', args);
  }

  // 直接从 URL 获取（FETCH_HEAD）
  fetchFromUrl(url: string, branch?: string): GitExecResult {
    const args = [url];
    if (branch) args.push(branch);
    return this.exec('fetch', args);
  }

  // 添加文件 - 修复版本
  add(options: AddOptions = {}): GitExecResult {
    const args: string[] = [];

    if (options.all) {
      args.push('--all');
    } else {
      // 默认添加当前目录所有文件
      args.push('.');
    }

    return this.exec('add', args);
  }

  // 提交代码 - 修复版本
  commit(message: string, options: CommitOptions = {}): GitExecResult {
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
  checkout(branch: string, options: CheckoutOptions = {}): GitExecResult {
    const args: string[] = [];
    if (options.newBranch) args.push('-b');
    args.push(branch);

    return this.exec('checkout', args);
  }

  // 合并分支
  merge(branch: string, options: MergeOptions = {}): GitExecResult {
    const args = [branch];
    if (options.ffOnly) args.push('--ff-only');

    return this.exec('merge', args);
  }

  // 合并 FETCH_HEAD（配合 fetchFromUrl 使用）
  mergeFetchHead(options: MergeOptions = {}): GitExecResult {
    const args = ['FETCH_HEAD'];
    if (options.ffOnly) args.push('--ff-only');
    return this.exec('merge', args);
  }

  // 变基到指定提交/引用
  rebase(onto: string): GitExecResult {
    return this.exec('rebase', [onto]);
  }

  // 终止变基
  rebaseAbort(): GitExecResult {
    return this.exec('rebase', ['--abort']);
  }

  // 显示状态
  status(): GitExecResult {
    return this.exec('status');
  }

  // 是否存在需要提交的更改（工作区或暂存区）
  hasChanges(): boolean {
    const result = this.exec('status', ['--porcelain'], { silent: true });
    if (!result.success) return false;
    return (result.output || '').trim().length > 0;
  }

  // 显示日志
  log(options: LogOptions = {}): GitExecResult {
    const args = ['--oneline', '--graph'];
    if (options.number) args.push(`-${options.number}`);

    return this.exec('log', args);
  }

  // 获取所有远程分支
  getAllRemoteBranches(remote: string = 'origin'): string[] {
    const result = this.exec('branch', ['-r'], { silent: true });
    if (!result.success) return [];

    const branches: string[] = [];
    const prefix = `${remote}/`;
    result.output?.split('\n').forEach((line) => {
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
  getAllLocalBranches(): string[] {
    const result = this.exec('branch', [], { silent: true });
    if (!result.success) return [];

    const branches: string[] = [];
    result.output?.split('\n').forEach((line) => {
      const branch = line.trim().replace(/^\*\s*/, '');
      if (branch) {
        branches.push(branch);
      }
    });

    return branches;
  }

  // 获取所有tag
  getAllTags(): string[] {
    const result = this.exec('tag', ['-l'], { silent: true });
    if (!result.success) return [];

    const tags: string[] = [];
    result.output?.split('\n').forEach((line) => {
      const tag = line.trim();
      if (tag) {
        tags.push(tag);
      }
    });

    return tags;
  }

  // 推送所有分支到指定URL
  pushAllBranches(
    url: string,
    remote: string = 'origin',
    options: PushAllBranchesOptions = {},
  ): GitExecResult {
    const args: string[] = [];

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
  pushAllTags(url: string, options: PushOptions = {}): GitExecResult {
    const args: string[] = [];
    if (options.forceWithLease) args.push('--force-with-lease');
    else if (options.force) args.push('--force');

    // 推送所有tag
    args.push('--tags');
    args.push(url);

    return this.exec('push', args);
  }

  // 从远程仓库获取所有分支和tag
  fetchAllFromRemote(remote: string = 'origin'): GitExecResult {
    // 只从指定的远程获取所有分支和tag
    // 使用 --tags 获取所有tag，不指定分支则获取所有分支
    const args = [remote, '--tags'];
    return this.exec('fetch', args);
  }
}

export default GitOperator;
