"use client";
import { useState } from "react";

// ----------------------
// Helper functions
// ----------------------
const clip = (text, limit = 1024) => {
  if (!text) return "";
  return text.length > limit ? text.slice(0, limit - 3) + "…" : text;
};

const fmtList = (lines, maxLines = 6) => {
  if (!lines || !lines.length) return "（無）";
  return lines.slice(0, maxLines).map((l, i) => `${i + 1}. ${l}`).join("\n");
};

const fmtKeywords = (words, maxItems = 12) => {
  if (!words || !words.length) return "（無）";
  return words.slice(0, maxItems).map(w => `\`${w}\``).join(" ");
};

// ----------------------
// Main Page
// ----------------------
export default function Page() {
  const [text, setText] = useState("");
  const [emotionImage, setEmotionImage] = useState(null);
  const [loading, setLoading] = useState(false);

  const [analysisResult, setAnalysisResult] = useState(null);
  const [topicsResult, setTopicsResult] = useState(null);

  // ----------------------
  // Handlers
  // ----------------------
  const handleAnalyze = async () => {
    if (!text) return;
    setLoading(true);
    setEmotionImage(null);

    try {
      const res = await fetch(`/api/analyze?text=${encodeURIComponent(text)}`);
      const data = await res.json();
      setAnalysisResult(data.error ? { error: "分析失敗" } : data.result);
    } catch (err) {
      setAnalysisResult({ error: "分析失敗" });
    }

    setLoading(false);
  };

  const handleFetchEmotion = async () => {
    if (!text) return;
    setLoading(true);
    setEmotionImage(null);

    try {
      const res = await fetch("http://127.0.0.1:8000/emotion_image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: text }),
      });

      if (!res.ok) throw new Error("無法取得情緒圖");
      const blob = await res.blob();
      setEmotionImage(URL.createObjectURL(blob));
    } catch (err) {
      alert(err.message);
    }

    setLoading(false);
  };

  const handleTopics = async () => {
    if (!text) return;
    setLoading(true);
    setTopicsResult(null);

    try {
      const res = await fetch("http://127.0.0.1:8000/topics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text })
      });
      const data = await res.json();
      setTopicsResult(data.error ? { error: data.error } : data);
    } catch (err) {
      setTopicsResult({ error: "取得主題分析失敗" });
    }

    setLoading(false);
  };
  // ----------------------
  // Render
  // ----------------------
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-800 to-blue-900 p-6 text-white">
      <h1 className="text-3xl font-bold mb-6 text-center">🤖 AI Comment Analyzer</h1>

      {/* 輸入與按鈕 */}
      <div className="flex mb-4 gap-2">
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="flex-1 p-3 rounded-l-lg text-white bg-white/10 border border-white/20 outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="貼上 YouTube URL"
        />
        <button onClick={handleAnalyze} className="bg-blue-500 text-white px-4 py-2 rounded-r-lg">
          分析
        </button>
        <button onClick={handleFetchEmotion} className="bg-blue-500 text-white px-4 py-2 rounded-r-lg">
          情緒分析
        </button>
        <button onClick={handleTopics} className="bg-blue-500 text-white px-4 py-2">
          主題分析
        </button>
      </div>

      {/* 分析結果 */}
      {analysisResult && !analysisResult.error && (
      <div className="bg-gray-800 p-6 rounded-lg shadow-md space-y-4">
        {/* 標題與影片ID */}
        <h2 className="text-xl font-bold">{clip(analysisResult.title || analysisResult.video_id, 256)}</h2>
        <p><strong>影片ID:</strong> {analysisResult.video_id || "N/A"}</p>

        {/* 中文摘要 */}
        {analysisResult.summary_zh?.length > 0 && (
          <div>
            <h3 className="font-semibold">📌 中文摘要</h3>
            <p style={{ whiteSpace: "pre-line" }}>{fmtList(analysisResult.summary_zh)}</p>
          </div>
        )}

        {/* 英文摘要 */}
        {analysisResult.summary_en?.length > 0 && (
          <div>
            <h3 className="font-semibold">📌 English Summary</h3>
            <p style={{ whiteSpace: "pre-line" }}>{fmtList(analysisResult.summary_en)}</p>
          </div>
        )}

        {/* 中文關鍵字 */}
        {analysisResult.keywords_zh?.length > 0 && (
          <div>
            <h3 className="font-semibold">🔑 中文關鍵字</h3>
            <p>{fmtKeywords(analysisResult.keywords_zh)}</p>
          </div>
        )}

        {/* 英文關鍵字 */}
        {analysisResult.keywords_en?.length > 0 && (
          <div>
            <h3 className="font-semibold">🔑 English Keywords</h3>
            <p>{fmtKeywords(analysisResult.keywords_en)}</p>
          </div>
        )}

        {/* 語言比例 */}
        {analysisResult.lang_ratio && (
          <div>
            <h3 className="font-semibold">🌍 語言佔比</h3>
            <p>
              🇹🇼 中文：{((analysisResult.lang_ratio.zh ?? 0) * 100).toFixed(1)}% <br/>
              🇺🇸 英文：{((analysisResult.lang_ratio.en ?? 0) * 100).toFixed(1)}% <br/>
              🌐 其他：{((analysisResult.lang_ratio.other ?? 0) * 100).toFixed(1)}%
            </p>
          </div>
        )}

        {/* Footer：總留言數 */}
        <footer className="text-sm text-gray-400">
          總留言數：{analysisResult.stats?.n_comments ?? 0}
        </footer>
      </div>
    )}

      {topicsResult && !topicsResult.error && (
  <div className="bg-gray-800 p-6 rounded-lg shadow-md space-y-4">
    <h2 className="text-xl font-bold">🧾 影片標題：{topicsResult.title}</h2>
    <p>🌐 主要語言：{topicsResult.language}</p>

    {topicsResult.topics?.length > 0 && topicsResult.topics.map((topic, idx) => {
      const total = topicsResult.topics.reduce((sum, t) => sum + (t.size || 0), 0) || 1;
      return (
        <div key={idx}>
          <strong>
            Topic {idx + 1}（{topic.size || 0} 則，佔 {((topic.size || 0) / total * 100).toFixed(1)}%）
          </strong>
          <p>關鍵詞：{fmtKeywords(topic.keywords)}</p>
          <p style={{ whiteSpace: "pre-line" }}>
            代表留言：<br/>{topic.representative_comments?.join("\n") || "無"}
          </p>
        </div>
      )
    })}

    <p className="mt-4">
      總留言數：{topicsResult.total_comments}
    </p>
  </div>
)}

      {/* 情緒圖 */}
      {emotionImage && (
        <div>
          <img src={emotionImage} alt="Emotion Radar" />
        </div>
      )}
    </div>
  );
}