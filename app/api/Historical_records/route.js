import { createClient } from "@supabase/supabase-js";

function getSupabase() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY;
  if (!supabaseUrl || !supabaseKey) return null;
  return createClient(supabaseUrl, supabaseKey);
}

/** 避免 ilike / or() 解析被破壞（逗號、反斜線、萬用字元） */
function sanitizeIlike(q) {
  return q
    .trim()
    .slice(0, 200)
    .replace(/\\/g, "")
    .replace(/%/g, "")
    .replace(/_/g, "")
    .replace(/,/g, "");
}

// GET: 讀歷史紀錄（可選 category、關鍵字 q）
export async function GET(req) {
  const supabase = getSupabase();
  if (!supabase) {
    return new Response(
      JSON.stringify({ error: "缺少 NEXT_PUBLIC_SUPABASE_URL 或 NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY" }),
      { status: 503, headers: { "Content-Type": "application/json" } }
    );
  }

  try {
    const { searchParams } = new URL(req.url);
    const category = searchParams.get("category");
    const q = sanitizeIlike(searchParams.get("q") || "");
    const limit = Math.min(parseInt(searchParams.get("limit") || "50", 10) || 50, 100);

    let query = supabase
      .from("analysis_records")
      .select("*")
      .order("analysis_date", { ascending: false })
      .limit(limit);

    if (category) query = query.eq("category", category);
    if (q) {
      const pattern = `%${q}%`;
      query = query.or(`title.ilike.${pattern},youtube_url.ilike.${pattern}`);
    }

    const { data, error } = await query;
    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 });

    // 前端去重：基於 youtube_url + category 的組合，只保留最新的記錄
    const uniqueRecords = [];
    const seen = new Set();
    
    for (const record of data) {
      const key = `${record.youtube_url}|${record.category}`;
      if (!seen.has(key)) {
        seen.add(key);
        uniqueRecords.push(record);
      }
    }

    return new Response(JSON.stringify({ records: uniqueRecords }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}
