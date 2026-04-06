"""
Integrate I/O
"""

from __future__ import annotations
from dataclasses import dataclass, field
from datetime import datetime
from typing import Any, List, Optional, Literal, Dict

# Analysis

@dataclass
class Stats:
    n_comments: int = 0

@dataclass
class LangRatio:
    zh: float = 0.0
    en: float = 0.0
    other: float = 1.0

@dataclass
class AnalysisResult:
    # video metadata
    video_id: str = ""
    title: str = ""
    url: str = ""

    # stats
    stats: Stats = field(default_factory=Stats)
    lang_ratio: LangRatio = field(default_factory=LangRatio)

    # outputs (pipeline → embed)
    summary_zh: List[str] = field(default_factory=list)
    summary_en: List[str] = field(default_factory=list)
    keywords_zh: List[str] = field(default_factory=list)
    keywords_en: List[str] = field(default_factory=list)

    # optional debug / future
    comments_zh: List[str] = field(default_factory=list)
    comments_en: List[str] = field(default_factory=list)
    tokens_zh: List[List[str]] = field(default_factory=list)

    # error handling
    error: Optional[str] = None
    
@dataclass
class Job:
    job_id: str
    video_id: str
    url: str
    message: Any  # discord.Message（Discord bot）；網頁示範可不使用
    created_at: datetime
    mode: str = "full"
    analyze_kwargs: Optional[Dict[str, Any]] = None

# Top Comments

Order = Literal["relevance", "time"]
SortBy = Literal["likes", "replies", "time"]

@dataclass(slots=True)
class TopComment:
    text: str
    like_count: int
    reply_count: int
    published_at: Optional[str] = None
    author: Optional[str] = None
    comment_id: Optional[str] = None

@dataclass(slots=True)
class TopCommentsResult:
    # required fields (no defaults)
    video_id: str
    title: str
    url: str
    top: List[TopComment]
    total_fetched: int
    order: Order
    sort_by: SortBy
    error: Optional[str] = None

# Topics

@dataclass(slots=True)
class TopicCluster:
    cluster_id: int
    size: int
    ratio: float
    keywords: List[str]
    representative_comments: List[str]
    language: Optional[str] = None

@dataclass(slots=True)
class TopicsResult:
    url: str
    title: str = ""
    total_comments: int = 0
    language: str = ""
    topics: List[TopicCluster] = field(default_factory=list)
    error: Optional[str] = None
    
# Emotion

@dataclass(slots=True)
class EmotionStats:
    emotions: Dict[str, int] = field(default_factory=dict)
    total: int = 0

@dataclass(slots=True)
class EmotionResult:
    url: str
    title: str = ""
    total_comments: int = 0
    language: str = ""
    stats: EmotionStats | None = None
    error: Optional[str] = None

# Trend Analysis

@dataclass(slots=True)
class TimePoint:
    timestamp: str  # ISO format datetime
    comment_count: int = 0
    emotions: Dict[str, int] = field(default_factory=dict)
    keywords: List[str] = field(default_factory=list)
    avg_sentiment: float = 0.0  # -1 to 1 scale

@dataclass(slots=True)
class NegativePeakAnalysis:
    """負面情緒高峰詳細分析"""
    peak_time: str  # 高峰時間點
    peak_sentiment: float  # 高峰情緒分數
    peak_comments: List[str]  # 高峰時間的留言
    peak_keywords: List[str]  # 高峰時間的關鍵字
    peak_summary: str  # 高峰時間的摘要
    negative_emotions: Dict[str, int]  # 各種負面情緒的分布
    total_peak_comments: int  # 高峰時間的留言總數

@dataclass(slots=True)
class TrendStats:
    time_points: List[TimePoint] = field(default_factory=list)
    total_comments: int = 0
    time_span_hours: int = 0
    peak_comment_time: Optional[str] = None
    peak_negative_time: Optional[str] = None
    anomaly_points: List[str] = field(default_factory=list)  # timestamps of anomalies
    negative_peak_analysis: Optional[NegativePeakAnalysis] = None  # 負面情緒高峰詳細分析

@dataclass(slots=True)
class TrendResult:
    url: str
    title: str = ""
    total_comments: int = 0
    language: str = ""
    trend_stats: TrendStats | None = None
    error: Optional[str] = None

@dataclass(slots=True)
class SentimentTopic:
    topic: str
    sentiment: str  # positive/negative/neutral
    comments: List[str]
    count: int
    keywords: List[str] = field(default_factory=list)  # 
    summary: str = ""  # 

@dataclass(slots=True)
class EmotionTopicResult:
    url: str
    title: str = ""
    total_comments: int = 0
    language: str = ""
    positive_topics: List[SentimentTopic] = field(default_factory=list)
    negative_topics: List[SentimentTopic] = field(default_factory=list)
    neutral_topics: List[SentimentTopic] = field(default_factory=list)
    error: Optional[str] = None