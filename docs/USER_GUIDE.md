# RunningHub MCP 用户指南

## 目录

1. [快速开始](#快速开始)
2. [RunningHub APP 设置指南](#runninghub-app-设置指南)
3. [OpenCode Agent 自动接入](#opencode-agent-自动接入)
4. [共享测试 APP ID](#共享测试-app-id)
5. [使用示例](#使用示例)
6. [故障排除](#故障排除)

---

## 快速开始

### 方式一：使用共享测试 APP（推荐新手）

如果你想快速体验，可以使用我们提供的**共享测试 APP ID**：

```json
{
  "apiKey": "YOUR_RUNNINGHUB_API_KEY",
  "baseUrl": "www.runninghub.ai",
  "maxConcurrent": 1,
  "storage": { "type": "local", "path": "./output" },
  "apps": {
    "test-image": {
      "appId": "2037760725296357377",
      "alias": "test-image",
      "category": "image",
      "description": "共享测试APP - 图片生成",
      "inputs": {}
    }
  },
  "modelRules": { "rules": {}, "defaultLanguage": "zh" },
  "retry": { "maxRetries": 3, "maxWaitTime": 600, "interval": 5 },
  "logging": { "level": "info" }
}
```

> 🔑 **获取 API Key**: 访问 [RunningHub](https://www.runninghub.ai) 注册账号后获取

### 方式二：使用自己的 APP（推荐生产环境）

见下方 [RunningHub APP 设置指南](#runninghub-app-设置指南)

---

## RunningHub APP 设置指南

### 步骤 1：注册 RunningHub 账号

1. 访问 [https://www.runninghub.ai](https://www.runninghub.ai)
2. 点击「注册」创建账号
3. 登录后进入控制台

### 步骤 2：获取 API Key

1. 进入「个人中心」→「API 密钥」
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

- **APP ID**: `2037760725296357377`（示例）
- **API 调用地址**: `https://www.runninghub.ai/task/openapi/ai-app/run`

### 配置规则建议

创建 APP 时，建议遵循以下规则：

```
1. 输入参数命名规范
   - 提示词: prompt / positive_prompt
   - 负面提示词: negative_prompt
   - 图片尺寸: width, height
   - 步数: steps / sampling_steps

2. 必填参数标记
   - 核心参数（如 prompt）设为必填
   - 可选参数提供默认值

3. 参数范围限制
   - 图片尺寸: 512-2048（推荐 1024）
   - 步数: 1-100（推荐 20-50）
   - CFG Scale: 1-20（推荐 7-12）

4. 类型匹配
   - 确保参数类型与 ComfyUI 节点一致
   - 图片输入使用 IMAGE 类型
```

---

## OpenCode Agent 自动接入

### 配置 MCP 服务

找到 OpenCode 配置文件位置：

| 平台    | 路径                                 |
| ------- | ------------------------------------ |
| Windows | `%APPDATA%\opencode\mcp_config.json` |
| macOS   | `~/.config/opencode/mcp_config.json` |
| Linux   | `~/.config/opencode/mcp_config.json` |

编辑配置文件，添加：

```json
{
  "mcpServers": {
    "runninghub": {
      "command": "node",
      "args": ["E:/Projects/RHMCP/dist/server/index.js"],
      "env": {
        "CONFIG_PATH": "E:/Projects/RHMCP/runninghub-mcp-config.json"
      }
    }
  }
}
```

> ⚠️ 上面的路径需替换为你的实际路径！

### 重启 OpenCode

配置完成后，重启 OpenCode 即可使用 RunningHub 工具。

---

## 共享测试 APP ID

为了方便测试，我提供了以下共享 APP ID：

### 图片生成 APP

| 属性       | 值                    |
| ---------- | --------------------- |
| **APP ID** | `2037760725296357377` |
| **类型**   | 图片生成              |
| **输入**   | prompt (提示词)       |
| **输出**   | 图片 URL              |
| **状态**   | ✅ 可用               |

**使用示例**：

```
用户: 请用 RunningHub 生成一张图片，提示词是 "一只在星空下的猫咪"

Agent: 我将使用 RunningHub 的图片生成 APP 为您创建图片...

[调用 rh_execute_app]
{
  "alias": "test-image",
  "params": {
    "prompt": "一只在星空下的猫咪"
  }
}

[返回结果]
{
  "taskId": "xxx",
  "status": "SUCCESS",
  "outputs": [
    {
      "fileUrl": "https://xxx.runninghub.ai/output/image.png"
    }
  ]
}
```

### 获取你自己的 APP ID

1. 按照 [RunningHub APP 设置指南](#runninghub-app-设置指南) 创建 APP
2. 在配置文件的 `apps` 中添加：

```json
{
  "apps": {
    "test-image": {
      "appId": "2037760725296357377",
      "alias": "test-image",
      "category": "image",
      "description": "共享测试APP"
    },
    "my-custom-app": {
      "appId": "YOUR_APP_ID",
      "alias": "my-app",
      "category": "image",
      "description": "我的自定义APP",
      "inputs": {
        "prompt": {
          "nodeId": "xxx",
          "fieldName": "prompt",
          "type": "STRING",
          "required": true
        }
      }
    }
  }
}
```

---

## 使用示例

### 示例 1：生成图片

```
用户: 请帮我生成一张图片，描述是一只可爱的小猫在花园里玩耍

Agent 思考:
1. 用户想要生成图片
2. 检查可用 APP，找到 test-image
3. 调用 rh_execute_app

Agent 执行:
[Tool: rh_execute_app]
参数: { alias: "test-image", params: { prompt: "一只可爱的小猫在花园里玩耍" } }

Agent 返回:
图片已生成！请查看：
![生成的图片](https://output-url)
```

### 示例 2：查询任务状态

```
用户: 查询任务 12345 的状态

Agent 执行:
[Tool: rh_query_task]
参数: { taskId: "12345" }

Agent 返回:
任务状态：运行中
进度：75%
```

### 示例 3：添加新 APP

```
用户: 我创建了一个新的 APP，ID 是 999999999，帮我添加到配置中

Agent 执行:
[Tool: rh_add_app]
参数: { appId: "999999999", alias: "new-app", category: "image" }

Agent 返回:
APP 已添加成功！
- APP ID: 999999999
- 别名: new-app
- 导入参数数量: 5
```

### 示例 4：查看所有 APP

```
用户: 列出我配置的所有 APP

Agent 执行:
[Resource: rh://apps]

Agent 返回:
您配置了以下 APP：

1. **test-image** (图片生成)
   - APP ID: 2037760725296357377
   - 类别: image

2. **my-app** (自定义工作流)
   - APP ID: YOUR_APP_ID
   - 类别: video
```

---

## 故障排除

### 问题 1：配置文件未找到

**错误**: `Configuration file not found. Please create runninghub-mcp-config.json`

**解决**:

```bash
# 方法一：在项目根目录创建配置文件
cp config/runninghub-mcp-config.example.json runninghub-mcp-config.json
# 编辑填入你的 API Key

# 方法二：指定配置文件路径
CONFIG_PATH=/path/to/your/config.json npm start
```

### 问题 2：API Key 无效

**错误**: `获取APP信息失败: API Key 无效`

**解决**:

1. 确认 RunningHub 账号状态正常
2. 检查 API Key 是否正确复制（无多余空格）
3. 尝试重新生成 API Key

### 问题 3：任务超时

**错误**: `任务超时 (600秒)`

**解决**:

```json
// 在配置中增加超时时间
{
  "retry": {
    "maxWaitTime": 1200, // 改为 20 分钟
    "interval": 10,
    "maxRetries": 5
  }
}
```

### 问题 4：MCP 连接失败

**错误**: OpenCode 无法连接 MCP 服务

**解决**:

1. 确认配置路径使用**绝对路径**
2. 确认已运行 `npm run build`
3. 确认 Node.js 版本 >= 18

```bash
# 检查 Node 版本
node --version  # 应该 >= 18

# 手动测试服务
cd YOUR_PATH/RHMCP
npm run build
npm start
# 应该看到 "✅ RunningHub MCP Server started successfully!"
```

### 问题 5：找不到 APP

**错误**: `APP "xxx" 不存在`

**解决**:

1. 检查配置文件中的 `apps` 部分
2. 确认 `alias` 拼写正确
3. 使用 `rh://apps` 资源查看所有可用 APP

---

## API 参考

### 工具列表

| 工具              | 用途          | 必需参数                     |
| ----------------- | ------------- | ---------------------------- |
| `rh_upload_media` | 上传媒体文件  | `filePath`, `fileType`       |
| `rh_get_app_info` | 获取 APP 配置 | `appId` 或 `alias`           |
| `rh_execute_app`  | 执行 APP      | `alias` 或 `appId`, `params` |
| `rh_query_task`   | 查询任务      | `taskId`                     |
| `rh_add_app`      | 添加 APP      | `appId`, `alias`, `category` |
| `rh_remove_app`   | 删除 APP      | `appId` 或 `alias`           |
| `rh_update_rules` | 更新规则      | (可选) `model`               |
| `rh_list_rules`   | 列出规则      | (可选) `category`            |

### 资源列表

| 资源 URI              | 用途          |
| --------------------- | ------------- |
| `rh://apps`           | 列出所有 APP  |
| `rh://apps/{alias}`   | 查看 APP 详情 |
| `rh://tasks/{taskId}` | 查询任务状态  |
| `rh://tasks/history`  | 任务历史      |
| `rh://rules`          | 模型规则列表  |
| `rh://config`         | 当前配置      |

---

## 支持与反馈

- **GitHub Issues**: [https://github.com/AIRix315/RHMCP/issues](https://github.com/AIRix315/RHMCP/issues)
- **RunningHub 官网**: [https://www.runninghub.ai](https://www.runninghub.ai)

---

**祝你使用愉快！🎉**
