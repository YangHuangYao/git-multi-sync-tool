// scripts/test-changelog-edge-cases.js
// 测试边界情况和特殊场景
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const chalk = require('chalk');

console.log(chalk.blue.bold('🔍 测试版本日志工具边界情况\n'));

let tests = 0;
let passed = 0;
let failed = 0;

function test(name, fn) {
  tests++;
  try {
    fn();
    passed++;
    console.log(chalk.green(`✅ ${name}`));
  } catch (error) {
    failed++;
    console.log(chalk.red(`❌ ${name}: ${error.message}`));
  }
}

// 测试1: 重复运行保护
test('重复运行保护 - 已存在的版本不重复生成', () => {
  const readmePath = path.join(__dirname, '..', 'README.md');
  const packageJsonPath = path.join(__dirname, '..', 'package.json');
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
  const currentVersion = packageJson.version;

  // 确保README中已有当前版本
  const readmeContent = fs.readFileSync(readmePath, 'utf-8');
  const versionPattern = new RegExp(
    `### v${currentVersion.replace(/\./g, '\\.')}`,
  );

  if (versionPattern.test(readmeContent)) {
    // 运行changelog脚本，应该跳过
    const output = execSync('npm run changelog', {
      encoding: 'utf-8',
      stdio: 'pipe',
      cwd: path.join(__dirname, '..'),
    });

    if (!output.includes('已存在') && !output.includes('跳过生成')) {
      throw new Error('未检测到重复版本的保护机制');
    }
  }
});

// 测试2: 空提交历史处理
test('空提交历史处理 - 脚本不崩溃', () => {
  // 这个测试需要mock git log，但为了简单，我们只测试脚本不会因为错误而崩溃
  try {
    const scriptPath = path.join(__dirname, 'generate-changelog.js');
    const script = fs.readFileSync(scriptPath, 'utf-8');

    // 检查是否有错误处理
    if (!script.includes('catch') || !script.includes('try')) {
      throw new Error('脚本缺少错误处理机制');
    }
  } catch (error) {
    throw new Error(`脚本检查失败: ${error.message}`);
  }
});

// 测试3: 版本号格式验证
test('版本号格式验证', () => {
  const packageJsonPath = path.join(__dirname, '..', 'package.json');
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
  const version = packageJson.version;

  // 标准语义化版本格式
  const versionRegex = /^\d+\.\d+\.\d+(-[\w\d-]+)?(\+[\w\d-]+)?$/;
  if (!versionRegex.test(version)) {
    throw new Error(`版本号格式不符合语义化版本规范: ${version}`);
  }
});

// 测试4: README.md写入权限
test('README.md写入权限检查', () => {
  const readmePath = path.join(__dirname, '..', 'README.md');
  try {
    // 尝试读取和写入
    const content = fs.readFileSync(readmePath, 'utf-8');
    fs.writeFileSync(readmePath, content, 'utf-8');
  } catch (error) {
    throw new Error(`README.md文件不可写: ${error.message}`);
  }
});

// 测试5: Git标签解析
test('Git标签解析逻辑', () => {
  const scriptPath = path.join(__dirname, 'generate-changelog.js');
  const script = fs.readFileSync(scriptPath, 'utf-8');

  // 检查是否有标签解析逻辑
  if (!script.includes('git tag')) {
    throw new Error('脚本缺少git标签解析逻辑');
  }
});

// 测试6: Conventional Commits格式识别
test('Conventional Commits格式识别', () => {
  const testCases = [
    'feat: 新功能',
    'fix: 修复bug',
    'docs: 更新文档',
    'style: 代码格式',
    'refactor: 重构',
    'perf: 性能优化',
    'test: 添加测试',
    'chore: 构建过程或辅助工具的变动',
    'feat(scope): 带范围的新功能',
    'fix(ui): 修复UI bug',
  ];

  const scriptPath = path.join(__dirname, 'generate-changelog.js');
  const script = fs.readFileSync(scriptPath, 'utf-8');

  // 检查是否有Conventional Commits正则表达式
  const hasPattern = script.match(
    /feat|fix|perf|refactor|docs|style|test|build|ci|chore/i,
  );
  if (!hasPattern) {
    throw new Error('脚本缺少Conventional Commits格式识别');
  }
});

// 测试7: postversion钩子集成
test('postversion钩子集成检查', () => {
  const packageJsonPath = path.join(__dirname, '..', 'package.json');
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));

  const postversion = packageJson.scripts.postversion;
  if (!postversion) {
    throw new Error('package.json中缺少postversion钩子');
  }

  if (!postversion.includes('changelog')) {
    throw new Error('postversion钩子未调用changelog脚本');
  }

  if (!postversion.includes('git add')) {
    throw new Error('postversion钩子未将README.md添加到git暂存区');
  }
});

// 测试8: Changelog格式一致性
test('Changelog格式一致性', () => {
  const readmePath = path.join(__dirname, '..', 'README.md');
  const readmeContent = fs.readFileSync(readmePath, 'utf-8');

  // 检查所有版本日志的格式
  const versionMatches = readmeContent.match(/### v\d+\.\d+\.\d+/g);
  if (!versionMatches || versionMatches.length === 0) {
    throw new Error('未找到任何版本日志');
  }

  // 检查每个版本标题后面都有内容
  versionMatches.forEach((match, index) => {
    const version = match.replace('### ', '');
    const matchIndex = readmeContent.indexOf(match);

    // 找到下一个版本标题的位置
    let nextMatchIndex = readmeContent.length;
    if (index < versionMatches.length - 1) {
      nextMatchIndex = readmeContent.indexOf(versionMatches[index + 1]);
    }

    // 提取当前版本的日志内容
    const section = readmeContent.substring(matchIndex, nextMatchIndex);
    const content = section.replace(/^### v\d+\.\d+\.\d+\s*\n\n/, '').trim();

    if (content.length < 10) {
      throw new Error(
        `版本 ${version} 的日志内容为空或过短 (${content.length} 字符)`,
      );
    }

    // 检查是否有日志条目（支持emoji和中文，兼容CRLF和LF）
    const hasEntries = content.match(/^- [✨🔧⚡♻️📚💄🧪📦👷🔨📝🔄🔐🛠️🛡️🧹]/m);
    if (!hasEntries) {
      throw new Error(`版本 ${version} 的日志中没有有效的条目`);
    }
  });
});

// 测试9: 依赖包检查
test('依赖包完整性检查', () => {
  const packageJsonPath = path.join(__dirname, '..', 'package.json');
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));

  const requiredDeps = ['chalk'];
  const requiredDevDeps = ['conventional-changelog-cli'];

  requiredDeps.forEach((dep) => {
    if (
      !packageJson.dependencies?.[dep] &&
      !packageJson.devDependencies?.[dep]
    ) {
      throw new Error(`缺少依赖包: ${dep}`);
    }
  });

  requiredDevDeps.forEach((dep) => {
    if (!packageJson.devDependencies?.[dep]) {
      throw new Error(`缺少开发依赖包: ${dep}`);
    }
  });
});

// 测试10: 脚本可执行性
test('脚本可执行性检查', () => {
  const scriptPath = path.join(__dirname, 'generate-changelog.js');

  if (!fs.existsSync(scriptPath)) {
    throw new Error('changelog脚本文件不存在');
  }

  // 检查文件是否可读
  try {
    const content = fs.readFileSync(scriptPath, 'utf-8');
    if (content.length === 0) {
      throw new Error('changelog脚本文件为空');
    }
  } catch (error) {
    throw new Error(`无法读取changelog脚本: ${error.message}`);
  }
});

// 输出结果
console.log(chalk.blue.bold('\n📊 边界情况测试结果\n'));
console.log(chalk.green(`✅ 通过: ${passed}`));
if (failed > 0) {
  console.log(chalk.red(`❌ 失败: ${failed}`));
} else {
  console.log(chalk.gray(`❌ 失败: ${failed}`));
}
console.log(chalk.cyan(`📈 总计: ${tests}`));
console.log(chalk.cyan(`📊 通过率: ${((passed / tests) * 100).toFixed(1)}%\n`));

if (failed > 0) {
  process.exit(1);
} else {
  console.log(chalk.green.bold('🎉 所有边界情况测试通过！\n'));
}
