# git-multi-sync-tool

一个强大的 Git 多仓库同步工具 - 基于文本配置文件，支持一键推送到多个远程仓库

## ✨ 功能特点

- 📝 **基于文本配置**：使用简单的 `.git-remotes.txt` 文件管理多个远程仓库
- 🌐 **多仓库同步**：一键将代码同步到 GitHub、Gitee、GitLab 等多个平台
- 🔄 **智能推送**：支持快进合并、强制推送、force-with-lease 等多种策略
- 🏷️ **全量同步**：支持同步所有分支和标签到指定仓库
- 🛡️ **错误容忍**：单个仓库失败不影响其他仓库的推送
- ⚡ **轻量高效**：命令行工具，快速简洁
- 🌍 **灵活配置**：支持多种 URL 格式和远程仓库命名
- 📦 **全局安装**：一次安装，所有项目可用
- 🔍 **状态查看**：实时查看配置和同步状态

## 🚀 快速开始

### 安装

```bash
# 全局安装
npm install -g git-multi-sync-tool
```

### 使用

```bash
# 1. 进入项目目录
cd /path/to/your/project

# 2. 创建配置文件
git-sync init

# 3. 编辑配置文件，添加远程仓库URL（.git-remotes.txt）
# https://github.com/username/repo1.git
# https://gitee.com/username/repo1.git
# [backup] https://gitlab.com/username/repo1.git

# 4. 查看配置
git-sync config

# 5. 设置远程仓库（首次使用）
git-sync setup

# 6. 推送到所有仓库
git-sync push
```

## 📋 配置文件示例

编辑 `.git-remotes.txt` 文件：

```text
# Git多仓库同步配置
# 每行一个远程仓库URL
# 可选：使用方括号或直接命名远程仓库
# 以 # 开头的行为注释

https://github.com/yourname/project.git
https://gitee.com/yourname/project.git
[backup] https://gitlab.com/yourname/project.git
company http://git.company.com/team/project.git
#disabled https://disabled.repo.git

# 支持相同仓库的多个 URL，自动合并为 push URL
origin https://github.com/user/repo.git
origin-2 https://gitee.com/user/repo.git
```

## 📚 完整命令参考

### 基础命令

| 命令     | 说明                     | 示例              |
| -------- | ------------------------ | ----------------- |
| `init`   | 创建示例配置文件         | `git-sync init`   |
| `config` | 显示当前配置             | `git-sync config` |
| `setup`  | 根据配置文件设置远程仓库 | `git-sync setup`  |
| `status` | 查看同步状态             | `git-sync status` |

### 提交和推送

| 命令               | 说明               | 示例                                      |
| ------------------ | ------------------ | ----------------------------------------- |
| `commit <message>` | 提交代码到所有仓库 | `git-sync commit "feat: add new feature"` |
| `push`             | 推送到所有仓库     | `git-sync push`                           |

**commit 命令选项**：

- `-p, --push` - 提交后自动推送
- `-a, --all` - 提交所有更改
- `-f, --force` - 强制推送
- `-u, --set-upstream` - 设置上游分支
- `--force-with-lease` - 使用更安全的强制推送
- `--pull-before-push` - 推送前先获取并快进合并
- `--on-non-ff <strategy>` - 非快进策略：skip|rebase|force-with-lease|force

**push 命令选项**：

- `-f, --force` - 强制推送
- `-u, --set-upstream` - 设置上游分支
- `--force-with-lease` - 使用更安全的强制推送
- `--pull-before-push` - 推送前先获取并快进合并
- `--on-non-ff <strategy>` - 非快进策略：skip|rebase|force-with-lease|force

### 拉取和获取

| 命令    | 说明               | 示例             |
| ------- | ------------------ | ---------------- |
| `pull`  | 从所有仓库拉取     | `git-sync pull`  |
| `fetch` | 从所有仓库获取更新 | `git-sync fetch` |

**pull 命令选项**：

- `-r, --rebase` - 使用 rebase 方式合并
- `--merge-mirrors` - 对镜像远程执行合并（默认仅 fetch）

### 全量同步（新增功能 ✨）

| 命令                    | 说明                         | 示例                             |
| ----------------------- | ---------------------------- | -------------------------------- |
| `sync-all <target-url>` | 同步所有分支和标签到指定仓库 | `git-sync sync-all <target-url>` |

**sync-all 命令选项**：

- `-s, --source <remote>` - 指定源远程仓库名称（默认: origin）
- `-f, --force` - 强制推送
- `--force-with-lease` - 使用更安全的强制推送

**使用场景示例**：

```bash
# 将 origin 的所有分支和标签同步到备份仓库
git-sync sync-all https://backup.company.com/repo.git

# 将 upstream 的所有分支和标签同步到目标仓库
git-sync sync-all https://target.com/repo.git -s upstream

# 强制覆盖目标仓库（谨慎使用）
git-sync sync-all https://target.com/repo.git --force
```

## 🎯 使用场景

### 场景 1: 多平台同步

同时将代码推送到 GitHub、Gitee、GitLab 等多个平台：

```bash
git-sync push
```

### 场景 2: 提交并推送

一次性完成提交和推送到所有仓库：

```bash
git-sync commit "feat: new feature" -p
```

### 场景 3: 全量仓库备份

将主仓库的所有分支和标签备份到备份仓库：

```bash
git-sync sync-all https://backup.company.com/repo.git
```

### 场景 4: 安全强制推送

使用更安全的 force-with-lease 推送：

```bash
git-sync push --force-with-lease
```

### 场景 5: 推送前自动合并

推送前先尝试从远程获取并合并：

```bash
git-sync push --pull-before-push --on-non-ff rebase
```

### 场景 6: 禁用某些仓库

使用配置文件中的注释功能临时禁用某些仓库：

```text
# https://temp-disabled.repo.git
```

## ⚙️ 高级配置

### 分组远程仓库

相同的仓库名（自动去除 `-数字` 后缀）会被视为同一组，后续的 URL 会自动添加为 push URL：

```text
origin https://github.com/user/repo.git
origin-2 https://gitee.com/user/repo.git
origin-3 https://gitlab.com/user/repo.git
```

效果：fetch 仅从 origin，但 push 会同时推送到所有三个地址。

### 非快进策略

当本地分支落后于远程分支时，可选择以下策略：

- `skip` (默认) - 跳过推送
- `rebase` - 自动 rebase 后推送
- `force-with-lease` - 安全强制推送
- `force` - 强制推送（危险）

## 🔧 故障排除

### 配置文件找不到

确保在 Git 项目根目录下运行命令，并且已执行 `git-sync init`。

### 远程仓库设置失败

检查配置文件格式是否正确，URL 是否有效。运行 `git-sync config` 查看详细配置。

### 推送失败

- 检查网络连接
- 验证远程仓库权限
- 尝试使用 `--force-with-lease` 选项
- 使用 `--pull-before-push` 先同步远程更改

### 分支或标签冲突

使用 `--force` 或 `--force-with-lease` 选项覆盖远程分支/标签。

## 📦 项目信息

- **名称**: git-multi-sync-tool
- **版本**: 1.0.3
- **仓库**: https://github.com/YangHuangYao/git-sync-tool
- **问题反馈**: https://github.com/YangHuangYao/git-sync-tool/issues
- **许可证**: MIT

## 🤝 贡献

欢迎提交问题和 Pull Request！

## 📝 更新日志

### v1.0.3

- ✨ 新增 `sync-all` 命令：同步所有分支和标签到指定仓库
- 🔧 优化错误处理和提示信息
- 📚 完善文档和使用示例

### v1.0.0

- 🎉 初始版本发布
- 📝 基础多仓库同步功能
- 🌐 支持 GitHub、Gitee、GitLab 等平台

## 📄 许可证

MIT License - 详见 [LICENSE](LICENSE) 文件
