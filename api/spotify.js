import { createCanvas, loadImage } from "@napi-rs/canvas";

const TOKEN_ENDPOINT = "https://accounts.spotify.com/api/token";
const NOW_PLAYING_ENDPOINT = "https://api.spotify.com/v1/me/player/currently-playing";
const RECENTLY_PLAYED_ENDPOINT = "https://api.spotify.com/v1/me/player/recently-played";

const basic = Buffer.from(`${process.env.CLIENT_ID}:${process.env.CLIENT_SECRET}`).toString("base64");

export default async function handler(req, res) {
  res.setHeader("Content-Type", "image/png");
  res.setHeader("Cache-Control", "public, s-maxage=60, stale-while-revalidate=30");

  try {
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
    if (!tokenData.access_token) {
      return res.send(await drawStatus("Gagal ambil Access Token", "#FF0000"));
    }

    const access_token = tokenData.access_token;

    // Coba ambil Currently Playing
    let response = await fetch(NOW_PLAYING_ENDPOINT, {
      headers: { Authorization: `Bearer ${access_token}` },
    });

    let song = null;
    let isPlaying = false;

    if (response.status === 200) {
      const data = await response.json();
      song = data.item;
      isPlaying = true;
    } 

    // Jika sedang tidak play, ambil Recently Played
    if (!song) {
      const recentRes = await fetch(`${RECENTLY_PLAYED_ENDPOINT}?limit=1`, {
        headers: { Authorization: `Bearer ${access_token}` },
      });
      const recentData = await recentRes.json();
      if (recentData.items && recentData.items.length > 0) {
        song = recentData.items[0].track;
      }
    }

    if (!song) {
      return res.send(await drawStatus("Riwayat Musik Kosong", "#282828"));
    }

    // Pembuatan Gambar
    const canvas = createCanvas(500, 150);
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#181818";
    ctx.fillRect(0, 0, 500, 150);

    const img = await loadImage(song.album.images[0].url);
    ctx.drawImage(img, 10, 10, 130, 130);

    ctx.fillStyle = "#FFFFFF";
    ctx.font = "bold 18px Arial"; 
    ctx.fillText(song.name.substring(0, 30), 155, 50);

    ctx.fillStyle = isPlaying ? "#1DB954" : "#B3B3B3";
    ctx.font = "bold 12px Arial";
    ctx.fillText(isPlaying ? "NOW PLAYING 🎧" : "RECENTLY PLAYED 🕒", 155, 115);

    return res.send(canvas.toBuffer("image/png"));

  } catch (err) {
    return res.send(await drawStatus(`Error: ${err.message}`, "#FF0000"));
  }
}

async function drawStatus(msg, bgColor) {
  const canvas = createCanvas(500, 100);
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = bgColor;
  ctx.fillRect(0, 0, 500, 100);
  ctx.fillStyle = "#FFFFFF";
  ctx.font = "14px Arial";
  ctx.fillText(msg, 20, 55);
  return canvas.toBuffer("image/png");
}