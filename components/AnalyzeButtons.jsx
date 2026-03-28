"use client";

export default function AnalyzeButtons({ data, onAnalyze }) {
  const types = ["keywords", "summary", "emotion", "topics", "top_comment"];
  if (!data) return null;

  return (
    <div className="flex flex-wrap justify-center gap-3 mb-6">
      {types.map((type) => (
        <button
          key={type}
          onClick={() => onAnalyze(type)}
          className="bg-gray-800 px-4 py-2 rounded-xl hover:bg-gray-700 border border-gray-600"
        >
          {type}
        </button>
      ))}
    </div>
  );
}