// Read-only Twitch chat over IRC-over-WebSocket with an anonymous "justinfan" login.
// No OAuth needed for reading public chat.

export type ChatMessage = { user: string; displayName: string; text: string };

export function parsePrivmsg(line: string): ChatMessage | null {
  // @tags :user!user@user.tmi.twitch.tv PRIVMSG #channel :message
  const m = line.match(/^(?:@(\S+) )?:(\w+)!\S+ PRIVMSG #\w+ :(.*)$/);
  if (!m) return null;
  const tags = Object.fromEntries((m[1] ?? "").split(";").map((kv) => kv.split("=") as [string, string]));
  return { user: m[2].toLowerCase(), displayName: tags["display-name"] || m[2], text: m[3] };
}

export function connectTwitchChat(channel: string, onMessage: (m: ChatMessage) => void): () => void {
  let ws: WebSocket | null = null;
  let stopped = false;
  let retry = 1000;

  const open = () => {
    ws = new WebSocket("wss://irc-ws.chat.twitch.tv:443");
    ws.onopen = () => {
      retry = 1000;
      ws!.send("CAP REQ :twitch.tv/tags");
      ws!.send("PASS SCHMOOPIIE");
      ws!.send(`NICK justinfan${Math.floor(10000 + Math.random() * 80000)}`);
      ws!.send(`JOIN #${channel.toLowerCase()}`);
    };
    ws.onmessage = (ev) => {
      for (const line of String(ev.data).split("\r\n")) {
        if (!line) continue;
        if (line.startsWith("PING")) {
          ws?.send(line.replace("PING", "PONG"));
          continue;
        }
        const msg = parsePrivmsg(line);
        if (msg) onMessage(msg);
      }
    };
    ws.onclose = () => {
      if (stopped) return;
      setTimeout(open, retry);
      retry = Math.min(retry * 2, 30_000);
    };
  };
  open();

  return () => {
    stopped = true;
    ws?.close();
  };
}
