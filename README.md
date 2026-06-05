# pi-qq-msg

[pi](https://www.npmjs.com/package/@earendil-works/pi-coding-agent) 扩展，通过 [LLBot](https://github.com/LLOneBot/LuckyLilliaBot) 的 OneBot 11 HTTP API 读写 QQ 个人号消息。

## 功能

- 查看最近私聊和群聊会话（分区、按时间排序）
- 按昵称/备注/QQ号搜索好友和群
- 读取私聊或群聊历史消息
- 发送私聊或群消息
- 群白名单过滤

## 安装

### 前置条件

- Windows 10+ (64位)
- [QQNT](https://im.qq.com/pcqq/index.shtml) 已安装
- [Node.js](https://nodejs.org/) >= 18
- [pi](https://www.npmjs.com/package/@earendil-works/pi-coding-agent) 已安装

### 1. 安装 QQNT

从 [QQ 官网](https://im.qq.com/pcqq/index.shtml) 下载安装桌面版 QQ。不要安装 LiteLoaderQQNT 等第三方插件。

### 2. 安装 LLBot Desktop

从 [LuckyLilliaBot Releases](https://github.com/LLOneBot/LuckyLilliaBot/releases/latest) 下载 `LLBot-Desktop-win-x64.zip`，解压到固定目录（如 `D:\LLBot-Desktop\`）。

双击 `llbot.exe` 打开管理界面，点击「启动」。LLBot 会通过 PMHQ 拉起 QQNT，在弹出的 QQ 窗口中扫码登录。

QQ 必须由 LLBot 启动（通过 PMHQ 注入），手动打开的 QQ 无法使用。

### 3. 配置 OneBot 11 HTTP

打开浏览器访问 `http://localhost:3080`（LLBot WebUI），在 OneBot 11 配置中启用 HTTP 连接：

| 配置项 | 推荐值 |
|--------|--------|
| type | http |
| enable | true |
| host | 127.0.0.1 |
| port | 3000 |
| token | 自定义一个字符串 |

也可以直接编辑配置文件 `<LLBot目录>\bin\llbot\data\config_<QQ号>.json`。

确认 PMHQ 能找到你的 QQ：编辑 `<LLBot目录>\bin\pmhq\pmhq_config.json`，将 `qq_path` 设为 QQ.exe 的绝对路径。

### 4. 验证

```bash
curl http://127.0.0.1:3000/get_login_info \
  -H "Authorization: Bearer <你的token>"
```

返回 `{"status":"ok",...}` 即正常。

### 5. 安装插件

```bash
pi install git:github.com/inouemoby/pi-qq-msg
```

### 6. 配置插件

在 `~/.pi/agent/settings.json` 中添加 `qq-msg` 字段：

```json
{
  "qq-msg": {
    "ob11_token": "<第3步设置的token>",
    "group_whitelist": []
  }
}
```

| 字段 | 说明 |
|------|------|
| `ob11_token` | LLBot HTTP API 的 Token |
| `ob11_url` | 可选，默认 `http://127.0.0.1:3000` |
| `group_whitelist` | 群号数组，为空则显示所有群，有值则只显示这些群 |

也可通过环境变量 `QQ_OB11_URL` 和 `QQ_OB11_TOKEN` 配置，优先级高于 settings.json。

### 7. 开机自启（可选）

将 `llbot.exe` 的快捷方式放入 `%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup\`。

在 `pmhq_config.json` 中设置 `"quick_login_qq": "<QQ号>"` 可实现自动登录。

## 工具

### qq_msg

通用 OneBot 11 API 调用。

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

完整 API 列表见 [LLBot API 文档](https://api.luckylillia.com/doc-7202281)。

### qq_msg_recent

显示最近的私聊和群聊会话，按时间排序，私聊和群聊分开显示。

参数：
- `limit` (number, 默认 15) — 每区显示条数
- `type` ("all" | "private" | "group") — 筛选类型

### qq_msg_search

搜索好友/群并查看聊天记录。

- `search_type: "friend"` + `keyword` → 搜索好友
- `search_type: "group"` + `keyword` → 搜索群
- `search_type: "private_history"` + `user_id` → 查看私聊记录
- `search_type: "group_history"` + `group_id` → 查看群聊记录

## 命令

| 命令 | 说明 |
|------|------|
| `/qq-recent` | 查看最近会话 |
| `/qq-msg <关键词>` | 搜索好友/群并查看最近消息 |
| `/qq-friends` | 好友列表 |
| `/qq-groups` | 群列表（受白名单过滤） |
| `/qq-send <目标> <内容>` | 发送消息 |

## 架构

```
pi (AI 助手)
  │ HTTP :3000 (OneBot 11)
  ▼
LLBot
  │ PMHQ WS :13000
  ▼
PMHQ (内存注入 QQNT 内部函数)
  │ 注入
  ▼
QQNT (原版 QQ 客户端)
```

启动流程：llbot.exe → PMHQ → QQ.exe（弹出窗口，扫码登录）→ PMHQ 检测登录 → LLBot 加载协议 → API 就绪

## 已知限制

- LLBot 只有 `set_group_msg_mask` 没有 `get_group_msg_mask`，无法通过 API 读取群免打扰状态
- 最近会话需要逐个查询每个好友的最后一条消息，好友多时较慢
- 群白名单需手动维护群号

## 相关项目

- [LLBot](https://github.com/LLOneBot/LuckyLilliaBot) — QQ 机器人框架
- [PMHQ](https://github.com/linyuchen/PMHQ) — NTQQ 内存注入
- [pi](https://www.npmjs.com/package/@earendil-works/pi-coding-agent) — AI 编程助手
- [OneBot 11](https://github.com/botuniverse/onebot-11) — 聊天机器人协议

## License

MIT
