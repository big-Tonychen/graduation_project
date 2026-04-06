"use client";

import { useState } from "react";
import Link from "next/link";
import { API_BASE } from "@/lib/apiBase";
import { AnalysisResultView, TopicsResultView } from "@/lib/recordResultViews";

/** 僅顯示其中一種結果：分析 / 主題 / 情緒圖 */
const PANEL = { analysis: "analysis", topics: "topics", emotion: "emotion" };

/** 情緒圖的子面板：一次只顯示一個 */
const EMOTION_PANEL = { topics: "topics", trend: "trend", combined: "combined" };

export default function Page() {
  const [text, setText] = useState("");
  const [emotionImage, setEmotionImage] = useState(null);
  const [loading, setLoading] = useState(false);

  const [analysisResult, setAnalysisResult] = useState(null);
  const [topicsResult, setTopicsResult] = useState(null);
  const [emotionTopicsResult, setEmotionTopicsResult] = useState(null);
  const [trendChart, setTrendChart] = useState(null);
  const [emotionTopicChart, setEmotionTopicChart] = useState(null);
  const [combinedChart, setCombinedChart] = useState(null);
  const [negativePeakAnalysis, setNegativePeakAnalysis] = useState(null);
  const [emotionSubPanel, setEmotionSubPanel] = useState(null); // 新增：情緒圖的子面板
  
  /** 目前要顯示哪一區（一次只顯示一個） */
  const [visiblePanel, setVisiblePanel] = useState(null);

  const clearEmotionBlob = () => {
    setEmotionImage((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
  };

  const clearChartBlob = (chartSetter) => {
    chartSetter((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
  };

  const clearAllBlobs = () => {
    clearEmotionBlob();
    clearChartBlob(setTrendChart);
    clearChartBlob(setEmotionTopicChart);
    clearChartBlob(setCombinedChart);
    setNegativePeakAnalysis(null);
  };

  const handleAnalyze = async () => {
    if (!text || loading) return; // 防止重複點擊
    setLoading(true);
    setVisiblePanel(PANEL.analysis);
    setTopicsResult(null);
    setEmotionTopicsResult(null);
    clearAllBlobs();

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
    if (!text || loading) return; // 防止重複點擊
    setLoading(true);
    setVisiblePanel(PANEL.emotion);
    setAnalysisResult(null);
    setTopicsResult(null);
    setEmotionTopicsResult(null);
    clearAllBlobs();

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
    if (!text || loading) return; // 防止重複點擊
    setLoading(true);
    setVisiblePanel(PANEL.topics);
    setAnalysisResult(null);
    setEmotionTopicsResult(null);
    clearAllBlobs();
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

  const handleEmotionTopics = async () => {
    if (!text || loading) return; // 防止重複點擊
    setLoading(true);
    setAnalysisResult(null);
    setTopicsResult(null);
    // 只清理圖表，不要清理情緒圖
    clearChartBlob(setTrendChart);
    clearChartBlob(setEmotionTopicChart);
    clearChartBlob(setCombinedChart);
    // 設置情緒面板和子面板
    setVisiblePanel(PANEL.emotion);
    setEmotionSubPanel(EMOTION_PANEL.topics);

    try {
      const res = await fetch(`${API_BASE}/emotion_topics`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: text }),
      });
      const data = await res.json();
      setEmotionTopicsResult(data.error ? { error: data.error } : data);
    } catch {
      setEmotionTopicsResult({ error: "取得情緒話題失敗" });
    }

    setLoading(false);
  };

  const handleTrendChart = async (chartType = "volume") => {
    if (!text || loading) return; // 防止重複點擊
    setLoading(true);
    // 只清理相關的圖表，不要清理情緒圖
    clearChartBlob(setTrendChart);
    clearChartBlob(setCombinedChart);
    // 設置情緒面板和子面板
    setVisiblePanel(PANEL.emotion);
    setEmotionSubPanel(EMOTION_PANEL.trend);

    try {
      const res = await fetch(`${API_BASE}/trend_chart`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: text, chart_type: chartType, time_unit: "hour" }),
      });

      if (!res.ok) throw new Error("無法取得趨勢圖表");
      const blob = await res.blob();
      setTrendChart(URL.createObjectURL(blob));
      
      // 如果是情緒趨勢，同時獲取負面情緒高峰分析
      if (chartType === "sentiment") {
        try {
          const trendRes = await fetch(`${API_BASE}/trend_analysis`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ url: text, time_unit: "hour" }),
          });
          const trendData = await trendRes.json();
          
          if (trendData.trend_stats && trendData.trend_stats.negative_peak_analysis) {
            setNegativePeakAnalysis(trendData.trend_stats.negative_peak_analysis);
          } else {
            setNegativePeakAnalysis({ error: "沒有找到負面情緒高峰" });
          }
        } catch (err) {
          console.error("獲取負面情緒高峰分析失敗:", err);
          setNegativePeakAnalysis({ error: "獲取負面情緒高峰分析失敗" });
        }
      }
    } catch (err) {
      alert(err.message);
    }

    setLoading(false);
  };

  const handleEmotionTopicChart = async () => {
    if (!text || loading) return; // 防止重複點擊
    setLoading(true);
    // 只清理相關的圖表，不要清理情緒圖
    clearChartBlob(setEmotionTopicChart);
    clearChartBlob(setCombinedChart);
    // 設置情緒面板和子面板
    setVisiblePanel(PANEL.emotion);
    setEmotionSubPanel(EMOTION_PANEL.topics);

    try {
      const res = await fetch(`${API_BASE}/emotion_topic_chart`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: text }),
      });

      if (!res.ok) throw new Error("無法取得情緒話題圖表");
      const blob = await res.blob();
      setEmotionTopicChart(URL.createObjectURL(blob));
    } catch (err) {
      alert(err.message);
    }

    setLoading(false);
  };

  const handleCombinedChart = async () => {
    if (!text || loading) return; // 防止重複點擊
    setLoading(true);
    // 只清理相關的圖表，不要清理情緒圖
    clearChartBlob(setCombinedChart);
    // 設置情緒面板和子面板
    setVisiblePanel(PANEL.emotion);
    setEmotionSubPanel(EMOTION_PANEL.combined);

    try {
      const res = await fetch(`${API_BASE}/combined_trend_chart`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: text, time_unit: "hour" }),
      });

      if (!res.ok) throw new Error("無法取得綜合圖表");
      const blob = await res.blob();
      setCombinedChart(URL.createObjectURL(blob));
    } catch (err) {
      alert(err.message);
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
              
              {/* 情緒話題按鈕 */}
              <div className="mt-4 flex flex-wrap gap-2 justify-center">
                <button
                  type="button"
                  onClick={() => handleEmotionTopics()}
                  disabled={loading}
                  className={`rounded-lg px-4 py-2 text-sm font-medium transition disabled:opacity-50 ${
                    emotionSubPanel === EMOTION_PANEL.topics
                      ? "bg-purple-500"
                      : "bg-purple-600 hover:bg-purple-500"
                  }`}
                >
                  顯示情緒話題
                </button>
                <button
                  type="button"
                  onClick={() => handleTrendChart("sentiment")}
                  disabled={loading}
                  className={`rounded-lg px-4 py-2 text-sm font-medium transition disabled:opacity-50 ${
                    emotionSubPanel === EMOTION_PANEL.trend
                      ? "bg-indigo-500"
                      : "bg-indigo-600 hover:bg-indigo-500"
                  }`}
                >
                  情緒趨勢
                </button>
                <button
                  type="button"
                  onClick={() => handleCombinedChart()}
                  disabled={loading}
                  className={`rounded-lg px-4 py-2 text-sm font-medium transition disabled:opacity-50 ${
                    emotionSubPanel === EMOTION_PANEL.combined
                      ? "bg-pink-500"
                      : "bg-pink-600 hover:bg-pink-500"
                  }`}
                >
                  綜合圖表
                </button>
              </div>
              
              {/* 根據子面板顯示不同內容 */}
              {emotionSubPanel === EMOTION_PANEL.topics && emotionTopicsResult && (
                <div className="mt-4 rounded-xl border border-white/15 bg-black/30 p-4">
                  {emotionTopicsResult.error ? (
                    <div className="text-center text-red-400">
                      <p>情緒話題分析失敗</p>
                      <p className="text-sm text-red-300">{emotionTopicsResult.error}</p>
                    </div>
                  ) : (
                    <>
                      <h4 className="mb-3 text-center font-semibold">情緒話題詳細分析</h4>
                      
                      {/* 正面話題 */}
                      {emotionTopicsResult.positive_topics?.length > 0 && (
                        <div className="mb-4">
                          <h5 className="mb-2 font-semibold text-green-300">正面情緒話題</h5>
                          <div className="space-y-3">
                            {emotionTopicsResult.positive_topics.map((topic, i) => (
                              <div key={i} className="rounded-lg border border-green-500/30 bg-green-950/40 p-3">
                                <div className="flex justify-between items-start mb-2">
                                  <h6 className="font-medium text-green-100">{topic.topic}</h6>
                                  <span className="text-sm text-green-300">{topic.count} 則留言</span>
                                </div>
                                
                                {/* 關鍵字 */}
                                {topic.keywords && topic.keywords.length > 0 && (
                                  <div className="mb-2">
                                    <p className="text-xs text-green-400 mb-1">關鍵字：</p>
                                    <div className="flex flex-wrap gap-1">
                                      {topic.keywords.map((keyword, j) => (
                                        <span key={j} className="px-2 py-1 text-xs bg-green-800/50 text-green-200 rounded">
                                          {keyword}
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                )}
                                
                                {/* 摘要 */}
                                {topic.summary && (
                                  <div className="mb-2">
                                    <p className="text-xs text-green-400 mb-1">摘要：</p>
                                    <p className="text-xs text-green-200 leading-relaxed">{topic.summary}</p>
                                  </div>
                                )}
                                
                                {/* 代表留言 */}
                                {topic.comments && topic.comments.length > 0 && (
                                  <div>
                                    <p className="text-xs text-green-400 mb-1">代表留言：</p>
                                    <div className="space-y-1">
                                      {topic.comments.map((comment, j) => (
                                        <p key={j} className="text-xs text-green-100 italic">"{comment}"</p>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {/* 負面話題 */}
                      {emotionTopicsResult.negative_topics?.length > 0 && (
                        <div className="mb-4">
                          <h5 className="mb-2 font-semibold text-red-300">負面情緒話題</h5>
                          <div className="space-y-3">
                            {emotionTopicsResult.negative_topics.map((topic, i) => (
                              <div key={i} className="rounded-lg border border-red-500/30 bg-red-950/40 p-3">
                                <div className="flex justify-between items-start mb-2">
                                  <h6 className="font-medium text-red-100">{topic.topic}</h6>
                                  <span className="text-sm text-red-300">{topic.count} 則留言</span>
                                </div>
                                
                                {/* 關鍵字 */}
                                {topic.keywords && topic.keywords.length > 0 && (
                                  <div className="mb-2">
                                    <p className="text-xs text-red-400 mb-1">關鍵字：</p>
                                    <div className="flex flex-wrap gap-1">
                                      {topic.keywords.map((keyword, j) => (
                                        <span key={j} className="px-2 py-1 text-xs bg-red-800/50 text-red-200 rounded">
                                          {keyword}
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                )}
                                
                                {/* 摘要 */}
                                {topic.summary && (
                                  <div className="mb-2">
                                    <p className="text-xs text-red-400 mb-1">摘要：</p>
                                    <p className="text-xs text-red-200 leading-relaxed">{topic.summary}</p>
                                  </div>
                                )}
                                
                                {/* 代表留言 */}
                                {topic.comments && topic.comments.length > 0 && (
                                  <div>
                                    <p className="text-xs text-red-400 mb-1">代表留言：</p>
                                    <div className="space-y-1">
                                      {topic.comments.map((comment, j) => (
                                        <p key={j} className="text-xs text-red-100 italic">"{comment}"</p>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {/* 中立話題 */}
                      {emotionTopicsResult.neutral_topics?.length > 0 && (
                        <div>
                          <h5 className="mb-2 font-semibold text-gray-300">中立情緒話題</h5>
                          <div className="space-y-3">
                            {emotionTopicsResult.neutral_topics.map((topic, i) => (
                              <div key={i} className="rounded-lg border border-gray-500/30 bg-gray-950/40 p-3">
                                <div className="flex justify-between items-start mb-2">
                                  <h6 className="font-medium text-gray-100">{topic.topic}</h6>
                                  <span className="text-sm text-gray-300">{topic.count} 則留言</span>
                                </div>
                                
                                {/* 關鍵字 */}
                                {topic.keywords && topic.keywords.length > 0 && (
                                  <div className="mb-2">
                                    <p className="text-xs text-gray-400 mb-1">關鍵字：</p>
                                    <div className="flex flex-wrap gap-1">
                                      {topic.keywords.map((keyword, j) => (
                                        <span key={j} className="px-2 py-1 text-xs bg-gray-800/50 text-gray-200 rounded">
                                          {keyword}
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                )}
                                
                                {/* 摘要 */}
                                {topic.summary && (
                                  <div className="mb-2">
                                    <p className="text-xs text-gray-400 mb-1">摘要：</p>
                                    <p className="text-xs text-gray-200 leading-relaxed">{topic.summary}</p>
                                  </div>
                                )}
                                
                                {/* 代表留言 */}
                                {topic.comments && topic.comments.length > 0 && (
                                  <div>
                                    <p className="text-xs text-gray-400 mb-1">代表留言：</p>
                                    <div className="space-y-1">
                                      {topic.comments.map((comment, j) => (
                                        <p key={j} className="text-xs text-gray-100 italic">"{comment}"</p>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
              
              {emotionSubPanel === EMOTION_PANEL.trend && trendChart && (
                <figure className="mt-4 overflow-hidden rounded-xl border border-white/15 bg-black/30 p-3">
                  <img
                    src={trendChart}
                    alt="趨勢圖表"
                    className="mx-auto max-h-[320px] w-auto max-w-full object-contain"
                  />
                  <figcaption className="mt-1 text-center text-xs text-white/50">
                    情緒趨勢分析
                  </figcaption>
                  
                  {/* 負面情緒高峰分析 - 整合到情緒趨勢中 */}
                  {negativePeakAnalysis && (
                    <div className="mt-4 rounded-xl border border-red-500/30 bg-red-950/40 p-4">
                      {negativePeakAnalysis.error ? (
                        <div className="text-center text-red-400">
                          <p>負面情緒高峰分析失敗</p>
                          <p className="text-sm text-red-300">{negativePeakAnalysis.error}</p>
                        </div>
                      ) : (
                        <>
                          <h4 className="mb-3 font-semibold text-red-300">🚨 負面情緒高峰詳細分析</h4>
                          
                          <div className="mb-4 grid grid-cols-2 gap-4">
                            <div>
                              <p className="text-xs text-red-400 mb-1">高峰時間：</p>
                              <p className="text-sm text-red-100">
                                {new Date(negativePeakAnalysis.peak_time).toLocaleString()}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-red-400 mb-1">情緒分數：</p>
                              <p className="text-sm text-red-100 font-bold">
                                {negativePeakAnalysis.peak_sentiment.toFixed(2)}
                              </p>
                            </div>
                          </div>
                          
                          {/* 負面情緒分布 */}
                          {negativePeakAnalysis.negative_emotions && (
                            <div className="mb-4">
                              <p className="text-xs text-red-400 mb-2">負面情緒分布：</p>
                              <div className="flex flex-wrap gap-2">
                                {Object.entries(negativePeakAnalysis.negative_emotions).map(([emotion, count]) => (
                                  <span key={emotion} className="px-3 py-1 text-xs bg-red-800/50 text-red-200 rounded-full">
                                    {emotion}: {count}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                          
                          {/* 關鍵字 */}
                          {negativePeakAnalysis.peak_keywords && 
                           negativePeakAnalysis.peak_keywords.length > 0 && (
                            <div className="mb-4">
                              <p className="text-xs text-red-400 mb-2">高峰關鍵字：</p>
                              <div className="flex flex-wrap gap-1">
                                {negativePeakAnalysis.peak_keywords.map((keyword, i) => (
                                  <span key={i} className="px-2 py-1 text-xs bg-red-800/30 text-red-200 rounded">
                                    {keyword}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                          
                          {/* 摘要 */}
                          {negativePeakAnalysis.peak_summary && (
                            <div className="mb-4">
                              <p className="text-xs text-red-400 mb-2">高峰摘要：</p>
                              <p className="text-xs text-red-200 leading-relaxed">
                                {negativePeakAnalysis.peak_summary}
                              </p>
                            </div>
                          )}
                          
                          {/* 代表留言 */}
                          {negativePeakAnalysis.peak_comments && 
                           negativePeakAnalysis.peak_comments.length > 0 && (
                            <div>
                              <p className="text-xs text-red-400 mb-2">高峰留言 ({negativePeakAnalysis.total_peak_comments} 則)：</p>
                              <div className="space-y-2">
                                {negativePeakAnalysis.peak_comments.map((comment, i) => (
                                  <p key={i} className="text-xs text-red-100 italic bg-red-900/20 p-2 rounded">
                                    "{comment}"
                                  </p>
                                ))}
                              </div>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  )}
                </figure>
              )}
              
              {emotionSubPanel === EMOTION_PANEL.combined && combinedChart && (
                <figure className="mt-4 overflow-hidden rounded-xl border border-white/15 bg-black/30 p-3">
                  <img
                    src={combinedChart}
                    alt="綜合圖表"
                    className="mx-auto max-h-[400px] w-auto max-w-full object-contain"
                  />
                  <figcaption className="mt-1 text-center text-xs text-white/50">
                    綜合趨勢分析
                  </figcaption>
                </figure>
              )}
            </figure>
          )}
        </main>
      </div>
    </div>
  );
}
