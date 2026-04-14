import { createCanvas, loadImage } from "@napi-rs/canvas";

const TOKEN_ENDPOINT = "https://accounts.spotify.com/api/token";
const NOW_PLAYING_ENDPOINT = "https://api.spotify.com/v1/me/player/currently-playing";

const basic = Buffer.from(
  `${process.env.CLIENT_ID}:${process.env.CLIENT_SECRET}`
).toString("base64");

export default async function handler(req, res) {
  // ambil token
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

  // ambil lagu
  const nowPlayingRes = await fetch(NOW_PLAYING_ENDPOINT, {
    headers: {
      Authorization: `Bearer ${access_token}`,
    },
  });

  const song = await nowPlayingRes.json();

  // kalau tidak ada lagu
  if (!song || !song.item) {
    res.setHeader("Content-Type", "image/png");

    const canvas = createCanvas(400, 100);
    const ctx = canvas.getContext("2d");

    ctx.fillStyle = "#121212";
    ctx.fillRect(0, 0, 400, 100);

    ctx.fillStyle = "#ffffff";
    ctx.font = "16px sans-serif";
    ctx.fillText("No song playing 🎧", 20, 50);

    return res.send(canvas.toBuffer("image/png"));
  }

  const title = song.item.name;
  const artist = song.item.artists.map(a => a.name).join(", ");
  const albumImage = song.item.album.images[0].url;

  const canvas = createCanvas(500, 150);
  const ctx = canvas.getContext("2d");

  // background
  ctx.fillStyle = "#121212";
  ctx.fillRect(0, 0, 500, 150);

  // load cover
  const img = await loadImage(albumImage);
  ctx.drawImage(img, 10, 10, 130, 130);

  // text
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 18px sans-serif";
  ctx.fillText(title.substring(0, 30), 160, 60);

  ctx.fillStyle = "#b3b3b3";
  ctx.font = "14px sans-serif";
  ctx.fillText(artist.substring(0, 40), 160, 90);

  res.setHeader("Content-Type", "image/png");
  return res.send(canvas.toBuffer("image/png"));
}