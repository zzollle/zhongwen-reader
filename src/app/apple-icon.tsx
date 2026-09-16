import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

const notoSc = await readFile(join(process.cwd(), "assets/fonts/noto-sc.ttf"));

export default async function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#2a1c15",
          backgroundImage: "radial-gradient(180px 120px at 50% 0%, #4a3225, #2a1c15 70%)",
          color: "#f0a868",
          // iOS가 모서리를 둥글게 깎으므로 글자가 가장자리에 닿지 않게 둔다
          fontSize: 100,
          fontFamily: "NotoSC",
          lineHeight: 1,
        }}
      >
        读
      </div>
    ),
    {
      ...size,
      fonts: [{ name: "NotoSC", data: notoSc, style: "normal", weight: 700 }],
    },
  );
}
