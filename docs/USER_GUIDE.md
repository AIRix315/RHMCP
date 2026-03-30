# RunningHub MCP 用户指南

## 目录

1. [配置前必读](#配置前必读)
2. [快速开始](#快速开始)
3. [RunningHub APP 设置指南](#runninghub-app-设置指南)
4. [OpenCode Agent 自动接入](#opencode-agent-自动接入)
5. [共享测试 APP ID](#共享测试-app-id)
6. [存储模式说明](#存储模式说明)
7. [使用示例](#使用示例)
8. [故障排除](#故障排除)

---

## 配置前必读

### ⚠️ baseUrl 选择

**请根据您的账号和服务器位置选择正确的域名：**

| 域名                | 说明           | 适用场景                   |
| ------------------- | -------------- | -------------------------- |
| `www.runninghub.cn` | 国内站（默认） | 服务器在中国，注册在国内站 |
| `www.runninghub.ai` | 国际站         | 服务器在海外，注册在国际站 |

**错误选择会导致 API 调用失败！**

### ⚠️ storage.mode 选择

| 模式      | 说明                   | 适用场景                                    |
| --------- | ---------------------- | ------------------------------------------- |
| `local`   | 下载文件到本地（默认） | 适合本地使用、直接获取文件                  |
| `network` | 上传到云存储           | 需要配置云存储（百度云/阿里云等）           |
| `auto`    | Agent 自动判断         | 继续处理返回URL，交付用户则下载             |
| `none`    | 不保存                 | 仅返回服务器原始URL，适合作为下一个任务输入 |

---

## 快速开始

### 方式一：使用共享测试 APP（推荐新手）

如果你想快速体验，可以使用我们提供的**共享测试 APP ID**：

**新配置格式（推荐）：**

```bash
# 1. 创建服务配置
cp service.json.example service.json

# 2. 创建 APP 配置
cp apps.json.example apps.json

# 3. 设置 API Key
echo "RUNNINGHUB_API_KEY=your_api_key_here" > .env
```

**service.json 示例：**
```json
{
  "baseUrl": "auto",
  "maxConcurrent": 1,
  "storage": { "mode": "local", "path": "./output" },
  "retry": { "maxRetries": 3, "maxWaitTime": 600, "interval": 5 },
  "logging": { "level": "info" },
  "modelRules": { "rules": {}, "defaultLanguage": "zh" }
}
```

> 🔑 **获取 API Key**: 访问 [RunningHub](https://www.runninghub.cn) 注册账号后，在「个人中心」→「API 控制台」获取

> 💡 **提示**: 也支持旧配置格式 `rhmcp-config.json`，会自动迁移。

### 方式二：使用自己的 APP（推荐生产环境）

见下方 [RunningHub APP 设置指南](#runninghub-app-设置指南)

---

## RunningHub APP 设置指南

### 步骤 1：注册 RunningHub 账号

1. 访问 [https://www.runninghub.cn](https://www.runninghub.cn)（国内站）或 [https://www.runninghub.ai](https://www.runninghub.ai)（国际站）
2. 点击「注册」创建账号
3. 登录后进入控制台

### 步骤 2：获取 API Key

1. 进入「个人中心」→「API 控制台」
2. 创建新的 API Key
3. **复制保存** API Key（只显示一次）

### 步骤 3：创建或导入工作流

RunningHub 支持两种方式创建 APP：

#### 方式 A：导入 ComfyUI 工作流（推荐）

1. 准备你的 ComfyUI 工作流 JSON 文件（`.json` 格式）
2. 在 RunningHub 控制台点击「创建应用」
3. 选择「导入 ComfyUI 工作流」
4. 上传 JSON 文件
5. 配置输入输出节点
6. 点击「发布」获取 APP ID

#### 方式 B：使用内置模板

1. 在控制台浏览「模板市场」
2. 选择适合的预置模板
3. 点击「使用此模板」
4. 根据需要调整参数
5. 点击「发布」获取 APP ID

### 步骤 4：配置 APP 参数

在创建 APP 时，需要定义以下内容：

| 参数类型 | 说明     | 示例                 |
| -------- | -------- | -------------------- |
| `STRING` | 文本输入 | 提示词、负面提示词   |
| `INT`    | 整数     | 图片宽度、高度、步数 |
| `FLOAT`  | 浮点数   | CFG Scale、Denoise   |
| `IMAGE`  | 图片上传 | 参考图、输入图       |
| `LIST`   | 下拉选择 | 采样器、模型选择     |
| `SWITCH` | 开关     | 是否启用某功能       |

### 步骤 5：获取 APP ID

发布成功后，在 APP 详情页可以看到：

- **APP ID**（如：`2037760725296357377`）
- **输入参数列表**（nodeInfoList）
- **输出类型**

---

## OpenCode Agent 自动接入

### 配置步骤

1. 编辑 OpenCode 配置文件：

```bash
# macOS/Linux
vim ~/.config/opencode/opencode.json

# Windows
notepad %APPDATA%\opencode\opencode.json
# 或
notepad %USERPROFILE%\.config\opencode\opencode.json
```

2. 添加 RunningHub MCP 服务：

```json
{
  "mcp": {
    "rhmcp": {
      "type": "local",
      "command": ["node", "/完整路径/RHMCP/dist/server/index.js", "--stdio"],
      "environment": {
        "RHMCP_CONFIG": "/完整路径/RHMCP"
      }
    }
  }
}
```

> 💡 `RHMCP_CONFIG` 指向配置目录（包含 service.json 和 apps.json）

3. 重启 OpenCode

---

## 共享测试 APP ID

以下 APP ID 可直接使用，无需自己创建：

| APP ID                | 别名                  | 类型     | 说明           |
| --------------------- | --------------------- | -------- | -------------- |
| `2037760725296357377` | `qwen-text-to-image`  | 图片生成 | Qwen文生图     |
| `2037822548796252162` | `qwen-image-to-image` | 图片修改 | Qwen提示词改图 |

---

## 存储模式说明

### local 模式（默认）

生成文件下载到本地目录：

```json
{
  "storage": {
    "mode": "local",
    "path": "./output"
  }
}
```

### network 模式

上传到云存储：

```json
{
  "storage": {
    "mode": "network",
    "cloudConfig": {
      "provider": "baidu",
      "accessKey": "YOUR_ACCESS_KEY",
      "secretKey": "YOUR_SECRET_KEY",
      "bucket": "YOUR_BUCKET"
    }
  }
}
```

### auto 模式

Agent 根据上下文自动判断：

- 需要继续处理 → 返回 URL
- 需要交付用户 → 下载本地

### none 模式

仅返回服务器原始 URL，不做任何处理。适合作为下一个任务的输入。

---

## 使用示例

### 文生图

```bash
# 使用 rh_execute_app 工具
{
  "alias": "qwen-text-to-image",
  "params": {
    "text": "一只在星空下的猫咪，梦幻风格，4K高清"
  }
}
```

### 图生图

```bash
# 1. 先上传图片
rh_upload_media --file ./input.png --type image

# 2. 执行图生图
{
  "alias": "qwen-image-to-image",
  "params": {
    "image": "api/xxx.png",
    "prompt": "转换为油画风格"
  }
}
```

---

## 故障排除

### API 调用失败

**问题**：API Key 无效

**解决方案**：

1. 确认 baseUrl 选择正确（cn 或 ai）
2. 确认 API Key 正确复制
3. 确认账号已开通 API 权限

### 任务一直 RUNNING

**问题**：任务长时间不完成

**解决方案**：

1. 检查网络连接
2. 增加 `maxWaitTime` 配置
3. 大图片/视频生成可能需要更长时间

### 文件下载失败

**问题**：storage.mode=local 时下载失败

**解决方案**：

1. 检查 storage.path 目录是否有写入权限
2. 确认磁盘空间充足

---

## 许可证

MIT License
