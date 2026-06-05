# pi-qq-msg

[pi](https://github.com/nicholasgasior/pi-coding-agent) 扩展插件，通过 [LLBot (LuckyLilliaBot)](https://github.com/LLOneBot/LuckyLilliaBot) 的 OneBot 11 HTTP API 读写 QQ 个人号消息。

让 AI 编程助手 pi 直接访问你的 QQ 私聊和群聊——查消息、搜好友、发消息，一句话搞定。

## 功能

- 📬 **最近会话** — 私聊/群聊分区显示，按时间排序
- 🔍 **搜索** — 按昵称/备注/QQ号搜索好友和群
- 💬 **聊天记录** — 读取任意私聊或群聊的历史消息
- 📤 **发送消息** — 发送私聊或群消息（需确认）
- 🏷️ **群白名单** — 只关注你关心的群，其余全部过滤
- 🛡️ **隐私分离** — 插件代码不含任何个人信息，所有用户数据独立存放

## 从零开始的完整安装指南

以下从一台只装了 QQNT 的 Windows 电脑开始，一步步配置到插件正常工作。

### 前置要求

- Windows 10 / Windows Server 2012 及以上（64位）
- [QQNT](https://im.qq.com/pcqq/index.shtml)（原版桌面版 QQ）已安装并可以正常登录
- [Node.js](https://nodejs.org/) >= 18（pi 依赖）
- [pi](https://www.npmjs.com/package/@earendil-works/pi-coding-agent) 已安装

### 第一步：安装 LLBot Desktop

LLBot 是一个 QQ 机器人框架，它通过 PMHQ（纯内存 Hook）注入原版 NTQQ，将 QQ 的内部功能暴露为标准协议 API。

1. 前往 [LuckyLilliaBot Releases](https://github.com/LLOneBot/LuckyLilliaBot/releases/latest) 下载 `LLBot-Desktop-win-x64.zip`

2. 解压到固定目录，例如 `D:\LLBot-Desktop\`

3. 双击 `llbot.exe` 启动

   > ⚠️ LLBot 会自动拉起 QQ.exe 进行注入。**必须由 LLBot 拉起 QQ**，手动打开的 QQ 不生效。如果你已经手动开了 QQ，先退出它。

4. 在 LLBot 界面中扫码登录你的 QQ 账号

5. 登录成功后，LLBot 界面应显示「已登录」状态

### 第二步：配置 LLBot

LLBot 支持多种协议（OneBot 11、Milky、Satori），我们只需要 OneBot 11 的 HTTP 接口。

#### 方式 A：通过 WebUI 配置（推荐）

1. 打开浏览器访问 `http://localhost:3080`（LLBot 内置 WebUI）
2. 找到 OneBot 11 配置区域
3. 启用 **HTTP** 连接方式，设置端口（默认 `3000`）
4. 设置 Token（用于 API 鉴权，自己定义一个字符串即可）
5. 保存配置

#### 方式 B：直接编辑配置文件

配置文件路径：`<LLBot目录>\bin\llbot\data\config_<你的QQ号>.json`

关键配置项：

```jsonc
{
  "ob11": {
    "enable": true,
    "connect": [
      // ... 其他连接方式可以关闭 ...
      {
        "type": "http",
        "enable": true,
        "host": "127.0.0.1",  // 出于安全考虑，只监听本地
        "port": 3000,
        "token": "你的自定义token",
        "reportSelfMessage": false,
        "reportOfflineMessage": false,
        "messageFormat": "array",
        "debug": false
      }
    ]
  },
  "onlyLocalhost": true  // 重要：不要暴露到公网
}
```

#### 配置 PMHQ（QQ 路径）

PMHQ 配置文件路径：`<LLBot目录>\bin\pmhq\pmhq_config.json`

```json
{
  "qq_path": "C:\\Program Files\\Tencent\\QQNT\\QQ.exe",
  "headless": false,
  "qq_console": false
}
```

- `qq_path`：QQ.exe 的绝对路径，确保指向你安装的 NTQQ
- `headless`：设为 `true` 可开启无头模式（不显示 QQ 窗口，但有掉线风险）
- `qq_console`：设为 `true` 可显示 QQ 控制台（调试用）

### 第三步：验证 LLBot 工作正常

在浏览器或终端中测试：

```bash
# 获取登录信息（替换 your_token 为你设置的 token）
curl http://127.0.0.1:3000/get_login_info \
  -H "Authorization: Bearer your_token"
```

应该返回：

```json
{"status":"ok","retcode":0,"data":{"user_id":123456789,"nickname":"你的昵称"}}
```

如果看到这个响应，说明 LLBot 和 OneBot 11 HTTP API 已经正常工作。

### 第四步：设置开机自启（可选）

创建 LLBot 的快捷方式，放到 Windows 启动目录：

```
%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup\LLBot.lnk
```

目标指向 `D:\LLBot-Desktop\llbot.exe`。这样每次开机 LLBot 会自动启动并拉起 QQ 登录。

如果需要自动登录，编辑 `pmhq_config.json`：

```json
{
  "quick_login_qq": "你的QQ号"
}
```

### 第五步：安装 pi-qq-msg 插件

#### 方式 A：通过 pi install（推荐）

```bash
pi install git:github.com/inouemoby/pi-qq-msg
```

#### 方式 B：手动安装

将本项目克隆到 pi 的扩展目录：

```bash
git clone https://github.com/inouemoby/pi-qq-msg ~/.pi/agent/extensions/qq-msg
```

### 第六步：配置 pi

在 pi 的 `settings.json` 中添加 `"qq-msg"` 字段：

路径：`~/.pi/agent/settings.json`

```jsonc
{
  // ... 其他 pi 配置 ...
  "qq-msg": {
    "ob11_token": "你在第二步设置的token",
    "group_whitelist": []
  }
}
```

字段说明：

| 字段 | 类型 | 说明 |
|------|------|------|
| `ob11_token` | string | LLBot HTTP API 的 Token |
| `ob11_url` | string? | 覆盖 API 地址（默认 `http://127.0.0.1:3000`） |
| `group_whitelist` | number[] | 群聊白名单（QQ群号列表），为空则显示所有群 |

也可以通过环境变量配置（优先级高于 settings.json）：

```bash
export QQ_OB11_URL="http://127.0.0.1:3000"
export QQ_OB11_TOKEN="your_token"
```

#### 群白名单说明

`group_whitelist` 控制哪些群会出现在 pi 的群聊列表中：

- **有白名单**：只显示白名单中的群，其他群全部被过滤
- **无白名单（空数组）**：显示所有群

示例——只关注 3 个群：

```jsonc
{
  "qq-msg": {
    "ob11_token": "my_secret_token",
    "group_whitelist": [591551114, 572865743, 807636814]
  }
}
```

### 第七步：重启 pi 并使用

```bash
pi
```

在 pi 中直接对话即可：

```
你：最近谁找我了
pi：[调用 qq_msg_recent，显示最近私聊和群聊]

你：看看和黄磊雄的聊天记录
pi：[调用 qq_msg_search，搜索好友，读取聊天记录]

你：给他说换个有的
pi：[确认后调用 qq_msg 发送消息]
```

## 架构

```
┌─────────────────────────────────────────────────┐
│                    pi (AI 助手)                   │
│        通过 pi-qq-msg 扩展调用工具                 │
└──────────────────┬──────────────────────────────┘
                   │ HTTP :3000 (OneBot 11)
┌──────────────────▼──────────────────────────────┐
│           LLBot (LuckyLilliaBot)                  │
│  ├─ OneBot 11 适配器 — 标准 HTTP/WS API          │
│  ├─ WebUI 管理界面 (:3080)                       │
│  └─ 核心 — 消息收发、事件分发、API 路由           │
└──────────────────┬──────────────────────────────┘
                   │ PMHQ WS :13000
┌──────────────────▼──────────────────────────────┐
│              PMHQ (Pure Memory Hook for QQNT)    │
│  通过内存注入 Hook NTQQ 内部函数                  │
│  将 QQ 内部服务暴露为可调用接口                    │
└──────────────────┬──────────────────────────────┘
                   │ 注入 + Hook
┌──────────────────▼──────────────────────────────┐
│          QQNT (原版桌面 QQ 客户端)                │
│  由 PMHQ 拉起，支持普通模式和无头模式              │
└─────────────────────────────────────────────────┘
```

三层分工：
- **QQNT**：官方客户端，维持真实 QQ 连接
- **PMHQ**：注入 QQNT 进程，Hook 内部 JS 函数，通过 WebSocket 暴露给 LLBot
- **LLBot**：将 PMHQ 的底层调用封装为标准 OneBot 11 协议，提供 HTTP/WS API

## 注册的工具

### `qq_msg` — 通用 OneBot 11 API 调用

直接调用 LLBot 的任意 OneBot 11 API 动作。

| 常用动作 | 方法 | 说明 |
|----------|------|------|
| `get_login_info` | GET | 获取登录信息 |
| `get_friend_list` | GET | 获取好友列表 |
| `get_group_list` | GET | 获取群列表（受白名单过滤） |
| `get_group_member_list` | GET | 获取群成员 |
| `get_friend_msg_history` | POST | 获取私聊记录 |
| `get_group_msg_history` | POST | 获取群聊记录 |
| `send_private_msg` | POST | 发送私聊消息 |
| `send_group_msg` | POST | 发送群消息 |
| `delete_msg` | POST | 撤回消息 |
| `set_group_kick` | POST | 踢人 |
| `set_group_ban` | POST | 禁言 |
| `set_group_whole_ban` | POST | 全体禁言 |

完整 API 列表参见 [LLBot OneBot 11 API 文档](https://api.luckylillia.com/doc-7202281)。

### `qq_msg_recent` — 最近会话

按时间排序显示最近的私聊和群聊，**私聊和群聊严格分区**。

参数：
- `limit` (number, 默认 15) — 每区最多显示条数
- `type` ("all" | "private" | "group") — 筛选类型

输出示例：

```
👤 私聊 (32个有消息，显示前5个)
  23:56 黄磊雄(exp x) [861627096]
  └ 我: 换个有的
  22:52 戴泽宇(秦川戴戴籽) [491711848]
  └ 秦川戴戴籽: ...

👥 群聊 (2个有消息，显示前2个)
  23:33 这个群真的是诸神黄昏(21人) [591551114] 🔇
  └ 洛克也是🧈: [图片]
  18:37 文卫的日常(2人) [572865743] 🔝
  └ 井文卫: ...
```

### `qq_msg_search` — 搜索 + 历史记录

先搜索好友/群，再查看聊天记录。

- `search_type: "friend"` + `keyword` → 模糊搜索好友
- `search_type: "group"` + `keyword` → 模糊搜索群
- `search_type: "private_history"` + `user_id` → 查看私聊记录
- `search_type: "group_history"` + `group_id` → 查看群聊记录

## 注册的命令

| 命令 | 说明 |
|------|------|
| `/qq-recent` | 查看最近会话概览 |
| `/qq-msg <关键词>` | 搜索好友/群并查看最近10条消息 |
| `/qq-friends` | 查看好友列表 |
| `/qq-groups` | 查看群列表（受白名单过滤） |
| `/qq-send <目标> <内容>` | 发送消息（按名称匹配） |

## 文件结构

```
pi-qq-msg/
├── index.ts          # 插件入口，注册工具和命令
├── package.json      # pi 扩展声明
├── SKILL.md          # pi skill 描述（AI 行为指引）
├── LICENSE           # MIT
└── README.md         # 本文档
```

用户配置写在 `~/.pi/agent/settings.json` 的 `"qq-msg"` 字段中，不额外创建文件。

## 安全注意事项

- **Token 不要硬编码在代码中** — 使用 `settings.json` 的 `qq-msg.ob11_token` 或环境变量 `QQ_OB11_TOKEN`
- **只监听 localhost** — LLBot 配置 `host: "127.0.0.1"`，不要暴露到公网
- **发送消息需确认** — 插件设计为 AI 会先确认再发送，避免误发
- **配置集中在 settings.json** — 插件从 `settings.json` 的 `"qq-msg"` 字段读取配置，无额外文件

## 已知限制

- **群消息掩码只能设置不能读取** — LLBot 只提供了 `set_group_msg_mask` API，没有 `get_group_msg_mask`，因此无法通过 API 读取群免打扰/群助手/屏蔽状态
- **最近会话较慢** — 需要逐个查询每个好友/群的最后一条消息，好友多时耗时较长（499 好友约需 30-60 秒）
- **群白名单需手动维护** — 群号需要手动填写到 `qq-msg-data.json` 中

## 相关项目

- [LLBot (LuckyLilliaBot)](https://github.com/LLOneBot/LuckyLilliaBot) — QQ 机器人框架
- [PMHQ](https://github.com/linyuchen/PMHQ) — NTQQ 内存注入工具
- [pi](https://www.npmjs.com/package/@earendil-works/pi-coding-agent) — AI 编程助手
- [OneBot 11](https://github.com/botuniverse/onebot-11) — 聊天机器人标准协议

## License

MIT
