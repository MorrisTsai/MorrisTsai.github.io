// Public Australian-topic Shorts in the order shown on YouTube.
const fallbackVideos = [
  ["Xq12jIIJ_JY", "一国党要取消父母取得PR的机会？", "sardefault"],
  ["3M9uIrlrJ-4", "父母移民等42年，怎么先团聚？", "oar2"],
  ["0x8WH9P0kyQ", "教华人的美术老师竟然歧视华人？", "sardefault"],
  ["c20zs0OAZo8", "澳洲打工度假：集签变120天，二签还要申请名额", "sardefault"],
  ["ps3rVZe20LY", "澳洲高考题目被骇客偷出来卖了？", "sardefault"],
  ["mcNCwSTK9yo", "父母移民，收入不够怎么办？", "sardefault"],
  ["dX0jUX9cslk", "有8503，哪些签证还有境内申请途径？", "oar2"],
  ["XmclYZla7hw", "ETA也要加8503：先来澳洲再转签，这条路要收紧了", "oar1"],
  ["GUJ6CZboquQ", "老板少发工资，为什么澳洲税局也找上门？", "oar1"],
  ["fuM-kdhVCcc", "維州大選政策比較：墨爾本房價太貴，誰的住房政見更好？", "oar3"],
  ["0bS8fCwSlQo", "公司可以强迫你放年假吗？", "oar1"],
  ["P0eHqcN_tjw", "澳洲洞窟探险：原来澳洲还能往地下玩！", "oar3"],
  ["khfGJMB3LHQ", "每项两年最高650澳元！不是PR也有机会获水电煤补助", "oar1"],
  ["KSId6qbkI8c", "摸猎豹、头顶过狮子、下水看巨鳄，还能摸科莫多龙！澳洲这四个地方太刺激。", "oar1"],
  ["vSWT1WUIZrQ", "在澳洲被恶意开除，怎么申诉？", "oar3"],
  ["SjgmCAiRHjo", "墨尔本附近，找野生动物的四个地方", "oar2"],
  ["tg9qerwYdNA", "墨尔本樱桃季，这4家果园怎么玩？", "oar3"],
  ["SVaTGTd000s", "澳洲今年第五次加息，3招减轻房贷压力", "oar2"],
];

const list = document.getElementById("shorts-list");
const player = document.getElementById("shorts-player");
const playerTitle = document.getElementById("shorts-player-title");
const frameSlot = document.getElementById("shorts-frame");
const sourceLink = document.getElementById("shorts-source");
const channelLink = document.getElementById("shorts-channel");
const platformPicker = document.getElementById("shorts-platforms");
const status = document.getElementById("shorts-status");
const controls = document.getElementById("shorts-scroll-controls");
const [newer, older] = controls.querySelectorAll("button");
const feedUrl = "https://raw.githubusercontent.com/MorrisTsai/MorrisTsai.github.io/shorts-feed/shorts-feed.json";
const platforms = {
  youtube: {
    label: "YouTube",
    channel: "https://www.youtube.com/channel/UCzhacy4_QKj7NCLdKzV-CBQ/shorts",
    video: (id) => `https://www.youtube.com/shorts/${id}`,
    embed: (id) => `https://www.youtube.com/embed/${id}?autoplay=1&playsinline=1`,
    cover: (id, thumbnail) => `https://i.ytimg.com/vi/${id}/${thumbnail}.jpg`,
    load: loadYouTube,
  },
  douyin: {
    label: "抖音",
    channel: "https://www.douyin.com/user/MS4wLjABAAAASBaGMN-6b2hmYTXMAjtXKklrAQM0GUkMLy65l2BEjZ7e4mp8ucvoaNmuyOpbLWX2",
    video: (id) => `https://www.douyin.com/video/${id}`,
    embed: (id) => `https://open.douyin.com/player/video?vid=${id}&autoplay=1`,
    cover: (_id, thumbnail) => thumbnail,
    load: loadDouyin,
  },
};
let activeCard;
let renderVersion = 0;

async function loadYouTube() {
  try {
    const response = await fetch(feedUrl, { signal: AbortSignal.timeout(2500) });
    if (!response.ok) return fallbackVideos;
    const feed = await response.json();
    if (feed.channel !== "UCzhacy4_QKj7NCLdKzV-CBQ" || !Array.isArray(feed.videos) || !feed.videos.length) {
      return fallbackVideos;
    }
    const valid = feed.videos.every((entry) => {
      if (!Array.isArray(entry)) return false;
      const [id, title, thumbnail] = entry;
      return /^[\w-]{11}$/.test(id) && typeof title === "string" && title.trim() &&
        /^(?:oar[1-3]|sardefault|hqdefault)$/.test(thumbnail);
    });
    return valid ? feed.videos : fallbackVideos;
  } catch {
    return fallbackVideos;
  }
}

async function loadDouyin() {
  const response = await fetch("douyin-feed.json", { signal: AbortSignal.timeout(3000) });
  if (!response.ok) throw new Error("Douyin catalog unavailable");
  const { videos } = await response.json();
  return videos.filter(([id, title, cover]) =>
    /^\d{19}$/.test(id) && typeof title === "string" &&
    /^https:\/\/[^/]+\.douyinpic\.com\//.test(cover)
  );
}

function videoCard(platformName, [id, title, thumbnail]) {
  const platform = platforms[platformName];
  const item = document.createElement("li");
  const link = document.createElement("a");
  link.href = platform.video(id);
  link.dataset.platform = platformName;
  link.dataset.videoId = id;
  const cover = document.createElement("span");
  cover.className = "shorts-cover";
  cover.setAttribute("aria-hidden", "true");
  const image = new Image(405, 720);
  image.alt = "";
  image.loading = "lazy";
  image.decoding = "async";
  if (platformName === "youtube" && thumbnail !== "hqdefault") {
    image.addEventListener("error", () => {
      image.src = platform.cover(id, "hqdefault");
    }, { once: true });
  }
  image.src = platform.cover(id, thumbnail);
  const label = document.createElement("strong");
  label.textContent = title;
  cover.append(image);
  link.append(cover, label);
  item.append(link);
  return item;
}

async function showPlatform(name) {
  const version = ++renderVersion;
  const platform = platforms[name];
  for (const button of platformPicker.querySelectorAll("button")) {
    button.setAttribute("aria-pressed", String(button.dataset.platform === name));
  }
  channelLink.href = platform.channel;
  channelLink.textContent = `在 ${platform.label} 查看频道 ↗`;
  list.replaceChildren();
  list.setAttribute("aria-busy", "true");
  status.textContent = "正在加载短视频…";
  updateScrollControls();

  let videos;
  try {
    videos = await platform.load();
  } catch {
    videos = [];
  }
  if (version !== renderVersion) return;
  for (const video of videos) list.append(videoCard(name, video));
  list.scrollTo({ left: 0, behavior: "instant" });
  list.removeAttribute("aria-busy");
  status.textContent = videos.length ? `共 ${videos.length} 支短视频` : "暂时无法加载作品，请前往频道查看。";
  updateScrollControls();
}

async function platformForLocation() {
  try {
    const response = await fetch("https://get.geojs.io/v1/ip/country", {
      signal: AbortSignal.timeout(2200),
      credentials: "omit",
      referrerPolicy: "no-referrer",
    });
    if (response.ok && (await response.text()).trim() === "CN") return "douyin";
  } catch {
    // A platform can still be selected when the country lookup is unavailable.
  }
  return "youtube";
}

function updateScrollControls() {
  const maxScroll = list.scrollWidth - list.clientWidth;
  controls.hidden = maxScroll < 2;
  newer.disabled = list.scrollLeft < 2;
  older.disabled = list.scrollLeft >= maxScroll - 2;
}

for (const button of [newer, older]) {
  button.addEventListener("click", () => {
    list.scrollBy({
      left: Number(button.dataset.scrollShorts) * list.clientWidth * 0.85,
      behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth",
    });
  });
}

list.addEventListener("scroll", updateScrollControls, { passive: true });
new ResizeObserver(updateScrollControls).observe(list);
platformPicker.hidden = false;
status.textContent = "正在加载短视频…";
platformPicker.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-platform]");
  if (button && button.getAttribute("aria-pressed") !== "true") showPlatform(button.dataset.platform);
});
platformForLocation().then((name) => {
  if (!renderVersion) showPlatform(name);
});

list.addEventListener("click", (event) => {
  const link = event.target.closest("a[data-video-id]");
  if (!link || !player.showModal || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
  event.preventDefault();
  activeCard = link;

  const title = link.textContent;
  const platform = platforms[link.dataset.platform];
  playerTitle.textContent = title;
  sourceLink.href = link.href;
  sourceLink.textContent = `在 ${platform.label} 播放 ↗`;
  const frame = document.createElement("iframe");
  frame.title = title;
  frame.referrerPolicy = "strict-origin-when-cross-origin";
  frame.allow = "autoplay; encrypted-media; picture-in-picture; fullscreen";
  frame.allowFullscreen = true;
  frame.src = platform.embed(link.dataset.videoId);
  frameSlot.replaceChildren(frame);
  player.showModal();
});

player.addEventListener("close", () => {
  frameSlot.replaceChildren();
  activeCard?.focus({ preventScroll: true });
  activeCard = undefined;
});
