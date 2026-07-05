const ADVISOR_SCHOOL_AUTH_STORAGE_KEY = "rewardSchoolAeasAuthV1";
const SCHOOL_IMAGE_FALLBACK = "assets/service-study-application.png";

const schoolListApp = document.querySelector("[data-advisor-schools-app]");
const schoolDetailApp = document.querySelector("[data-advisor-school-detail-app]");

const SCHOOL_FIELDS = {
  type: "性别/类型",
  chineseName: "学校中文名",
  region: "区域",
  yearLevels: "年级设置",
  visaPath: "学生签证国际生路径（说人话）",
  entryPoint: "Year10/11入学点",
  fees: "Year10-12费用（国际学生口径）",
  accommodation: "住宿/CAAW/监护",
  englishSupport: "主课内英文支持",
  bridging: "主课前英文/HSP/ELICOS/Bridge",
  aeas: "AEAS/英文门槛",
  grades: "在校成绩/过往成绩",
  interview: "面试/笔试",
  recommendation: "推荐信/个人陈述",
  results: "VCE/ATAR公开结果",
  resultSource: "依据/备注",
  difficulty: "申请难度",
  weakEnglish: "英文弱学生",
  weakGrades: "成绩弱学生",
  weakAll: "英文+成绩+态度都弱",
  feeCalibration: "学费口径校验",
};

const TUITION_FILTER_OPTIONS = ["高", "中", "低"];
const TUITION_HIGH_MIN = 60000;
const TUITION_MEDIUM_MIN = 50000;
const TUITION_AMOUNT_MIN = 10000;

const SCHOOL_MARKETING_PROFILES = {
  "scotch-college": {
    position: "Scotch 通常会把自己放在墨尔本传统男校、强校友网络、强寄宿文化和高学术期待的组合里介绍。它吸引家庭的核心不是“容易进”，而是历史声望、男生成长环境、体育/音乐/领导力机会，以及寄宿体系带来的全天候管理。",
    pillars: ["1851 年创校的传统男校品牌", "Hawthorn 区位与成熟 boarding community", "学术高期待、活动资源深、校友网络强", "适合成熟、自律、能承受强竞争的男生"],
    local: "对本地家庭，重点会放在传统、男校文化、共同课程、运动音乐与校友圈。",
    international: "对国际家庭，重点会放在寄宿照顾、稳定福利安排和强学术环境，但英文与成熟度要先够。"
  },
  "melbourne-grammar-school": {
    position: "Melbourne Grammar School 是位于 South Yarra 的独立男校。Senior School 覆盖 Year 9-12，约 800 名男生，其中 100+ 为 boarding students。学校高年级提供 40+ subject areas，并以 VCE 成绩、APS 体育、co-curricular activities、boarding 体系、Old Melburnians 校友网络和学校价值观作为主要特色。",
    pillars: [
      "Senior School：约 800 名 Year 9-12 男生，其中 100+ boarders；高年级超过 40 个 subject areas",
      "领导力与价值观：self-reliance、responsibility、ethical action、service、positive contribution",
      "体育与活动：APS sport、每年至少两项 APS sports、通常每周两次训练、校内外运动设施",
      "Boarding：Year 7-12 男生寄宿路径，含 after-hours academic support 与 pastoral care"
    ],
    local: "South Yarra 城市校区、传统男校环境、VCE 与高年级科目选择、APS 体育、co-curricular activities、Old Melburnians 校友网络和价值观教育。",
    international: "Boarding 覆盖 Year 7-12 男生；Senior School 有 100+ boarders。寄宿资料包含结构化生活、after-hours academic support、pastoral care、校内设施和活动接入。",
    verifiedHighlights: [
      {
        title: "Senior School",
        detail: "Senior School 约 800 名 Year 9-12 男生，包含 100+ boarders。高年级提供 40+ subject areas，并通过课堂科目与校内外 co-curricular activities 扩展学习范围。",
        sourceLabel: "MGS Senior School",
        sourceUrl: "https://www.mgs.vic.edu.au/learning/campuses/senior-school"
      },
      {
        title: "领导力与价值观",
        detail: "School Values 包含 accept responsibility、act ethically、stand up for what you believe、give back to community/world。Towards 2030 强调 whole child、confidence、capacity 和 positive impact。",
        sourceLabel: "MGS Values / Towards 2030",
        sourceUrl: "https://www.mgs.vic.edu.au/about/governance-and-leadership/school-values"
      },
      {
        title: "体育与 APS",
        detail: "Senior School 参加 APS；学生一年至少参加两项 APS sports，训练通常每周两次。项目包含 athletics、cricket、football、hockey、rowing、soccer、swimming/diving、tennis、water polo 等。学校资料提到 AFL 每个俱乐部都曾有 MGS alumnus 进入 senior team；Olympians 校友包括 rowing、sailing、athletics 金牌得主。",
        sourceLabel: "MGS Senior School Sport",
        sourceUrl: "https://www.mgs.vic.edu.au/learning/campuses/senior-school/outside-classroom/sport"
      },
      {
        title: "Boarding",
        detail: "Boarding 资料包含结构化生活、after-hours academic support、dedicated pastoral care、校内设施和活动接入。",
        sourceLabel: "MGS Boarding",
        sourceUrl: "https://www.mgs.vic.edu.au/boarding"
      }
    ],
    whyChoose: [
      {
        title: "Purpose",
        detail: "学校Purpose聚焦 independent and creative thinkers，并强调学生具备 confidence 与 capacity，在身边世界作出 meaningful contributions。",
        sourceLabel: "MGS Purpose",
        sourceUrl: "https://www.mgs.vic.edu.au/"
      },
      {
        title: "Senior School环境",
        detail: "Senior School为Year 9-12男校环境，位于South Yarra，学生为day students与boarders；学校描述该阶段学习环境由integrity、inclusiveness和respect定义。",
        sourceLabel: "MGS Senior School",
        sourceUrl: "https://www.mgs.vic.edu.au/"
      },
      {
        title: "Teaching and learning",
        detail: "教学资料强调attentive classrooms、academic excellence，以及Senior School中liberal、discipline-based approach；Years 11-12可选择40+ subjects。",
        sourceLabel: "MGS Teaching and Learning",
        sourceUrl: "https://www.mgs.vic.edu.au/learning/our-approach/teaching-and-learning"
      },
      {
        title: "Pastoral care",
        detail: "Pastoral care页面说明学校通过formal和informal threads支持wellbeing；Senior School以House system作为关怀框架，并有registered psychologists与Health Centres。",
        sourceLabel: "MGS Pastoral Care",
        sourceUrl: "https://www.mgs.vic.edu.au/learning/our-approach/pastoral-care"
      },
      {
        title: "Success and alumni",
        detail: "学校首页把success and achievement拆成tradition of excellence、outstanding results和diverse alumni community；资料还写到三位校友曾担任澳洲Prime Minister。",
        sourceLabel: "MGS Homepage",
        sourceUrl: "https://www.mgs.vic.edu.au/"
      },
      {
        title: "Boarding life",
        detail: "Boarding资料显示Year 7-12男生可寄宿；官网强调boarding community、after-hours academic support、pastoral care、校内设施与活动接入。",
        sourceLabel: "MGS Boarding",
        sourceUrl: "https://www.mgs.vic.edu.au/boarding"
      }
    ]
  },
  "geelong-grammar-school": {
    position: "Geelong Grammar 会把自己介绍成澳洲最有辨识度的寄宿名校之一，卖点是大校园、全人教育、boarding 文化、VCE/IB 选择，以及 Timbertop/户外教育这类很难被普通走读学校复制的体验。",
    pillars: ["澳洲代表性 boarding school", "大校园和户外教育体验", "VCE 与 IB 双路径", "适合预算高、接受非市中心寄宿环境的家庭"],
    local: "对本地家庭，它强调全人发展、户外教育、寄宿传统和多元课程。",
    international: "对国际家庭，它强调长期接收海外学生、成熟寄宿管理和国际化学习环境。"
  },
  "haileybury": {
    position: "Haileybury 的招生语言通常围绕大型高表现学校、学术成绩、分校资源、VCE/IB 和国际化展开。它很擅长把自己包装成结果导向、体系化、规模化且选择多的学校。",
    pillars: ["大型高表现混校", "VCE/IB 和多校区资源", "公开成绩表现强", "适合学术目标明确、竞争意识强的学生"],
    local: "对本地家庭，它强调成绩、课程选择、活动规模和升学体系。",
    international: "对国际家庭，它强调国际维度、清晰申请评估和强结果，但住宿限制要先确认。"
  },
  "methodist-ladies-college-mlc": {
    position: "MLC 的品牌会围绕 Kew 女校传统、女生领导力、VCE/IB、寄宿和广泛课程选择展开。它吸引的是想要强女校资源、学术结果和多元发展机会的家庭。",
    pillars: ["Kew 区传统强女校", "VCE 与 IB 双路径", "boarding 与女生领导力培养", "适合学术基础强、目标高的女生"],
    local: "对本地家庭，它强调女生教育、课程广度、领导力与升学成果。",
    international: "对国际家庭，它强调寄宿、国际学生团队、学术支持和高标准入学要求。"
  },
  "presbyterian-ladies-college-plc": {
    position: "PLC 会把自己放在墨尔本顶级女校、寄宿、VCE/IB 和高学术成果的框架里。它卖的不只是成绩，也包括女生独立性、领导力、音乐艺术和国际视野。",
    pillars: ["Burwood 顶级女校与 boarding", "VCE/IB 成绩强", "女生领导力和共同课程完整", "适合有潜力、英文与学习习惯较好的女生"],
    local: "对本地家庭，它强调女校传统、学术成果和全人发展。",
    international: "对国际家庭，它强调 boarding、ELICOS 判断路径和入学后的学生支持。"
  },
  "st-catherines-school": {
    position: "St Catherine’s 会以 Toorak 精品女校、强社区感、精致照顾和高期待学习环境来吸引家庭。它不像大校那样强调规模，而是强调女生被看见、被支持、被挑战。",
    pillars: ["Toorak 精品女校", "小而精的社区感", "boarding 与女生教育", "适合重视照顾质量、社群和学术氛围的家庭"],
    local: "对本地家庭，它强调精致女校环境、关怀和高期待。",
    international: "对国际家庭，它强调 boarding 和支持体系，但 Year 10-12 英文要求高。"
  },
  "lauriston-girls-school": {
    position: "Lauriston 的招生特色会围绕女生教育、Armadale 区位、VCE/IB、Howqua 户外学习和独立自信展开。它适合看重女生领导力、探索精神和学术选择的家庭。",
    pillars: ["Armadale 女校与 VCE/IB", "Howqua 户外教育体验", "强调 courage、relationships、engagement", "适合父母陪读或稳定监护安排的女生"],
    local: "对本地家庭，它强调女生独立性、Howqua 和多元课程。",
    international: "对国际家庭，它强调海外学生支持与入学前英文达标，但住宿路径偏父母陪读。"
  },
  "caulfield-grammar-school": {
    position: "Caulfield Grammar 会以大型混校、多校区、boarding、VCE、高成绩和丰富活动资源来介绍自己。它的卖点是资源规模、选择多、学术强，同时又比传统单一男校/女校更混校化。",
    pillars: ["大型混校与多校区资源", "Year 9 起 boarding", "公开成绩强", "适合想要混校、活动广、学术也强的家庭"],
    local: "对本地家庭，它强调混校环境、课程活动广度和升学表现。",
    international: "对国际家庭，它强调 boarding、AEAS 判断和入学准备，但不是低门槛。"
  },
  "wesley-college": {
    position: "Wesley 会把自己讲成多校区、混校、VCE/IB、国际化和全人教育的学校。它的特点是 Glen Waverley、St Kilda Road、Elsternwick 等校区选择，以及对英文准备路径相对清楚。",
    pillars: ["多校区混校品牌", "VCE/IB 双路径", "Glen Waverley boarding 与 homestay 选择", "适合想要混校、国际化、课程选择多的家庭"],
    local: "对本地家庭，它强调多校区、课程选择、共同课程和全人发展。",
    international: "对国际家庭，它强调 English preparation / ELICOS 后评估和较清楚的衔接规则。"
  },
  "carey-baptist-grammar-school": {
    position: "Carey 会以 Kew 混校、Senior School、VCE/IB、包容社区和学生自主成长来吸引家庭。它常见的卖点是不是传统单性别强校，而是现代、混校、选择多、支持感较强。",
    pillars: ["Kew 混校与 Senior School", "VCE/IB 双路径", "homestay / local support person 路径", "适合成绩普通偏上、想要混校环境的学生"],
    local: "对本地家庭，它强调混校、包容、课程选择和学生 wellbeing。",
    international: "对国际家庭，它强调来自多国家的学生群体和清晰文件流程。"
  },
  "st-leonards-college": {
    position: "St Leonard’s 会主打 Bayside 混校、VCE/IB、PLACE 语言与文化过渡、学术表现和现代校园体验。它对非英语背景家庭的吸引点，是过渡支持比很多强校说得更具体。",
    pillars: ["Brighton East 混校", "VCE/IB 和公开学术结果", "PLACE 语言文化过渡支持", "适合想要走读、混校和语言支持的家庭"],
    local: "对本地家庭，它强调 Bayside 区位、课程选择和学术成果。",
    international: "对国际家庭，它强调 PLACE、AEAS 和从原教育体系过渡到澳洲课堂。"
  },
  "brighton-grammar-school": {
    position: "Brighton Grammar 的招生定位是 Bayside 男校、强男生成长路径、体育与活动文化、学术结果和社区连接。它吸引想要男校但不一定选择内城顶私寄宿的家庭。",
    pillars: ["Bayside 男校", "男生成长、运动与共同课程", "公开成绩强", "适合有稳定住宿监护、英文基础好的男生"],
    local: "对本地家庭，它强调男校教育、Bayside 社区和活动资源。",
    international: "对国际家庭，它强调 International Liaison 与 support person，但需先满足英文要求。"
  },
  "trinity-grammar-school-kew": {
    position: "Trinity Kew 会以 Anglican 男校、Kew 区位、学术成绩、音乐体育与社区精神来招生。相较顶级寄宿男校，它对部分 Year 10/11 国际路径有更现实的询问空间。",
    pillars: ["Kew 男校与 Anglican 传统", "HSP 可作为条件路径", "学术结果强", "适合男校目标明确但需要桥接判断的家庭"],
    local: "对本地家庭，它强调男校文化、社区和学术/活动并重。",
    international: "对国际家庭，它强调 AEAS 后 HSP 可能性、homestay 和 Local Support Person。"
  },
  "ivanhoe-grammar-school": {
    position: "Ivanhoe Grammar 的核心卖点是混校、多校区、VCE/IB 和 International Academy。对国际家庭来说，它比较突出的不是一句欢迎词，而是有相对完整的英语+学科衔接机制。",
    pillars: ["混校与 VCE/IB", "Ivanhoe International Academy", "approved homestay 与 designated carer", "适合英文需要衔接但学习态度好的学生"],
    local: "对本地家庭，它强调混校、多课程选择和社区。",
    international: "对国际家庭，它强调 Intensive English 与学科过渡，是较好解释的桥接型选择。"
  },
  "toorak-college": {
    position: "Toorak College 会以 Mornington Peninsula 女校、boarding、海边校园感、关怀社区和学术结果吸引家庭。它适合想要女生寄宿，但不一定只看内城顶私的家庭。",
    pillars: ["Mornington Peninsula 女校", "girls boarding", "社区照顾与学术结果", "适合接受半岛寄宿环境的女生"],
    local: "对本地家庭，它强调女生教育、校园环境和个性化照顾。",
    international: "对国际家庭，它强调 boarding、Joan Ansett Hall 和国际学生入学支持。"
  },
  "korowa-anglican-girls-school": {
    position: "Korowa 会以 Glen Iris 女校、走读、学术表现、wellbeing 和女生自信成长来招生。它不是 boarding 路线，卖点更偏精致女校社区和高学术期待。",
    pillars: ["Glen Iris 女校", "公开成绩强", "wellbeing 与女生支持", "适合有父母或 guardian 同住安排的女生"],
    local: "对本地家庭，它强调女校环境、学术成果和学生支持。",
    international: "对国际家庭，它强调 AEAS、过渡支持和 pastoral/wellbeing，但住宿要家庭自理。"
  },
  "strathcona-girls-grammar": {
    position: "Strathcona 的定位是 Canterbury 女校、学术高期待、走读和有限海外学生名额。它会吸引想要小而强、社区清晰、女校学习氛围的家庭。",
    pillars: ["Canterbury 女校", "海外学生名额有限", "homestay 与 local support 路径", "适合英文成绩稳定、想要精致女校的学生"],
    local: "对本地家庭，它强调女校文化、学术和社区。",
    international: "对国际家庭，它强调有限名额、homestay 规则和面试/等待名单流程。"
  },
  "firbank-grammar-school": {
    position: "Firbank 会以 Brighton 女校、Bayside boarding、CRICOS、EAL 小班和温暖社区来介绍自己。它对国际女生家庭的吸引点，是在 Bayside 女校环境里有寄宿选择。",
    pillars: ["Brighton 女校与低龄部分混校", "Bayside boarding", "EAL 小班与 International Student Coordinator", "适合想要女生 boarding 和社区支持的家庭"],
    local: "对本地家庭，它强调 Bayside 女校社区、活动和学习支持。",
    international: "对国际家庭，它强调 boarding house、EAL 和国际学生协调支持。"
  },
  "peninsula-grammar": {
    position: "Peninsula Grammar 会以 Mount Eliza 校园、Mornington Peninsula 路线、混校、wellbeing 和学术目标来吸引家庭。它不是内城顶私逻辑，而是环境、社区和相对温和申请的组合。",
    pillars: ["Mount Eliza 混校", "半岛校园环境", "重视 wellbeing 与 achievement", "适合考虑非市中心、预算和适配度的家庭"],
    local: "对本地家庭，它强调校园环境、社区和学生成长。",
    international: "对国际家庭，它强调国际学生路径和费用入口，但住宿福利需逐案确认。"
  },
  "yarra-valley-grammar": {
    position: "Yarra Valley Grammar 会以 Ringwood 混校、清楚的国际生流程、homestay、英语评估和强社区感来招生。它适合普通偏上的学生先做预评估，而不是硬冲顶私。",
    pillars: ["Ringwood 混校", "homestay 与 welfare 信息清楚", "English Language Assessment", "适合需要更清楚英文衔接判断的家庭"],
    local: "对本地家庭，它强调混校、社区、活动和学术发展。",
    international: "对国际家庭，它强调 English Language Assessment、可能的 intensive English course 和 provisional offer。"
  },
  "kilvington-grammar-school": {
    position: "Kilvington 会以 Ormond 小型混校、ESL、International Students Coordinator、温和社区和学术结果来吸引家庭。它的卖点是小校照顾感和可沟通性。",
    pillars: ["Ormond 小型混校", "ESL 与国际学生协调", "少量 overseas 名额", "适合需要更多照顾感、成绩普通偏上的学生"],
    local: "对本地家庭，它强调小校、社区和学生被看见。",
    international: "对国际家庭，它强调 ESL、host family 和 coordinator，但名额有限。"
  },
  "oakleigh-grammar": {
    position: "Oakleigh Grammar 会以 Oakleigh 区位、Greek Orthodox 背景、国际学生路径、homestay 合作和相对清楚的英文/成绩参考线来介绍自己。它是较适合做现实选项的学校。",
    pillars: ["Oakleigh 混校", "Greek Orthodox 社区特色", "Australian Homestay Network 合作", "适合预算和录取现实性都要看的家庭"],
    local: "对本地家庭，它强调社区、价值观和包容环境。",
    international: "对国际家庭，它强调 homestay、welfare、AEAS/IELTS 参考线和 intensive English 条件。"
  },
  "westbourne-grammar-school": {
    position: "Westbourne Grammar 会以西区混校、Truganina/Williams Landing、费用相对低、CRICOS 和较现实的入学询问空间来吸引家庭。它适合预算敏感和地理位置可接受的家庭。",
    pillars: ["西区混校与两个校区", "费用相对温和", "CRICOS 公开", "适合预算敏感、需要现实选项的家庭"],
    local: "对本地家庭，它强调西区社区、校园发展和混校环境。",
    international: "对国际家庭，它强调 CRICOS 和费用公开，但住宿/CAAW 要先书面确认。"
  },
  "kardinia-international-college": {
    position: "Kardinia 会以 Geelong 混校、IB World School、homestay 管理、国际化和较温和申请环境来吸引家庭。它适合接受 Geelong 路线、需要 homestay 体系和 EAL 支持的学生。",
    pillars: ["Geelong 混校与 IB World School", "学校管理 Homestay Program", "EAL 与过渡支持", "适合考虑非墨尔本市内、桥接型选择的家庭"],
    local: "对本地家庭，它强调 IB、国际视野和校园社区。",
    international: "对国际家庭，它强调 homestay 管理、EAL 支持和 overseas student experience。"
  }
};

initAdvisorSchools();

async function initAdvisorSchools() {
  const app = schoolListApp || schoolDetailApp;
  if (!app) return;

  const token = loadAdvisorSchoolToken();
  if (!token) {
    renderAdvisorSchoolGate(app, "请先登录", "这个页面只开放给 Advisor 账号。请回到个人中心登录后再进入。", true);
    return;
  }

  try {
    const [user, payload] = await Promise.all([
      window.rewardSchoolApi.getCurrentUser({ token }),
      window.rewardSchoolApi.getAdvisorSchools({ token }),
    ]);

    if (!user?.advisor) {
      renderAdvisorSchoolGate(app, "没有 Advisor 权限", "当前账号还没有 Advisor 标记，因此不能查看学校资料。", true);
      return;
    }

    const schools = Array.isArray(payload?.schools) ? payload.schools : [];
    if (schoolDetailApp) {
      renderSchoolDetailPage(schoolDetailApp, payload, schools);
    } else {
      renderSchoolListPage(schoolListApp, payload, schools);
    }
  } catch (error) {
    if (error.status === 401) {
      renderAdvisorSchoolGate(app, "登录已过期", "请回到个人中心重新登录。", true);
      return;
    }
    if (error.status === 403) {
      renderAdvisorSchoolGate(app, "没有 Advisor 权限", "当前账号还没有 Advisor 标记，因此不能查看学校资料。", true);
      return;
    }
    renderAdvisorSchoolGate(app, "读取失败", error.message || "暂时无法读取学校资料，请稍后再试。", true);
  }
}

function loadAdvisorSchoolToken() {
  try {
    const saved = JSON.parse(localStorage.getItem(ADVISOR_SCHOOL_AUTH_STORAGE_KEY) || "null");
    return saved?.token || "";
  } catch (error) {
    return "";
  }
}

function renderAdvisorSchoolGate(app, title, message, isError = false) {
  app.innerHTML = `
    <section class="advisor-flow-lock ${isError ? "is-error" : ""}">
      <p class="eyebrow">Advisor Only</p>
      <h1>${escapeHTML(title)}</h1>
      <p>${escapeHTML(message)}</p>
      <a class="button primary" href="profile.html">返回个人中心</a>
    </section>
  `;
}

function renderSchoolListPage(app, payload, schools) {
  const levels = getLevelFilterOptions(schools);
  const genders = getUnique(schools.map((school) => school.gender));
  const boardingTypes = getUnique(schools.map((school) => school.boardingType));
  const englishPaths = getUnique(schools.map((school) => school.englishPath));
  const tuitionLevels = getTuitionFilterOptions(schools);

  app.innerHTML = `
    <section class="advisor-school-hero">
      <div>
        <p class="eyebrow">Advisor School Guide</p>
        <h1>维州私校资料库</h1>
        <p>${escapeHTML(payload?.intro || "长表已重新整理为可筛选卡片和单校详情页。")}</p>
      </div>
      <div class="advisor-school-stats">
        <div><span>学校数量</span><strong>${schools.length}</strong></div>
        <div><span>分层</span><strong>${levels.length}</strong></div>
        <div><span>图片</span><strong>${schools.filter((school) => school.imageStatus === "downloaded").length}</strong></div>
      </div>
    </section>

    <section class="advisor-school-tools" aria-label="学校筛选">
      <label>
        <span>搜索学校/关键词</span>
        <input type="search" data-school-search placeholder="例如 Wesley、boarding、ELICOS" />
      </label>
      ${renderSelect("Level", "level", levels)}
      ${renderSelect("学费", "tuition", tuitionLevels)}
      ${renderSelect("学校类型", "gender", genders)}
      ${renderSelect("住宿路径", "boarding", boardingTypes)}
      ${renderSelect("英文路径", "english", englishPaths)}
    </section>

    <section class="advisor-school-results">
      <div class="advisor-school-results-bar">
        <div class="advisor-school-result-count" data-school-count></div>
        <div class="advisor-school-view-toggle" aria-label="切换学校资料视图">
          <button type="button" class="is-active" data-school-view="cards">卡片整理</button>
          <button type="button" data-school-view="table">原表整表</button>
        </div>
      </div>
      <div class="advisor-school-grid" data-school-grid></div>
      <div class="advisor-school-table-wrap" data-school-table hidden></div>
    </section>
  `;

  const state = {
    query: "",
    level: "",
    tuition: "",
    gender: "",
    boarding: "",
    english: "",
    view: "cards",
  };

  const grid = app.querySelector("[data-school-grid]");
  const table = app.querySelector("[data-school-table]");
  const count = app.querySelector("[data-school-count]");
  const render = () => {
    const filtered = filterSchools(schools, state);
    count.textContent = `显示 ${filtered.length}/${schools.length} 间学校`;
    const isTable = state.view === "table";
    grid.hidden = isTable;
    table.hidden = !isTable;
    if (isTable) {
      table.innerHTML = filtered.length
        ? renderFullSchoolTable(filtered)
        : `<div class="advisor-school-empty">没有符合条件的学校。</div>`;
    } else {
      grid.innerHTML = filtered.length
        ? filtered.map(renderSchoolCard).join("")
        : `<div class="advisor-school-empty">没有符合条件的学校。</div>`;
    }
  };

  app.querySelector("[data-school-search]")?.addEventListener("input", (event) => {
    state.query = event.target.value.trim();
    render();
  });
  app.querySelectorAll("[data-school-filter]").forEach((select) => {
    select.addEventListener("change", () => {
      state[select.dataset.schoolFilter] = select.value;
      render();
    });
  });
  app.querySelectorAll("[data-school-view]").forEach((button) => {
    button.addEventListener("click", () => {
      state.view = button.dataset.schoolView || "cards";
      app.querySelectorAll("[data-school-view]").forEach((item) => {
        item.classList.toggle("is-active", item.dataset.schoolView === state.view);
      });
      render();
    });
  });
  render();
}

function renderSelect(label, key, values) {
  return `
    <label>
      <span>${escapeHTML(label)}</span>
      <select data-school-filter="${escapeHTML(key)}">
        <option value="">全部</option>
        ${values.map((value) => `<option value="${escapeHTML(value)}">${escapeHTML(value)}</option>`).join("")}
      </select>
    </label>
  `;
}

function filterSchools(schools, state) {
  const query = normalizeSearch(state.query);
  return schools.filter((school) => {
    if (state.level && !getSchoolLevelFilters(school).includes(state.level)) return false;
    if (state.tuition && getTuitionLevel(school) !== state.tuition) return false;
    if (state.gender && school.gender !== state.gender) return false;
    if (state.boarding && school.boardingType !== state.boarding) return false;
    if (state.english && school.englishPath !== state.english) return false;
    if (!query) return true;
    return normalizeSearch([
      school.name,
      school.level,
      school.summary,
      school.boardingType,
      school.englishPath,
      ...Object.values(school.fields || {}),
    ].join(" ")).includes(query);
  });
}

function renderSchoolCard(school) {
  const image = getSchoolImage(school);
  return `
    <article class="advisor-school-card">
      <a class="advisor-school-card-media" href="${escapeHTML(getSchoolDetailUrl(school.slug))}" aria-label="查看 ${escapeHTML(school.name)}">
        <img src="${escapeHTML(image)}" alt="${escapeHTML(school.name)}" loading="lazy" decoding="async" />
        <span>${escapeHTML(school.levelShort)}</span>
      </a>
      <div class="advisor-school-card-body">
        <div class="advisor-school-title-row">
          <div>
            <span>${escapeHTML(school.gender)} · ${escapeHTML(school.boardingType)}</span>
            <h2><a href="${escapeHTML(getSchoolDetailUrl(school.slug))}">${escapeHTML(school.name)}</a></h2>
          </div>
          <a class="profile-secondary-button" href="${escapeHTML(getSchoolDetailUrl(school.slug))}">详情</a>
        </div>
        <p>${escapeHTML(school.summary || school.fields?.[SCHOOL_FIELDS.type] || "")}</p>
        <div class="advisor-school-chip-row">
          <span>${escapeHTML(school.level)}</span>
          <span>${escapeHTML(school.englishPath)}</span>
          <span>${escapeHTML(school.fields?.[SCHOOL_FIELDS.difficulty] || "难度需确认")}</span>
        </div>
        <div class="advisor-school-mini-grid">
          ${renderMiniFact("费用", school.fields?.[SCHOOL_FIELDS.fees])}
          ${renderMiniFact("住宿/福利", school.fields?.[SCHOOL_FIELDS.accommodation])}
          ${renderMiniFact("英文支持", school.fields?.[SCHOOL_FIELDS.englishSupport])}
          ${renderMiniFact("ATAR/VCE", school.fields?.[SCHOOL_FIELDS.results])}
        </div>
        <details class="advisor-school-full-fields">
          <summary>展开原表完整字段</summary>
          ${renderFieldGrid(school)}
        </details>
      </div>
    </article>
  `;
}

function renderMiniFact(label, value) {
  return `
    <div>
      <span>${escapeHTML(label)}</span>
      <p>${escapeHTML(truncateText(value || "未列明", 92))}</p>
    </div>
  `;
}

function renderSchoolDetailPage(app, payload, schools) {
  const slug = new URLSearchParams(window.location.search).get("school") || "";
  const school = schools.find((item) => item.slug === slug);
  if (!school) {
    renderAdvisorSchoolGate(app, "找不到学校", "请从学校介绍列表重新进入。", true);
    return;
  }

  document.title = `${school.name} | Reward School Advisor`;
  const image = getSchoolImage(school);
  const officialIntro = school.officialIntro || buildFallbackIntro(school);
  const marketingProfile = getMarketingProfile(school);
  const schoolCourseInfo = buildSchoolInfoLine(school, [
    SCHOOL_FIELDS.type,
    SCHOOL_FIELDS.results,
    SCHOOL_FIELDS.resultSource,
  ]);
  const internationalStudentInfo = buildSchoolInfoLine(school, [
    SCHOOL_FIELDS.accommodation,
    SCHOOL_FIELDS.englishSupport,
    SCHOOL_FIELDS.bridging,
  ]);

  app.innerHTML = `
    <section class="advisor-school-detail-hero">
      <div class="advisor-school-detail-copy">
        <a class="profile-secondary-button" href="${escapeHTML(getSchoolListUrl())}">返回学校列表</a>
        <p class="eyebrow">School Profile</p>
        <h1>${escapeHTML(school.name)}</h1>
        <p>${escapeHTML(school.summary || school.fields?.[SCHOOL_FIELDS.type] || "")}</p>
        <div class="advisor-school-chip-row">
          <span>${escapeHTML(school.level)}</span>
          <span>${escapeHTML(school.gender)}</span>
          <span>${escapeHTML(school.boardingType)}</span>
          <span>${escapeHTML(school.englishPath)}</span>
        </div>
      </div>
      <div class="advisor-school-detail-image">
        <img src="${escapeHTML(image)}" alt="${escapeHTML(school.name)}" decoding="async" />
      </div>
    </section>

    <section class="advisor-school-detail-layout">
      <article class="advisor-school-section advisor-school-positioning">
        <p class="eyebrow">Official Overview</p>
        <h2>学校官方简介</h2>
        <p>${escapeHTML(officialIntro)}</p>
        ${school.officialTitle ? `<small>官网页面：${escapeHTML(school.officialTitle)}</small>` : ""}
      </article>

      <aside class="advisor-school-section advisor-school-quick">
        <p class="eyebrow">Application Data</p>
        <h2>申请与衔接信息</h2>
        <dl>
          <div><dt>申请难度</dt><dd>${escapeHTML(school.fields?.[SCHOOL_FIELDS.difficulty] || "需确认")}</dd></div>
          <div><dt>英文弱</dt><dd>${escapeHTML(school.fields?.[SCHOOL_FIELDS.weakEnglish] || "需确认")}</dd></div>
          <div><dt>成绩弱</dt><dd>${escapeHTML(school.fields?.[SCHOOL_FIELDS.weakGrades] || "需确认")}</dd></div>
          <div><dt>三项都弱</dt><dd>${escapeHTML(school.fields?.[SCHOOL_FIELDS.weakAll] || "需确认")}</dd></div>
        </dl>
      </aside>
    </section>

    <section class="advisor-school-section advisor-school-marketing">
      <div class="advisor-school-section-heading">
        <div>
          <p class="eyebrow">School Features</p>
          <h2>学校概况与特色</h2>
        </div>
      </div>
      <p class="advisor-school-marketing-lede">${escapeHTML(formatSchoolInfoText(marketingProfile.position))}</p>
      ${renderVerifiedHighlights(marketingProfile)}
      ${renderWhyChoose(marketingProfile)}
      <div class="advisor-school-audience-grid">
        <article>
          <span>学校与课程信息</span>
          <p>${escapeHTML(schoolCourseInfo || school.summary || marketingProfile.local)}</p>
        </article>
        <article>
          <span>住宿与国际学生信息</span>
          <p>${escapeHTML(internationalStudentInfo || marketingProfile.international)}</p>
        </article>
      </div>
      <div class="advisor-school-pillars">
        ${marketingProfile.pillars.map((point) => `<span>${escapeHTML(formatSchoolInfoText(point))}</span>`).join("")}
      </div>
    </section>

    <section class="advisor-school-section advisor-school-selling">
      <div class="section-heading center">
        <p class="eyebrow">Table Highlights</p>
        <h2>原表重点信息</h2>
      </div>
      <div class="advisor-selling-grid">
        ${(school.sellingPoints || []).map((point) => `<article><span></span><p>${escapeHTML(point)}</p></article>`).join("")}
      </div>
    </section>

    <section class="advisor-school-section advisor-school-original">
      <div class="advisor-school-section-heading">
        <div>
          <p class="eyebrow">Original Columns Preserved</p>
          <h2>原表完整内容</h2>
        </div>
        <div class="advisor-school-link-row">
          ${renderOfficialLink("学费页", school.links?.fees)}
          ${renderOfficialLink("国际招生页", school.links?.international)}
          ${renderOfficialLink("ATAR/VCE来源", school.links?.resultSource)}
        </div>
      </div>
      ${renderFieldGrid(school)}
      ${school.imageSourceUrl ? `<p class="advisor-image-source">图片来源：<a href="${escapeHTML(school.imageSourceUrl)}" target="_blank" rel="noopener">学校网页图片</a></p>` : ""}
    </section>
  `;
}

function renderVerifiedHighlights(profile) {
  const highlights = Array.isArray(profile.verifiedHighlights) ? profile.verifiedHighlights : [];
  if (!highlights.length) return "";
  return `
    <div class="advisor-school-verified">
      <div class="advisor-school-section-heading compact">
        <div>
          <p class="eyebrow">Verified School Information</p>
          <h3>官方资料重点</h3>
        </div>
      </div>
      <div class="advisor-school-verified-grid">
        ${highlights.map((item) => `
          <article>
            <h4>${escapeHTML(item.title)}</h4>
            <p>${escapeHTML(item.detail)}</p>
            ${item.sourceUrl ? `<a href="${escapeHTML(item.sourceUrl)}" target="_blank" rel="noopener">${escapeHTML(item.sourceLabel || "学校官网来源")}</a>` : ""}
          </article>
        `).join("")}
      </div>
    </div>
  `;
}

function renderWhyChoose(profile) {
  const items = Array.isArray(profile.whyChoose) ? profile.whyChoose : [];
  if (!items.length) return "";
  return `
    <div class="advisor-school-why">
      <div class="advisor-school-section-heading compact">
        <div>
          <p class="eyebrow">Why Choose</p>
          <h3>官方定位与选择理由</h3>
        </div>
      </div>
      <div class="advisor-school-why-grid">
        ${items.map((item) => `
          <article>
            <h4>${escapeHTML(item.title)}</h4>
            <p>${escapeHTML(item.detail)}</p>
            ${item.sourceUrl ? `<a href="${escapeHTML(item.sourceUrl)}" target="_blank" rel="noopener">${escapeHTML(item.sourceLabel || "学校官网来源")}</a>` : ""}
          </article>
        `).join("")}
      </div>
    </div>
  `;
}

function buildSchoolInfoLine(school, fieldNames) {
  return fieldNames
    .map((fieldName) => school.fields?.[fieldName])
    .filter(Boolean)
    .map(formatSchoolInfoText)
    .join(" ");
}

function formatSchoolInfoText(value) {
  return String(value || "")
    .replace(/对本地家庭，?/g, "")
    .replace(/对国际家庭，?/g, "")
    .replace(/重点可以讲/g, "")
    .replace(/可以讲/g, "")
    .replace(/可先讲/g, "")
    .replace(/顾问沟通时建议/g, "")
    .replace(/招生叙事/g, "资料重点")
    .replace(/招生语言/g, "资料重点")
    .replace(/招生特色/g, "特色")
    .replace(/通常会把自己放在/g, "定位包含")
    .replace(/会把自己放在/g, "定位包含")
    .replace(/会把自己介绍成/g, "定位为")
    .replace(/会把自己讲成/g, "定位为")
    .replace(/会主打/g, "主要信息包含")
    .replace(/会以/g, "特色包含")
    .replace(/来招生/g, "")
    .replace(/来吸引家庭/g, "")
    .replace(/吸引家庭/g, "")
    .replace(/它会强调/g, "重点包含")
    .replace(/它强调/g, "重点包含")
    .replace(/。它适合/g, "。学生画像：")
    .replace(/，适合/g, "；学生画像：")
    .replace(/^适合/g, "学生画像：")
    .replace(/要先确认/g, "需确认")
    .replace(/要先够/g, "需达到")
    .trim();
}

function renderOfficialLink(label, href) {
  return /^https?:\/\//i.test(href || "")
    ? `<a class="profile-secondary-button" href="${escapeHTML(href)}" target="_blank" rel="noopener">${escapeHTML(label)}</a>`
    : "";
}

function renderFieldGrid(school) {
  const fields = school.fields || {};
  const entries = Object.entries(fields).filter(([key]) => !["学校", "学费链接", "国际招生链接"].includes(key));
  return `
    <div class="advisor-school-field-grid">
      ${entries.map(([key, value]) => `
        <div>
          <span>${escapeHTML(key)}</span>
          <p>${escapeHTML(value)}</p>
        </div>
      `).join("")}
    </div>
  `;
}

function renderFullSchoolTable(schools) {
  const columns = getOriginalTableColumns(schools);
  return `
    <div class="advisor-school-table-hint">左右滑动查看完整原表栏位；学校名和详情按钮都可以进入专属介绍页。</div>
    <div class="advisor-school-table-scroll" tabindex="0" aria-label="原表完整内容，可以左右滚动查看">
      <table class="advisor-school-raw-table">
        <thead>
          <tr>
            <th>学校</th>
            ${columns.map((column) => `<th>${escapeHTML(column)}</th>`).join("")}
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          ${schools.map((school) => `
            <tr>
              <th><a href="${escapeHTML(getSchoolDetailUrl(school.slug))}">${escapeHTML(school.name)}</a></th>
              ${columns.map((column) => `<td>${escapeHTML(school.fields?.[column] || "")}</td>`).join("")}
              <td><a class="profile-secondary-button" href="${escapeHTML(getSchoolDetailUrl(school.slug))}">详情</a></td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    </div>
  `;
}

function getOriginalTableColumns(schools) {
  const preferred = [
    "Level",
    SCHOOL_FIELDS.chineseName,
    SCHOOL_FIELDS.region,
    SCHOOL_FIELDS.type,
    SCHOOL_FIELDS.yearLevels,
    SCHOOL_FIELDS.visaPath,
    SCHOOL_FIELDS.entryPoint,
    SCHOOL_FIELDS.fees,
    SCHOOL_FIELDS.accommodation,
    SCHOOL_FIELDS.englishSupport,
    SCHOOL_FIELDS.bridging,
    SCHOOL_FIELDS.aeas,
    SCHOOL_FIELDS.grades,
    SCHOOL_FIELDS.interview,
    SCHOOL_FIELDS.recommendation,
    SCHOOL_FIELDS.results,
    SCHOOL_FIELDS.resultSource,
    SCHOOL_FIELDS.difficulty,
    SCHOOL_FIELDS.weakEnglish,
    SCHOOL_FIELDS.weakGrades,
    SCHOOL_FIELDS.weakAll,
    SCHOOL_FIELDS.feeCalibration,
    "学费链接",
    "国际招生链接",
  ];
  const all = new Set();
  schools.forEach((school) => {
    Object.keys(school.fields || {}).forEach((key) => {
      if (key !== "学校") all.add(key);
    });
  });
  return [
    ...preferred.filter((key) => all.has(key)),
    ...[...all].filter((key) => !preferred.includes(key)),
  ];
}

function getMarketingProfile(school) {
  const profile = SCHOOL_MARKETING_PROFILES[school.slug];
  const baseProfile = profile || {
    position: buildFallbackIntro(school),
    pillars: [
      school.fields?.[SCHOOL_FIELDS.type] || school.summary || school.name,
      school.fields?.[SCHOOL_FIELDS.accommodation] || school.boardingType,
      school.fields?.[SCHOOL_FIELDS.englishSupport] || school.englishPath,
      school.fields?.[SCHOOL_FIELDS.results] || "公开成绩和课程信息需以学校官方资料核对",
    ].filter(Boolean).map((item) => truncateText(item, 90)),
    local: "本地入学资料包含学校定位、课程资源、社区氛围和公开成绩。",
    international: "国际学生资料包含住宿/监护、英文支持、入学评估和 Year 10-12 衔接信息。"
  };
  return completeMarketingProfile(school, baseProfile);
}

function completeMarketingProfile(school, profile) {
  const generated = buildGeneratedMarketingProfile(school);
  return {
    ...generated,
    ...profile,
    pillars: Array.isArray(profile.pillars) && profile.pillars.length
      ? profile.pillars
      : generated.pillars,
    verifiedHighlights: Array.isArray(profile.verifiedHighlights) && profile.verifiedHighlights.length
      ? profile.verifiedHighlights
      : generated.verifiedHighlights,
    whyChoose: Array.isArray(profile.whyChoose) && profile.whyChoose.length
      ? profile.whyChoose
      : generated.whyChoose,
  };
}

function buildGeneratedMarketingProfile(school) {
  const fields = school.fields || {};
  const schoolLabel = fields[SCHOOL_FIELDS.chineseName]
    ? `${school.name}（${fields[SCHOOL_FIELDS.chineseName]}）`
    : school.name;
  const internationalUrl = getOfficialSourceUrl(school, "international");
  const feesUrl = getOfficialSourceUrl(school, "fees") || internationalUrl;
  const sourceLabel = `${school.name} 国际招生资料`;
  const feeSourceLabel = `${school.name} 学费/国际学生资料`;

  const profile = {
    position: buildGeneratedPosition(school),
    pillars: buildGeneratedPillars(school),
    local: compactText([
      fieldLine("学校类型", fields[SCHOOL_FIELDS.type]),
      fieldLine("区域", fields[SCHOOL_FIELDS.region]),
      fieldLine("年级设置", fields[SCHOOL_FIELDS.yearLevels]),
      fieldLine("公开结果", fields[SCHOOL_FIELDS.results]),
    ]),
    international: compactText([
      fieldLine("学生签证路径", fields[SCHOOL_FIELDS.visaPath]),
      fieldLine("住宿/CAAW/监护", fields[SCHOOL_FIELDS.accommodation]),
      fieldLine("英文与桥接", fields[SCHOOL_FIELDS.bridging] || fields[SCHOOL_FIELDS.englishSupport]),
    ]),
    verifiedHighlights: [
      makeProfileItem(
        "学校定位与年级设置",
        [
          fieldLine("学校", schoolLabel),
          fieldLine("Level", fields.Level || school.level),
          fieldLine("区域", fields[SCHOOL_FIELDS.region]),
          fieldLine("性别/类型", fields[SCHOOL_FIELDS.type]),
          fieldLine("年级设置", fields[SCHOOL_FIELDS.yearLevels]),
        ],
        sourceLabel,
        internationalUrl
      ),
      makeProfileItem(
        "国际学生路径与Year 10/11入口",
        [
          fieldLine("学生签证国际生路径", fields[SCHOOL_FIELDS.visaPath]),
          fieldLine("Year 10/11入学点", fields[SCHOOL_FIELDS.entryPoint]),
        ],
        sourceLabel,
        internationalUrl
      ),
      makeProfileItem(
        "住宿 / CAAW / 监护",
        [
          fieldLine("住宿与福利", fields[SCHOOL_FIELDS.accommodation]),
          fieldLine("学费口径", fields[SCHOOL_FIELDS.feeCalibration]),
        ],
        feeSourceLabel,
        feesUrl
      ),
      makeProfileItem(
        "英文支持与桥接",
        [
          fieldLine("主课内英文支持", fields[SCHOOL_FIELDS.englishSupport]),
          fieldLine("主课前英文/HSP/ELICOS/Bridge", fields[SCHOOL_FIELDS.bridging]),
          fieldLine("AEAS/英文门槛", fields[SCHOOL_FIELDS.aeas]),
        ],
        sourceLabel,
        internationalUrl
      ),
      makeProfileItem(
        "申请材料、面试与成绩",
        [
          fieldLine("在校成绩/过往成绩", fields[SCHOOL_FIELDS.grades]),
          fieldLine("面试/笔试", fields[SCHOOL_FIELDS.interview]),
          fieldLine("推荐信/个人陈述", fields[SCHOOL_FIELDS.recommendation]),
        ],
        sourceLabel,
        internationalUrl
      ),
      makeProfileItem(
        "VCE / ATAR公开结果",
        [
          fieldLine("公开结果", fields[SCHOOL_FIELDS.results]),
          fieldLine("依据/备注", fields[SCHOOL_FIELDS.resultSource]),
        ],
        feeSourceLabel,
        feesUrl
      ),
    ].filter((item) => item.detail),
    whyChoose: [
      makeProfileItem(
        "区位与学校类型",
        [
          fieldLine("学校", schoolLabel),
          fieldLine("区域", fields[SCHOOL_FIELDS.region]),
          fieldLine("类型", fields[SCHOOL_FIELDS.type]),
        ],
        sourceLabel,
        internationalUrl
      ),
      makeProfileItem(
        "课程与年级路径",
        [
          fieldLine("年级设置", fields[SCHOOL_FIELDS.yearLevels]),
          fieldLine("Year 10/11入口", fields[SCHOOL_FIELDS.entryPoint]),
          fieldLine("学生签证路径", fields[SCHOOL_FIELDS.visaPath]),
        ],
        sourceLabel,
        internationalUrl
      ),
      makeProfileItem(
        "住宿与福利安排",
        [
          fieldLine("住宿/CAAW/监护", fields[SCHOOL_FIELDS.accommodation]),
        ],
        sourceLabel,
        internationalUrl
      ),
      makeProfileItem(
        "英文门槛与衔接",
        [
          fieldLine("AEAS/英文门槛", fields[SCHOOL_FIELDS.aeas]),
          fieldLine("主课前英文路径", fields[SCHOOL_FIELDS.bridging]),
          fieldLine("主课内英文支持", fields[SCHOOL_FIELDS.englishSupport]),
        ],
        sourceLabel,
        internationalUrl
      ),
      makeProfileItem(
        "学术结果与公开口径",
        [
          fieldLine("VCE/ATAR", fields[SCHOOL_FIELDS.results]),
          fieldLine("依据/备注", fields[SCHOOL_FIELDS.resultSource]),
        ],
        feeSourceLabel,
        feesUrl
      ),
      makeProfileItem(
        "申请难度与风险口径",
        [
          fieldLine("申请难度", fields[SCHOOL_FIELDS.difficulty]),
          fieldLine("英文弱学生", fields[SCHOOL_FIELDS.weakEnglish]),
          fieldLine("成绩弱学生", fields[SCHOOL_FIELDS.weakGrades]),
          fieldLine("英文+成绩+态度都弱", fields[SCHOOL_FIELDS.weakAll]),
        ],
        sourceLabel,
        internationalUrl
      ),
    ].filter((item) => item.detail),
  };

  return profile;
}

function buildGeneratedPosition(school) {
  const fields = school.fields || {};
  return compactText([
    `${school.name} 的资料以学校官方国际学生路径、国际费用、住宿/监护、英文门槛和公开成绩为主。`,
    fieldLine("学校类型", fields[SCHOOL_FIELDS.type]),
    fieldLine("区域", fields[SCHOOL_FIELDS.region]),
    fieldLine("学生签证国际生路径", fields[SCHOOL_FIELDS.visaPath]),
  ]);
}

function buildGeneratedPillars(school) {
  const fields = school.fields || {};
  return [
    compactText([fields[SCHOOL_FIELDS.type], fields[SCHOOL_FIELDS.region]]),
    fields[SCHOOL_FIELDS.visaPath],
    fields[SCHOOL_FIELDS.accommodation],
    fields[SCHOOL_FIELDS.bridging] || fields[SCHOOL_FIELDS.englishSupport],
    fields[SCHOOL_FIELDS.results],
  ]
    .filter(Boolean)
    .map((item) => truncateText(formatSchoolInfoText(item), 110))
    .slice(0, 5);
}

function makeProfileItem(title, lines, sourceLabel, sourceUrl) {
  return {
    title,
    detail: compactText(lines),
    sourceLabel,
    sourceUrl: /^https?:\/\//i.test(sourceUrl || "") ? sourceUrl : "",
  };
}

function fieldLine(label, value) {
  const clean = formatSchoolInfoText(value);
  return clean ? `${label}：${clean}` : "";
}

function compactText(parts) {
  return parts
    .map((part) => formatSchoolInfoText(part))
    .filter(Boolean)
    .join(" ");
}

function getOfficialSourceUrl(school, kind) {
  const url = school?.links?.[kind];
  if (/^https?:\/\//i.test(url || "")) return url;
  const fallback = kind === "fees" ? school?.links?.international : school?.links?.fees;
  return /^https?:\/\//i.test(fallback || "") ? fallback : "";
}

function buildFallbackIntro(school) {
  return `${school.name} 的资料包含学校类型、住宿路径、英文支持、公开成绩、申请难度和 Year 10-12 衔接信息。`;
}

function getSchoolImage(school) {
  return school?.image || SCHOOL_IMAGE_FALLBACK;
}

function getSchoolDetailUrl(slug) {
  const params = new URLSearchParams();
  params.set("school", slug);
  copyRuntimeParams(params);
  return `advisor-school-detail.html?${params.toString()}`;
}

function getSchoolListUrl() {
  const params = new URLSearchParams();
  copyRuntimeParams(params);
  const query = params.toString();
  return `advisor-schools.html${query ? `?${query}` : ""}`;
}

function copyRuntimeParams(targetParams) {
  const currentParams = new URLSearchParams(window.location.search);
  ["api", "debug", "apiDebug"].forEach((name) => {
    if (currentParams.has(name) && !targetParams.has(name)) {
      targetParams.set(name, currentParams.get(name));
    }
  });
}

function getUnique(values) {
  return [...new Set(values.filter(Boolean))];
}

function getLevelFilterOptions(schools) {
  return getUnique(schools.flatMap(getSchoolLevelFilters)).sort(compareSchoolLevels);
}

function getSchoolLevelFilters(school) {
  return String(school?.levelShort || "")
    .match(/L\d+/g) || [];
}

function compareSchoolLevels(a, b) {
  const numberA = Number(a.replace(/\D/g, ""));
  const numberB = Number(b.replace(/\D/g, ""));
  return numberA - numberB || a.localeCompare(b);
}

function getTuitionFilterOptions(schools) {
  const available = new Set(schools.map(getTuitionLevel).filter(Boolean));
  return TUITION_FILTER_OPTIONS.filter((level) => available.has(level));
}

function getTuitionLevel(school) {
  const amounts = getTuitionAmounts(school);
  if (!amounts.length) return "";
  const amount = Math.max(...amounts);
  if (amount >= TUITION_HIGH_MIN) return "高";
  if (amount >= TUITION_MEDIUM_MIN) return "中";
  return "低";
}

function getTuitionAmounts(school) {
  const text = school?.fields?.[SCHOOL_FIELDS.fees] || "";
  return [...String(text).matchAll(/AUD\s*([0-9,]+)/gi)]
    .map((match) => Number(match[1].replace(/,/g, "")))
    .filter((amount) => Number.isFinite(amount) && amount >= TUITION_AMOUNT_MIN);
}

function normalizeSearch(value) {
  return String(value || "").trim().toLowerCase();
}

function truncateText(value, maxLength) {
  const text = String(value || "");
  return text.length > maxLength ? `${text.slice(0, maxLength).trim()}...` : text;
}

function escapeHTML(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
