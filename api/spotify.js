import { createCanvas, loadImage } from "@napi-rs/canvas";

// GUNAKAN ENDPOINT RESMI SPOTIFY
const TOKEN_ENDPOINT = "https://accounts.spotify.com/api/token";
const NOW_PLAYING_ENDPOINT = "https://api.spotify.com/v1/me/player/currently-playing";

const basic = Buffer.from(
  `${process.env.CLIENT_ID}:${process.env.CLIENT_SECRET}`
).toString("base64");

export default async function handler(req, res) {
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

    if (!tokenData.access_token) {
      return renderError(res, "Invalid Refresh Token/Env");
    }

    // 2. Ambil Lagu
    const nowPlayingRes = await fetch(NOW_PLAYING_ENDPOINT, {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
      },
    });

    // Header agar GitHub tidak nge-cache gambar terlalu lama
    res.setHeader("Content-Type", "image/png");
    res.setHeader("Cache-Control", "public, s-maxage=60, stale-while-revalidate=30");

    // 3. Kondisi jika tidak ada lagu (Status 204 atau item kosong)
    if (nowPlayingRes.status === 204 || nowPlayingRes.status > 400) {
      return renderError(res, "Spotify is Idle 😴", "#b3b3b3");
    }

    const song = await nowPlayingRes.json();
    if (!song.item) {
      return renderError(res, "Nothing playing", "#b3b3b3");
    }

    // 4. Render Lagu
    const title = song.item.name;
    const artist = song.item.artists.map(a => a.name).join(", ");
    const albumImage = song.item.album.images[0].url;

    const canvas = createCanvas(500, 150);
    const ctx = canvas.getContext("2d");

    // Background
    ctx.fillStyle = "#121212";
    ctx.fillRect(0, 0, 500, 150);

    // Cover Album
    const img = await loadImage(albumImage);
    ctx.drawImage(img, 10, 10, 130, 130);

    // Text Title
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 18px sans-serif";
    ctx.fillText(title.substring(0, 30), 160, 60);

    // Text Artist
    ctx.fillStyle = "#b3b3b3";
    ctx.font = "14px sans-serif";
    ctx.fillText(artist.substring(0, 40), 160, 90);

    // Spotify Logo/Label
    ctx.fillStyle = "#1DB954";
    ctx.font = "bold 12px sans-serif";
    ctx.fillText("LISTENING ON SPOTIFY", 160, 125);

    return res.send(canvas.toBuffer("image/png"));

  } catch (e) {
    return renderError(res, "Server Error: " + e.message);
  }
}

// Fungsi pembantu untuk menampilkan pesan di gambar jika ada masalah
async function renderError(res, message, color = "#FF5555") {
  const canvas = createCanvas(500, 100);
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#121212";
  ctx.fillRect(0, 0, 500, 100);
  ctx.fillStyle = color;
  ctx.font = "16px sans-serif";
  ctx.fillText(message, 20, 55);
  return res.send(canvas.toBuffer("image/png"));
}