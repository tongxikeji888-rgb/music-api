export default function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  const keyword = (req.query.keyword || "").trim();

  if (!keyword) {
    return res.status(400).json({
      code: 400,
      message: "缺少 keyword 参数",
      data: []
    });
  }

  return res.status(200).json({
    code: 200,
    message: "success",
    data: [
      {
        id: "demo-001",
        name: keyword + " 测试歌曲",
        artist: "测试歌手",
        cover: "https://picsum.photos/300/300?random=1",
        lrc: "[00:00.00]这里是测试歌词\n[00:03.00]如果你看到歌词滚动，说明接口通了",
        url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
        source: "demo"
      }
    ]
  });
}
