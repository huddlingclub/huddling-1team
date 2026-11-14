import type { NextConfig } from "next";

// 정적 이미지 캐시: 캐릭터는 파일명이 바뀌면 새 경로를 쓰므로 1년 immutable, 나머지는 하루 + 백그라운드 갱신
const nextConfig: NextConfig = {
  async headers() {
    return [
      { source: "/chars/:path*", headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }] },
      { source: "/:dir(mallang|brand|characters)/:path*", headers: [{ key: "Cache-Control", value: "public, max-age=86400, stale-while-revalidate=604800" }] },
    ];
  },
};
export default nextConfig;
