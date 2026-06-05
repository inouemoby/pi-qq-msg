---
name: qq-msg
description: QQ个人号消息读写 skill。通过 LLOneBot OneBot 11 HTTP API 获取最近会话、好友/群列表、查看聊天记录、发送私聊/群消息、消息撤回、群管理等。涉及QQ消息、好友、群聊相关任务时应优先使用。
version: 1.1.0
---

# QQ Messaging (个人号消息)

通过 LLOneBot (LLBot Desktop) 的 OneBot 11 HTTP API 读写 QQ 个人号消息。

## 前置条件

- LLBot Desktop 运行中（开机自启已配置）
- OneBot 11 HTTP API 开启：`http://127.0.0.1:3000`
- Access Token: 通过环境变量 `QQ_OB11_TOKEN` 配置
- 环境变量覆盖：`QQ_OB11_URL`, `QQ_OB11_TOKEN`

## 核心使用流程

1. **`qq_msg_recent`** → 看「最近谁找我了？」（私聊/群聊分区，按时间排序）
2. **`qq_msg_search(search_type="private_history", user_id=xxx)`** → 读某个人的完整私聊
3. **`qq_msg_search(search_type="group_history", group_id=xxx)`** → 读某个群的完整群聊

## 工具

### qq_msg_recent（推荐首选）

查看最近会话概览，**私聊和群聊严格分区**：

- 👤 私聊区：只显示最近聊过天的好友，按时间倒序
- 👥 群聊区：只显示最近有消息的群，按时间倒序，标记 🔝置顶 / 🔇免打扰

参数：
- `limit`: 每区最多显示几条（默认15，越多越慢，因为要逐个查询）
- `type`: "all"(默认) / "private"(仅私聊) / "group"(仅群聊)

### qq_msg_search

搜索好友/群 + 查看聊天记录：

- `search_type: "friend"` + `keyword` → 模糊搜索好友（按昵称/备注/QQ号）
- `search_type: "group"` + `keyword` → 模糊搜索群（按群名/群号）
- `search_type: "private_history"` + `user_id` → 查看与某人的私聊记录
- `search_type: "group_history"` + `group_id` → 查看某群的群聊记录

### qq_msg

通用 OneBot 11 API 调用工具。支持所有标准动作。

**常用动作：**

| 动作 | 方法 | 参数 | 说明 |
|------|------|------|------|
| `get_login_info` | GET | - | 获取登录信息 |
| `get_friend_list` | GET | - | 获取好友列表 |
| `get_group_list` | GET | - | 获取群列表（含 🔝置顶 / 🔇免打扰状态） |
| `get_group_member_list` | GET | group_id | 获取群成员 |
| `get_friend_msg_history` | POST | user_id, count | 获取私聊记录 |
| `get_group_msg_history` | POST | group_id, count | 获取群聊记录 |
| `send_private_msg` | POST | user_id, message | 发送私聊消息 |
| `send_group_msg` | POST | group_id, message | 发送群消息 |
| `delete_msg` | POST | message_id | 撤回消息 |
| `set_group_kick` | POST | group_id, user_id | 踢人 |
| `set_group_ban` | POST | group_id, user_id, duration | 禁言 |
| `set_group_whole_ban` | POST | group_id, enable | 全体禁言 |

## 命令

| 命令 | 说明 |
|------|------|
| `/qq-msg <关键词>` | 搜索好友/群并查看最近10条消息 |
| `/qq-recent` | 查看最近会话概览 |
| `/qq-friends` | 查看好友列表 |
| `/qq-groups` | 查看群列表 |
| `/qq-send <目标> <内容>` | 发送消息（按名称匹配） |

## 注意

- 发送消息前应与用户确认，避免误发
- LLBot 未运行时会返回连接失败提示
- 好友列表和群列表有缓存，可能延迟
- 群聊标记：🔝=置顶，🔇=被禁言/免打扰