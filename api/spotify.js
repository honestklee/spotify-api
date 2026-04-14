import { createCanvas, loadImage } from "@napi-rs/canvas";

// ENDPOINT RESMI SPOTIFY
const TOKEN_ENDPOINT = "https://accounts.spotify.com/api/token";
const NOW_PLAYING_ENDPOINT = "https://api.spotify.com/v1/me/player/currently-playing";

const basic = Buffer.from(
  `${process.env.CLIENT_ID}:${process.env.CLIENT_SECRET}`
).toString("base64");

export default async function handler(req, res) {
  try {
    // 1. MENGAMBIL ACCESS TOKEN BARU
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

    // Jika refresh token salah / expired
    if (!tokenData.access_token) {
      return renderMessage(res, "Error: Invalid Refresh Token", "#FF5555");
    }

    const access_token = tokenData.access_token;

    // 2. MENGAMBIL DATA LAGU DARI SPOTIFY
    const nowPlayingRes = await fetch(NOW_PLAYING_ENDPOINT, {
      headers: {
        Authorization: `Bearer ${access_token}`,
      },
    });

    // Set header agar gambar tidak di-cache terlalu lama oleh GitHub
    res.setHeader("Content-Type", "image/png");
    res.setHeader("Cache-Control", "public, s-maxage=60, stale-while-revalidate=30");

    // 3. CEK APAKAH ADA LAGU YANG DIPUTAR
    if (nowPlayingRes.status === 204 || nowPlayingRes.status > 400) {
      return renderMessage(res, "Spotify is Idle - Putar Lagu!", "#b3b3b3");
    }

    const song = await nowPlayingRes.json();

    if (!song || !song.item) {
      return renderMessage(res, "Nothing playing right now", "#b3b3b3");
    }

    // 4. PREPARASI DATA UNTUK DITAMPILKAN
    const title = song.item.name;
    const artist = song.item.artists.map((a) => a.name).join(", ");
    const albumImage = song.item.album.images[0].url;

    // 5. RENDER CANVAS (DENGAN LAGU)
    const canvas = createCanvas(500, 150);
    const ctx = canvas.getContext("2d");

    // Background Gelap
    ctx.fillStyle = "#121212";
    ctx.fillRect(0, 0, 500, 150);

    // Load & Draw Cover Album
    const img = await loadImage(albumImage);
    ctx.drawImage(img, 10, 10, 130, 130);

    // Text Judul
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 18px sans-serif";
    ctx.fillText(title.substring(0, 35), 160, 60);

    // Text Artist
    ctx.fillStyle = "#b3b3b3";
    ctx.font = "14px sans-serif";
    ctx.fillText(artist.substring(0, 45), 160, 90);

    // Label Spotify
    ctx.fillStyle = "#1DB954";
    ctx.font = "bold 12px sans-serif";
    ctx.fillText("LISTENING ON SPOTIFY 🎧", 160, 125);

    return res.send(canvas.toBuffer("image/png"));

  } catch (error) {
    console.error(error);
    return renderMessage(res, "Server Error: " + error.message, "#FF5555");
  }
}

// FUNGSI UNTUK MERENDER PESAN (ERROR/IDLE) PADA GAMBAR
async function renderMessage(res, message, color) {
  const canvas = createCanvas(500, 100);
  const ctx = canvas.getContext("2d");

  ctx.fillStyle = "#121212";
  ctx.fillRect(0, 0, 500, 100);

  ctx.fillStyle = color;
  ctx.font = "16px sans-serif";
  ctx.fillText(message, 20, 55);

  const buffer = canvas.toBuffer("image/png");
  return res.send(buffer);
}