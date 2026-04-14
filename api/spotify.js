import { createCanvas, loadImage } from "@napi-rs/canvas";

const TOKEN_ENDPOINT = "https://accounts.spotify.com/api/token";
const NOW_PLAYING_ENDPOINT = "https://api.spotify.com/v1/me/player/currently-playing";
const RECENTLY_PLAYED_ENDPOINT = "https://www.google.com/search?q=https://www.spotify.com/id/account/apps/";

const basic = Buffer.from(`${process.env.CLIENT_ID}:${process.env.CLIENT_SECRET}`).toString("base64");

export default async function handler(req, res) {
  res.setHeader("Content-Type", "image/png");
  res.setHeader("Cache-Control", "public, s-maxage=60, stale-while-revalidate=30");

  try {
    // 1. Ambil Access Token
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

    const access_token = tokenData.access_token;

    // 2. Coba ambil yang lagi diputar sekarang
    let response = await fetch(NOW_PLAYING_ENDPOINT, {
      headers: { Authorization: `Bearer ${access_token}` },
    });

    let isPlaying = true;
    let song = null;

    if (response.status === 204 || response.status > 400) {
      // 3. JIKA OFF, ambil lagu terakhir (Recently Played)
      isPlaying = false;
      const recentRes = await fetch(RECENTLY_PLAYED_ENDPOINT, {
        headers: { Authorization: `Bearer ${access_token}` },
      });
      const recentData = await recentRes.json();
      song = recentData.items[0].track; // Ambil item paling atas
    } else {
      const data = await response.json();
      song = data.item;
    }

    if (!song) return res.send(await drawStatus("Tidak ada riwayat lagu", "#282828"));

    // 4. Render Canvas
    const canvas = createCanvas(500, 150);
    const ctx = canvas.getContext("2d");

    ctx.fillStyle = "#181818";
    ctx.fillRect(0, 0, 500, 150);

    // Cover Album
    try {
      const img = await loadImage(song.album.images[0].url);
      ctx.drawImage(img, 10, 10, 130, 130);
    } catch (e) {
      ctx.fillStyle = "#333";
      ctx.fillRect(10, 10, 130, 130);
    }

    // Judul
    ctx.fillStyle = "#FFFFFF";
    ctx.font = "bold 18px Arial"; 
    ctx.fillText(song.name.substring(0, 30), 155, 50);

    // Artist
    ctx.fillStyle = "#B3B3B3";
    ctx.font = "14px Arial";
    ctx.fillText(song.artists[0].name.substring(0, 40), 155, 80);

    // Status (Current vs Recent)
    ctx.fillStyle = isPlaying ? "#1DB954" : "#b3b3b3";
    ctx.font = "bold 12px Arial";
    ctx.fillText(isPlaying ? "NOW PLAYING 🎧" : "RECENTLY PLAYED 🕒", 155, 115);

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