"""
趨勢分析圖表生成模組
"""

import matplotlib
matplotlib.use('Agg')  # 使用非交互式後端，避免 tkinter 錯誤
import matplotlib.pyplot as plt
import matplotlib.dates as mdates
import numpy as np
from datetime import datetime
from io import BytesIO
from backend.pipeline.schema import TrendResult, EmotionTopicResult

# 設置中文字體支持
plt.rcParams['font.sans-serif'] = ['SimHei', 'Microsoft YaHei', 'DejaVu Sans']
plt.rcParams['axes.unicode_minus'] = False


def build_trend_chart(trend_result: TrendResult, chart_type: str = 'volume') -> BytesIO:
    """建立趨勢分析圖表"""
    if not trend_result.trend_stats or not trend_result.trend_stats.time_points:
        raise ValueError("沒有趨勢資料")
    
    time_points = trend_result.trend_stats.time_points
    timestamps = [datetime.fromisoformat(tp.timestamp.replace('Z', '+00:00')) for tp in time_points]
    
    plt.style.use('dark_background')
    fig, ax = plt.subplots(figsize=(12, 6))
    
    if chart_type == 'volume':
        # 留言數量趨勢
        comment_counts = [tp.comment_count for tp in time_points]
        ax.plot(timestamps, comment_counts, color='#00ff88', linewidth=2, marker='o', markersize=4)
        ax.fill_between(timestamps, comment_counts, alpha=0.3, color='#00ff88')
        
        # 標記異常點
        anomaly_times = trend_result.trend_stats.anomaly_points
        if anomaly_times:
            anomaly_timestamps = [datetime.fromisoformat(at.replace('Z', '+00:00')) for at in anomaly_times]
            anomaly_counts = [tp.comment_count for tp in time_points if tp.timestamp in anomaly_times]
            ax.scatter(anomaly_timestamps, anomaly_counts, color='red', s=100, marker='x', label='異常點')
            ax.legend()
        
        ax.set_title('留言數量趨勢', fontsize=16, fontweight='bold')
        ax.set_ylabel('留言數量', fontsize=12)
        
    elif chart_type == 'sentiment':
        # 情緒趨勢
        sentiments = [tp.avg_sentiment for tp in time_points]
        ax.plot(timestamps, sentiments, color='#ff6b6b', linewidth=2, marker='o', markersize=4)
        ax.axhline(y=0, color='white', linestyle='--', alpha=0.5)
        ax.fill_between(timestamps, sentiments, 0, alpha=0.3, color='#ff6b6b')
        
        # 標記負面情緒高峰
        if trend_result.trend_stats.peak_negative_time:
            peak_time = datetime.fromisoformat(trend_result.trend_stats.peak_negative_time.replace('Z', '+00:00'))
            peak_sentiment = next(tp.avg_sentiment for tp in time_points if tp.timestamp == trend_result.trend_stats.peak_negative_time)
            ax.scatter([peak_time], [peak_sentiment], color='red', s=100, marker='x', label='負面情緒高峰')
            ax.legend()
        
        ax.set_title('情緒趨勢分析', fontsize=16, fontweight='bold')
        ax.set_ylabel('情緒分數 (-1 到 1)', fontsize=12)
        ax.set_ylim(-1, 1)
    
    # 設定 x 軸格式
    ax.xaxis.set_major_formatter(mdates.DateFormatter('%m/%d %H:%M'))
    ax.xaxis.set_major_locator(mdates.HourLocator(interval=6))
    plt.xticks(rotation=45)
    
    ax.grid(True, alpha=0.3)
    ax.set_facecolor('#1a1a1a')
    fig.patch.set_facecolor('#0a0a0a')
    
    plt.tight_layout()
    
    buf = BytesIO()
    plt.savefig(buf, format='png', dpi=150, facecolor='#0a0a0a', edgecolor='none')
    plt.close()
    buf.seek(0)
    
    return buf


def build_emotion_topic_chart(emotion_topic_result: EmotionTopicResult) -> BytesIO:
    """建立情緒話題圖表"""
    if not emotion_topic_result.positive_topics and not emotion_topic_result.negative_topics:
        raise ValueError("沒有情緒話題資料")
    
    plt.style.use('dark_background')
    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(14, 6))
    
    # 正面話題
    if emotion_topic_result.positive_topics:
        positive_topics = emotion_topic_result.positive_topics[:5]  # 取前5個
        pos_labels = [f"{t.topic}\n({t.count})" for t in positive_topics]
        pos_counts = [t.count for t in positive_topics]
        
        colors_pos = ['#00ff88', '#00cc66', '#00aa44', '#008822', '#006600']
        ax1.pie(pos_counts, labels=pos_labels, colors=colors_pos, autopct='%1.1f%%', startangle=90)
        ax1.set_title('正面話題分布', fontsize=14, fontweight='bold')
    else:
        ax1.text(0.5, 0.5, '無正面話題', ha='center', va='center', transform=ax1.transAxes, fontsize=12)
        ax1.set_title('正面話題分布', fontsize=14, fontweight='bold')
    
    # 負面話題
    if emotion_topic_result.negative_topics:
        negative_topics = emotion_topic_result.negative_topics[:5]  # 取前5個
        neg_labels = [f"{t.topic}\n({t.count})" for t in negative_topics]
        neg_counts = [t.count for t in negative_topics]
        
        colors_neg = ['#ff4444', '#cc3333', '#aa2222', '#881111', '#660000']
        ax2.pie(neg_counts, labels=neg_labels, colors=colors_neg, autopct='%1.1f%%', startangle=90)
        ax2.set_title('負面話題分布', fontsize=14, fontweight='bold')
    else:
        ax2.text(0.5, 0.5, '無負面話題', ha='center', va='center', transform=ax2.transAxes, fontsize=12)
        ax2.set_title('負面話題分布', fontsize=14, fontweight='bold')
    
    fig.suptitle(f'情緒話題分析 - {emotion_topic_result.title}', fontsize=16, fontweight='bold')
    
    plt.tight_layout()
    
    buf = BytesIO()
    plt.savefig(buf, format='png', dpi=150, facecolor='#0a0a0a', edgecolor='none')
    plt.close()
    buf.seek(0)
    
    return buf


def build_combined_trend_chart(trend_result: TrendResult, emotion_topic_result: EmotionTopicResult) -> BytesIO:
    """建立綜合趨勢圖表"""
    if not trend_result.trend_stats or not trend_result.trend_stats.time_points:
        raise ValueError("沒有趨勢資料")
    
    time_points = trend_result.trend_stats.time_points
    timestamps = [datetime.fromisoformat(tp.timestamp.replace('Z', '+00:00')) for tp in time_points]
    
    plt.style.use('dark_background')
    fig, (ax1, ax2) = plt.subplots(2, 1, figsize=(14, 10))
    
    # 上圖：留言數量趨勢
    comment_counts = [tp.comment_count for tp in time_points]
    ax1.plot(timestamps, comment_counts, color='#00ff88', linewidth=2, marker='o', markersize=4)
    ax1.fill_between(timestamps, comment_counts, alpha=0.3, color='#00ff88')
    
    # 標記異常點
    anomaly_times = trend_result.trend_stats.anomaly_points
    if anomaly_times:
        anomaly_timestamps = [datetime.fromisoformat(at.replace('Z', '+00:00')) for at in anomaly_times]
        anomaly_counts = [tp.comment_count for tp in time_points if tp.timestamp in anomaly_times]
        ax1.scatter(anomaly_timestamps, anomaly_counts, color='red', s=100, marker='x', label='異常點')
        ax1.legend()
    
    ax1.set_title('留言數量趨勢', fontsize=14, fontweight='bold')
    ax1.set_ylabel('留言數量', fontsize=12)
    ax1.grid(True, alpha=0.3)
    
    # 下圖：情緒趨勢
    sentiments = [tp.avg_sentiment for tp in time_points]
    ax2.plot(timestamps, sentiments, color='#ff6b6b', linewidth=2, marker='o', markersize=4)
    ax2.axhline(y=0, color='white', linestyle='--', alpha=0.5)
    ax2.fill_between(timestamps, sentiments, 0, alpha=0.3, color='#ff6b6b')
    
    # 標記負面情緒高峰
    if trend_result.trend_stats.peak_negative_time:
        peak_time = datetime.fromisoformat(trend_result.trend_stats.peak_negative_time.replace('Z', '+00:00'))
        peak_sentiment = next(tp.avg_sentiment for tp in time_points if tp.timestamp == trend_result.trend_stats.peak_negative_time)
        ax2.scatter([peak_time], [peak_sentiment], color='red', s=100, marker='x', label='負面情緒高峰')
        ax2.legend()
    
    ax2.set_title('情緒趨勢分析', fontsize=14, fontweight='bold')
    ax2.set_ylabel('情緒分數 (-1 到 1)', fontsize=12)
    ax2.set_ylim(-1, 1)
    ax2.grid(True, alpha=0.3)
    
    # 設定 x 軸格式
    for ax in [ax1, ax2]:
        ax.xaxis.set_major_formatter(mdates.DateFormatter('%m/%d %H:%M'))
        ax.xaxis.set_major_locator(mdates.HourLocator(interval=6))
        plt.setp(ax.xaxis.get_majorticklabels(), rotation=45)
    
    fig.suptitle(f'綜合趨勢分析 - {trend_result.title}', fontsize=16, fontweight='bold')
    fig.patch.set_facecolor('#0a0a0a')
    
    plt.tight_layout()
    
    buf = BytesIO()
    plt.savefig(buf, format='png', dpi=150, facecolor='#0a0a0a', edgecolor='none')
    plt.close()
    buf.seek(0)
    
    return buf
