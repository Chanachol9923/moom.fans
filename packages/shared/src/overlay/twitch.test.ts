import { describe, expect, it } from "vitest";
import { parsePrivmsg } from "./twitch";

describe("parsePrivmsg", () => {
  it("parses tagged messages", () => {
    const line =
      "@badge-info=;color=#FF0000;display-name=NokNoi;emotes= :noknoi!noknoi@noknoi.tmi.twitch.tv PRIVMSG #moom :สวัสดีจ้า";
    expect(parsePrivmsg(line)).toEqual({ user: "noknoi", displayName: "NokNoi", text: "สวัสดีจ้า" });
  });

  it("ignores other lines", () => {
    expect(parsePrivmsg(":tmi.twitch.tv 001 justinfan123 :Welcome")).toBeNull();
    expect(parsePrivmsg("PING :tmi.twitch.tv")).toBeNull();
  });
});
