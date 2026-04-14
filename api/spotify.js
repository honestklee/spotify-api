import { createCanvas, loadImage, GlobalFonts } from "@napi-rs/canvas";

// 1. Gunakan Endpoint RESMI Spotify
const TOKEN_ENDPOINT = "https://accounts.spotify.com/api/token";
const NOW_PLAYING_ENDPOINT = "https://api.spotify.com/v1/me/player/currently-playing";

const basic = Buffer.from(
  `${process.env.CLIENT_ID}:${process.env.CLIENT_SECRET}`
).toString("base64");

export default async function handler(req, res) {
  try {
    // 2. Ambil Access Token menggunakan Refresh Token
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

    const { access_token } = await tokenRes.json();

    // 3. Ambil data lagu yang sedang diputar
    const nowPlayingRes = await fetch(NOW_PLAYING_ENDPOINT, {
      headers: {
        Authorization: `Bearer ${access_token}`,
      },
    });

    // Header untuk menghindari cache berlebihan di GitHub (Update tiap 1 menit)
    res.setHeader("Content-Type", "image/png");
    res.setHeader("Cache-Control", "public, s-maxage=60, stale-while-revalidate=30");

    // 4. Jika Spotify mati atau tidak ada lagu (Status 204)
    if (nowPlayingRes.status === 204 || nowPlayingRes.status > 400) {
      return res.send(await renderEmptyState());
    }

    const song = await nowPlayingRes.json();

    // Pastikan item ada
   if (!song || !song.item) {
    const canvas = createCanvas(500, 150); // Samakan ukurannya
    const ctx = canvas.getContext("2d");

    ctx.fillStyle = "#121212";
    ctx.fillRect(0, 0, 500, 150);

    ctx.fillStyle = "#b3b3b3";
    ctx.font = "italic 16px sans-serif";
    ctx.fillText("Sedang tidak mendengarkan apa pun... 😴", 130, 80);

    res.setHeader("Content-Type", "image/png");
    return res.send(canvas.toBuffer("image/png"));
  }
    // 5. Render Canvas untuk lagu yang sedang diputar
    const title = song.item.name;
    const artist = song.item.artists.map((a) => a.name).join(", ");
    const albumImage = song.item.album.images[0].url;

    const canvas = createCanvas(500, 150);
    const ctx = canvas.getContext("2d");

    // Background Gelap ala Spotify
    ctx.fillStyle = "#121212";
    ctx.roundRect(0, 0, 500, 150, 10); // Membuat sudut sedikit melengkung
    ctx.fill();

    // Load & Draw Cover Album
    const img = await loadImage(albumImage);
    ctx.save();
    // Membuat cover album sedikit rounded
    ctx.beginPath();
    ctx.roundRect(10, 10, 130, 130, 5);
    ctx.clip();
    ctx.drawImage(img, 10, 10, 130, 130);
    ctx.restore();

    // Text Title
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 18px sans-serif";
    ctx.fillText(title.substring(0, 35), 160, 60);

    // Text Artist
    ctx.fillStyle = "#b3b3b3";
    ctx.font = "14px sans-serif";
    ctx.fillText(artist.substring(0, 45), 160, 90);
    
    // Indikator "Currently Playing"
    ctx.fillStyle = "#1DB954"; // Hijau Spotify
    ctx.font = "12px sans-serif";
    ctx.fillText("ON SPOTIFY 🎧", 160, 120);

    return res.send(canvas.toBuffer("image/png"));

  } catch (error) {
    console.error(error);
    return res.send(await renderEmptyState("Error loading Spotify"));
  }
}

// Fungsi untuk merender tampilan saat tidak ada lagu
async function renderEmptyState(message = "Not playing anything") {
  const canvas = createCanvas(400, 100);
  const ctx = canvas.getContext("2d");

  ctx.fillStyle = "#121212";
  ctx.fillRect(0, 0, 400, 100);

  ctx.fillStyle = "#b3b3b3";
  ctx.font = "16px sans-serif";
  ctx.fillText(message, 20, 55);

  return canvas.toBuffer("image/png");
}