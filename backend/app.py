from fastapi import FastAPI, HTTPException, Query ,Body
from fastapi.responses import JSONResponse, StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from backend.pipeline.analyze import analyze
from backend.pipeline.emotion import build_emotion
from backend.chart import build_emotion_radar_chart  # 後端雷達圖工具
import io
from fastapi.responses import StreamingResponse

# ----------------------
# FastAPI App 初始化
# ----------------------
app = FastAPI(title="YouTube Comment Analyzer API")

# 允許前端跨域請求
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 可以改成 ["http://localhost:3000"]
    allow_methods=["*"],
    allow_headers=["*"],
)

# ----------------------
# GET: 一般文字分析
# ----------------------
@app.get("/analyze")
def analyze_text(text: str):
    """
    接收文字 (text)，回傳分析結果 JSON
    """
    try:
        result = analyze(text)
        return {"result": result}
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
    return StreamingResponse(buf, media_type="image/png")