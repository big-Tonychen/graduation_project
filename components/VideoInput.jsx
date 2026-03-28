"use client";

export default function VideoInput({ url, setUrl, onAnalyze }) {
  return (
    <div className="flex justify-center gap-2 mb-6">
      <input
        className="w-1/2 p-3 rounded-xl bg-gray-800 border border-gray-600"
        placeholder="貼上 YouTube URL..."
        value={url}
        onChange={(e) => setUrl(e.target.value)}
      />
      <button
        onClick={onAnalyze}
        className="bg-blue-500 px-4 py-2 rounded-xl hover:bg-blue-600"
      >
        Analyze
      </button>
    </div>
  );
}