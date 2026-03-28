import { NextResponse } from "next/server";

export async function POST(req) {
  const { type, data } = await req.json();

  let result;

  if (type === "keywords") {
    result = "關鍵字結果";
  } else if (type === "summary") {
    result = "摘要結果";
  } else if (type === "emotion") {
    result = "情緒分析結果";
  } else if (type === "topics") {
    result = "主題分析結果";
  } else if (type === "top_comment") {
    result = "最熱門留言";
  }

  return Response.json({ result });
}