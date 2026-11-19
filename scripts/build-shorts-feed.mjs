import { readFileSync } from "node:fs";

const channel = "UCzhacy4_QKj7NCLdKzV-CBQ";
const excluded = new Set([
  "dzkApyvryGo",
  "LSbmHnf7uYA",
  "sN5QPLWa-2k",
]);

const data = JSON.parse(readFileSync(0, "utf8"));
if (data.channel_id !== channel || data.webpage_url_basename !== "shorts" ||
    !Array.isArray(data.entries) || !data.entries.length || data.entries.length !== data.playlist_count) {
  throw new Error("YouTube did not return the expected Shorts catalog.");
}

const videos = [];
const seen = new Set();
for (const entry of data.entries) {
  const { id, title, url, thumbnails = [] } = entry;
  if (!/^[\w-]{11}$/.test(id) || typeof title !== "string" || !title.trim() ||
      url !== `https://www.youtube.com/shorts/${id}` || seen.has(id)) {
    throw new Error("YouTube returned an invalid or duplicate Shorts entry.");
  }
  seen.add(id);
  if (excluded.has(id)) continue;
  const thumbnail = thumbnails
    .map(({ url }) => url?.match(/\/(oar[1-3]|sardefault)\.jpg(?:\?|$)/)?.[1])
    .find(Boolean) ?? "hqdefault";
  videos.push([id, title, thumbnail]);
}

if (!videos.length) throw new Error("The Shorts feed contains no publishable videos.");
process.stdout.write(JSON.stringify({ channel, videos }, null, 2) + "\n");
