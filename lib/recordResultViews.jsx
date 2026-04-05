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

/** 與首頁「情緒圖」相同；若資料庫已存 payload.emotion_chart_png_base64 則直接顯示，否則向後端重算 */
export function EmotionRecordView({ youtubeUrl, payload }) {
  const chartFromDb = payload?.emotion_chart_png_base64
    ? `data:image/png;base64,${payload.emotion_chart_png_base64}`
    : null;

  const [fetchedBlobUrl, setFetchedBlobUrl] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const [loading, setLoading] = useState(!chartFromDb);

  useEffect(() => {
    if (chartFromDb) {
      setFetchedBlobUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return null;
      });
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

  const imageSrc = chartFromDb || fetchedBlobUrl;

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
