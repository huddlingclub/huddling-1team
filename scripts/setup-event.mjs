import { createClient } from "@supabase/supabase-js";
import { randomBytes, createHash } from "node:crypto";
import { appendFileSync, chmodSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const envPath = resolve(".env.local");
if (!existsSync(envPath)) throw new Error(".env.local 파일이 필요합니다.");
const parse = (text) => Object.fromEntries(text.split(/\r?\n/).filter((line) => /^[A-Za-z_][A-Za-z0-9_]*=/.test(line))
  .map((line) => { const i = line.indexOf("="); return [line.slice(0, i), line.slice(i + 1).replace(/^["']|["']$/g, "")]; }));
const vars = parse(readFileSync(envPath, "utf8"));
const projectUrl = vars.SUPABASE_URL;
const secret = vars.SUPABASE_SECRET_KEY;
if (!projectUrl || !secret) throw new Error("Supabase URL과 서버 키가 .env.local에 필요합니다.");
const baseArgument = process.argv.indexOf("--base-url");
if (baseArgument !== -1 && !process.argv[baseArgument + 1]) throw new Error("--base-url 뒤에 주소가 필요합니다.");
const base = new URL(baseArgument !== -1 ? process.argv[baseArgument + 1] : vars.NEXT_PUBLIC_APP_URL || "http://localhost:3000");
if (!["http:", "https:"].includes(base.protocol) || base.username || base.password) throw new Error("올바른 웹 주소가 필요합니다.");
const token = () => randomBytes(32).toString("base64url");
const digest = (value) => createHash("sha256").update(value).digest("hex");

const names = ["HUDDLING_EVENT_TOKEN", ...Array.from({ length: 15 }, (_, index) => "HUDDLING_HOST_TOKEN_" + String(index + 1).padStart(2, "0"))];
const additions = [];
for (const name of names) {
  if (!vars[name]) { vars[name] = token(); additions.push(name + "=" + vars[name]); }
  if (!/^[A-Za-z0-9_-]{43}$/.test(vars[name])) throw new Error(name + " 형식을 확인해 주세요.");
}
if (additions.length) appendFileSync(envPath, "\n" + additions.join("\n") + "\n", { mode: 0o600 });
chmodSync(envPath, 0o600);

const db = createClient(projectUrl, secret, { auth: { persistSession: false, autoRefreshToken: false } });
const inviteHash = digest(vars.HUDDLING_EVENT_TOKEN);
const { data: existing, error: readError } = await db.from("ice_rooms").select("id,name,team_number,host_hash")
  .eq("invite_hash", inviteHash).not("team_number", "is", null);
if (readError) throw new Error("행사 조 조회에 실패했습니다. DB 마이그레이션을 확인해 주세요.");
for (const room of existing || []) {
  const key = "HUDDLING_HOST_TOKEN_" + String(room.team_number).padStart(2, "0");
  if (!vars[key] || digest(vars[key]) !== room.host_hash) throw new Error(room.team_number + "조 팀장 토큰이 기존 방과 다릅니다. 덮어쓰지 않았습니다.");
}
const have = new Set((existing || []).map((room) => room.team_number));
const missing = Array.from({ length: 15 }, (_, i) => i + 1).filter((n) => !have.has(n)).map((number) => ({
  name: number + "조", team_number: number, invite_hash: inviteHash,
  host_hash: digest(vars["HUDDLING_HOST_TOKEN_" + String(number).padStart(2, "0")]),
}));
if (missing.length) {
  const { error } = await db.from("ice_rooms").insert(missing);
  if (error) throw new Error("행사 조 생성에 실패했습니다. 기존 데이터는 삭제하지 않았습니다.");
}
const { data: teams, error: teamError } = await db.from("ice_rooms").select("id,team_number")
  .eq("invite_hash", inviteHash).not("team_number", "is", null).order("team_number");
if (teamError || teams?.length !== 15) throw new Error("15개 조 확인에 실패했습니다.");
const linksFile = resolve(".env.huddling-links-" + digest(base.origin).slice(0, 8) + ".local");
if (!existsSync(linksFile)) {
  const eventUrl = new URL("/event", base);
  eventUrl.hash = vars.HUDDLING_EVENT_TOKEN;
  const lines = ["# 비공개 초대 링크: GitHub·채팅·로그에 전체 목록을 올리지 마세요.", "EVENT_LINK='" + eventUrl.toString() + "'"];
  for (const team of teams) {
    const url = new URL("/room/" + team.id, base);
    url.hash = new URLSearchParams({ host: vars["HUDDLING_HOST_TOKEN_" + String(team.team_number).padStart(2, "0")], event: vars.HUDDLING_EVENT_TOKEN }).toString();
    lines.push("TEAM_" + String(team.team_number).padStart(2, "0") + "_HOST_LINK='" + url.toString() + "'");
  }
  writeFileSync(linksFile, lines.join("\n") + "\n", { mode: 0o600, flag: "wx" });
}
console.log("15개 조 준비 완료. 행사 링크와 팀장 링크는 로컬 비공개 파일에 저장했습니다:", linksFile);
