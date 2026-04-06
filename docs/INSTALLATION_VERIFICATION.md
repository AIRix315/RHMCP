# RHMCP 安装验证清单

> 🎯 目标：确保客户和 Agent 都能正确部署和使用 RHMCP

---

## ✅ 预发布检查清单

### 1. 源码完整性

```bash
# 构建测试
npm run build          # ✅ 必须通过
npm run lint           # ✅ 必须通过
npm run format:check   # ✅ 必须通过
npm test               # ✅ 必须通过 (90 个测试)
```

### 2. 文件完整性

| 文件                       | 用途                | 必须 |
| -------------------------- | ------------------- | ---- |
| `package.json`             | NPM 配置            | ✅   |
| `tsconfig.json`            | TypeScript 配置     | ✅   |
| `dist/server/index.js`     | 主入口              | ✅   |
| `README.md`                | 主文档              | ✅   |
| `docs/OpenCode-setup.md`   | OpenCode 配置指南   | ✅   |
| `docs/OpenClaw-setup.md`   | OpenClaw 配置指南   | ✅   |
| `skills/openclaw/SKILL.md` | OpenClaw Skill 定义 | ✅   |
| `references/apps.json`     | 官方 APP 列表       | ✅   |

### 3. CI/CD 验证

- **GitHub Actions**: `.github/workflows/ci.yml`
  - ✅ 测试 Node 18.x, 20.x, 22.x
  - ✅ 代码风格检查
  - ✅ 构建测试
- **Release**: `.github/workflows/release.yml`
  - ✅ 自动创建 GitHub Release
- **Publish**: `.github/workflows/publish.yml`
  - ✅ 发布到 NPM (需要 NPM_TOKEN)

---

## 🚀 快速安装指南（客户）

### 方式一：GitHub 直接安装（推荐）

```bash
# 1. 安装
npm install -g AIRix315/RHMCP

# 2. 验证
rhmcp --help

# 3. 配置
mkdir -p ~/.rhmcp
echo "RUNNINGHUB_API_KEY=your_key" > ~/.rhmcp/.env
cat > ~/.rhmcp/service.json << 'EOF'
{
  "baseUrl": "auto",
  "maxConcurrent": 1,
  "storage": { "mode": "none" }
}
EOF

# 4. 更新 APP 列表
rhmcp --update-apps ~/.rhmcp/apps.json
```

### 方式二：本地构建安装

```bash
# 1. 克隆仓库
git clone https://github.com/AIRix315/RHMCP.git
cd RHMCP

# 2. 安装依赖
npm ci

# 3. 构建
npm run build

# 4. 全局链接
npm link

# 5. 验证
rhmcp --help
```

### 方式三：离线安装（内网/离线环境）

```bash
# 在有网络的环境：
# 1. 打包
npm pack
# 生成：runninghub-mcp-1.1.1.tgz

# 2. 复制到目标机器
# scp runninghub-mcp-1.1.1.tgz user@server:~

# 在目标机器：
npm install -g ./runninghub-mcp-1.1.1.tgz
```

---

## 🤖 Agent 部署指南

### OpenCode Agent

**配置文件位置**：

- Windows: `%USERPROFILE%\.config\opencode\opencode.json`
- Linux/macOS: `~/.config/opencode/opencode.json`

**配置内容**：

```json
{
  "mcp": {
    "rhmcp": {
      "type": "local",
      "command": ["rhmcp", "--stdio"],
      "environment": {
        "RHMCP_CONFIG": "/home/user/.rhmcp"
      }
    }
  }
}
```

**验证 Agent 连接**：

```bash
opencode mcp list
# 预期输出：
# SERVER    STATUS    TOOLS
# rhmcp     running   8
```

### OpenClaw Agent

**配置文件位置**：`~/.openclaw/openclaw.json`

**配置内容**：

```json
{
  "mcp": {
    "servers": {
      "rhmcp": {
        "command": "node",
        "args": ["/path/to/RHMCP/dist/server/index.js", "--stdio"],
        "env": {
          "RHMCP_CONFIG": "/path/to/RHMCP"
        }
      }
    }
  },
  "skills": {
    "entries": {
      "rhmcp-skill": {
        "enabled": true,
        "path": "/path/to/RHMCP/skills/openclaw"
      }
    }
  }
}
```

**Skill 特性**：

| 特性          | 说明                              |
| ------------- | --------------------------------- |
| 🎯 场景映射   | "生成图片" → `qwen-text-to-image` |
| 🔧 参数填充   | 自动填充 width/height 默认值      |
| 🧠 存储决策   | AUTO 模式智能选择                 |
| 🔗 链式工作流 | URL 自动传递                      |

---

## 📋 Agent 测试场景

### 场景 1：文生图

```
用户："生成一张可爱的猫咪图片"

Agent 应执行：
1. rhmcp_rh_execute_app({
     alias: "qwen-text-to-image",
     params: { text: "一只可爱的猫咪", width: 1024, height: 1024 }
   })
2. 返回图片 URL
```

### 场景 2：图生图（链式）

```
用户："把这张图片改成冬天背景"

Agent 应执行：
1. rhmcp_rh_upload_media({ filePath: "/path/to/image.png", fileType: "image" })
2. rhmcp_rh_execute_app({
     alias: "qwen-image-to-image",
     params: { image: "上传返回的URL", prompt: "冬天背景" }
   })
3. 返回新图片 URL
```

### 场景 3：数字人视频

```
用户："生成一个数字人说话的视频"

Agent 应执行：
1. rhmcp_rh_upload_media({ fileType: "audio" })  // 上传音频
2. rhmcp_rh_upload_media({ fileType: "image" })   // 上传图片
3. rhmcp_rh_execute_app({
     alias: "infinite-digital-human",
     params: {
       audio: "音频URL",
       image: "图片URL",
       width: 512,
       height: 512
     },
     mode: "async"
   })
4. 轮询 rhmcp_rh_query_task({ taskId: "..." })
```

---

## 🔧 故障排除

### 问题 1：MCP 连接失败

**症状**：Agent 找不到 RHMCP 工具

**检查**：

```bash
# 1. 验证构建
npm run build

# 2. 验证入口文件
ls dist/server/index.js

# 3. 验证配置
cat ~/.rhmcp/service.json
cat ~/.rhmcp/.env
```

### 问题 2：API Key 未配置

**症状**：`请先登录后访问`

**解决**：

```bash
# 方式一：环境变量
export RUNNINGHUB_API_KEY="your_key_here"

# 方式二：配置文件
echo "RUNNINGHUB_API_KEY=your_key_here" > ~/.rhmcp/.env

# 方式三：OpenCode/OpenClaw 配置
# 在 environment 字段添加 RUNNINGHUB_API_KEY
```

### 问题 3：APP 列表为空

**症状**：`未找到 alias`

**解决**：

```bash
# 更新 APP 列表
rhmcp --update-apps ~/.rhmcp/apps.json

# 验证
cat ~/.rhmcp/apps.json
# 应包含：qwen-text-to-image, qwen-image-to-image 等
```

### 问题 4：GitHub 安装失败

**症状**：`npm ERR! network`

**解决**：

```bash
# 方式一：使用镜像
npm install -g AIRix315/RHMCP --registry=https://registry.npmmirror.com

# 方式二：使用 GitHub Release
wget https://github.com/AIRix315/RHMCP/archive/refs/tags/v1.1.1.tar.gz
tar -xzf v1.1.1.tar.gz
cd RHMCP-1.1.1
npm ci && npm run build && npm link
```

---

## 📊 APP ID 列表（已验证）

| APP Alias                          | APP ID              | Category | Status      |
| ---------------------------------- | ------------------- | -------- | ----------- |
| qwen-text-to-image                 | 2037760725296357377 | image    | ✅          |
| qwen-text-to-image-upscale         | 2038131610033332226 | image    | ✅          |
| qwen-image-to-image                | 2037822548796252162 | image    | ✅          |
| indextts-audio-generation          | 2038460463490535426 | audio    | ✅          |
| qwentts-audio-generation           | 2038460895365439489 | audio    | ✅          |
| infinite-digital-human-integrated  | 2038472757071056897 | video    | ✅          |
| infinite-digital-human             | 2038499492558807041 | video    | ✅          |
| ltx23-digital-human                | 2040262879986847745 | video    | ✅ (需登录) |
| ltx23-first-last-frame-video       | 2041120539950977025 | video    | ✅ (需登录) |
| ltx23-first-mid-last-frame-video   | 2041123433374818306 | video    | ✅ (需登录) |
| ltx23-storyboard-infinite-duration | 2041147372696244226 | video    | ✅          |
| rtxvsr-video-upscale               | 2040411956145819649 | video    | ✅          |

---

## ✅ 最终验证步骤

```bash
# 1. 完整测试
npm run build && npm run lint && npm test

# 2. MCP 协议测试
echo '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test","version":"1.0"}}}' | rhmcp --stdio

# 3. Agent 连接测试
opencode mcp list  # OpenCode
# 或
# 查看 OpenClaw 启动日志

# 4. 功能测试
# 在 Agent 中执行：
# - "生成一张猫咪图片"
# - "上传这张图片"
# - "生成一个数字人视频"
```

---

## 📚 相关文档

- [README.md](../README.md) - 主文档
- [OpenCode-setup.md](./OpenCode-setup.md) - OpenCode 详细配置
- [OpenClaw-setup.md](./OpenClaw-setup.md) - OpenClaw 详细配置
- [skills/openclaw/README.md](../skills/openclaw/README.md) - Skill 使用指南
- [FAQ.md](./openclaw/FAQ.md) - 常见问题

---

## 🔗 快速链接

- 📦 GitHub: https://github.com/AIRix315/RHMCP
- 📚 官方文档: https://github.com/AIRix315/RHMCP#readme
- 🐛 问题反馈: https://github.com/AIRix315/RHMCP/issues
- 🔑 API Key: https://www.runninghub.cn
