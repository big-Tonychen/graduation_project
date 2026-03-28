import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({ msg: "API works, but use POST with { url }" });
}

export async function POST(req) {
  const { url } = await req.json();

  // 👉 把 YouTube URL 轉成 videoId
  const videoId = url.split("v=")[1];

  const API_KEY = process.env.YOUTUBE_API_KEY;

  const res = await fetch(
    `https://www.googleapis.com/youtube/v3/commentThreads?part=snippet&videoId=${videoId}&key=${API_KEY}`
  );

  // 檢查 HTTP 狀態
  if (!res.ok) {
  const text = await res.text(); // 可以看看 API 回傳了什麼
  console.error("YouTube API error:", text);
  return Response.json({ comments: [], error: text });
  }

  const data = await res.json();

  const comments = data.items.map(
    (item) => item.snippet.topLevelComment.snippet.textDisplay
  );

  return Response.json({ comments });
}