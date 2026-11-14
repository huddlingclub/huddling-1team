import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { cookieName, hashToken } from "../../lib/server";
import { GET as teamsGET } from "./teams/route";
import { GET as publicGET } from "./rooms/[id]/public/route";
import { POST as hostPOST } from "./host-claim/route";
import { GET as eventGET } from "./events/current/route";
import { GET as roomGET } from "./rooms/[id]/route";
import { GET as leaderGET } from "./rooms/[id]/leader/route";
import { POST as profilePOST } from "./rooms/[id]/profiles/route";
import { POST as topicsPOST } from "./rooms/[id]/topics/route";
import { POST as analysisPOST } from "./rooms/[id]/analysis/route";

vi.mock("server-only", () => ({}));
vi.mock("@supabase/supabase-js", () => ({ createClient: () => db }));
vi.mock("@/lib/ai-server", () => ({ createQuestions: vi.fn(async () => ({ questions: ["하나", "둘", "셋"], source: "basic" })) }));

type Row = Record<string, string | number | string[] | null>;
let tables: Record<string, Row[]>;
let failedTable: string | null;
let saveFails: boolean;
const eventToken = "e".repeat(43), otherEventToken = "o".repeat(43), hostToken = "h".repeat(43), profileToken = "p".repeat(43);
const r1 = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", r2 = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb", r3 = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const appOrigin = "http://localhost:3000";
const oldTime = "2026-11-14T01:00:00.000Z", newTime = "2026-11-14T02:00:00.000Z";

// In-memory Supabase transport. Production auth, cookie and route code run unchanged.
class Query {
  filters: ((row: Row) => boolean)[] = [];
  ordering: string[] = [];
  fields = "";
  one = false;
  updateValues: Row | undefined;
  constructor(readonly table: string) {}
  select(fields: string, _options?: { count?: string; head?: boolean }) { this.fields = fields; return this; }
  update(values: Row) { this.updateValues = values; return this; }
  is(key: string, value: unknown) { return this.eq(key, value); }
  eq(key: string, value: unknown) { this.filters.push((row) => row[key] === value); return this; }
  in(key: string, values: unknown[]) { this.filters.push((row) => values.includes(row[key])); return this; }
  not(key: string, _operator: string, value: unknown) { this.filters.push((row) => row[key] !== value); return this; }
  gte(key: string, value: number) { this.filters.push((row) => typeof row[key] === "number" && row[key] >= value); return this; }
  lte(key: string, value: number) { this.filters.push((row) => typeof row[key] === "number" && row[key] <= value); return this; }
  lt(key: string, value: number) { this.filters.push((row) => typeof row[key] === "number" && row[key] < value); return this; }
  order(key: string) { this.ordering.push(key); return this; }
  limit(_n: number) { return this; }
  single() { this.one = true; return this; }
  maybeSingle() { this.one = true; return this; }
  then(resolve: (value: { data: unknown; error: unknown; count: number }) => unknown) {
    const rows = (tables[this.table] || []).filter((row) => this.filters.every((filter) => filter(row))).sort((a, b) => {
      for (const key of this.ordering) {
        if (a[key] === b[key]) continue;
        return a[key]! < b[key]! ? -1 : 1;
      }
      return 0;
    }).map((row) => {
      if (this.updateValues) Object.assign(row, this.updateValues);
      return Object.fromEntries(this.fields.split(",").map((key) => [key, row[key]]));
    });
    return Promise.resolve({ data: this.one ? rows[0] || null : rows, error: failedTable === this.table ? { message: "unavailable" } : null, count: rows.length }).then(resolve);
  }
}
const db = {
  from: (table: string) => new Query(table),
  rpc: vi.fn(async (name: string, args: Record<string, unknown>) => {
    if (name === "ice_claim_host_profile") {
      const target = tables.ice_rooms.find((row) => row.id === args.p_room && row.invite_hash === args.p_event_hash && row.host_name === null);
      if (!target) return { data: null, error: null };
    }
    if (name === "ice_join_profile" || name === "ice_claim_host_profile") {
      tables.ice_profiles.push({ id: "new-profile", room_id: String(args.p_room), token_hash: String(args.p_token_hash),
        name: String(args.p_name), occupation: String(args.p_occupation), experience: String(args.p_experience),
        domains: args.p_domains as string[], introduction: String(args.p_introduction), social_url: String(args.p_social_url), created_at: newTime });
      if (name === "ice_claim_host_profile") {
        Object.assign(tables.ice_rooms.find((row) => row.id === args.p_room)!, {
          host_name: args.p_name, host_hash: args.p_host_hash, host_profile_id: "new-profile" });
      }
      return { data: "new-profile", error: null };
    }
    if (name === "ice_begin_questions") return { data: "generation", error: null };
    if (saveFails) return { data: false, error: null };
    const room = tables.ice_rooms.find((row) => row.id === args.p_room)!;
    room.topics_generated_at = newTime;
    return { data: true, error: null };
  }),
};
const params = (id = r1) => ({ params: Promise.resolve({ id }) });
const profileInput = { name: "새 참가자", occupation: "개발", experience: "2~4년", domains: ["AI"], introduction: "백엔드 개발", socialUrl: "", consent: true };
function request(path: string, cookies: Record<string, string> = {}, body?: unknown, origin = "http://localhost:3000") {
  return new NextRequest("http://localhost:3000" + path, { method: body === undefined ? "GET" : "POST",
    headers: { cookie: Object.entries(cookies).map(([key, value]) => `${key}=${value}`).join("; "), origin, "content-type": "application/json" },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
}
function room(id: string, number: number | null, token = eventToken): Row {
  return { id, name: `${number}조`, team_number: number, invite_hash: hashToken(token), host_hash: hashToken(hostToken), phase: "collecting", host_name: number === 1 ? "팀장" : null, host_profile_id: number === 1 ? "mine" : null, topics_generated_at: oldTime };
}
function profile(id: string, roomId: string, createdAt: string, token = profileToken): Row {
  return { id, room_id: roomId, name: id, occupation: "개발", experience: "2~4년", domains: ["AI"], introduction: "백엔드 개발",
    social_url: "https://example.com/private", token_hash: hashToken(token), created_at: createdAt };
}
beforeEach(() => {
  vi.stubEnv("SUPABASE_URL", "https://example.supabase.co");
  vi.stubEnv("SUPABASE_SECRET_KEY", "test-placeholder");
  vi.stubEnv("HUDDLING_EVENT_TOKEN", eventToken);
  vi.stubEnv("NEXT_PUBLIC_APP_URL", "http://localhost:3000");
  tables = { ice_rooms: [room(r2, 2), room(r3, 1, otherEventToken), room(r1, 1)],
    ice_profiles: [profile("later", r1, newTime, "l".repeat(43)), profile("other-event", r3, oldTime, "x".repeat(43)), profile("mine", r1, oldTime)],
    ice_questions: [{ id: "q", room_id: r1, text: "주제", position: 0, source: "basic" }] };
  failedTable = null; saveFails = false; db.rpc.mockClear();
});

describe("행사 전체 카드", () => {
  it("초대가 없거나 잘못된 행사 쿠키가 있어도 서버 행사만 공개한다", async () => {
    for (const cookies of [{}, { ice_event: "bad" }, { ice_event: "x".repeat(43) }, { [cookieName("room", r1)]: "x".repeat(43) }]) {
      const response = await eventGET(request("/api/events/current", cookies));
      expect(response.status).toBe(200);
      expect((await response.json()).teams.map((team: { id: string }) => team.id)).toEqual([r1, r2]);
    }
  });
  it("조·카드를 정렬하고 행사 밖 카드와 민감 필드를 제외한다", async () => {
    const response = await eventGET(request("/api/events/current", { ice_event: eventToken, [cookieName("profile", r1)]: profileToken }));
    expect(response.status).toBe(200); expect(response.headers.get("cache-control")).toBe("no-store");
    const data = await response.json();
    expect(data.myRoomId).toBe(r1); expect(data.teams.map((team: { number: number }) => team.number)).toEqual([1, 2]);
    expect(data.teams[0].cards.map((card: { id: string }) => card.id)).toEqual(["mine", "later"]);
    expect(data.teams.map((team: { count: number }) => team.count)).toEqual([2, 0]);
    expect(data.teams[0].cards[0]).not.toHaveProperty("token_hash"); expect(data.teams[0].cards[0]).not.toHaveProperty("social_url");
    expect(JSON.stringify(data)).not.toContain("other-event"); expect(data.teams[0]).not.toHaveProperty("invite_hash");
  });
  it("조 쿠키만 있어도 행사 목록과 내 조를 반환한다", async () => {
    const data = await (await eventGET(request("/api/events/current", { [cookieName("room", r2)]: eventToken }))).json();
    expect(data.teams).toHaveLength(2); expect(data.myRoomId).toBe(r2);
  });
  it("만료된 행사 쿠키가 있어도 유효한 조 쿠키로 조회한다", async () => {
    expect((await eventGET(request("/api/events/current", { ice_event: "x".repeat(43), [cookieName("room", r2)]: eventToken }))).status).toBe(200);
  });
  it("행사 쿠키만 있으면 내 조는 null이다", async () => {
    expect((await (await eventGET(request("/api/events/current", { ice_event: eventToken }))).json()).myRoomId).toBeNull();
  });
  it("프로필 쿠키는 원래 조와 토큰이 모두 맞아야 한다", async () => {
    const data = await (await eventGET(request("/api/events/current", { ice_event: eventToken, [cookieName("profile", r2)]: profileToken }))).json();
    expect(data.myRoomId).toBeNull();
  });
  it("조회 실패는 빈 성공 응답 대신 503이다", async () => {
    failedTable = "ice_profiles";
    expect((await eventGET(request("/api/events/current", { ice_event: eventToken }))).status).toBe(503);
  });
});

describe("제출·조 정보", () => {
  it("다른 조에 다시 제출해도 기존 카드 조 id와 409를 반환한다", async () => {
    const response = await profilePOST(request(`/api/rooms/${r2}/profiles`, { ice_event: eventToken, [cookieName("profile", r1)]: profileToken }, profileInput), params(r2));
    expect(response.status).toBe(409); expect((await response.json()).roomId).toBe(r1); expect(db.rpc).not.toHaveBeenCalled();
  });
  it("같은 조의 중복 제출도 409와 roomId를 반환한다", async () => {
    const response = await profilePOST(request(`/api/rooms/${r1}/profiles`, { ice_event: eventToken, [cookieName("profile", r1)]: profileToken }, profileInput), params());
    expect(response.status).toBe(409); expect((await response.json()).roomId).toBe(r1);
  });
  it("다른 행사 쿠키가 있어도 행사 밖 공개 등록은 404다", async () => {
    const response = await profilePOST(request(`/api/rooms/${r3}/profiles`, { ice_event: otherEventToken, [cookieName("profile", r1)]: profileToken }, profileInput), params(r3));
    expect(response.status).toBe(404); expect(db.rpc).not.toHaveBeenCalled();
  });
  it("쿠키 없이 등록하고 profile·room 쿠키를 발급하며 재제출은 409다", async () => {
    const response = await profilePOST(request("/profiles", {}, profileInput), params());
    expect(response.status).toBe(200);
    const token = response.cookies.get(cookieName("profile", r1))?.value;
    expect(token).toBeTruthy(); expect(response.cookies.get(cookieName("room", r1))?.value).toBe(eventToken);
    expect(response.cookies.get(cookieName("profile", r1))?.httpOnly).toBe(true);
    const duplicate = await profilePOST(request("/profiles", { [cookieName("profile", r1)]: token! }, profileInput), params(r2));
    expect(duplicate.status).toBe(409); expect((await duplicate.json()).roomId).toBe(r1);
  });
  it("잘못된 입력과 외부 출처의 등록을 차단한다", async () => {
    expect((await profilePOST(request("/profiles", {}, profileInput, "https://example.com"), params())).status).toBe(403);
    expect((await profilePOST(request("/profiles", { ice_event: eventToken }, {}), params())).status).toBe(400);
  });
  it("조 인원·생성 시각·본인 카드와 기존 주제를 함께 반환한다", async () => {
    const data = await (await roomGET(request("/room", { ice_event: eventToken, [cookieName("profile", r1)]: profileToken }), params())).json();
    expect(data.profileCount).toBe(2); expect(data.generatedAt).toBe(oldTime); expect(data.myProfileId).toBe("mine");
    expect(data.questions).toEqual([{ id: "q", text: "주제" }]); expect(data.isHost).toBe(false);
    tables.ice_rooms.find((row) => row.id === r1)!.topics_generated_at = null;
    expect((await (await roomGET(request("/room", { ice_event: eventToken }), params())).json()).generatedAt).toBeNull();
  });
});

describe("팀장 현황·주제 생성", () => {
  it("팀원·행사 쿠키와 다른 조 팀장 쿠키는 팀장 현황을 조회할 수 없다", async () => {
    for (const cookies of [{}, { ice_event: eventToken }, { [cookieName("room", r1)]: eventToken }, { [cookieName("host", r2)]: hostToken }]) {
      expect((await leaderGET(request("/leader", cookies), params())).status).toBe(403);
    }
  });
  it("팀장은 초대 링크·인원·등록순 이름을 조회한다", async () => {
    const response = await leaderGET(request("/leader", { [cookieName("host", r1)]: hostToken }), params());
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(await response.json()).toEqual({ inviteUrl: `${appOrigin}/event#${eventToken}`, count: 2, names: ["mine", "later"] });
  });
  it("독립 조에는 조 참여 링크를 반환한다", async () => {
    tables.ice_rooms.find((row) => row.id === r1)!.team_number = null;
    const data = await (await leaderGET(request("/leader", { [cookieName("host", r1)]: hostToken, [cookieName("room", r1)]: eventToken }), params())).json();
    expect(data.inviteUrl).toBe(`${appOrigin}/room/${r1}/join#${eventToken}`);
  });
  it("초대 원본을 복원할 수 없으면 잘못된 링크를 만들지 않는다", async () => {
    vi.stubEnv("HUDDLING_EVENT_TOKEN", "");
    expect((await leaderGET(request("/leader", { [cookieName("host", r1)]: hostToken }), params())).status).toBe(503);
  });
  it("topics와 analysis는 같은 핸들러이며 저장 성공 시각을 반환한다", async () => {
    expect(topicsPOST).toBe(analysisPOST);
    const response = await topicsPOST(request("/topics", { [cookieName("host", r1)]: hostToken }, {}), params());
    expect(response.status).toBe(200); expect(await response.json()).toEqual({ source: "basic", generatedAt: newTime });
  });
  it("팀원과 다른 출처의 주제 생성은 저장을 호출하지 않는다", async () => {
    expect((await topicsPOST(request("/topics", { ice_event: eventToken }, {}), params())).status).toBe(403);
    expect((await topicsPOST(request("/topics", { [cookieName("host", r1)]: hostToken }, {}, "https://example.com"), params())).status).toBe(403);
    expect(db.rpc).not.toHaveBeenCalled();
  });
  it("주제 저장 실패는 이전 성공 시각을 바꾸지 않는다", async () => {
    saveFails = true;
    expect((await topicsPOST(request("/topics", { [cookieName("host", r1)]: hostToken }, {}), params())).status).toBe(503);
    expect(tables.ice_rooms.find((row) => row.id === r1)!.topics_generated_at).toBe(oldTime);
  });
});


describe("v3 공개 API 계약", () => {
  it("공개 teams는 정렬한 요약과 hostName·count만 정확히 반환한다", async () => {
    const response = await teamsGET(request("/api/teams"));
    expect(response.status).toBe(200); expect(response.headers.get("cache-control")).toBe("no-store");
    expect(await response.json()).toEqual({ event: { name: "허들링 아이스브레이커" }, myRoomId: null,
      teams: [{ id: r1, number: 1, name: "1조", count: 2, hostName: "팀장" }, { id: r2, number: 2, name: "2조", count: 0, hostName: null }] });
  });
  it("공개 teams도 본인 카드 쿠키로 내 조를 찾고 다른 행사 쿠키는 무시한다", async () => {
    const data = await (await teamsGET(request("/api/teams", { ice_event: otherEventToken, [cookieName("profile", r1)]: profileToken }))).json();
    expect(data.myRoomId).toBe(r1); expect(data.teams.map((team: { id: string }) => team.id)).toEqual([r1, r2]);
  });
  it("공개 조 메타데이터는 정확한 계약 응답을 반환한다", async () => {
    const response = await publicGET(request("/public"), params());
    expect(response.status).toBe(200); expect(response.headers.get("cache-control")).toBe("no-store");
    expect(await response.json()).toEqual({ id: r1, number: 1, name: "1조", count: 2, hostName: "팀장" });
  });
  it("공개 조는 다른 행사·독립 조·잘못된 id를 404로 처리한다", async () => {
    expect((await publicGET(request("/public"), params(r3))).status).toBe(404);
    expect((await publicGET(request("/public"), params("invalid"))).status).toBe(404);
    tables.ice_rooms.find((row) => row.id === r1)!.team_number = null;
    expect((await publicGET(request("/public"), params())).status).toBe(404);
  });
  it("조 1~15 범위를 벗어난 데이터는 공개 조회와 등록에서 제외한다", async () => {
    tables.ice_rooms.find((row) => row.id === r1)!.team_number = 16;
    expect((await (await teamsGET(request("/api/teams"))).json()).teams).toHaveLength(1);
    expect((await publicGET(request("/public"), params())).status).toBe(404);
    expect((await profilePOST(request("/profiles", {}, profileInput), params())).status).toBe(404);
  });
  it.each([0, 16])("공개 범위 밖 %i조 카드 쿠키는 현재 행사 등록을 막지 않는다", async (number) => {
    tables.ice_rooms.find((row) => row.id === r1)!.team_number = number;
    const response = await profilePOST(request("/profiles", { [cookieName("profile", r1)]: profileToken }, profileInput), params(r2));
    expect(response.status).toBe(200);
  });
  it("조 페이지도 초대 없이 열람되며 팀장 권한은 생기지 않는다", async () => {
    const response = await roomGET(request("/room"), params());
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.profileCount).toBe(2); expect(data.myProfileId).toBeNull(); expect(data.isHost).toBe(false); expect(data.generatedAt).toBe(oldTime);
    expect((await roomGET(request("/room"), params(r3))).status).toBe(404);
    const host = await (await roomGET(request("/room", { [cookieName("host", r1)]: hostToken }), params())).json();
    expect(host.isHost).toBe(true);
  });
  it("서버 행사 설정이 없으면 쿠키를 행사 설정으로 대신 쓰지 않는다", async () => {
    vi.stubEnv("HUDDLING_EVENT_TOKEN", "");
    const cookies = { ice_event: eventToken, [cookieName("room", r1)]: eventToken };
    expect((await teamsGET(request("/api/teams", cookies))).status).toBe(503);
    expect((await eventGET(request("/api/events/current", cookies))).status).toBe(503);
    expect((await publicGET(request("/public", cookies), params())).status).toBe(503);
    expect((await profilePOST(request("/profiles", cookies, profileInput), params())).status).toBe(503);
  });
  it("팀장 선점과 프로필 등록 후 역할·관심 분야가 함께 반환된다", async () => {
    const makeRequest = () => request("/api/host-claim", {}, { id: r2, ...profileInput });
    const first = await hostPOST(makeRequest());
    expect(first.status).toBe(200);
    const host = first.cookies.get(cookieName("host", r2))!.value;
    const member = first.cookies.get(cookieName("profile", r2))!.value;
    expect(host).toBeTruthy(); expect(member).toBeTruthy();
    const data = await (await roomGET(request("/room", { [cookieName("host", r2)]: host, [cookieName("profile", r2)]: member }), params(r2))).json();
    expect(data.isHost).toBe(true); expect(data.myDomains).toEqual(["AI"]);
    expect(data.profiles).toHaveLength(1); expect(data.profiles[0].isHost).toBe(true);
    expect(tables.ice_rooms.find((row) => row.id === r2)!.host_profile_id).toBe(data.myProfileId);
    expect((await hostPOST(makeRequest())).status).toBe(409);
    expect(tables.ice_profiles.filter((row) => row.room_id === r2)).toHaveLength(1);
  });
  it("팀장 선점 실패와 불완전 입력은 프로필을 만들지 않는다", async () => {
    const count = tables.ice_profiles.length;
    expect((await hostPOST(request("/api/host-claim", {}, { id: r1, ...profileInput }))).status).toBe(409);
    expect((await hostPOST(request("/api/host-claim", {}, { id: r2, name: "이름만" }))).status).toBe(400);
    expect(tables.ice_profiles).toHaveLength(count);
    const publicData = await (await roomGET(request("/room"), params())).json();
    expect(publicData.myDomains).toEqual([]);
    expect(publicData.profiles.find((profile: { id: string }) => profile.id === "mine").isHost).toBe(true);
    expect(publicData.profiles.find((profile: { id: string }) => profile.id === "later").isHost).toBe(false);
  });

});
