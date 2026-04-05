"use client";

import { useState } from "react";
import Link from "next/link";
import { API_BASE } from "@/lib/apiBase";
import { AnalysisResultView, TopicsResultView } from "@/lib/recordResultViews";

/** 僅顯示其中一種結果：分析 / 主題 / 情緒圖 */
const PANEL = { analysis: "analysis", topics: "topics", emotion: "emotion" };

export default function Page() {
  const [text, setText] = useState("");
  const [emotionImage, setEmotionImage] = useState(null);
  const [loading, setLoading] = useState(false);

  const [analysisResult, setAnalysisResult] = useState(null);
  const [topicsResult, setTopicsResult] = useState(null);
  /** 目前要顯示哪一區（一次只顯示一個） */
  const [visiblePanel, setVisiblePanel] = useState(null);

  const clearEmotionBlob = () => {
    setEmotionImage((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
  };

  const handleAnalyze = async () => {
    if (!text) return;
    setLoading(true);
    setVisiblePanel(PANEL.analysis);
    setTopicsResult(null);
    clearEmotionBlob();

    const body = JSON.stringify({ video_url: text });

    try {
      const res = await fetch(`${API_BASE}/analyze/queued`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
      });
      const data = await res.json();
      setAnalysisResult(data.error ? { error: "分析失敗" } : data.result);
    } catch {
      setAnalysisResult({ error: "分析失敗" });
    }

    setLoading(false);
  };

  const handleFetchEmotion = async () => {
    if (!text) return;
    setLoading(true);
    setVisiblePanel(PANEL.emotion);
    setAnalysisResult(null);
    setTopicsResult(null);
    clearEmotionBlob();

    try {
      const res = await fetch(`${API_BASE}/emotion_image`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: text }),
      });

      if (!res.ok) throw new Error("無法取得情緒圖");
      const blob = await res.blob();
      setEmotionImage(URL.createObjectURL(blob));
    } catch (err) {
      alert(err.message);
      setVisiblePanel(null);
    }

    setLoading(false);
  };

  const handleTopics = async () => {
    if (!text) return;
    setLoading(true);
    setVisiblePanel(PANEL.topics);
    setAnalysisResult(null);
    clearEmotionBlob();
    setTopicsResult(null);

    try {
      const res = await fetch(`${API_BASE}/topics`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const data = await res.json();
      setTopicsResult(data.error ? { error: data.error } : data);
    } catch {
      setTopicsResult({ error: "取得主題分析失敗" });
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-950 via-purple-900 to-blue-950 px-4 py-8 text-white sm:px-6">
      <div className="mx-auto max-w-5xl space-y-8">
        <header className="space-y-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-sm font-medium uppercase tracking-wider text-indigo-200/90">
                Graduation project
              </p>
              <h1 className="mt-1 text-3xl font-bold tracking-tight sm:text-4xl">
                AI Comment Analyzer
              </h1>
              <p className="mt-2 max-w-xl text-sm text-white/70">
                留言摘要、關鍵字、主題與情緒視覺化。
              </p>
            </div>
            <Link
              href="/Historical_records"
              className="inline-flex shrink-0 items-center justify-center rounded-xl bg-white/10 px-5 py-2.5 text-sm font-medium ring-1 ring-white/20 transition hover:bg-white/20"
            >
              歷史紀錄
            </Link>
          </div>
        </header>

        <main className="space-y-6">
          <div className="rounded-2xl border border-white/15 bg-white/[0.06] p-5 backdrop-blur-md">
            <label className="block text-sm font-medium text-white/85">YouTube 網址</label>
            <div className="mt-3 flex flex-col gap-3 lg:flex-row lg:items-stretch">
              <input
                type="url"
                value={text}
                onChange={(e) => setText(e.target.value)}
                className="min-h-[48px] flex-1 rounded-xl border border-white/20 bg-white/10 px-4 text-white outline-none placeholder:text-white/45 focus:ring-2 focus:ring-indigo-400"
                placeholder="貼上 YouTube 影片連結"
              />
              <div className="flex flex-wrap gap-2 lg:shrink-0">
                <button
                  type="button"
                  onClick={handleAnalyze}
                  disabled={loading}
                  className="min-h-[48px] rounded-xl bg-indigo-500 px-5 font-medium transition hover:bg-indigo-400 disabled:opacity-50"
                >
                  {loading ? "處理中…" : "分析"}
                </button>
                <button
                  type="button"
                  onClick={handleFetchEmotion}
                  disabled={loading}
                  className="min-h-[48px] rounded-xl bg-violet-600 px-5 font-medium transition hover:bg-violet-500 disabled:opacity-50"
                >
                  情緒圖
                </button>
                <button
                  type="button"
                  onClick={handleTopics}
                  disabled={loading}
                  className="min-h-[48px] rounded-xl bg-sky-600 px-5 font-medium transition hover:bg-sky-500 disabled:opacity-50"
                >
                  主題分析
                </button>
              </div>
            </div>
          </div>

          {visiblePanel === PANEL.analysis && analysisResult && (
            <AnalysisResultView result={analysisResult} />
          )}

          {visiblePanel === PANEL.topics && topicsResult && (
            <TopicsResultView result={topicsResult} />
          )}

          {visiblePanel === PANEL.emotion && emotionImage && (
            <figure className="overflow-hidden rounded-2xl border border-white/15 bg-black/30 p-4">
              <img
                src={emotionImage}
                alt="情緒雷達圖"
                className="mx-auto max-h-[480px] w-auto max-w-full object-contain"
              />
              <figcaption className="mt-2 text-center text-xs text-white/50">
                情緒分析雷達圖
              </figcaption>
            </figure>
          )}
        </main>
      </div>
    </div>
  );
}
