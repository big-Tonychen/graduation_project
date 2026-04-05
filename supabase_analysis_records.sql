-- 在 Supabase → SQL Editor 執行（若尚未建立資料表）。
-- 圖檔：情緒雷達圖以 base64 字串放在 payload.emotion_chart_png_base64（與數值一併存 jsonb）。
-- 若改存「純二進位」可用 bytea 欄位，或 Supabase Storage 存檔＋資料表只存公開 URL。
create table if not exists public.analysis_records (
  id uuid primary key default gen_random_uuid(),
  category text not null,
  youtube_url text not null,
  title text,
  analysis_date timestamptz not null default now(),
  payload jsonb
);

create index if not exists analysis_records_analysis_date_idx
  on public.analysis_records (analysis_date desc);

create index if not exists analysis_records_category_idx
  on public.analysis_records (category);

-- 添加複合索引來優化去重查詢
create index if not exists analysis_records_url_category_idx
  on public.analysis_records (youtube_url, category);

-- 若啟用 RLS，請自行新增適合的 policy（例如允許 anon insert/select），否則後端與 API 寫入會被拒絕。
