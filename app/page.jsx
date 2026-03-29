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
  const [url, setUrl] = useState("");
  const [text, setText] = useState("");
  const [result, setResult] = useState(null);
  const [emotionImage, setEmotionImage] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleAnalyze = async () => {
    if (!text) return;
    setLoading(true);
    setEmotionImage(null);

    try {
      const res = await fetch(`/api/analyze?text=${encodeURIComponent(text)}`);
      const data = await res.json();
      setResult(data.error ? { error: "分析失敗" } : data.result);
    } catch (err) {
      setResult({ error: "分析失敗" });
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
        body: JSON.stringify({ url: text }),  // 注意這裡要包在物件裡
      });

    if (!res.ok) throw new Error("無法取得情緒圖");
      const blob = await res.blob();
      setEmotionImage(URL.createObjectURL(blob));
    } catch (err) {
      alert(err.message);
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-800 to-blue-900 p-6 text-white">
      <h1 className="text-3xl font-bold mb-6 text-center">🤖 AI Comment Analyzer</h1>

      {/* 輸入與按鈕 */}
      <div className="flex mb-4">
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="flex-1 p-3 rounded-l-lg text-white bg-white/10 border border-white/20 outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="貼上 YouTube URL"
        />
        <button
          onClick={handleAnalyze}
          className="bg-blue-500 text-white px-4 py-2 rounded-r-lg"
        >
          分析
        </button>
        <button 
          onClick={handleFetchEmotion}
          className="bg-blue-500 text-white px-4 py-2 rounded-r-lg"
        >
          情緒分析
        </button>
      </div>

      {/* 結果區 */}
      <div className="mt-6 space-y-6">
        {result&& (
          result.error ? (
            <div className="bg-red-600 p-4 rounded-md">{result.error}</div>
          ) : (
            <div className="bg-gray-800 p-6 rounded-lg shadow-md space-y-4">
              {/* 標題與連結 */}
              <h2 className="text-xl font-bold">{clip(result.title, 256)}</h2>
              <p><strong>影片ID:</strong> {result.video_id}</p>

              {/* 摘要 */}
              <div>
                <h3 className="font-semibold">📌 中文摘要</h3>
                <p style={{ whiteSpace: "pre-line" }}>{fmtList(result.summary_zh, 6)}</p>
              </div>
              <div>
                <h3 className="font-semibold">📌 English Summary</h3>
                <p style={{ whiteSpace: "pre-line" }}>{fmtList(result.summary_en, 6)}</p>
              </div>

              {/* 關鍵字 */}
              <div>
                <h3 className="font-semibold">🔑 中文關鍵字</h3>
                <p>{fmtKeywords(result.keywords_zh, 15)}</p>
              </div>
              <div>
                <h3 className="font-semibold">🔑 English Keywords</h3>
                <p>{fmtKeywords(result.keywords_en, 15)}</p>
              </div>

              {/* 語言比例 */}
              <div>
                <h3 className="font-semibold">🌍 語言佔比</h3>
                <p>
                  🇹🇼 中文：{(result.lang_ratio.zh*100).toFixed(1)}% <br/>
                  🇺🇸 英文：{(result.lang_ratio.en*100).toFixed(1)}% <br/>
                  🌐 其他：{(result.lang_ratio.other*100).toFixed(1)}%
                </p>
              </div>

              {/* Footer */}
              <footer className="text-sm text-gray-400">
                總留言數：{result.stats.n_comments}
              </footer>
            </div>
          )
        )}

          {emotionImage && (
          <div>
            <img src={emotionImage} alt="Emotion Radar" />
          </div>
        )}

      </div>
    </div>
  );
}