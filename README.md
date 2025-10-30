# git-sync-tool
Git operation for submitting a set of code to multiple different remote repositories

## 使用方法
```
1、全局安装​​：
npm install -g git-sync-tool

2、在项目中使用​​：
# 进入项目目录
cd /path/to/your/project

# 创建示例配置文件
git-sync init

# 编辑配置文件，添加远程仓库URL
# 编辑 .git-remotes.txt 文件，例如：
# https://github.com/username/repo1.git
# https://gitee.com/username/repo1.git
# [company] http://git.company.com/repo.git

# 查看配置
git-sync config

# 设置远程仓库（首次使用）
git-sync setup

# 推送到所有仓库
git-sync push

# 从所有仓库拉取
git-sync pull

# 检查状态
git-sync status

3、​​配置文件示例​​ (.git-remotes.txt)：
# Git多仓库同步配置
# 每行一个远程仓库URL

https://github.com/yourname/project.git
https://gitee.com/yourname/project.git
[backup] https://gitlab.com/yourname/project.git
company http://git.company.com/team/project.git


```
## 特点

```

✅ ​​基于文本配置​​：简单的txt文件管理多个远程仓库
✅ ​​全局安装​​：一次安装，所有项目可用
✅ ​​灵活配置​​：支持多种URL格式和命名方式
✅ ​​批量操作​​：一键推送到所有配置的仓库
✅ ​​错误容忍​​：单个仓库失败不影响其他仓库
✅ ​​易于使用​​：简单的命令行界面

```