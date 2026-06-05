import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { Type } from "typebox";

const OB11_BASE = process.env.QQ_OB11_URL || "http://127.0.0.1:3000";
const SKILL_DIR = __dirname;

// ─── 从 settings.json 的 "qq-msg" 字段读取用户配置 ───
import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";

function loadUserConfig(): { group_whitelist: number[]; ob11_url?: string; ob11_token?: string } {
  // 向上遍历找到 settings.json 所在目录
  let dir = SKILL_DIR;
  for (let i = 0; i < 10; i++) {
    const candidate = join(dir, "settings.json");
    if (existsSync(candidate)) {
      try {
        const settings = JSON.parse(readFileSync(candidate, "utf-8"));
        return settings["qq-msg"] || {};
      } catch { /* ignore */ }
    }
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return {};
}

const USER_CONFIG = loadUserConfig();
const GROUP_WHITELIST: Set<number> = new Set(USER_CONFIG.group_whitelist || []);
const OB11_ACTUAL_TOKEN = process.env.QQ_OB11_TOKEN || USER_CONFIG.ob11_token || "";

// ─── OneBot 11 HTTP helpers ─────────────────────────────────────

async function ob11Get(action: string, params: Record<string, any> = {}): Promise<any> {
  const url = new URL(`/${action}`, OB11_BASE);
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null) url.searchParams.set(k, String(v));
  }
  const resp = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${OB11_ACTUAL_TOKEN}` },
    signal: AbortSignal.timeout(15_000),
  });
  return resp.json();
}

async function ob11Post(action: string, body: Record<string, any>): Promise<any> {
  const url = new URL(`/${action}`, OB11_BASE);
  const resp = await fetch(url.toString(), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${OB11_ACTUAL_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(15_000),
  });
  return resp.json();
}

function formatGroup(g: any): string {
  return `[${g.group_name}](${g.group_id}) (${g.member_count}人)` + (g.is_top ? " 🔝" : "");
}

function formatFriend(f: any): string {
  return `${f.nickname}(${f.user_id})` + (f.remark ? ` 备注:${f.remark}` : "");
}

function formatMsg(m: any): string {
  const sender = m.sender?.nickname || m.sender?.user_id || "?";
  const time = m.time ? new Date(m.time * 1000).toLocaleString("zh-CN") : "";
  let text = "";
  if (Array.isArray(m.message)) {
    for (const seg of m.message) {
      if (seg.type === "text") text += seg.data?.text || "";
      else if (seg.type === "face") text += `[表情${seg.data?.id}]`;
      else if (seg.type === "image") {
        const imgFile = seg.data?.file || "?";
        const imgUrl = seg.data?.url || "";
        text += `[图片:${imgFile}${imgUrl ? " " + imgUrl : ""}]`;
      }
      else if (seg.type === "at") text += `@${seg.data?.qq}`;
      else if (seg.type === "reply") text += `[回复]`;
      else if (seg.type === "record") text += `[语音]`;
      else if (seg.type === "file") text += `[文件:${seg.data?.file}]`;
      else text += `[${seg.type}]`;
    }
  } else if (typeof m.message === "string") {
    text = m.message;
  }
  return `${time} ${sender}: ${text}`;
}

// ─── Extension entry ─────────────────────────────────────────

export default function (pi: ExtensionAPI) {

  // ── Tool: qq_msg ────────────────────────────────────────────
  pi.registerTool({
    name: "qq_msg",
    label: "QQ Messaging",
    description:
      "Read and send QQ personal account messages via LLOneBot OneBot 11 HTTP API. " +
      "Supports: get chat history, send private/group messages, get friend list, get group list, " +
      "get group member list, get message, delete message, set group kick/ban/mute, etc. " +
      "LLBot must be running with HTTP API enabled on port 3000.",
    promptSnippet: "QQ消息读写: 收发私聊/群消息, 查好友/群列表, 查聊天记录",
    promptGuidelines: [
      "Use qq_msg when user asks about QQ消息, 私聊, 群聊, 好友, 群列表 etc.",
      "LLBot (LLOneBot) must be running with OneBot 11 HTTP API enabled.",
      "Default API: http://127.0.0.1:3000, configurable via env QQ_OB11_URL, QQ_OB11_TOKEN.",
      "For sending messages, always confirm with user before sending to avoid accidental sends.",
      "message_type is 'private' for DMs, 'group' for group chats.",
      "Messages use OneBot 11 array format; string format also accepted.",
    ],
    parameters: Type.Object({
      action: Type.String({
        description:
          "OneBot 11 API action: get_login_info, get_friend_list, get_group_list, " +
          "get_group_member_list, get_msg, get_friend_msg_history, get_group_msg_history, " +
          "send_private_msg, send_group_msg, send_msg, delete_msg, " +
          "set_group_kick, set_group_ban, set_group_whole_ban, " +
          "set_group_admin, set_group_card, set_group_name, " +
          "get_group_info, get_version_info, get_status",
      }),
      params: Type.Optional(Type.Record(Type.String(), Type.Any(), {
        description:
          "Action parameters as key-value pairs. Examples: " +
          "get_friend_msg_history: {user_id:123456, count:10}; " +
          "send_private_msg: {user_id:123456, message:[{type:'text',data:{text:'hello'}}]}; " +
          "send_group_msg: {group_id:123456, message:[{type:'text',data:{text:'hello'}}]}; " +
          "get_group_member_list: {group_id:123456}; " +
          "get_group_msg_history: {group_id:123456, count:10}; " +
          "delete_msg: {message_id:123}; " +
          "For send actions, message can be string or array of message segments.",
      })),
      _method: Type.Optional(Type.String({
        description: "HTTP method: 'GET' (default) or 'POST'. Use POST for send actions and actions with body data.",
        enum: ["GET", "POST"],
      })),
    }),
    async execute(_toolCallId: string, params: any, _signal: any, onUpdate: any, _ctx: any) {
      const { action, params: ob11Params = {}, _method } = params;
      const method = _method || "GET";
      const isSendAction = action.startsWith("send_") || action.startsWith("set_") || action.startsWith("delete_");
      const usePost = method === "POST" || isSendAction;

      onUpdate?.({ content: [{ type: "text", text: `🔄 ${method} /${action} ${usePost ? JSON.stringify(ob11Params) : Object.entries(ob11Params).map(([k,v])=>`${k}=${v}`).join("&")}` }] });

      try {
        let result: any;
        if (usePost) {
          result = await ob11Post(action, ob11Params);
        } else {
          result = await ob11Get(action, ob11Params);
        }

        // Check for errors
        if (result.retcode !== 0 && result.status !== "ok") {
          return {
            content: [{ type: "text", text: `❌ API错误: retcode=${result.retcode}, message=${result.message || result.wording || "unknown"}` }],
            isError: true,
          };
        }

        // Smart formatting for common responses
        let text = "";
        const data = result.data;

        if (action === "get_login_info") {
          text = `✅ 已登录: ${data.nickname}(${data.user_id})`;
        } else if (action === "get_friend_list") {
          if (!Array.isArray(data) || data.length === 0) {
            text = "好友列表为空";
          } else {
            text = `好友列表 (${data.length}人):\n` + data.map(formatFriend).join("\n");
          }
        } else if (action === "get_group_list") {
          const filtered = GROUP_WHITELIST.size > 0 ? data.filter((g: any) => GROUP_WHITELIST.has(g.group_id)) : data;
          if (!Array.isArray(filtered) || filtered.length === 0) {
            text = "群列表为空";
          } else {
            text = `群列表 (白名单${filtered.length}个/共${data.length}个):\n` + filtered.map(formatGroup).join("\n");
          }
        } else if (action === "get_group_member_list") {
          if (!Array.isArray(data) || data.length === 0) {
            text = "群成员列表为空";
          } else {
            text = `群成员 (${data.length}人):\n` + data.slice(0, 50).map((m: any) =>
              `${m.nickname}(${m.user_id})` + (m.card ? ` 卡片:${m.card}` : "") + (m.role === "admin" ? " [管理]" : m.role === "owner" ? " [群主]" : "")
            ).join("\n");
            if (data.length > 50) text += `\n... 共${data.length}人，只显示前50`;
          }
        } else if (action === "get_friend_msg_history" || action === "get_group_msg_history" || action === "get_chat_history") {
          const msgs = data?.messages || data;
          if (!Array.isArray(msgs) || msgs.length === 0) {
            text = "聊天记录为空";
          } else {
            text = `聊天记录 (${msgs.length}条):\n` + msgs.map(formatMsg).join("\n");
          }
        } else if (action === "send_private_msg" || action === "send_group_msg" || action === "send_msg") {
          text = `✅ 消息已发送, message_id=${data?.message_id}`;
        } else if (action === "delete_msg") {
          text = "✅ 消息已撤回";
        } else if (action.startsWith("set_group_")) {
          text = `✅ 操作成功`;
        } else {
          text = typeof data === "object" ? JSON.stringify(data, null, 2) : String(data);
        }

        return { content: [{ type: "text", text }] };
      } catch (e: any) {
        const msg = e.cause?.code === "ECONNREFUSED"
          ? "连接失败: LLBot 未运行或 HTTP API 未开启 (端口3000)"
          : e.message;
        return { content: [{ type: "text", text: `❌ ${msg}` }], isError: true };
      }
    },
  });

  // ── Tool: qq_msg_recent ─────────────────────────────────────
  pi.registerTool({
    name: "qq_msg_recent",
    label: "QQ Recent Chats",
    description:
      "List recent private and group conversations sorted by time, separated into two sections. " +
      "Shows who you recently chatted with (not individual messages). " +
      "Groups show mute/shut_up and pin/top status. " +
      "Use qq_msg_search with private_history/group_history to read full messages of a specific conversation.",
    promptSnippet: "QQ最近会话: 按时间查看最近私聊和群聊列表",
    promptGuidelines: [
      "Use qq_msg_recent when user asks 'any new messages?', 'who messaged me recently?', 'what's happening on QQ?', etc.",
      "It shows TWO separate lists: private chats (friends) and group chats, sorted by last message time.",
      "Groups are marked with 🔇 (muted/shut_up) and 🔝 (pinned/top).",
      "After showing the list, use qq_msg_search with private_history or group_history to read a specific conversation.",
    ],
    parameters: Type.Object({
      limit: Type.Optional(Type.Number({
        description: "Max conversations per section (default 15). Larger values take longer.",
        default: 15,
      })),
      type: Type.Optional(Type.String({
        description: "'all' (default), 'private' for friends only, 'group' for groups only.",
        enum: ["all", "private", "group"],
        default: "all",
      })),
    }),
    async execute(_toolCallId: string, params: any, _signal: any, onUpdate: any, _ctx: any) {
      const { limit = 15, type = "all" } = params;

      onUpdate?.({ content: [{ type: "text", text: `🔄 正在扫描最近会话...` }] });

      try {
        // 获取自己的 user_id，用于区分"我"和对方
        let selfUserId = 0;
        try {
          const loginInfo = await ob11Get("get_login_info");
          selfUserId = loginInfo.data?.user_id || 0;
        } catch { /* ignore */ }

        const privateChats: Array<{ name: string; id: number; lastTime: number; lastMsg: string; extra?: string }> = [];
        const groupChats: Array<{ name: string; id: number; lastTime: number; lastMsg: string; memberCount: number; isTop: boolean; isShutUp: boolean; isMuted: boolean }> = [];

        const fetchPrivate = type !== "group";
        const fetchGroup = type !== "private";

        const [friendResult, groupResult] = await Promise.all([
          fetchPrivate ? ob11Get("get_friend_list") : Promise.resolve(null),
          fetchGroup ? ob11Get("get_group_list") : Promise.resolve(null),
        ]);

        const friends: any[] = (friendResult?.data) || [];
        const groups: any[] = (groupResult?.data) || [];

        const now = Math.floor(Date.now() / 1000);
        const BATCH_SIZE = 10;

        if (fetchPrivate && friends.length > 0) {
          onUpdate?.({ content: [{ type: "text", text: `📋 扫描 ${friends.length} 个好友...` }] });
          for (let i = 0; i < friends.length; i += BATCH_SIZE) {
            const batch = friends.slice(i, i + BATCH_SIZE);
            const results = await Promise.all(batch.map(async (f: any) => {
              try {
                const r = await ob11Post("get_friend_msg_history", { user_id: f.user_id, count: 1 });
                const msgs = r.data?.messages || r.data;
                if (Array.isArray(msgs) && msgs.length > 0) {
                  const last = msgs[msgs.length - 1];
                  const time = last.time || 0;
                  if (time === 0) return null;
                  const selfId = selfUserId;
                  const sender = last.sender?.user_id === selfId ? "我" : (last.sender?.nickname || String(last.sender?.user_id || "?"));
                  const raw = last.raw_message || "";
                  const preview = raw.length > 40 ? raw.slice(0, 40) + "..." : raw;
                  return { name: f.remark || f.nickname, id: f.user_id, lastTime: time, lastMsg: `${sender}: ${preview}`, extra: f.remark ? f.nickname : undefined };
                }
                return null;
              } catch { return null; }
            }));
            for (const r of results) { if (r) privateChats.push(r); }
          }
        }

        if (fetchGroup && groups.length > 0) {
          const whitelistedGroups = GROUP_WHITELIST.size > 0
            ? groups.filter((g: any) => GROUP_WHITELIST.has(g.group_id))
            : groups;
          onUpdate?.({ content: [{ type: "text", text: `📋 扫描 ${whitelistedGroups.length} 个白名单群 (共${groups.length}个)...` }] });
          for (let i = 0; i < whitelistedGroups.length; i += BATCH_SIZE) {
            const batch = whitelistedGroups.slice(i, i + BATCH_SIZE);
            const results = await Promise.all(batch.map(async (g: any) => {
              try {
                const r = await ob11Post("get_group_msg_history", { group_id: g.group_id, count: 1 });
                const msgs = r.data?.messages || r.data;
                if (Array.isArray(msgs) && msgs.length > 0) {
                  const last = msgs[msgs.length - 1];
                  const time = last.time || 0;
                  if (time === 0) return null;
                  const sender = last.sender?.card || last.sender?.nickname || String(last.sender?.user_id || "?");
                  const raw = last.raw_message || "";
                  const preview = raw.length > 40 ? raw.slice(0, 40) + "..." : raw;
                  const isShutUp = (g.shut_up_all_timestamp || 0) > now || (g.shut_up_me_timestamp || 0) > now;
                  const isMuted = (g.shut_up_me_timestamp || 0) > 0 && g.shut_up_me_timestamp !== 0;
                  return { name: g.group_name, id: g.group_id, lastTime: time, lastMsg: `${sender}: ${preview}`, memberCount: g.member_count, isTop: !!g.is_top, isShutUp, isMuted };
                }
                return null;
              } catch { return null; }
            }));
            for (const r of results) { if (r) groupChats.push(r); }
          }
        }

        // Sort by time descending
        privateChats.sort((a, b) => b.lastTime - a.lastTime);
        groupChats.sort((a, b) => b.lastTime - a.lastTime);

        const fmtTime = (ts: number) => {
          if (!ts) return "";
          const d = new Date(ts * 1000);
          const today = new Date();
          const isToday = d.toDateString() === today.toDateString();
          const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1);
          const isYesterday = d.toDateString() === yesterday.toDateString();
          const time = d.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" });
          if (isToday) return time;
          if (isYesterday) return `昨天${time}`;
          return `${d.getMonth()+1}/${d.getDate()} ${time}`;
        };

        let output = "";
        if (fetchPrivate && privateChats.length > 0) {
          const shown = privateChats.slice(0, limit);
          output += `👤 私聊 (${privateChats.length}个有消息，显示前${shown.length}个)\n`;
          output += shown.map(c => {
            const name = c.extra ? `${c.name}(${c.extra})` : c.name;
            return `  ${fmtTime(c.lastTime)} ${name} [${c.id}]\n  └ ${c.lastMsg}`;
          }).join("\n");
          output += "\n";
        }
        if (fetchGroup && groupChats.length > 0) {
          const shown = groupChats.slice(0, limit);
          output += `\n👥 群聊 (${groupChats.length}个有消息，显示前${shown.length}个)\n`;
          output += shown.map(g => {
            const badges = [];
            if (g.isTop) badges.push("🔝");
            if (g.isMuted) badges.push("🔇");
            else if (g.isShutUp) badges.push("🔕");
            const badge = badges.length ? " " + badges.join("") : "";
            return `  ${fmtTime(g.lastTime)} ${g.name}(${g.memberCount}人) [${g.id}]${badge}\n  └ ${g.lastMsg}`;
          }).join("\n");
        }

        if (!output) output = "暂无最近消息";
        return { content: [{ type: "text", text: output }] };
      } catch (e: any) {
        return { content: [{ type: "text", text: `❌ ${e.message}` }], isError: true };
      }
    },
  });

  // ── Tool: qq_msg_search ─────────────────────────────────────
  pi.registerTool({
    name: "qq_msg_search",
    label: "QQ Message Search",
    description:
      "Search for a friend or group by name/keyword, then get recent chat history. " +
      "Two-step convenience tool: 1) find target 2) fetch messages.",
    promptSnippet: "搜索QQ好友/群并查看聊天记录",
    promptGuidelines: [
      "Use qq_msg_search when user wants to find a specific person or group and read messages.",
      "Step 1: search_type='friend' or 'group' with keyword to find the target.",
      "Step 2: use the returned user_id/group_id with search_type='private_history' or 'group_history' to fetch messages.",
      "For a quick overview of all recent conversations sorted by time, use qq_msg_recent instead.",
    ],
    parameters: Type.Object({
      search_type: Type.String({
        description: "'friend' to search friends, 'group' to search groups, 'private_history' to get DM history, 'group_history' to get group history",
        enum: ["friend", "group", "private_history", "group_history"],
      }),
      keyword: Type.Optional(Type.String({
        description: "Search keyword for friend/group name (fuzzy match). Required for friend/group search.",
      })),
      user_id: Type.Optional(Type.Number({
        description: "Target user_id for private_history.",
      })),
      group_id: Type.Optional(Type.Number({
        description: "Target group_id for group_history.",
      })),
      count: Type.Optional(Type.Number({
        description: "Number of messages to fetch (default 20, max 50).",
        default: 20,
      })),
    }),
    async execute(_toolCallId: string, params: any, _signal: any, _onUpdate: any, _ctx: any) {
      const { search_type, keyword, user_id, group_id, count = 20 } = params;

      try {
        if (search_type === "friend") {
          const result = await ob11Get("get_friend_list");
          const friends = result.data || [];
          const matches = keyword
            ? friends.filter((f: any) =>
                (f.nickname + f.remark + String(f.user_id)).toLowerCase().includes(keyword.toLowerCase())
              )
            : friends;
          if (matches.length === 0) return { content: [{ type: "text", text: `未找到匹配"${keyword}"的好友` }] };
          const text = `找到 ${matches.length} 个好友:\n` + matches.map(formatFriend).join("\n");
          return { content: [{ type: "text", text }] };
        }

        if (search_type === "group") {
          const result = await ob11Get("get_group_list");
          const groups = result.data || [];
          const matches = keyword
            ? groups.filter((g: any) =>
                (g.group_name + String(g.group_id)).toLowerCase().includes(keyword.toLowerCase())
              )
            : groups;
          if (matches.length === 0) return { content: [{ type: "text", text: `未找到匹配"${keyword}"的群` }] };
          const text = `找到 ${matches.length} 个群:\n` + matches.map(formatGroup).join("\n");
          return { content: [{ type: "text", text }] };
        }

        if (search_type === "private_history") {
          if (!user_id) return { content: [{ type: "text", text: "需要提供 user_id" }], isError: true };
          const result = await ob11Post("get_friend_msg_history", {
            user_id,
            count: Math.min(count, 50),
          });
          const msgs = (result.data?.messages || result.data) || [];
          if (!Array.isArray(msgs) || msgs.length === 0) return { content: [{ type: "text", text: "聊天记录为空" }] };
          const text = `与 ${user_id} 的私聊记录 (${msgs.length}条):\n` + msgs.map(formatMsg).join("\n");
          return { content: [{ type: "text", text }] };
        }

        if (search_type === "group_history") {
          if (!group_id) return { content: [{ type: "text", text: "需要提供 group_id" }], isError: true };
          const result = await ob11Post("get_group_msg_history", {
            group_id,
            count: Math.min(count, 50),
          });
          const msgs = (result.data?.messages || result.data) || [];
          if (!Array.isArray(msgs) || msgs.length === 0) return { content: [{ type: "text", text: "聊天记录为空" }] };
          const text = `群 ${group_id} 的聊天记录 (${msgs.length}条):\n` + msgs.map(formatMsg).join("\n");
          return { content: [{ type: "text", text }] };
        }

        return { content: [{ type: "text", text: `未知 search_type: ${search_type}` }], isError: true };
      } catch (e: any) {
        return { content: [{ type: "text", text: `❌ ${e.message}` }], isError: true };
      }
    },
  });

  // ── Commands ───────────────────────────────────────────────

  pi.registerCommand("qq-recent", {
    description: "查看最近的QQ会话 (按时间排序)",
    handler: async (_args: string, ctx: any) => {
      try {
        const conversations: Array<{ name: string; id: number; type: string; lastMsg: string; time: number; timeStr: string }> = [];
        const [friendResult, groupResult] = await Promise.all([
          ob11Get("get_friend_list"),
          ob11Get("get_group_list"),
        ]);
        const friends = friendResult.data || [];
        const groups = groupResult.data || [];
        // Sample: check top friends and groups for recent messages
        const BATCH = 15;
        const fBatch = friends.slice(0, BATCH);
        const gBatch = groups.slice(0, BATCH);
        const results = await Promise.all([
          ...fBatch.map((f: any) => ob11Post("get_friend_msg_history", { user_id: f.user_id, count: 1 }).then(r => ({ r, f, t: "private" })).catch(() => null)),
          ...gBatch.map((g: any) => ob11Post("get_group_msg_history", { group_id: g.group_id, count: 1 }).then(r => ({ r, g, t: "group" })).catch(() => null)),
        ]);
        for (const item of results) {
          if (!item) continue;
          const msgs = item.r?.data?.messages || item.r?.data || [];
          if (!Array.isArray(msgs) || msgs.length === 0) continue;
          const last = msgs[msgs.length - 1];
          const time = last.time || 0;
          const name = item.t === "private" ? (item.f.remark || item.f.nickname) : item.g.group_name;
          const id = item.t === "private" ? item.f.user_id : item.g.group_id;
          conversations.push({ name, id, type: item.t, lastMsg: formatMsg(last).slice(0, 80), time, timeStr: time ? new Date(time * 1000).toLocaleString("zh-CN") : "" });
        }
        conversations.sort((a, b) => b.time - a.time);
        const top = conversations.slice(0, 15);
        const lines = top.map(c => `${c.type === "private" ? "👤" : "👥"} ${c.name} [${c.id}]\n   ${c.timeStr} | ${c.lastMsg}`);
        ctx.ui.notify(`📬 最近会话:\n${lines.join("\n")}`, "info");
      } catch (e: any) {
        ctx.ui.notify(`❌ ${e.message}`, "error");
      }
    },
  });

  pi.registerCommand("qq-msg", {
    description: "快速查看QQ消息 (用法: /qq-msg <好友名或群名>)",
    handler: async (args: string, ctx: any) => {
      if (!args) {
        ctx.ui.notify("用法: /qq-msg <关键词> — 搜索好友/群并查看最近消息", "info");
        return;
      }
      try {
        const friendResult = await ob11Get("get_friend_list");
        const friends = (friendResult.data || []).filter((f: any) =>
          (f.nickname + f.remark + String(f.user_id)).toLowerCase().includes(args.toLowerCase())
        );
        if (friends.length > 0) {
          const f = friends[0];
          const msgResult = await ob11Post("get_friend_msg_history", {
            user_id: f.user_id, count: 10,
          });
          const msgs = ((msgResult.data?.messages || msgResult.data) || []).map(formatMsg).join("\n");
          ctx.ui.notify(`📩 ${f.nickname}(${f.user_id}) 的私聊:\n${msgs || "无消息"}`, "info");
          return;
        }
        const groupResult = await ob11Get("get_group_list");
        const groups = (groupResult.data || []).filter((g: any) =>
          (g.group_name + String(g.group_id)).toLowerCase().includes(args.toLowerCase())
        );
        if (groups.length > 0) {
          const g = groups[0];
          const msgResult = await ob11Post("get_group_msg_history", {
            group_id: g.group_id, count: 10,
          });
          const msgs = ((msgResult.data?.messages || msgResult.data) || []).map(formatMsg).join("\n");
          ctx.ui.notify(`📩 [${g.group_name}](${g.group_id}) 的群聊:\n${msgs || "无消息"}`, "info");
          return;
        }
        ctx.ui.notify(`未找到匹配"${args}"的好友或群`, "info");
      } catch (e: any) {
        ctx.ui.notify(`❌ ${e.message}`, "error");
      }
    },
  });

  pi.registerCommand("qq-friends", {
    description: "查看QQ好友列表",
    handler: async (_args: string, ctx: any) => {
      try {
        const result = await ob11Get("get_friend_list");
        const friends = result.data || [];
        ctx.ui.notify(`好友列表 (${friends.length}人):\n` + friends.map(formatFriend).join("\n"), "info");
      } catch (e: any) {
        ctx.ui.notify(`❌ ${e.message}`, "error");
      }
    },
  });

  pi.registerCommand("qq-groups", {
    description: "查看QQ群列表",
    handler: async (_args: string, ctx: any) => {
      try {
        const result = await ob11Get("get_group_list");
        const groups = result.data || [];
        ctx.ui.notify(`群列表 (${groups.length}个):\n` + groups.map(formatGroup).join("\n"), "info");
      } catch (e: any) {
        ctx.ui.notify(`❌ ${e.message}`, "error");
      }
    },
  });

  pi.registerCommand("qq-send", {
    description: "发送QQ消息 (用法: /qq-send <好友名或群名> <消息内容>)",
    handler: async (args: string, ctx: any) => {
      const parts = args.split(/\s+/);
      if (parts.length < 2) {
        ctx.ui.notify("用法: /qq-send <好友名/群名> <消息内容>", "info");
        return;
      }
      const target = parts[0];
      const message = parts.slice(1).join(" ");

      try {
        const friendResult = await ob11Get("get_friend_list");
        const friends = (friendResult.data || []).filter((f: any) =>
          (f.nickname + f.remark + String(f.user_id)).toLowerCase().includes(target.toLowerCase())
        );
        if (friends.length > 0) {
          const f = friends[0];
          const sendResult = await ob11Post("send_private_msg", {
            user_id: f.user_id,
            message,
          });
          ctx.ui.notify(`✅ 已发送给 ${f.nickname}(${f.user_id}), msg_id=${sendResult.data?.message_id}`, "info");
          return;
        }
        const groupResult = await ob11Get("get_group_list");
        const groups = (groupResult.data || []).filter((g: any) =>
          (g.group_name + String(g.group_id)).toLowerCase().includes(target.toLowerCase())
        );
        if (groups.length > 0) {
          const g = groups[0];
          const sendResult = await ob11Post("send_group_msg", {
            group_id: g.group_id,
            message,
          });
          ctx.ui.notify(`✅ 已发送到 [${g.group_name}](${g.group_id}), msg_id=${sendResult.data?.message_id}`, "info");
          return;
        }
        ctx.ui.notify(`未找到匹配"${target}"的好友或群`, "info");
      } catch (e: any) {
        ctx.ui.notify(`❌ ${e.message}`, "error");
      }
    },
  });

  // ── Inject skill path ───────────────────────────────────────
  pi.on("resources_discover", async () => {
    return { skillPaths: [SKILL_DIR] };
  });
}