import base64
import os
import sys
from contextlib import asynccontextmanager
from datetime import datetime
from io import BytesIO
from pathlib import Path

# 添加當前目錄到 Python 路徑
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from fastapi import FastAPI, HTTPException, Query, Body, Request
from fastapi.responses import JSONResponse, StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from backend.pipeline.analyze import analyze
from backend.pipeline.emotion import build_emotion
from backend.chart import build_emotion_radar_chart
from backend.pipeline.topic import build_topics
from backend.model.summary.zh import summarize_zh
from backend.model.summary.en import summarize_en
from backend.data.youtube.api import API
from backend.queue import AnalysisQueue

from supabase import create_client

from fastapi.encoders import jsonable_encoder

try:
    from dotenv import load_dotenv

    load_dotenv(Path(__file__).resolve().parents[1] / ".env")
except Exception:
    pass
# ----------------------
# FastAPI App 初始化
# ----------------------
_yt_api = API()


@asynccontextmanager
async def lifespan(app: FastAPI):
    wq = AnalysisQueue(
        analyze_fn=analyze,
        extract_video_id_fn=_yt_api.extract_video_id,
        workers=2,
        cache_ttl_minutes=10,
        max_queue_size=50,
    )
    await wq.start()
    app.state.web_queue = wq
    yield
    await wq.stop()


app = FastAPI(title="YouTube Comment Analyzer API", lifespan=lifespan)

_SUPABASE_URL = os.getenv("NEXT_PUBLIC_SUPABASE_URL") or os.getenv("SUPABASE_URL")
_SUPABASE_KEY = os.getenv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY") or os.getenv(
    "SUPABASE_ANON_KEY"
)
supabase = (
    create_client(_SUPABASE_URL, _SUPABASE_KEY) if _SUPABASE_URL and _SUPABASE_KEY else None
)


def save_analysis_record(category: str, youtube_url: str, title: str, payload: dict) -> None:
    """寫入 Supabase；失敗時只記錄 log，不影響 API 回應。避免重複記錄。"""
    if not supabase:
        return
    try:
        # 檢查是否已存在相同的記錄
        existing = supabase.table("analysis_records").select("id").eq("youtube_url", youtube_url).eq("category", category).execute()
        
        row = {
            "category": category,
            "youtube_url": youtube_url,
            "title": title or None,
            "payload": payload,
            "analysis_date": datetime.utcnow().isoformat(),  # 更新時間戳
        }
        
        if existing.data and len(existing.data) > 0:
            # 更新現有記錄
            supabase.table("analysis_records").update(row).eq("id", existing.data[0]["id"]).execute()
        else:
            # 新增記錄
            supabase.table("analysis_records").insert(row).execute()
    except Exception as e:
        print("save_analysis_record failed:", e)


# 允許前端跨域請求
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

class AnalyzeRequest(BaseModel):
    video_url: str
    pages: int = 5
    page_size: int = 100
    min_likes: int = 0
    summary_topk: int = 5
    keyword_topk: int = 10
    run_summary: bool = True
    run_keywords: bool = True
# ----------------------
# POST: 經佇列的分析
# ----------------------
@app.post("/analyze/queued")
async def analyze_queued(req: AnalyzeRequest, request: Request):
    """與 /analyze 相同參數，經 WebAnalysisQueue（worker + TTL 快取 + 同影片去重）執行。"""
    wq = request.app.state.web_queue
    payload = req.model_dump()
    video_url = payload.pop("video_url")
    try:
        job_id = await wq.submit(video_url, "full", analyze_kwargs=payload)
        # 等待任務完成
        result = await wq.wait_for_result(job_id, timeout=300)  # 5分鐘超時
        
        if isinstance(result, dict) and not result.get("error"):
            save_analysis_record(
                "分析",
                video_url,
                result.get("title") or "",
                result,
            )
        elif hasattr(result, 'error') and not result.error:  
            # 將 AnalysisResult 物件轉換為字典格式
            result_dict = jsonable_encoder(result)
            save_analysis_record(
                "分析",
                video_url,
                result.title or "",
                result_dict,
            )
        return {"result": result}
    except Exception as e:
        return JSONResponse({"error": str(e)}, status_code=500)


@app.post("/analyze")
def analyze_api(req: AnalyzeRequest):
    try:
        result = analyze(
            video_url=req.video_url,
            pages=req.pages,
            page_size=req.page_size,
            min_likes=req.min_likes,
            summary_topk=req.summary_topk,
            keyword_topk=req.keyword_topk,
            run_summary=req.run_summary,
            run_keywords=req.run_keywords,
        )

        encoded = jsonable_encoder(result)
        if not result.error:
            save_analysis_record(
                "分析",
                req.video_url,
                getattr(result, "title", "") or "",
                encoded,
            )
        return {"result": encoded}

    except Exception as e:
        return JSONResponse({"error": str(e)}, status_code=500)

# ----------------------
# POST: 情緒分析圖片
# ----------------------
@app.post("/emotion_image")
def emotion_image(data: dict = Body(...)):
    url = data.get("url")
    if not url:
        return {"error": "缺少 URL"}

    result = build_emotion(url)

    if not result or result.error or not result.stats or not result.stats.emotions:
        return {"error": result.error or "無法取得情緒資料"}

    buf = build_emotion_radar_chart(result.stats.emotions)
    png_bytes = buf.getvalue()

    # 將雷達圖一併存入 Supabase payload（base64），歷史紀錄可直接顯示、不必重算
    encoded = jsonable_encoder(result)
    encoded["emotion_chart_png_base64"] = base64.standard_b64encode(png_bytes).decode("ascii")
    save_analysis_record(
        "情緒分析",
        url,
        result.title or "",
        encoded,
    )

    return StreamingResponse(BytesIO(png_bytes), media_type="image/png")

@app.get("/")
def root():
    return {"message": "Topic API running"}

@app.post("/topics")
def topics_text(data: dict = Body(...)):
    text = data.get("text")
    if not text:
        return {"error": "缺少 text"}
    result = build_topics(text)
    encoded = jsonable_encoder(result)
    if not result.error:
        save_analysis_record(
            "主題分析",
            text,
            result.title or "",
            encoded,
        )
    return encoded