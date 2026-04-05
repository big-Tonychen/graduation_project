"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { HistoryRecordBody } from "@/lib/recordResultViews";

const CATEGORIES = [
  { value: "", label: "全部" },
  { value: "分析", label: "分析" },
  { value: "主題分析", label: "主題分析" },
  { value: "情緒分析", label: "情緒分析" },
];

function formatWhen(record) {
  const raw = record.analysis_date ?? record.date;
  if (!raw) return "—";
  try {
    return new Date(raw).toLocaleString("zh-TW");
  } catch {
    return String(raw);
  }
}

export default function HistoricalRecords() {
  const [records, setRecords] = useState([]);
  const [category, setCategory] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [detail, setDetail] = useState(null);

  const fetchRecords = useCallback(async (categoryFilter, q) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (categoryFilter) params.set("category", categoryFilter);
      if (q?.trim()) params.set("q", q.trim());
      const qs = params.toString();
      const res = await fetch(`/api/Historical_records${qs ? `?${qs}` : ""}`);
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "載入失敗");
        setRecords([]);
        return;
      }
      setRecords(data.records || []);
    } catch (err) {
      console.error(err);
      setError("無法連線到伺服器");
      setRecords([]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchRecords(category, appliedSearch);
  }, [category, appliedSearch, fetchRecords]);

  const runSearch = () => {
    setAppliedSearch(searchInput);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-800 to-blue-900 p-6 text-white">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-3xl font-bold">歷史紀錄</h1>
        <Link
          href="/"
          className="rounded-lg bg-white/10 px-4 py-2 text-sm ring-1 ring-white/20 hover:bg-white/20"
        >
          返回首頁
        </Link>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        <input
          type="text"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && runSearch()}
          placeholder="搜尋標題或 YouTube 網址…"
          className="min-w-[200px] flex-1 rounded-l-lg border border-white/20 bg-white/10 p-3 text-white outline-none placeholder:text-white/50 focus:ring-2 focus:ring-blue-500"
        />
        <button
          type="button"
          onClick={runSearch}
          className="rounded-r-lg bg-blue-500 px-4 py-2 font-medium hover:bg-blue-600"
        >
          搜尋
        </button>
      </div>

      <div className="mb-6 flex flex-wrap gap-2">
        <span className="self-center text-sm text-white/70">類型</span>
        {CATEGORIES.map((c) => (
          <button
            key={c.value || "all"}
            type="button"
            onClick={() => setCategory(c.value)}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
              category === c.value
                ? "bg-blue-500 text-white"
                : "bg-white/10 text-white/90 ring-1 ring-white/20 hover:bg-white/20"
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>

      {error && <p className="mb-4 rounded-lg bg-red-500/20 px-3 py-2 text-red-100">{error}</p>}

      {loading ? (
        <p className="text-white/80">載入中…</p>
      ) : (
        <div className="space-y-3">
          {records.length === 0 && !error && <p className="text-white/70">沒有紀錄</p>}
          {records.map((item) => (
            <div
              key={item.id}
              className="flex flex-col gap-2 rounded-xl bg-gray-900/90 p-4 ring-1 ring-white/10 transition hover:bg-gray-800/90 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">{item.title || "（無標題）"}</p>
                <p className="truncate text-sm text-gray-400">{item.youtube_url}</p>
                <p className="mt-1 text-xs text-gray-500">
                  {item.category} · {formatWhen(item)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setDetail(item)}
                className="shrink-0 text-blue-400 hover:underline"
              >
                查看
              </button>
            </div>
          ))}
        </div>
      )}

      {detail && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          role="dialog"
          aria-modal="true"
          onClick={() => setDetail(null)}
        >
          <div
            className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-xl bg-gray-950/95 p-6 text-left shadow-xl ring-1 ring-white/20"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-6 flex items-start justify-between gap-4 border-b border-white/10 pb-4">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-indigo-300/90">
                  與首頁相同預覽
                </p>
                <h2 className="mt-1 text-lg font-bold text-white">{detail.title || "紀錄詳情"}</h2>
                <p className="mt-1 break-all text-sm text-gray-400">{detail.youtube_url}</p>
                <p className="mt-2 text-xs text-gray-500">
                  {detail.category} · {formatWhen(detail)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setDetail(null)}
                className="rounded-lg bg-white/10 px-3 py-1.5 text-sm hover:bg-white/20"
              >
                關閉
              </button>
            </div>
            <HistoryRecordBody
              category={detail.category}
              payload={detail.payload}
              youtubeUrl={detail.youtube_url}
            />
          </div>
        </div>
      )}
    </div>
  );
}
