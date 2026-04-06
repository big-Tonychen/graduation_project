"use client";

import { useEffect, useState } from "react";
import { API_BASE } from "@/lib/apiBase";
import { clip, fmtKeywords, fmtList } from "@/lib/analysisFormat";

/** 與首頁「分析」按鈕結果相同版面 */
export function AnalysisResultView({ result }) {
  if (!result) return null;
  if (result.error) {
    return (
      <p className="rounded-xl border border-red-500/30 bg-red-950/40 px-4 py-3 text-red-100">
        {result.error}
      </p>
    );
  }

  return (
    <article className="rounded-2xl border border-white/15 bg-gray-900/50 p-6 shadow-inner backdrop-blur-md">
      <h2 className="text-xl font-bold">{clip(result.title || result.video_id, 256)}</h2>
      <p className="mt-1 text-sm text-white/60">影片 ID：{result.video_id || "N/A"}</p>

      <div className="mt-6 space-y-5">
        {result.summary_zh?.length > 0 && (
          <section>
            <h3 className="font-semibold text-indigo-200">中文摘要</h3>
            <p className="mt-2 whitespace-pre-line text-white/90">{fmtList(result.summary_zh)}</p>
          </section>
        )}

        {result.summary_en?.length > 0 && (
          <section>
            <h3 className="font-semibold text-indigo-200">English summary</h3>
            <p className="mt-2 whitespace-pre-line text-white/90">{fmtList(result.summary_en)}</p>
          </section>
        )}

        {result.keywords_zh?.length > 0 && (
          <section>
            <h3 className="font-semibold text-indigo-200">中文關鍵字</h3>
            <p className="mt-2">{fmtKeywords(result.keywords_zh)}</p>
          </section>
        )}

        {result.keywords_en?.length > 0 && (
          <section>
            <h3 className="font-semibold text-indigo-200">English keywords</h3>
            <p className="mt-2">{fmtKeywords(result.keywords_en)}</p>
          </section>
        )}

        {result.lang_ratio && (
          <section>
            <h3 className="font-semibold text-indigo-200">語言佔比</h3>
            <p className="mt-2 text-white/90">
              中文：{((result.lang_ratio.zh ?? 0) * 100).toFixed(1)}% · 英文：
              {((result.lang_ratio.en ?? 0) * 100).toFixed(1)}% · 其他：
              {((result.lang_ratio.other ?? 0) * 100).toFixed(1)}%
            </p>
          </section>
        )}

        <footer className="border-t border-white/10 pt-4 text-sm text-white/50">
          總留言數：{result.stats?.n_comments ?? 0}
        </footer>
      </div>
    </article>
  );
}

/** 與首頁「主題分析」按鈕結果相同版面 */
export function TopicsResultView({ result }) {
  if (!result) return null;
  if (result.error) {
    return (
      <p className="rounded-xl border border-amber-500/30 bg-amber-950/30 px-4 py-3 text-amber-100">
        {result.error}
      </p>
    );
  }

  return (
    <article className="rounded-2xl border border-white/15 bg-gray-900/50 p-6 backdrop-blur-md">
      <h2 className="text-xl font-bold">主題分析 · {result.title}</h2>
      <p className="mt-1 text-sm text-white/65">主要語言：{result.language}</p>

      <div className="mt-6 space-y-6">
        {result.topics?.length > 0 &&
          result.topics.map((topic, idx) => {
            const total = result.topics.reduce((sum, t) => sum + (t.size || 0), 0) || 1;
            return (
              <section
                key={idx}
                className="rounded-xl border border-white/10 bg-black/20 p-4"
              >
                <h3 className="font-semibold text-sky-200">
                  Topic {idx + 1}（{topic.size || 0} 則 ·{" "}
                  {(((topic.size || 0) / total) * 100).toFixed(1)}%）
                </h3>
                <p className="mt-2 text-sm">關鍵詞：{fmtKeywords(topic.keywords)}</p>
                <p className="mt-2 whitespace-pre-line text-sm text-white/85">
                  代表留言：
                  <br />
                  {topic.representative_comments?.join("\n") || "無"}
                </p>
              </section>
            );
          })}
      </div>

      <p className="mt-6 text-sm text-white/55">總留言數：{result.total_comments}</p>
    </article>
  );
}

/** 與首頁「情緒圖」相同；包含情緒雷達圖、情緒話題、情緒趨勢、綜合圖表 */
export function EmotionRecordView({ youtubeUrl, payload }) {
  const chartFromDb = payload?.emotion_chart_png_base64
    ? `data:image/png;base64,${payload.emotion_chart_png_base64}`
    : null;

  const [fetchedBlobUrl, setFetchedBlobUrl] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const [loading, setLoading] = useState(!chartFromDb);
  const [emotionSubPanel, setEmotionSubPanel] = useState(null); // 新增：情緒圖的子面板
  const [emotionTopicsResult, setEmotionTopicsResult] = useState(null);
  const [trendChart, setTrendChart] = useState(null);
  const [combinedChart, setCombinedChart] = useState(null);
  const [negativePeakAnalysis, setNegativePeakAnalysis] = useState(null);
  const [subPanelLoading, setSubPanelLoading] = useState(false);

  // 情緒圖的子面板定義
  const EMOTION_PANEL = { topics: "topics", trend: "trend", combined: "combined" };

  // 如果資料庫有圖表，就直接使用，不需要重新生成
  const imageSrc = chartFromDb || fetchedBlobUrl;

  // 只有在資料庫沒有圖表時才重新生成
  useEffect(() => {
    if (chartFromDb) {
      // 資料庫有圖表，直接使用
      setFetchedBlobUrl(null);
      setLoading(false);
      setLoadError(null);
      return;
    }

    if (!youtubeUrl) {
      setLoading(false);
      setLoadError("缺少影片網址");
      return;
    }

    let cancelled = false;
    setLoading(true);
    setLoadError(null);
    setFetchedBlobUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });

    (async () => {
      try {
        const res = await fetch(`${API_BASE}/emotion_image`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: youtubeUrl }),
        });
        if (!res.ok) throw new Error("無法取得情緒圖");
        const blob = await res.blob();
        const objectUrl = URL.createObjectURL(blob);
        if (cancelled) {
          URL.revokeObjectURL(objectUrl);
          return;
        }
        setFetchedBlobUrl(objectUrl);
      } catch (e) {
        if (!cancelled) setLoadError(e.message || "載入失敗");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      setFetchedBlobUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return null;
      });
    };
  }, [youtubeUrl, chartFromDb]);

  // 處理情緒話題
  const handleEmotionTopics = async () => {
    if (!youtubeUrl || subPanelLoading) return;
    setSubPanelLoading(true);
    setEmotionSubPanel(EMOTION_PANEL.topics);
    setTrendChart(null);
    setCombinedChart(null);

    try {
      const res = await fetch(`${API_BASE}/emotion_topics`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: youtubeUrl }),
      });
      const data = await res.json();
      setEmotionTopicsResult(data.error ? { error: data.error } : data);
    } catch {
      setEmotionTopicsResult({ error: "取得情緒話題失敗" });
    }

    setSubPanelLoading(false);
  };

  // 處理情緒趨勢
  const handleTrendChart = async () => {
    if (!youtubeUrl || subPanelLoading) return;
    setSubPanelLoading(true);
    setEmotionSubPanel(EMOTION_PANEL.trend);
    setEmotionTopicsResult(null);
    setCombinedChart(null);

    try {
      const res = await fetch(`${API_BASE}/trend_chart`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: youtubeUrl, chart_type: "sentiment", time_unit: "hour" }),
      });

      if (!res.ok) throw new Error("無法取得趨勢圖表");
      const blob = await res.blob();
      setTrendChart(URL.createObjectURL(blob));
      
      // 同時獲取負面情緒高峰分析
      try {
        const trendRes = await fetch(`${API_BASE}/trend_analysis`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: youtubeUrl, time_unit: "hour" }),
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
    } catch (err) {
      alert(err.message);
    }

    setSubPanelLoading(false);
  };

  // 處理綜合圖表
  const handleCombinedChart = async () => {
    if (!youtubeUrl || subPanelLoading) return;
    setSubPanelLoading(true);
    setEmotionSubPanel(EMOTION_PANEL.combined);
    setEmotionTopicsResult(null);
    setTrendChart(null);

    try {
      const res = await fetch(`${API_BASE}/combined_trend_chart`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: youtubeUrl, time_unit: "hour" }),
      });

      if (!res.ok) throw new Error("無法取得綜合圖表");
      const blob = await res.blob();
      setCombinedChart(URL.createObjectURL(blob));
    } catch (err) {
      alert(err.message);
    }

    setSubPanelLoading(false);
  };

  const stats = payload?.stats;
  const emotions = stats?.emotions;

  return (
    <div className="space-y-4">
      {loading && <p className="text-sm text-white/60">正在產生情緒雷達圖…</p>}
      {loadError && (
        <p className="rounded-xl border border-amber-500/30 bg-amber-950/30 px-4 py-3 text-amber-100">
          {loadError}（若留言已變更或 API 金鑰失效，可能無法重繪）
        </p>
      )}
      {imageSrc && (
        <figure className="overflow-hidden rounded-2xl border border-white/15 bg-black/30 p-4">
          <img
            src={imageSrc}
            alt="情緒雷達圖"
            className="mx-auto max-h-[480px] w-auto max-w-full object-contain"
          />
          <figcaption className="mt-2 text-center text-xs text-white/50">
            {chartFromDb ? "情緒分析雷達圖（資料庫存檔）" : "情緒分析雷達圖"}
          </figcaption>
          
          {/* 情緒話題按鈕 */}
          <div className="mt-4 flex flex-wrap gap-2 justify-center">
            <button
              type="button"
              onClick={handleEmotionTopics}
              disabled={subPanelLoading}
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
              onClick={handleTrendChart}
              disabled={subPanelLoading}
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
              onClick={handleCombinedChart}
              disabled={subPanelLoading}
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
          {subPanelLoading && (
            <div className="mt-4 text-center text-sm text-white/60">
              載入中…
            </div>
          )}
          
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
              
              {/* 負面情緒高峰分析 */}
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

      {(payload?.title || payload?.language != null || emotions) && (
        <article className="rounded-2xl border border-white/15 bg-gray-900/50 p-5 backdrop-blur-md">
          <h3 className="font-semibold text-violet-200">紀錄中的情緒資料</h3>
          {payload?.title && <p className="mt-2 text-white/90">{payload.title}</p>}
          {payload?.language && (
            <p className="mt-1 text-sm text-white/65">主要語言：{payload.language}</p>
          )}
          {typeof payload?.total_comments === "number" && (
            <p className="mt-1 text-sm text-white/65">分析留言數：{payload.total_comments}</p>
          )}
          {emotions && Object.keys(emotions).length > 0 && (
            <ul className="mt-3 grid gap-1 text-sm sm:grid-cols-2">
              {Object.entries(emotions).map(([k, v]) => (
                <li key={k} className="flex justify-between gap-2 rounded-lg bg-black/25 px-3 py-2">
                  <span className="text-white/75">{k}</span>
                  <span className="tabular-nums text-white/90">{v}</span>
                </li>
              ))}
            </ul>
          )}
        </article>
      )}
    </div>
  );
}

/** 依 Supabase 紀錄 category + payload 選擇與首頁對應的版面 */
export function HistoryRecordBody({ category, payload, youtubeUrl }) {
  const data = payload ?? {};

  if (category === "分析") {
    return <AnalysisResultView result={data} />;
  }
  if (category === "主題分析") {
    return <TopicsResultView result={data} />;
  }
  if (category === "情緒分析") {
    return <EmotionRecordView youtubeUrl={youtubeUrl} payload={data} />;
  }

  return (
    <p className="text-sm text-white/60">
      此紀錄類型無法對應首頁預覽（{category || "未分類"}）。
    </p>
  );
}
