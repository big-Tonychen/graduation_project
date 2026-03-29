export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const text = searchParams.get("text");

  try {
    const res = await fetch(
      `http://localhost:8000/analyze?text=${encodeURIComponent(text)}`
    );

    const data = await res.json();

    return Response.json(data);
  } catch (error) {
    return Response.json({ error: "分析失敗" }, { status: 500 });
  }
}