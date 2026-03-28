"use client";

export default function ResultCard({ result }) {
  if (!result) return null;

  return (
    <div className="max-w-2xl mx-auto bg-gray-800 p-6 rounded-2xl shadow-lg border border-gray-700">
      <h2 className="text-xl mb-3">📊 分析結果</h2>
      <p className="text-gray-300">{result}</p>
    </div>
  );
}