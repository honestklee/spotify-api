const TOKEN_ENDPOINT = "https://accounts.spotify.com/api/token";
const NOW_PLAYING_ENDPOINT = "https://api.spotify.com/v1/me/player/currently-playing";

const basic = Buffer.from(
  `${process.env.CLIENT_ID}:${process.env.CLIENT_SECRET}`
).toString("base64");

export default async function handler(req, res) {
  // 1. Get access token
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

  // 2. Get current playing
  const nowPlayingRes = await fetch(NOW_PLAYING_ENDPOINT, {
    headers: {
      Authorization: `Bearer ${access_token}`,
    },
  });

  const song = await nowPlayingRes.json();

  // 3. Kalau tidak ada lagu
  if (!song || !song.item) {
    return res.status(200).send("No song playing");
  }

  const title = song.item.name;
  const artist = song.item.artists.map(a => a.name).join(", ");
  const albumImage = song.item.album.images[0].url;

  // 4. Ambil image album
  const imageRes = await fetch(albumImage);
  const imageBuffer = await imageRes.arrayBuffer();

  // 5. Return HTML (biar tampil di README)
  res.setHeader("Content-Type", "text/html");

  return res.send(`
    <div style="display:flex;align-items:center;background:#121212;color:white;padding:10px;border-radius:10px;width:400px;">
      <img src="${albumImage}" style="width:80px;height:80px;border-radius:8px;margin-right:10px;" />
      <div>
        <div style="font-weight:bold;">${title}</div>
        <div style="font-size:12px;color:#b3b3b3;">${artist}</div>
      </div>
    </div>
  `);
}

//test