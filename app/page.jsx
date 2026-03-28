"use client";
import { useState } from "react";
import VideoInput from "../components/VideoInput";
import AnalyzeButtons from "../components/AnalyzeButtons";
import ResultCard from "../components/ResultCard";

export default function Page() {
  const [url, setUrl] = useState("");
  const [data, setData] = useState(null);
  const [result, setResult] = useState("");

  // GET: API 狀態檢查
  const fetchStatus = async () => {
    try {
      const res = await fetch("/api/fetch", { method: "GET" });
      const d = await res.json();
      console.log("GET result:", d);
      setData(d);
    } catch (err) {
      console.error("GET failed", err);
    }
  };

  // POST: 傳影片 URL 分析留言
  const fetchAnalysis = async (type = null) => {
    if (!url) {
      alert("Please enter a YouTube URL");
      return;
    }
    try {
      const res = await fetch("/api/fetch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const d = await res.json();
      setData(d);
      console.log("Fetched comments:", d);

      if (type && d.comments) {
        const analyzeRes = await fetch("/api/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type, data: d.comments }), // 只傳留言陣列
        });
        const analyzeData = await analyzeRes.json();
        setResult(JSON.stringify(analyzeData, null, 2));
      }
    } catch (err) {
      console.error("POST failed", err);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-800 to-blue-900 p-6 text-white">
      <h1 className="text-3xl font-bold mb-6 text-center">🤖 AI Comment Analyzer</h1>

      {/* URL 輸入 */}
      <VideoInput url={url} setUrl={setUrl} onAnalyze={fetchAnalysis} />

      {/* 分析按鈕 */}
      <AnalyzeButtons data={data} onAnalyze={fetchAnalysis} />

      {/* API 狀態檢查按鈕 */}
      <div className="mt-4 flex gap-2">
        <button
          onClick={fetchStatus}
          className="bg-green-500 text-white p-2 rounded"
        >
        </button>
      </div>

      {/* 結果卡片 */}
      <ResultCard result={result} />
    </div>
  );
}