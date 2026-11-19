// Public Australian-topic Shorts in the order shown on YouTube.
const videos = [
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
const cards = document.createDocumentFragment();
let activeCard;

for (const [id, title, thumbnail] of videos) {
  const item = document.createElement("li");
  const link = document.createElement("a");
  link.href = `https://www.youtube.com/shorts/${id}`;
  link.dataset.videoId = id;
  const cover = document.createElement("span");
  cover.className = "shorts-cover";
  cover.setAttribute("aria-hidden", "true");
  const image = new Image(405, 720);
  image.alt = "";
  image.loading = "lazy";
  image.decoding = "async";
  image.addEventListener("error", () => {
    image.src = `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
  }, { once: true });
  image.src = `https://i.ytimg.com/vi/${id}/${thumbnail}.jpg`;
  const label = document.createElement("strong");
  label.textContent = title;
  cover.append(image);
  link.append(cover, label);
  item.append(link);
  cards.append(item);
}

list.append(cards);
document.getElementById("shorts-status").textContent = `共 ${videos.length} 支短视频`;

list.addEventListener("click", (event) => {
  const link = event.target.closest("a[data-video-id]");
  if (!link || !player.showModal || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
  event.preventDefault();
  activeCard = link;

  const title = link.textContent;
  playerTitle.textContent = title;
  sourceLink.href = link.href;
  const frame = document.createElement("iframe");
  frame.title = title;
  frame.referrerPolicy = "strict-origin-when-cross-origin";
  frame.allow = "autoplay; encrypted-media; picture-in-picture; fullscreen";
  frame.allowFullscreen = true;
  frame.src = `https://www.youtube.com/embed/${link.dataset.videoId}?autoplay=1&playsinline=1`;
  frameSlot.replaceChildren(frame);
  player.showModal();
});

player.addEventListener("close", () => {
  frameSlot.replaceChildren();
  activeCard?.focus({ preventScroll: true });
  activeCard = undefined;
});
