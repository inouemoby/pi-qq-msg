# pi-qq-msg

[pi](https://www.npmjs.com/package/@earendil-works/pi-coding-agent) extension for reading QQ personal account messages via [LLBot](https://github.com/LLOneBot/LuckyLilliaBot) OneBot 11 HTTP API.

## Features

- Recent private and group conversations (sorted by time, separated by type)
- Search friends/groups by nickname/remark/QQ number
- Read private and group chat history
- Send private and group messages
- Group whitelist filtering

## Architecture

```
pi (AI agent)
  │ HTTP :3000 (OneBot 11)
  ▼
LLBot (LiteLoaderQQNT plugin, OneBot 11 protocol implementation)
  ↑ loaded by
LiteLoaderQQNT (QQNT plugin loader)
  ↑ injected by
PMHQ (pure memory hook, injects into QQNT process)
  ↑ injects into
QQNT (official QQ desktop client)
```

LLBot Desktop manages this chain: `llbot.exe` → PMHQ → inject LiteLoaderQQNT + LLBot into QQNT → QQ login window → API ready.

## Install

### Prerequisites

- Windows 10+ (64-bit)
- [QQNT](https://im.qq.com/pcqq/index.shtml) (official QQ desktop client) installed
- [Node.js](https://nodejs.org/) >= 18
- [pi](https://www.npmjs.com/package/@earendil-works/pi-coding-agent) installed

### 1. Install LLBot Desktop

Download `LLBot-Desktop-win-x64.zip` from [LuckyLilliaBot Releases](https://github.com/LLOneBot/LuckyLilliaBot/releases/latest), extract to a fixed directory (e.g. `D:\LLBot-Desktop\`).

LLBot Desktop includes PMHQ and LLBot. It will automatically install LiteLoaderQQNT and the LLBot plugin into QQNT on first launch.

Run `llbot.exe`, click "Start". PMHQ will launch QQNT — scan QR code in the QQ window to log in.

QQ must be launched by LLBot (via PMHQ injection). Manually opened QQ will not work.

### 2. Configure OneBot 11 HTTP

Open `http://localhost:3080` (LLBot WebUI) in a browser, enable HTTP connection in OneBot 11 config:

| Setting | Recommended |
|---------|-------------|
| type | http |
| enable | true |
| host | 127.0.0.1 |
| port | 3000 |
| token | a custom string |

Or edit config file directly: `<LLBot-dir>\bin\llbot\data\config_<QQ-number>.json`.

Set QQ path in `<LLBot-dir>\bin\pmhq\pmhq_config.json`:
```json
{ "qq_path": "C:\\Program Files\\Tencent\\QQNT\\QQ.exe" }
```

### 3. Verify

```bash
curl http://127.0.0.1:3000/get_login_info \
  -H "Authorization: Bearer <your-token>"
```

Returns `{"status":"ok",...}` if working.

### 4. Install plugin

```bash
pi install git:github.com/inouemoby/pi-qq-msg
```

### 5. Configure plugin

Add to `~/.pi/agent/settings.json`:

```json
{
  "qq-msg": {
    "ob11_token": "<token from step 2>",
    "group_whitelist": []
  }
}
```

| Field | Description |
|-------|-------------|
| `ob11_token` | LLBot HTTP API token |
| `ob11_url` | Optional, default `http://127.0.0.1:3000` |
| `group_whitelist` | Group number array. Empty = show all groups, non-empty = only these groups |

Environment variables `QQ_OB11_URL` and `QQ_OB11_TOKEN` take priority over settings.json.

### 6. Auto-start on boot (optional)

Add shortcut to `llbot.exe` in `%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup\`.

Set `"quick_login_qq": "<QQ-number>"` in `pmhq_config.json` for automatic login.

## Tools

### qq_msg

Generic OneBot 11 API calls.

| Common action | Method | Description |
|---------------|--------|-------------|
| `get_login_info` | GET | Get login info |
| `get_friend_list` | GET | Get friend list |
| `get_group_list` | GET | Get group list (filtered by whitelist) |
| `get_group_member_list` | GET | Get group members |
| `get_friend_msg_history` | POST | Get private chat history |
| `get_group_msg_history` | POST | Get group chat history |
| `send_private_msg` | POST | Send private message |
| `send_group_msg` | POST | Send group message |
| `delete_msg` | POST | Recall message |
| `set_group_kick` | POST | Kick member |
| `set_group_ban` | POST | Mute member |
| `set_group_whole_ban` | POST | Mute all |

Full API reference: [LLBot API Docs](https://api.luckylillia.com/doc-7202281)

### qq_msg_recent

Show recent private and group conversations, sorted by time, separated by type.

Parameters:
- `limit` (number, default 15) — entries per section
- `type` ("all" | "private" | "group") — filter type

### qq_msg_search

Search friends/groups and view chat history.

- `search_type: "friend"` + `keyword` → search friends
- `search_type: "group"` + `keyword` → search groups
- `search_type: "private_history"` + `user_id` → view private chat history
- `search_type: "group_history"` + `group_id` → view group chat history

## Commands

| Command | Description |
|---------|-------------|
| `/qq-recent` | Show recent conversations |
| `/qq-msg <keyword>` | Search friend/group and show recent messages |
| `/qq-friends` | Friend list |
| `/qq-groups` | Group list (filtered by whitelist) |
| `/qq-send <target> <content>` | Send message |

## Known limitations

- LLBot only has `set_group_msg_mask`, no `get_group_msg_mask` — cannot read group notification settings via API
- Recent conversations require querying each friend's last message individually, slow with many friends
- Group whitelist must be maintained manually

## Related projects

- [LLBot](https://github.com/LLOneBot/LuckyLilliaBot) — QQ bot framework (OneBot 11 protocol implementation)
- [LiteLoaderQQNT](https://github.com/LiteLoaderQQNT/LiteLoaderQQNT) — QQNT plugin loader
- [PMHQ](https://github.com/linyuchen/PMHQ) — NTQQ memory injection
- [pi](https://www.npmjs.com/package/@earendil-works/pi-coding-agent) — AI coding agent
- [OneBot 11](https://github.com/botuniverse/onebot-11) — Chat bot protocol

## License

MIT
