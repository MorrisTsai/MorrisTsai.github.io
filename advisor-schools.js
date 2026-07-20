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
  academicRank: "ATAR排名",
  academicRankBasis: "ATAR排名依据",
  resultSource: "依据/备注",
  difficulty: "申请难度",
  weakEnglish: "英文弱学生",
  weakGrades: "成绩弱学生",
  weakAll: "英文+成绩+态度都弱",
  feeCalibration: "学费口径校验",
  agentPolicy: "Education Agent政策",
  agentEvidence: "Education Agent证据链接",
};

const TUITION_FILTER_OPTIONS = ["高", "中", "低"];
const TUITION_HIGH_MIN = 60000;
const TUITION_MEDIUM_MIN = 50000;
const TUITION_AMOUNT_MIN = 10000;
const BOARDING_FILTER_OPTIONS = ["寄宿/boarding", "Homestay", "Guardian/亲属"];

const SCHOOL_MARKETING_PROFILES = {
  "scotch-college": {
    position: "Scotch 通常会把自己放在墨尔本传统男校、强校友网络、强寄宿文化和高学术期待的组合里介绍。它吸引家庭的核心不是“容易进”，而是历史声望、男生成长环境、体育/音乐/领导力机会，以及寄宿体系带来的全天候管理。",
    pillars: ["1851 年创校的传统男校品牌", "Hawthorn 区位与成熟 boarding community", "学术高期待、活动资源深、校友网络强", "适合成熟、自律、能承受强竞争的男生"],
    local: "对本地家庭，重点会放在传统、男校文化、共同课程、运动音乐与校友圈。",
    international: "对国际家庭，重点会放在寄宿照顾、稳定的住宿与监护安排和强学术环境，但英文与成熟度要先够。"
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
    international: "对国际家庭，它强调国际学生路径和费用入口，但住宿与监护需逐案确认。"
  },
  "yarra-valley-grammar": {
    position: "Yarra Valley Grammar 会以 Ringwood 混校、清楚的国际生流程、homestay、英语评估和强社区感来招生。它适合普通偏上的学生先做预评估，而不是硬冲顶私。",
    pillars: ["Ringwood 混校", "homestay 与住宿监护信息清楚", "English Language Assessment", "适合需要更清楚英文衔接判断的家庭"],
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
    international: "对国际家庭，它强调 homestay、住宿监护、AEAS/IELTS 参考线和 intensive English 条件。"
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
  },
  "melbourne-girls-grammar": {
    position: "Melbourne Girls Grammar 位于 South Yarra，是墨尔本市区的独立女校，提供 Prep 至 Year 12 课程。国际学生可选择与父母或获批亲属同住；年满 13 岁的学生也可申请校内寄宿。学校重视女生教育、城市学习资源、学术发展与国际学生支持。",
    pillars: ["South Yarra 城市女校", "Prep 至 Year 12 与 VCE 路径", "Year 7-12 寄宿选择", "AEAS、面试与国际学生协调支持"],
    local: "城市区位、女生教育、课程选择与共同课程资源。",
    international: "国际学生可住校或与父母、获批亲属同住，并由 International Student Coordinator 跟进住宿监护与学习支持。"
  },
  "genazzano-fcj-college": {
    position: "Genazzano FCJ College 是位于 Kew 的独立女校，提供 Prep 至 Year 12 课程并设有寄宿。学校公开资料强调关怀社区、个性化学习、广泛的教育与体育选择，以及对国际学生学业、英文、住宿与监护支持。",
    pillars: ["Kew 独立女校", "Prep 至 Year 12", "校内寄宿与国际学生支持", "AEAS、学术报告与英文能力评估"],
    local: "女生教育、关怀社区、校园设施与多元课程选择。",
    international: "国际生申请需提交英文能力测试与近期学术报告，住宿、监护和入学支持由学校国际学生体系衔接。"
  },
  "the-geelong-college": {
    position: "The Geelong College 以吉朗区域传统混校、boarding 与必须经认证代理申请的国际路径见长；多数国际生先读本地 ELICOS，再经两轮面试进入主课。",
    pillars: ["Geelong 混校 day+boarding", "国际申请必须经认证代理", "AEAS + Avalon College ELICOS", "两轮虚拟面试与寄宿名额"],
    local: "强调区域传统、寄宿社区与学术活动并重。",
    international: "必须经 preferred agent 递交；AEAS 后多数先读 8–30 周 ELICOS，再过两轮面试。"
  },
  "st-margarets-berwick-grammar": {
    position: "St Margaret's Berwick Grammar 以 Berwick/Officer 平行男女校区、公开 AEAS/IDAT 年级门槛和限量 homestay 吸引国际家庭，并公开招募教育代理。",
    pillars: ["Berwick 女校区 + Officer 男校区", "Year 7–11 国际入口", "公开 AEAS/IDAT 建议分", "限量 homestay + 代理名单/招募"],
    local: "强调分校区学习、学术结果与社区。",
    international: "Year 10/11 可申请；英文门槛公开；无 boarding，以 homestay/590 亲属为主。"
  },
  "alphington-grammar-school": {
    position: "Alphington Grammar 是 open-entry 混校，海外生仅收 Prep–Year 10，门槛相对较低，并设授权代理名单与 HSPP 英文预备。",
    pillars: ["Alphington open-entry 混校", "海外生仅到 Year 10", "HSPP/英文预备", "授权代理名单 + AHN homestay"],
    local: "强调多元、非宗教开放入学与社区。",
    international: "Year 11 不收新国际生；14 岁以上 homestay；可经授权代理或 Registrar 申请。"
  },
  "carey-baptist-grammar-school": {
    position: "Carey 是一线混校，但学生签证国际生仅收 Kew 校区 Senior School Years 10–12；VCE/IB 双路径，并与多家教育代理合作。",
    pillars: ["Kew Senior School Years 10–12 国际入口", "VCE + IB", "15 岁及以上 homestay", "与多家 International Education Agents 合作"],
    local: "强调混校、双课程路径与学术表现。",
    international: "须 AEAS；国际生仅 Years 10–12 Kew；家庭可直申或经代理。"
  },
  "mentone-girls-grammar-school": {
    position: "Mentone Girls' Grammar 以 Bayside 女校、Years 7–12 国际路径、公开 AEAS 建议分与 Approved Agent 名单吸引国际女生家庭。",
    pillars: ["Mentone Bayside 女校", "Years 7–12 overseas", "AEAS 建议分 + ELICOS 缓冲", "公开 Approved Agent 名单"],
    local: "强调女生教育、沿海社区与学术结果。",
    international: "Year 9 起可 homestay；Year 11–12 可走 EAL；有代理名单也可直联招生。"
  },
  "camberwell-girls-grammar-school": {
    position: "Camberwell Girls Grammar 是 Canterbury 精英女校，仅 Senior School 收少量国际生，成绩顶尖，并设 approved agent 名单。",
    pillars: ["Canterbury 精英女校", "少量 Senior School 国际名额", "2025 median ATAR 93.2", "approved agents + ELICOS 条件路径"],
    local: "强调学术卓越、女校传统与社区。",
    international: "Year 10 可入、Year 11 仅 Sem 1；AEAS 须达标；经 approved agent 或直申。"
  }
};

initAdvisorSchools();

async function initAdvisorSchools() {
  const app = schoolListApp || schoolDetailApp;
  if (!app) return;

  const token = loadAdvisorSchoolToken();
  try {
    const payload = await window.rewardSchoolApi.getAdvisorSchools({ token });
    const schools = Array.isArray(payload?.schools) ? payload.schools : [];
    const isAdvisor = payload?.access?.advisor === true;
    if (schoolDetailApp) {
      renderSchoolDetailPage(schoolDetailApp, payload, schools, isAdvisor);
    } else {
      renderSchoolListPage(schoolListApp, payload, schools, isAdvisor);
    }
  } catch (error) {
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
      <p class="eyebrow">School Directory</p>
      <h1>${escapeHTML(title)}</h1>
      <p>${escapeHTML(message)}</p>
      <a class="button primary" href="${schoolDetailApp ? "advisor-schools.html" : "index.html"}">返回</a>
    </section>
  `;
}

function renderSchoolListPage(app, payload, schools, isAdvisor) {
  const levels = isAdvisor ? getLevelFilterOptions(schools) : [];
  const academicRanks = isAdvisor ? getAcademicRankFilterOptions(schools) : [];
  const genders = isAdvisor ? getSchoolTypeFilterOptions(schools) : [];
  const boardingTypes = isAdvisor ? getBoardingFilterOptions(schools) : [];
  const englishPaths = isAdvisor ? getUnique(schools.map((school) => school.englishPath)) : [];
  const tuitionLevels = isAdvisor ? getTuitionFilterOptions(schools) : [];

  app.innerHTML = `
    <section class="advisor-school-hero">
      <div>
        <p class="eyebrow">School Directory</p>
        <h1>维州私校资料库</h1>
        <p>${escapeHTML(payload?.intro || "长表已重新整理为可筛选卡片和单校详情页。")}</p>
      </div>
      <div class="advisor-school-stats">
        <div><span>学校数量</span><strong>${schools.length}</strong></div>
        ${isAdvisor
          ? `<div><span>顾问分层</span><strong>${levels.length}</strong></div><div><span>查看模式</span><strong>Advisor</strong></div>`
          : `<div><span>公开内容</span><strong>简介与特色</strong></div>`}
      </div>
    </section>

    <section class="advisor-school-tools" aria-label="学校筛选">
      <label>
        <span>搜索学校/关键词</span>
        <input type="search" data-school-search placeholder="例如 Wesley、boarding、ELICOS" />
      </label>
      ${isAdvisor ? `
        ${renderSelect("Level", "level", levels)}
        ${renderSelect("ATAR排名", "academicRank", academicRanks)}
        ${renderSelect("学费", "tuition", tuitionLevels)}
        ${renderSelect("学校类型", "gender", genders)}
        ${renderSelect("住宿路径", "boarding", boardingTypes)}
        ${renderSelect("英文路径", "english", englishPaths)}
      ` : ""}
    </section>

    <section class="advisor-school-results">
      <div class="advisor-school-results-bar">
        <div class="advisor-school-result-count" data-school-count></div>
        ${isAdvisor ? `<div class="advisor-school-view-toggle" aria-label="切换学校资料视图">
          <button type="button" class="is-active" data-school-view="cards">卡片整理</button>
          <button type="button" data-school-view="table">原表整表</button>
        </div>` : ""}
      </div>
      <div class="advisor-school-grid" data-school-grid></div>
      <div class="advisor-school-table-wrap" data-school-table hidden></div>
    </section>
  `;

  const state = {
    query: "",
    level: "",
    academicRank: "",
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
    const filtered = filterSchools(schools, state, payload, isAdvisor);
    count.textContent = `显示 ${filtered.length}/${schools.length} 间学校`;
    const isTable = isAdvisor && state.view === "table";
    grid.hidden = isTable;
    table.hidden = !isTable;
    if (isTable) {
      table.innerHTML = filtered.length
        ? renderFullSchoolTable(filtered)
        : `<div class="advisor-school-empty">没有符合条件的学校。</div>`;
    } else {
      grid.innerHTML = filtered.length
        ? filtered.map((school) => renderSchoolCard(school, payload?.researchProfiles?.[school.slug], isAdvisor)).join("")
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

function filterSchools(schools, state, payload, isAdvisor) {
  const query = normalizeSearch(state.query);
  return schools.filter((school) => {
    if (isAdvisor && state.level && getSchoolLevelFilter(school) !== state.level) return false;
    if (isAdvisor && state.academicRank && getSchoolAcademicRankFilter(school) !== state.academicRank) return false;
    if (isAdvisor && state.tuition && getTuitionLevel(school) !== state.tuition) return false;
    if (isAdvisor && state.gender && getSchoolTypeFilter(school) !== state.gender) return false;
    if (isAdvisor && state.boarding && !getSchoolBoardingFilters(school).includes(state.boarding)) return false;
    if (isAdvisor && state.english && school.englishPath !== state.english) return false;
    if (!query) return true;
    const publicProfile = payload?.researchProfiles?.[school.slug] || {};
    const publicSearchText = [
      school.name,
      school.chineseName,
      publicProfile.introduction,
      ...Object.values(publicProfile.overview || {}),
      ...(publicProfile.advantages || []).flatMap((item) => [item?.title, item?.detail]),
    ];
    return normalizeSearch([
      ...publicSearchText,
      ...(isAdvisor ? [school.level, school.summary, school.boardingType, school.englishPath, ...Object.values(school.fields || {})] : []),
    ].join(" ")).includes(query);
  });
}

function renderSchoolCard(school, researchProfile = null, isAdvisor = false) {
  const image = getSchoolImage(school);
  const officialLinks = researchProfile?.officialLinks || school.links || {};
  return `
    <article class="advisor-school-card">
      <a class="advisor-school-card-media" href="${escapeHTML(getSchoolDetailUrl(school.slug))}" aria-label="查看 ${escapeHTML(school.name)}">
        <img src="${escapeHTML(image)}" alt="${escapeHTML(school.name)}" loading="lazy" decoding="async" />
        ${isAdvisor ? `<span>${escapeHTML(school.levelShort)}</span>` : ""}
      </a>
      <div class="advisor-school-card-body">
        <div class="advisor-school-title-row">
          <div>
            ${isAdvisor ? `<span>${escapeHTML(school.gender)} · ${escapeHTML(school.boardingType)}</span>` : ""}
            <h2><a href="${escapeHTML(getSchoolDetailUrl(school.slug))}">${escapeHTML(school.name)}</a></h2>
          </div>
          <div class="advisor-school-card-actions">
            ${isAdvisor ? renderOfficialLink("学费页", officialLinks.fees) : ""}
            ${isAdvisor ? renderOfficialLink("国际招生页", officialLinks.international) : ""}
            <a class="profile-secondary-button" href="${escapeHTML(getSchoolDetailUrl(school.slug))}">详情</a>
          </div>
        </div>
        <p>${escapeHTML(researchProfile?.introduction || school.summary || school.fields?.[SCHOOL_FIELDS.type] || "")}</p>
        ${isAdvisor ? `<div class="advisor-school-chip-row">
          ${renderChip(school.level)}
          ${renderChip(school.academicRankLabel || school.fields?.[SCHOOL_FIELDS.academicRank])}
          ${renderChip(school.englishPath)}
          ${renderChip(school.fields?.[SCHOOL_FIELDS.difficulty])}
        </div>
        <div class="advisor-school-mini-grid">
          ${renderMiniFact("费用", school.fields?.[SCHOOL_FIELDS.fees])}
          ${renderMiniFact("住宿/监护", school.fields?.[SCHOOL_FIELDS.accommodation])}
          ${renderMiniFact("英文支持", school.fields?.[SCHOOL_FIELDS.englishSupport])}
          ${renderMiniFact("ATAR/VCE", school.fields?.[SCHOOL_FIELDS.results])}
          ${renderMiniFact("ATAR排名依据", school.fields?.[SCHOOL_FIELDS.academicRankBasis])}
        </div>
        <details class="advisor-school-full-fields">
          <summary>展开原表完整字段</summary>
          ${renderFieldGrid(school)}
        </details>` : ""}
      </div>
    </article>
  `;
}

function renderMiniFact(label, value) {
  if (!hasMeaningfulValue(value)) return "";
  return `
    <div>
      <span>${escapeHTML(label)}</span>
      <p>${escapeHTML(truncateText(value, 92))}</p>
    </div>
  `;
}

function renderChip(value) {
  return hasMeaningfulValue(value) ? `<span>${escapeHTML(value)}</span>` : "";
}

function renderDefinitionFact(label, value) {
  if (!hasMeaningfulValue(value)) return "";
  return `<div><dt>${escapeHTML(label)}</dt><dd>${escapeHTML(value)}</dd></div>`;
}

function getSchoolResearchProfile(payload, school) {
  const profile = payload?.researchProfiles?.[school.slug];
  if (profile?.introduction && Array.isArray(profile.advantages)) return profile;
  const legacyProfile = payload?.publicProfiles?.[school.slug] || {};
  return {
    introduction: school.name,
    overview: legacyProfile.overview || {
      location: "资料整理中",
      schoolType: "资料整理中",
      yearLevels: "资料整理中",
      studentCount: "学校官网未公开具体人数",
      internationalStudentCount: "学校官网未公开具体人数",
      seniorPathways: "资料整理中",
    },
    advantages: legacyProfile.advantages || [],
    localAdvantages: legacyProfile.advantages || [],
    internationalAdvantages: [],
    relatedLinks: [],
    advisorScale: {},
    officialLinks: school.links || {},
  };
}

function renderSchoolDetailPage(app, payload, schools, isAdvisor) {
  const slug = app.dataset.schoolSlug
    || new URLSearchParams(window.location.search).get("school")
    || getSchoolSlugFromPath();
  const school = schools.find((item) => item.slug === slug);
  if (!school) {
    renderAdvisorSchoolGate(app, "找不到学校", "请从学校介绍列表重新进入。", true);
    return;
  }

  if (!app.dataset.schoolSlug) {
    document.title = `${school.name} | Reward School 睿澳升学`;
  }
  const image = getSchoolImage(school);
  const researchProfile = getSchoolResearchProfile(payload, school);
  const advisorInsights = isAdvisor ? buildAdvisorInsights(school) : [];
  const matchProfile = isAdvisor ? payload?.matchProfiles?.[school.slug] : null;

  app.innerHTML = `
    <section class="advisor-school-detail-hero">
      <div class="advisor-school-detail-copy">
        <a class="profile-secondary-button" href="${escapeHTML(getSchoolListUrl())}">返回学校列表</a>
        <p class="eyebrow">School Profile</p>
        <h1>${escapeHTML(school.name)}</h1>
        <p>${escapeHTML(researchProfile.introduction)}</p>
      </div>
      <div class="advisor-school-detail-image">
        <img src="${escapeHTML(image)}" alt="${escapeHTML(school.name)}" decoding="async" />
      </div>
    </section>

    <section class="advisor-school-section advisor-school-top-snapshot">
      <div class="advisor-school-section-heading">
        <div>
          <p class="eyebrow">School Overview</p>
          <h2>学校简介</h2>
        </div>
      </div>
      ${renderPublicSchoolOverview(researchProfile.overview)}
    </section>

    <section class="advisor-school-section advisor-school-advantages">
      <div class="advisor-school-section-heading">
        <div>
          <p class="eyebrow">Why Choose</p>
          <h2>学校特色</h2>
        </div>
      </div>
      ${renderPublicFeatureItems(
        researchProfile.advantages
          || [...(researchProfile.localAdvantages || []), ...(researchProfile.internationalAdvantages || [])]
      )}
      ${renderRelatedSchoolLinks(researchProfile.relatedLinks)}
    </section>

    ${isAdvisor ? `<section class="advisor-school-section advisor-school-advisor-insights">
      <div class="advisor-school-section-heading">
        <div>
          <p class="eyebrow">Advisor Planning Notes</p>
          <h2>申请判断与顾问要点</h2>
        </div>
      </div>
      <div class="advisor-school-advisor-block">
        <div class="advisor-school-feature-heading">
          <span>Advisor Snapshot</span>
          <h3>顾问速览</h3>
        </div>
        ${renderAdvisorSnapshot(school)}
      </div>
      ${renderAdvisorMatchProfile(matchProfile)}
      <div class="advisor-school-advisor-block">
        <div class="advisor-school-feature-heading">
          <span>Scale Assessment</span>
          <h3>学校与国际生规模判断</h3>
        </div>
        ${renderAdvisorScale(researchProfile.advisorScale)}
      </div>
      ${renderAdvisorOfficialLinks(researchProfile.officialLinks)}
      <p class="advisor-school-marketing-lede">以下集中整理国际生入口、英文衔接、住宿与监护、申请材料与学生适配判断；相同信息只保留一次。</p>
      ${renderProfileItems(advisorInsights, "advisor-school-why-grid")}
      <details class="advisor-school-full-fields advisor-school-source-details">
        <summary>查看完整数据字段与来源</summary>
        ${renderFieldGrid(school)}
        ${school.imageSourceUrl ? `<p class="advisor-image-source">图片来源：<a href="${escapeHTML(school.imageSourceUrl)}" target="_blank" rel="noopener">学校网页图片</a></p>` : ""}
      </details>
    </section>` : ""}
  `;
}

function renderPublicFeatureItems(items) {
  const safeItems = Array.isArray(items) ? items.filter((item) => item?.detail) : [];
  if (!safeItems.length) return `<p>资料整理中，请以学校最新官方页面为准。</p>`;
  return `
    <div class="advisor-school-advantages-grid">
      ${safeItems.map((item) => `
        <article>
          <h4>${escapeHTML(item.title)}</h4>
          <p>${escapeHTML(item.detail)}</p>
          ${/^https?:\/\//i.test(item.sourceUrl || "") ? `<a href="${escapeHTML(item.sourceUrl)}" target="_blank" rel="noopener">学校官网来源</a>` : ""}
        </article>
      `).join("")}
    </div>
  `;
}

function renderRelatedSchoolLinks(items) {
  const safeItems = Array.isArray(items)
    ? items.filter((item) => item?.label && /^https?:\/\//i.test(item?.url || ""))
    : [];
  if (!safeItems.length) return "";
  return `
    <div class="advisor-school-related-links">
      <strong>进一步了解学校</strong>
      <div>${safeItems.map((item) => renderOfficialLink(item.label, item.url)).join("")}</div>
    </div>
  `;
}

function renderPublicSchoolOverview(overview = {}) {
  return `
    <dl class="advisor-school-public-facts advisor-school-snapshot-grid">
      ${renderDefinitionFact("地点", overview.location)}
      ${renderDefinitionFact("学校类型", overview.schoolType)}
      ${renderDefinitionFact("年级", overview.yearLevels)}
      ${renderDefinitionFact("学生人数", overview.studentCount)}
      ${renderDefinitionFact("国际学生人数", overview.internationalStudentCount)}
      ${renderDefinitionFact("高中课程", overview.seniorPathways)}
    </dl>
  `;
}

function renderAdvisorSnapshot(school) {
  return `
    <dl class="advisor-school-public-facts advisor-school-snapshot-grid">
      ${renderDefinitionFact("顾问分层", school.level)}
      ${renderDefinitionFact("学术参考", school.academicRankLabel || school.fields?.[SCHOOL_FIELDS.academicRank])}
      ${renderDefinitionFact("住宿路径", school.boardingType)}
      ${renderDefinitionFact("英文衔接", school.englishPath)}
    </dl>
  `;
}

function renderAdvisorMatchProfile(profile) {
  if (!profile) {
    return `<div class="advisor-match-profile advisor-match-profile-missing"><strong>内部匹配画像尚未载入</strong><p>请检查顾问权限或画像数据文件。</p></div>`;
  }

  const academicFocus = profile.academicReview?.focus || {};
  const aeasSensitivity = profile.aeasSensitivity || {};
  const selection = profile.selectionPriorities || {};
  const patterns = profile.studentPatternFit || {};
  const pathways = profile.englishPathways || {};
  const internalRange = profile.aeasPlanning?.internalExperienceRange || {};
  const officialAeas = profile.aeasPlanning?.officialRequirement || {};
  const sources = Array.isArray(profile.sourceRegister) ? profile.sourceRegister : [];
  const soft = profile.softMatch || {};
  const softSourceLabel = soft.source === "researched-character-profile"
    ? "官网证据 + 社群公开分享研究"
    : "关键字推导（未录入研究画像）";
  const communityInsights = Array.isArray(soft.communityInsights) ? soft.communityInsights : [];
  const agent = profile.agentPolicy || {};
  const agentStanceLabel = ({
    welcome: "欢迎教育代理",
    "not-welcome": "明文不欢迎代理",
    "not-mentioned": "官网未明确提及",
  })[agent.stance] || "待核实";

  return `
    <div class="advisor-school-advisor-block advisor-match-profile">
      <div class="advisor-school-feature-heading">
        <span>Private Fit Profile</span>
        <h3>内部匹配画像（仅顾问可见）</h3>
      </div>
      <p class="advisor-match-warning">内部区间与判断不是学校官方录取线，也不表示录取概率；需结合当期位置、完整成绩单、AEAS 单项、面试和学校书面回复复核。</p>

      <div class="advisor-match-grid">
        <article class="advisor-match-card">
          <h4>学术竞争与在校成绩</h4>
          ${renderAdvisorMatchFact("学术竞争强度", profile.academicCompetition?.level, profile.academicCompetition?.confidence)}
          ${renderAdvisorMatchFact("判断依据", profile.academicCompetition?.basis)}
          ${renderInternalChips(profile.academicReview?.priorities, "关注项目")}
          <dl class="advisor-match-metric-grid">
            ${renderAdvisorMatchFact("平均分", matchWeightLabel(academicFocus.average))}
            ${renderAdvisorMatchFact("核心科目", matchWeightLabel(academicFocus.coreSubjects))}
            ${renderAdvisorMatchFact("成绩趋势", matchWeightLabel(academicFocus.trend))}
            ${renderAdvisorMatchFact("挂科", matchWeightLabel(academicFocus.failedSubjects))}
            ${renderAdvisorMatchFact("出勤", matchWeightLabel(academicFocus.attendance))}
            ${renderAdvisorMatchFact("教师评语", matchWeightLabel(academicFocus.teacherComments))}
          </dl>
          ${renderAdvisorMatchFact("官方证据", profile.academicReview?.officialEvidence)}
        </article>

        <article class="advisor-match-card advisor-match-aeas-card">
          <h4>AEAS：官方要求与内部经验分开</h4>
          <div class="advisor-match-evidence advisor-match-evidence-official">
            <strong>学校公开要求</strong>
            <p>${escapeHTML(officialAeas.text || "官网未公开固定分数线。")}</p>
            ${Array.isArray(officialAeas.scoreValues) && officialAeas.scoreValues.length
              ? `<small>公开分数：${escapeHTML(officialAeas.scoreValues.join(" / "))}</small>`
              : `<small>公开固定分数：未找到</small>`}
          </div>
          <div class="advisor-match-evidence advisor-match-evidence-internal">
            <strong>顾问内部经验区间</strong>
            <p>Year 10：${escapeHTML(formatAdvisorRange(internalRange.year10))}</p>
            <p>Year 11：${escapeHTML(formatAdvisorRange(internalRange.year11))}</p>
            <small>${escapeHTML(internalRange.note || "仅供规划使用。")}</small>
          </div>
          <dl class="advisor-match-metric-grid">
            ${renderAdvisorMatchFact("阅读", matchWeightLabel(aeasSensitivity.reading))}
            ${renderAdvisorMatchFact("写作", matchWeightLabel(aeasSensitivity.writing))}
            ${renderAdvisorMatchFact("听力", matchWeightLabel(aeasSensitivity.listening))}
            ${renderAdvisorMatchFact("口语", matchWeightLabel(aeasSensitivity.speaking))}
            ${renderAdvisorMatchFact("词汇", matchWeightLabel(aeasSensitivity.vocabulary))}
          </dl>
          <p class="advisor-match-note">${escapeHTML(aeasSensitivity.note || "单项敏感度为内部规划判断。")}</p>
        </article>

        <article class="advisor-match-card">
          <h4>面试、材料与学习态度</h4>
          <dl class="advisor-match-metric-grid">
            ${renderAdvisorMatchFact("面试权重", matchWeightLabel(profile.interviewAssessment?.weight))}
            ${renderAdvisorMatchFact("推荐信", matchWeightLabel(selection.references?.weight))}
            ${renderAdvisorMatchFact("行为", matchWeightLabel(selection.behaviour?.weight))}
            ${renderAdvisorMatchFact("出勤", matchWeightLabel(selection.attendance?.weight))}
            ${renderAdvisorMatchFact("学习态度", matchWeightLabel(selection.learningAttitude?.weight))}
          </dl>
          ${renderAdvisorMatchFact("面试证据", profile.interviewAssessment?.evidence)}
          ${renderAdvisorMatchFact("推荐信证据", selection.references?.evidence)}
          ${renderAdvisorMatchFact("行为与态度证据", selection.learningAttitude?.evidence || selection.behaviour?.evidence)}
        </article>

        <article class="advisor-match-card">
          <h4>学生模式适配</h4>
          <div class="advisor-match-pattern">
            <strong>成绩一般但进步明显</strong>
            <span>${escapeHTML(patterns.improvingAcademics?.advisorJudgement || "未知")}</span>
            <p>${escapeHTML(patterns.improvingAcademics?.evidence || patterns.improvingAcademics?.officialPosition || "暂无证据")}</p>
          </div>
          <div class="advisor-match-pattern">
            <strong>英文较弱但学术扎实</strong>
            <span>${escapeHTML(patterns.weakEnglishStrongAcademics?.advisorJudgement || "未知")}</span>
            <p>${escapeHTML(patterns.weakEnglishStrongAcademics?.evidence || patterns.weakEnglishStrongAcademics?.officialPosition || "暂无证据")}</p>
          </div>
        </article>

        <article class="advisor-match-card">
          <h4>英文衔接与条件路径</h4>
          <dl class="advisor-match-metric-grid">
            ${renderAdvisorMatchFact("HSP", pathwayStatusLabel(pathways.hsp?.status))}
            ${renderAdvisorMatchFact("ELICOS", pathwayStatusLabel(pathways.elicos?.status))}
            ${renderAdvisorMatchFact("条件 Offer", pathwayStatusLabel(pathways.conditionalOffer?.status))}
            ${renderAdvisorMatchFact("其他英语准备", pathwayStatusLabel(pathways.generalPreparation?.status))}
          </dl>
          ${renderAdvisorMatchFact("HSP 证据", pathways.hsp?.evidence)}
          ${renderAdvisorMatchFact("ELICOS 证据", pathways.elicos?.evidence)}
          ${renderAdvisorMatchFact("条件 Offer 证据", pathways.conditionalOffer?.evidence)}
          <p class="advisor-match-note">${escapeHTML(pathways.warning || "必须向学校确认最新路径与退出条件。")}</p>
        </article>

        <article class="advisor-match-card">
          <h4>环境、理想学生与不适配风险</h4>
          ${renderInternalChips(profile.advisorEnvironmentTags || profile.environmentTags, "学校环境")}
          ${renderInternalChips(profile.idealStudentTraits || profile.preferredTraits, "理想学生特征")}
          ${renderInternalChips(profile.misfitRisks, "不适配风险", "is-risk")}
          ${(profile.misfitRisks || []).map((risk) => {
            const note = profile.misfitRiskNotes?.[risk];
            return note ? `<p class="advisor-match-risk-note"><strong>${escapeHTML(risk)}：</strong>${escapeHTML(note)}</p>` : "";
          }).join("")}
        </article>

        <article class="advisor-match-card">
          <h4>Education Agent 政策</h4>
          <dl class="advisor-match-metric-grid">
            ${renderAdvisorMatchFact("官方立场", agentStanceLabel)}
            ${renderAdvisorMatchFact("公开授权名单", agent.hasPublishedAgentList ? "有" : "未见/未录入")}
            ${renderAdvisorMatchFact("可直申", agent.acceptsDirectApplications === false ? "否" : "是/通常可直申")}
            ${renderAdvisorMatchFact("公开招募新代理", agent.recruitsNewAgents ? "是" : "否/未写明")}
          </dl>
          ${renderAdvisorMatchFact("政策摘要", agent.summaryZh)}
          ${agent.quote ? renderAdvisorMatchFact("官网原文", agent.quote) : ""}
          ${renderAdvisorMatchFact("顾问备注", agent.notesZh)}
          ${/^https?:\/\//i.test(agent.evidenceUrl || "") ? `<p class="advisor-match-note"><a href="${escapeHTML(agent.evidenceUrl)}" target="_blank" rel="noopener noreferrer">查验证据页</a> · ${escapeHTML(agent.evidenceStatus || "")}${agent.lastResearchedAt ? ` · 研究日 ${escapeHTML(agent.lastResearchedAt)}` : ""}</p>` : `<p class="advisor-match-note">${escapeHTML(agent.evidenceStatus || "证据待补")}</p>`}
        </article>

        <article class="advisor-match-card advisor-match-soft-card">
          <h4>学校性格与软性匹配</h4>
          ${soft.bestFitSummary ? `<p class="advisor-match-bestfit">${escapeHTML(soft.bestFitSummary)}</p>` : ""}
          <dl class="advisor-match-metric-grid">
            ${renderAdvisorMatchFact("学习风格", soft.learningStyle)}
            ${renderAdvisorMatchFact("关怀风格", soft.pastoralStyle)}
            ${renderAdvisorMatchFact("社交环境", soft.socialEnvironment)}
          </dl>
          ${renderInternalChips(soft.schoolCulture, "学校文化")}
          ${renderInternalChips(soft.cocurricularStrengths, "活动强项")}
          ${communityInsights.length
            ? `<div class="advisor-match-community">
                 <strong>社群真实分享（匿名、低置信度参考）</strong>
                 ${communityInsights.map((item) => `
                   <p class="advisor-match-community-item">
                     ${item.theme ? `<span class="advisor-match-community-theme">${escapeHTML(item.theme)}</span>` : ""}
                     ${escapeHTML(item.summary || "")}
                     ${item.url ? ` <a href="${escapeHTML(item.url)}" target="_blank" rel="noopener noreferrer">${escapeHTML(item.platform || "来源")}</a>` : (item.platform ? ` <span class="advisor-match-community-platform">（${escapeHTML(item.platform)}）</span>` : "")}
                   </p>`).join("")}
               </div>`
            : ""}
          <p class="advisor-match-note">软性画像来源：${escapeHTML(softSourceLabel)}；置信度低，非学校官方结论，需结合当期招生回复复核。</p>
        </article>
      </div>

      <div class="advisor-match-provenance">
        <div>
          <strong>顾问经验与置信度：${escapeHTML(profile.advisorExperience?.confidenceLabel || matchConfidenceLabel(profile.advisorExperience?.confidence))}</strong>
          <p>${escapeHTML(profile.advisorExperience?.note || "暂无说明。")}</p>
        </div>
        <div class="advisor-match-source-list">
          ${sources.map((source) => `
            <article>
              <strong>${escapeHTML(source.type || "来源")}</strong>
              <span>${escapeHTML(source.status || "未知")}</span>
              <p>${escapeHTML(source.detail || "")}</p>
              ${/^https?:\/\//i.test(source.url || "") ? `<a href="${escapeHTML(source.url)}" target="_blank" rel="noopener">查看来源</a>` : ""}
            </article>
          `).join("")}
        </div>
      </div>
    </div>
  `;
}

function renderAdvisorMatchFact(label, value, confidence = "") {
  if (!hasMeaningfulValue(value)) return "";
  return `<div><dt>${escapeHTML(label)}</dt><dd>${escapeHTML(value)}${confidence ? ` <small>（置信度：${escapeHTML(matchConfidenceLabel(confidence))}）</small>` : ""}</dd></div>`;
}

function renderInternalChips(values, label, className = "") {
  const safeValues = Array.isArray(values) ? values.filter(hasMeaningfulValue) : [];
  if (!safeValues.length) return "";
  return `<div class="advisor-match-chip-group ${escapeHTML(className)}"><strong>${escapeHTML(label)}</strong><div>${safeValues.map((value) => `<span>${escapeHTML(value)}</span>`).join("")}</div></div>`;
}

function formatAdvisorRange(range = {}) {
  const minimum = Number.isFinite(Number(range.minimum)) ? Number(range.minimum) : null;
  const preferred = Number.isFinite(Number(range.preferred)) ? Number(range.preferred) : null;
  const upper = Number.isFinite(Number(range.upper)) ? Number(range.upper) : null;
  if (minimum === null && preferred === null && upper === null) return "尚未校准";
  return `${minimum ?? "?"}–${upper ?? "?"}（规划中心 ${preferred ?? "?"}）`;
}

function matchWeightLabel(value) {
  return ({ high: "高", medium: "中", low: "低", unknown: "未知 / 未公开" })[value] || value || "未知 / 未公开";
}

function matchConfidenceLabel(value) {
  return ({ high: "高", medium: "中", low: "低" })[value] || value || "未知";
}

function pathwayStatusLabel(value) {
  return ({
    available: "已找到公开路径",
    "school-linked": "学校关联路径",
    "conditional-path": "有条件路径证据",
    "not-evidenced": "公开资料未见明确证据",
    unknown: "未知 / 需向学校确认",
  })[value] || value || "未知 / 需向学校确认";
}

function renderAdvisorScale(scale = {}) {
  const items = [
    ["学校总体规模", scale.schoolSize],
    ["年级 / 班级结构", scale.cohortStructure],
    ["国际学生规模", scale.internationalScale],
    ["证据与可信度", scale.evidenceNote],
  ].filter(([, value]) => hasMeaningfulValue(value));
  if (!items.length) return `<p>规模资料整理中。</p>`;
  return `
    <div class="advisor-school-scale-grid">
      ${items.map(([label, value]) => `
        <article>
          <span>${escapeHTML(label)}</span>
          <p>${escapeHTML(value)}</p>
        </article>
      `).join("")}
    </div>
  `;
}

function renderAdvisorOfficialLinks(links = {}) {
  const candidates = [
    ["国际学生招生页", links.international],
    ["国际学生学费页", links.fees],
    ["学校官方成绩 / 报告", links.results],
  ];
  const safeLinks = candidates.filter(([, url]) => /^https?:\/\//i.test(url || ""));
  if (!safeLinks.length) return "";
  return `
    <div class="advisor-school-official-links">
      <div>
        <span>Official Application Sources</span>
        <h3>官方申请资料</h3>
      </div>
      <div>${safeLinks.map(([label, url]) => renderOfficialLink(label, url)).join("")}</div>
    </div>
  `;
}

function renderProfileItems(items, className) {
  const safeItems = Array.isArray(items) ? items.filter((item) => item?.detail) : [];
  if (!safeItems.length) return `<p>资料整理中，请以学校最新官方页面为准。</p>`;
  return `
    <div class="${escapeHTML(className)}">
      ${safeItems.map((item) => `
        <article>
          <h4>${escapeHTML(item.title)}</h4>
          <p>${escapeHTML(item.detail)}</p>
          ${item.sourceUrl ? `<a href="${escapeHTML(item.sourceUrl)}" target="_blank" rel="noopener">${escapeHTML(item.sourceLabel || "学校官网来源")}</a>` : ""}
        </article>
      `).join("")}
    </div>
  `;
}

function buildAdvisorInsights(school) {
  const fields = school.fields || {};
  return [
    makeProfileItem("国际生路径与入学点", [
      fieldLine("学生签证路径", fields[SCHOOL_FIELDS.visaPath]),
      fieldLine("Year 10/11 入学点", fields[SCHOOL_FIELDS.entryPoint]),
      fieldLine("Education Agent", fields[SCHOOL_FIELDS.agentPolicy]),
    ]),
    makeProfileItem("英文门槛与课程衔接", [
      fieldLine("AEAS / 英文门槛", fields[SCHOOL_FIELDS.aeas]),
      fieldLine("主课前英文路径", fields[SCHOOL_FIELDS.bridging]),
      fieldLine("主课内英文支持", fields[SCHOOL_FIELDS.englishSupport]),
    ]),
    makeProfileItem("申请材料与学校评估", [
      fieldLine("在校成绩", fields[SCHOOL_FIELDS.grades]),
      fieldLine("面试 / 笔试", fields[SCHOOL_FIELDS.interview]),
      fieldLine("推荐信 / 个人陈述", fields[SCHOOL_FIELDS.recommendation]),
    ]),
    makeProfileItem("住宿、监护与费用", [
      fieldLine("住宿 / CAAW / 监护", fields[SCHOOL_FIELDS.accommodation]),
      fieldLine("国际学生费用", fields[SCHOOL_FIELDS.fees]),
    ]),
    makeProfileItem("学术表现与申请难度", [
      fieldLine("VCE / ATAR", fields[SCHOOL_FIELDS.results]),
      fieldLine("ATAR 排名依据", fields[SCHOOL_FIELDS.academicRankBasis]),
      fieldLine("申请难度", fields[SCHOOL_FIELDS.difficulty]),
    ]),
    makeProfileItem("学生适配判断", [
      fieldLine("英文基础较弱", fields[SCHOOL_FIELDS.weakEnglish]),
      fieldLine("学术成绩较弱", fields[SCHOOL_FIELDS.weakGrades]),
      fieldLine("英文、成绩与学习态度均需加强", fields[SCHOOL_FIELDS.weakAll]),
    ]),
  ].filter((item) => item.detail);
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
    .replace(/很擅长把自己包装成/g, "公开资料呈现为")
    .replace(/把自己包装成/g, "定位为")
    .replace(/核心卖点是/g, "主要特色包括")
    .replace(/卖点更偏/g, "特色侧重")
    .replace(/卖点是/g, "特色包括")
    .replace(/不是低门槛/g, "入学仍有明确门槛")
    .replace(/硬冲顶私/g, "直接申请高门槛学校")
    .replace(/普通偏上/g, "具备稳定学术基础")
    .replace(/较现实的/g, "相对明确的")
    .replace(/现实选项/g, "适配选项")
    .replace(/不联系主课/g, "不建议直接申请主课")
    .replace(/不包装主课/g, "不建议直接申请主课")
    .replace(/不适合直接主课/g, "不建议直接进入主课")
    .replace(/不适合/g, "不建议")
    .replace(/英文弱/g, "英文基础较弱")
    .replace(/成绩弱/g, "学术成绩较弱")
    .replace(/成绩差/g, "学术成绩明显不足")
    .replace(/态度差/g, "学习态度不稳定")
    .replace(/硬上/g, "直接进入")
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
  const entries = Object.entries(fields)
    .map(([key, value]) => [key, normalizeFieldGridValue(school, key, value)])
    .filter(([key, value]) =>
      !["学校", "学费链接", "国际招生链接", SCHOOL_FIELDS.feeCalibration].includes(key) &&
      hasMeaningfulValue(value)
    );
  return `
    <div class="advisor-school-field-grid">
      ${entries.map(([key, value]) => `
        <div>
          <span>${escapeHTML(getFieldDisplayLabel(key))}</span>
          <p>${escapeHTML(value)}</p>
        </div>
      `).join("")}
    </div>
  `;
}

function normalizeFieldGridValue(school, key, value) {
  if (key === "Level") return school.level;
  if (key === SCHOOL_FIELDS.academicRank) {
    return school.academicRankLabel || value;
  }
  return formatSchoolInfoText(value);
}

function hasMeaningfulValue(value) {
  const text = String(value || "").trim();
  if (!text) return false;
  return !/^(未列明|需确认|待确认|N\/A|NA|-|—)$/i.test(text);
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
            ${columns.map((column) => `<th>${escapeHTML(getFieldDisplayLabel(column))}</th>`).join("")}
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          ${schools.map((school) => `
            <tr>
              <th><a href="${escapeHTML(getSchoolDetailUrl(school.slug))}">${escapeHTML(school.name)}</a></th>
              ${columns.map((column) => `<td>${escapeHTML(formatSchoolInfoText(school.fields?.[column] || ""))}</td>`).join("")}
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
    SCHOOL_FIELDS.agentPolicy,
    SCHOOL_FIELDS.fees,
    SCHOOL_FIELDS.accommodation,
    SCHOOL_FIELDS.englishSupport,
    SCHOOL_FIELDS.bridging,
    SCHOOL_FIELDS.aeas,
    SCHOOL_FIELDS.grades,
    SCHOOL_FIELDS.interview,
    SCHOOL_FIELDS.recommendation,
    SCHOOL_FIELDS.results,
    SCHOOL_FIELDS.academicRank,
    SCHOOL_FIELDS.academicRankBasis,
    SCHOOL_FIELDS.resultSource,
    SCHOOL_FIELDS.difficulty,
    SCHOOL_FIELDS.weakEnglish,
    SCHOOL_FIELDS.weakGrades,
    SCHOOL_FIELDS.weakAll,
    "学费链接",
    "国际招生链接",
  ];
  const all = new Set();
  schools.forEach((school) => {
    Object.keys(school.fields || {}).forEach((key) => {
      if (key !== "学校" && key !== SCHOOL_FIELDS.feeCalibration) all.add(key);
    });
  });
  return [
    ...preferred.filter((key) => all.has(key)),
    ...[...all].filter((key) => !preferred.includes(key)),
  ];
}

function getFieldDisplayLabel(key) {
  const labels = {
    [SCHOOL_FIELDS.visaPath]: "学生签证国际生路径",
    [SCHOOL_FIELDS.entryPoint]: "Year 10/11 入学点",
    [SCHOOL_FIELDS.agentPolicy]: "Education Agent 政策",
    [SCHOOL_FIELDS.agentEvidence]: "Education Agent 证据链接",
    [SCHOOL_FIELDS.fees]: "Year 10-12 国际学生费用",
    [SCHOOL_FIELDS.accommodation]: "住宿 / CAAW / 监护",
    [SCHOOL_FIELDS.englishSupport]: "主课内英文支持",
    [SCHOOL_FIELDS.bridging]: "主课前英文 / HSP / ELICOS / Bridge",
    [SCHOOL_FIELDS.aeas]: "AEAS / 英文门槛",
    [SCHOOL_FIELDS.grades]: "在校成绩 / 过往成绩",
    [SCHOOL_FIELDS.interview]: "面试 / 笔试",
    [SCHOOL_FIELDS.recommendation]: "推荐信 / 个人陈述",
    [SCHOOL_FIELDS.resultSource]: "官方来源与备注",
    [SCHOOL_FIELDS.weakEnglish]: "英文基础较弱",
    [SCHOOL_FIELDS.weakGrades]: "学术成绩较弱",
    [SCHOOL_FIELDS.weakAll]: "英文、成绩与学习态度均需加强",
  };
  return labels[key] || key;
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
  const completed = {
    ...generated,
    ...profile,
    pillars: Array.isArray(profile.pillars) && profile.pillars.length
      ? profile.pillars
      : generated.pillars,
    whyChoose: Array.isArray(profile.whyChoose) && profile.whyChoose.length
      ? profile.whyChoose
      : generated.whyChoose,
  };
  completed.verifiedHighlights = Array.isArray(profile.verifiedHighlights) && profile.verifiedHighlights.length
    ? profile.verifiedHighlights
    : buildPublicHighlights(school, completed);
  return completed;
}

function buildPublicHighlights(school, profile) {
  const fields = school.fields || {};
  const sourceUrl = getOfficialSourceUrl(school, "international");
  const sourceLabel = `${school.name} 学校官网资料`;
  return [
    makeProfileItem("学校与校区", [
      fieldLine("学校类型", fields[SCHOOL_FIELDS.type]),
      fieldLine("区域", fields[SCHOOL_FIELDS.region]),
      fieldLine("年级设置", fields[SCHOOL_FIELDS.yearLevels]),
    ], sourceLabel, sourceUrl),
    makeProfileItem("课程与学习特色", [profile.local], sourceLabel, sourceUrl),
    makeProfileItem("学生发展与校园体验", [
      ...(Array.isArray(profile.pillars) ? profile.pillars.slice(0, 3) : []),
    ], sourceLabel, sourceUrl),
    makeProfileItem("国际学生支持概览", [profile.international], sourceLabel, sourceUrl),
  ].filter((item) => item.detail);
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
          fieldLine("Education Agent政策", fields[SCHOOL_FIELDS.agentPolicy]),
        ],
        sourceLabel,
        internationalUrl
      ),
      makeProfileItem(
        "住宿 / CAAW / 监护",
        [
          fieldLine("住宿与监护", fields[SCHOOL_FIELDS.accommodation]),
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
        "住宿与监护安排",
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
  copyRuntimeParams(params);
  const query = params.toString();
  return `/schools/${encodeURIComponent(slug)}.html${query ? `?${query}` : ""}`;
}

function getSchoolListUrl() {
  const params = new URLSearchParams();
  copyRuntimeParams(params);
  const query = params.toString();
  return `/advisor-schools.html${query ? `?${query}` : ""}`;
}

function getSchoolSlugFromPath() {
  const match = window.location.pathname.match(/\/schools\/([^/]+)\.html$/i);
  return match ? decodeURIComponent(match[1]) : "";
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
  return getUnique(schools.map(getSchoolLevelFilter)).sort(compareSchoolLevels);
}

function getSchoolLevelFilter(school) {
  const match = String(school?.levelShort || "").match(/^L\d+/);
  return match ? match[0] : "";
}

function compareSchoolLevels(a, b) {
  const numberA = Number(a.replace(/\D/g, ""));
  const numberB = Number(b.replace(/\D/g, ""));
  return numberA - numberB || a.localeCompare(b);
}

function getAcademicRankFilterOptions(schools) {
  return getUnique(schools.map(getSchoolAcademicRankFilter)).sort(compareAcademicRanks);
}

function getSchoolAcademicRankFilter(school) {
  const match = String(school?.academicRank || school?.fields?.[SCHOOL_FIELDS.academicRank] || "").match(/^R\d+/);
  return match ? match[0] : "";
}

function compareAcademicRanks(a, b) {
  const numberA = Number(a.replace(/\D/g, ""));
  const numberB = Number(b.replace(/\D/g, ""));
  return numberA - numberB || a.localeCompare(b);
}

function getSchoolTypeFilterOptions(schools) {
  return ["男校", "女校", "混校"].filter((type) =>
    schools.some((school) => getSchoolTypeFilter(school) === type)
  );
}

function getSchoolTypeFilter(school) {
  const text = [
    school?.gender,
    school?.fields?.[SCHOOL_FIELDS.type],
    school?.summary,
  ].join(" ");

  if (/男校|boys'? school|boys only|all boys/i.test(text)) return "男校";
  if (/女校|girls'? school|girls only|all girls/i.test(text)) return "女校";
  if (/混校|co-?ed|coeducational|co-educational/i.test(text)) return "混校";
  return "";
}

function getBoardingFilterOptions(schools) {
  const available = new Set(schools.flatMap(getSchoolBoardingFilters));
  return BOARDING_FILTER_OPTIONS.filter((option) => available.has(option));
}

function getSchoolBoardingFilters(school) {
  const filters = new Set();
  const primary = String(school?.boardingType || "");
  const accommodation = String(school?.fields?.[SCHOOL_FIELDS.accommodation] || "");
  const summary = String(school?.summary || "");
  const text = `${primary} ${accommodation} ${summary}`;

  if (primary.includes("寄宿") || primary.toLowerCase().includes("boarding")) {
    filters.add("寄宿/boarding");
  }

  const excludesHomestay = /不是普通homestay|不走.*homestay|不提供.*homestay/i.test(text);
  if (!excludesHomestay && /homestay|host family|ahn|寄宿家庭/i.test(text)) {
    filters.add("Homestay");
  }

  if (
    /父母|亲属|親屬|获批亲属|獲批親屬|合格家庭成员|家庭成員|家长|家長|陪读|陪讀|parent|guardian|relative|dha|home affairs approved person/i.test(text)
  ) {
    filters.add("Guardian/亲属");
  }

  return [...filters];
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
  if (/未见国际学生费用|未见国际费|local students/i.test(text)) return [];
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
