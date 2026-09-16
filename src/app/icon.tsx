import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

export const size = { width: 64, height: 64 };
export const contentType = "image/png";

const notoSc = await readFile(join(process.cwd(), "assets/fonts/noto-sc.ttf"));

export default async function Icon() {
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
          color: "#f0a868",
          fontSize: 46,
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
