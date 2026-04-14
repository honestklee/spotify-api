import { createCanvas, loadImage } from "@napi-rs/canvas";

const TOKEN_ENDPOINT = "https://accounts.spotify.com/api/token";
const NOW_PLAYING_ENDPOINT = "https://api.spotify.com/v1/me/player/currently-playing";

const basic = Buffer.from(`${process.env.CLIENT_ID}:${process.env.CLIENT_SECRET}`).toString("base64");

export default async function handler(req, res) {
  res.setHeader("Content-Type", "image/png");
  res.setHeader("Cache-Control", "public, s-maxage=60, stale-while-revalidate=30");

  try {
    // 1. Ambil Token
    const tokenRes = await fetch(TOKEN_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Basic ${basic}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: process.env.REFRESH_TOKEN,
      }),
    });

    const tokenData = await tokenRes.json();
    if (!tokenData.access_token) return res.send(await drawStatus("Token Error / Check Env", "#FF0000"));

    // 2. Ambil Lagu
    const nowPlayingRes = await fetch(NOW_PLAYING_ENDPOINT, {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });

    if (nowPlayingRes.status === 204 || nowPlayingRes.status > 400) {
      return res.send(await drawStatus("Spotify Sedang Off 😴", "#282828"));
    }

    const song = await nowPlayingRes.json();
    if (!song?.item) return res.send(await drawStatus("Lagu Tidak Ditemukan", "#282828"));

    // 3. Render Canvas Utama
    const canvas = createCanvas(500, 150);
    const ctx = canvas.getContext("2d");

    // Background (Ganti jadi Abu-abu gelap agar beda dengan 'hitam error')
    ctx.fillStyle = "#181818";
    ctx.fillRect(0, 0, 500, 150);

    // Gambar Cover
    try {
      const img = await loadImage(song.item.album.images[0].url);
      ctx.drawImage(img, 10, 10, 130, 130);
    } catch (e) {
      ctx.fillStyle = "#333";
      ctx.fillRect(10, 10, 130, 130); // Placeholder jika gambar gagal load
    }

    // Gambar Teks (Gunakan font Arial sebagai fallback umum)
    ctx.fillStyle = "#FFFFFF";
    ctx.font = "bold 18px Arial"; 
    ctx.fillText(song.item.name.substring(0, 30), 155, 50);

    ctx.fillStyle = "#B3B3B3";
    ctx.font = "14px Arial";
    ctx.fillText(song.item.artists[0].name.substring(0, 40), 155, 80);

    ctx.fillStyle = "#1DB954";
    ctx.font = "bold 12px Arial";
    ctx.fillText("ON SPOTIFY 🎧", 155, 115);

    return res.send(canvas.toBuffer("image/png"));

  } catch (err) {
    return res.send(await drawStatus("Crash: " + err.message, "#FF0000"));
  }
}

async function drawStatus(msg, bgColor) {
  const canvas = createCanvas(500, 100);
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = bgColor;
  ctx.fillRect(0, 0, 500, 100);
  ctx.fillStyle = "#FFFFFF";
  ctx.font = "16px Arial";
  ctx.fillText(msg, 20, 55);
  return canvas.toBuffer("image/png");
}