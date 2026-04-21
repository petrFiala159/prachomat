import { ImageResponse } from "next/og";

export const size = { width: 512, height: 512 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: "#111827",
          color: "#fff",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 320,
          fontWeight: 700,
          letterSpacing: -10,
          borderRadius: 80,
        }}
      >
        P
      </div>
    ),
    { ...size }
  );
}
