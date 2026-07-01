export default {
  async fetch(request) {
    const headers = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Content-Type": "application/json; charset=utf-8"
    };

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers });
    }

    const url = new URL(request.url);
    const pathname = url.pathname;
    const keyword = (url.searchParams.get("keyword") || "").trim();

    if (pathname !== "/api/search") {
      return jsonResponse({
        code: 404,
        message: "接口不存在，请访问 /api/search?keyword=周杰伦",
        data: []
      }, headers);
    }

    if (!keyword) {
      return jsonResponse({
        code: 400,
        message: "缺少 keyword 参数",
        data: []
      }, headers);
    }

    try {
      const searchUrl =
        "https://api.xunhuisi.store/API/QQMusic/Song.php?name=" +
        encodeURIComponent(keyword);

      const searchJson = await fetchJson(searchUrl);
      const rawList = pickArray(searchJson);

      const baseList = rawList
        .map((item, index) => normalizeSong(item, keyword, index))
        .filter(song => song.name)
        .slice(0, 12);

      const data = await Promise.all(
        baseList.map(async song => {
          if (song.cover && song.lrc && song.url) return song;

          const id = song.id || song.mid;
          if (!id) return song;

          try {
            const detailUrl =
              "https://api.xunhuisi.store/API/QQMusic/Song.php?mid=" +
              encodeURIComponent(id);

            const detailJson = await fetchJson(detailUrl);
            const detailRaw = pickFirst(detailJson);
            const detail = normalizeSong(detailRaw || {}, song.name, 0);

            return {
              id: song.id || detail.id,
              mid: song.mid || detail.mid || song.id || detail.id,
              name: song.name || detail.name,
              artist: song.artist || detail.artist,
              cover: detail.cover || song.cover || "",
              lrc: detail.lrc || song.lrc || "",
              url: detail.url || song.url || "",
              source: "qqmusic"
            };
          } catch (e) {
            return song;
          }
        })
      );

      const finalData = data.sort((a, b) => {
        return Number(!!b.url) - Number(!!a.url);
      });

      return jsonResponse({
        code: 200,
        message: "success",
        data: finalData
      }, headers);

    } catch (e) {
      return jsonResponse({
        code: 500,
        message: "接口异常：" + (e && e.message ? e.message : "unknown"),
        data: []
      }, headers);
    }
  }
};

function jsonResponse(obj, headers) {
  return new Response(JSON.stringify(obj), {
    status: 200,
    headers
  });
}

async function fetchJson(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12000);

  try {
    const res = await fetch(url, {
      method: "GET",
      headers: {
        "User-Agent": "Mozilla/5.0",
        "Accept": "application/json,text/plain,*/*"
      },
      signal: controller.signal
    });

    if (!res.ok) {
      throw new Error("HTTP " + res.status);
    }

    const text = await res.text();

    try {
      return JSON.parse(text);
    } catch (e) {
      throw new Error("上游返回不是 JSON");
    }

  } finally {
    clearTimeout(timer);
  }
}

function pickArray(json) {
  if (!json) return [];

  if (Array.isArray(json.data)) return json.data;
  if (Array.isArray(json.songs)) return json.songs;
  if (Array.isArray(json.result?.songs)) return json.result.songs;
  if (Array.isArray(json.result)) return json.result;
  if (Array.isArray(json.list)) return json.list;

  if (json.data && typeof json.data === "object") return [json.data];

  if (
    json.music_url ||
    json.url ||
    json.play_url ||
    json.mid ||
    json.id ||
    json.name ||
    json.songname ||
    json.title
  ) {
    return [json];
  }

  return [];
}

function pickFirst(json) {
  const arr = pickArray(json);
  return arr[0] || null;
}

function normalizeSong(item, keyword, index) {
  item = item || {};

  const id =
    item.id ||
    item.mid ||
    item.songmid ||
    item.song_id ||
    item.songId ||
    `${keyword}-${index}`;

  const name =
    item.name ||
    item.songname ||
    item.songName ||
    item.title ||
    keyword;

  const artist = normalizeArtist(
    item.artist ||
    item.singer ||
    item.author ||
    item.singers ||
    item.ar ||
    item.singername
  );

  const cover =
    item.cover ||
    item.pic ||
    item.picUrl ||
    item.pic_url ||
    item.album_pic ||
    item.albumpic ||
    item.img ||
    item.image ||
    "";

  const lrc =
    item.lrc ||
    item.lyric ||
    item.lyrics ||
    item.lyric_text ||
    "";

  const playUrl =
    item.url ||
    item.music_url ||
    item.musicUrl ||
    item.play_url ||
    item.playUrl ||
    item.audio ||
    item.src ||
    "";

  return {
    id: String(id || ""),
    mid: String(id || ""),
    name: String(name || ""),
    artist: artist || "未知歌手",
    cover: String(cover || ""),
    lrc: String(lrc || ""),
    url: String(playUrl || ""),
    source: "qqmusic"
  };
}

function normalizeArtist(value) {
  if (!value) return "";

  if (typeof value === "string") {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map(v => {
      if (typeof v === "string") return v;
      return v.name || v.singer || v.title || "";
    }).filter(Boolean).join(" / ");
  }

  if (typeof value === "object") {
    return value.name || value.singer || value.title || "";
  }

  return String(value);
}
