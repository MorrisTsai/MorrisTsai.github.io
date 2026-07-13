const ADVISOR_AUTH_STORAGE_KEY = "rewardSchoolAeasAuthV1";

const advisorApp = document.querySelector("[data-advisor-flow-app]");

const APPLICATION_TIMELINE = [
  {
    time: "18-15个月前",
    title: "定位与诊断",
    detail: "确认目标年级、入学Term、当前成绩、英文基础、住宿路径和预算范围。",
    services: ["咨询评估", "学校匹配", "AEAS诊断"]
  },
  {
    time: "12个月前",
    title: "第一次英文判断",
    detail: "完成AEAS或内部模考，判断是否需要ELICOS/HSP，开始建立学校梯度。",
    services: ["AEAS备考", "学校清单", "英文方案"]
  },
  {
    time: "9-10个月前",
    title: "递交申请",
    detail: "递交阶段成绩、AEAS、在读证明、护照、推荐信等材料，进入学校审核。",
    services: ["材料准备", "申请学校", "面试安排"]
  },
  {
    time: "7月",
    title: "补交最终成绩",
    detail: "中国学年结束后补最终成绩，决定7-12月读ELICOS/HSP、继续国内课程或做VCE预备。",
    services: ["补材料", "英文衔接", "VCE预备"]
  },
  {
    time: "7-12月",
    title: "英文与学术衔接",
    detail: "完成ELICOS/HSP、AEAS复测、学术英文、数学/科学英文、essay和presentation训练。",
    services: ["HSP/ELICOS规划", "学术英文", "复测跟进"]
  },
  {
    time: "3-4个月前",
    title: "Offer与入境文件",
    detail: "接受offer、缴费、确认boarding/homestay/guardian、CoE、CAAW、OSHC和签证。",
    services: ["Offer处理", "签证住宿", "CAAW/CoE"]
  },
  {
    time: "入学前1个月",
    title: "选课与入境",
    detail: "确认orientation、校服、设备、住宿、接机、EAL/English路径和VCE选课准备。",
    services: ["行前指导", "到澳落地", "入学后陪跑"]
  }
];

const YEAR_ENTRY_PLANS = [
  {
    title: "Year 10入学",
    badge: "衔接空间最大",
    detail: "Year 10适合做英文、学术和课堂方式过渡。7月完成中国当前学年后，7-12月可用于ELICOS/HSP、继续国内高一上、学术英文或VCE预备。",
    points: ["适合利用半年做过渡", "英文不足时可先HSP/ELICOS", "Term 1最稳，Term 2可按学校判断"]
  },
  {
    title: "Year 11入学",
    badge: "当前申请重点",
    detail: "Year 11进入VCE/Senior阶段，Term 2/3插班会缺少前置课程、SAC/assessment、选课基础和课堂训练。",
    points: ["建议12-18个月前启动", "Term 1优先，插班风险更高", "英文不足时优先延期或改Year 10路径"]
  },
  {
    title: "Year 12入学",
    badge: "个案评估",
    detail: "Year 12申请需要先确认学校是否开放名额、课程衔接是否可行、签证住宿时间线是否来得及，以及学生英文和学术材料是否足够成熟。",
    points: ["先确认课程与名额", "核对签证和住宿时间线", "根据评估结果定制申请方案"]
  }
];

const ENGLISH_PATHWAY_BANDS = [
  { score: "80+", level: "Advanced", weeks: "0周", path: "可优先考虑直接主课，仍需看学校要求、成绩单和面试。" },
  { score: "71-79", level: "Pre-Advanced", weeks: "4-8周", path: "Year 10机会较好；Year 11需看学校门槛。" },
  { score: "61-70", level: "Upper Intermediate", weeks: "8-12周", path: "更适合先英文/HSP后进Year 10；Year 11需要谨慎评估。" },
  { score: "46-60", level: "Intermediate", weeks: "12-20周", path: "通常需要先做英文衔接；Year 10/11需结合学校要求判断。" },
  { score: "36-45", level: "Pre-Intermediate", weeks: "20-30周", path: "先ELICOS/HSP；目标Year 11通常需要延期或改Year 10。" },
  { score: "0-35", level: "Elementary / Beginners", weeks: "30-48周", path: "半年通常不够；需要更早开始英文或延后主课入学。" }
];

const GAP_PLANS = [
  {
    title: "英文已达标",
    detail: "7-12月保持学习连续，可继续国内下一学期，或做学术英文、VCE预备、写作、数学/科学英文、阅读训练。",
    tag: "Direct / Mainstream + EAL"
  },
  {
    title: "英文接近达标",
    detail: "安排8-12周短期ELICOS/HSP，或国内强化AEAS与英文写作；入学后可能配EAL/English Support。",
    tag: "Short English Prep"
  },
  {
    title: "英文中等偏弱",
    detail: "7/8月开始ELICOS/HSP读到11/12月，完成学校测试或AEAS复测；Year 10路径更合理。",
    tag: "HSP / ELICOS"
  },
  {
    title: "英文很弱或成绩也弱",
    detail: "提前开始长期ELICOS/HSP，叠加数学英文、科学英文、essay和学习习惯补强；Year 11需要重新评估入学时间与学校组合。",
    tag: "Longer Bridge / Year 10"
  }
];

const SERVICE_SCOPE = [
  {
    title: "核心服务地区",
    items: [
      "以墨尔本及维州私校申请为主",
      "重点覆盖墨尔本本地资源、学校沟通与落地服务",
      "其他州学校申请可按家庭需求另行评估"
    ]
  },
  {
    title: "申请范围判断",
    items: [
      "学校是否接收国际学生",
      "学校是否具备对应国际学生资质",
      "目标年级当年是否有名额",
      "当年招生政策与学校官方要求"
    ]
  },
  {
    title: "学校名单口径",
    items: [
      "具体学校名单以学校官方招生要求为准",
      "具体学校名单以当年空位为准",
      "学校梯度需要结合英文、成绩、年级、住宿和预算综合判断"
    ]
  }
];

const SERVICE_DETAIL_MAP = {
  "咨询评估": [
    {
      title: "学生与申请基础",
      items: ["当前年龄与年级", "目前就读学校类型", "近1-2年成绩表现", "英文基础与口语表达能力", "AEAS或其他英文测试记录", "目标入学时间"]
    },
    {
      title: "家庭与学校偏好",
      items: ["目标申请年级", "家庭预算范围", "住宿、陪读或监护安排", "地区偏好", "排名与学校梯度", "男校/女校/混校", "寄宿与课程体系偏好"]
    }
  ],
  "学校匹配": [
    {
      title: "匹配维度",
      items: ["学生当前成绩", "英文基础与AEAS预估水平", "目标申请年级", "学校是否接收国际学生", "目标年级是否有位置", "学校所在区域", "学校类型", "VCE/IB或其他课程体系"]
    },
    {
      title: "决策维度",
      items: ["是否需要寄宿或住宿安排", "学费与家庭预算", "学生性格与适应能力", "家庭未来升学规划", "冲刺校/匹配校/保底校梯度", "学校当年招生政策与空位"]
    }
  ],
  "AEAS 备考": [
    {
      title: "备考服务",
      items: ["备考规划", "考试技巧讲解", "模拟考试", "答疑与反馈", "正式考试安排提醒"]
    },
    {
      title: "训练目标",
      items: ["熟悉AEAS考试形式", "提高英文表达", "提高答题效率", "提高考试稳定性", "形成可用于申请的评估材料"]
    }
  ],
  "材料准备": [
    {
      title: "材料整理",
      items: ["检查学校申请要求", "整理材料清单", "提醒翻译、公证或认证需求", "检查材料完整度", "根据学校要求调整材料准备方式", "提醒材料递交截止时间"]
    },
    {
      title: "常见材料",
      items: ["成绩单", "在读证明", "护照", "AEAS/英文测试", "推荐信", "阶段成绩", "最终成绩补交", "住宿或监护说明"]
    }
  ],
  "申请学校": [
    {
      title: "递交流程",
      items: ["确认最终申请学校名单", "核对每所学校申请要求", "填写或协助填写申请表", "整理并上传申请材料", "提醒申请费支付", "向学校递交申请"]
    },
    {
      title: "申请跟进",
      items: ["跟进学校确认邮件", "补充学校要求材料", "持续跟进申请进度", "提醒面试或补充材料要求", "确认入学Term与年级"]
    }
  ],
  "面试辅导": [
    {
      title: "面试训练",
      items: ["英文自我介绍训练", "常见面试问题讲解", "个人经历梳理", "兴趣爱好表达", "学校匹配表达", "模拟面试"]
    },
    {
      title: "反馈调整",
      items: ["面试后反馈", "表达逻辑调整", "语言准确度调整", "英文沟通清晰度", "真实表达能力", "降低英文面试紧张感"]
    }
  ],
  "Offer 获取": [
    {
      title: "Offer内容核对",
      items: ["Offer类型", "正式录取或条件录取", "是否要求语言课程", "入学年级与入学时间", "缴费金额与截止日期", "是否需要补充材料", "住宿或监护要求"]
    },
    {
      title: "后续安排",
      items: ["理解Offer内容", "提醒接受Offer时间节点", "确认缴费和位置保留要求", "与学校沟通后续安排", "根据Offer条件规划下一步", "进入签证、住宿和行前准备"]
    }
  ],
  "行前指导": [
    {
      title: "澳洲私校学习环境",
      items: ["课堂互动方式", "小组讨论与课堂发言", "作业和Assessment形式", "老师对主动提问的期待", "课堂笔记方法", "Presentation与Group Work", "学术诚信", "学校邮箱、学习平台和系统"]
    },
    {
      title: "模拟澳洲课堂体验",
      items: ["英文课堂听课节奏", "老师课堂指令", "课堂讨论方式", "听不懂时如何礼貌提问", "如何参与小组合作", "如何完成课堂任务", "如何表达观点"]
    },
    {
      title: "行前生活指导",
      items: ["入境前准备清单", "澳洲校园基本规则", "校服、教材、电子设备", "交通和安全", "通讯、银行卡和生活基础", "住宿或陪读家庭生活衔接", "入学第一周常见问题", "如何向学校寻求帮助"]
    },
    {
      title: "心理与情绪适应",
      items: ["离家焦虑", "语言环境压力", "交朋友困难", "课堂不敢发言", "文化适应不安", "入学前紧张", "亲子沟通压力", "新环境不确定感"]
    }
  ],
  "签证与住宿": [
    {
      title: "签证事项",
      items: ["学生签证材料清单", "签证申请时间节点", "体检、保险提醒", "学校Offer与入学文件整理", "对接合规签证服务资源", "签证审理时间与补材料提醒"]
    },
    {
      title: "住宿与监护",
      items: ["可选住宿形式", "学校寄宿或认可住宿", "homestay或其他住宿安排", "未满18岁福利与监护要求", "入住时间沟通", "住宿合同、费用、规则和安全事项", "接机、入住和报到安排"]
    }
  ],
  "到澳落地": [
    {
      title: "抵达与入住",
      items: ["接机安排提醒或协助", "入住住宿地点", "生活用品准备", "熟悉周边环境", "紧急联系人确认", "与家长同步落地情况"]
    },
    {
      title: "报到与生活基础",
      items: ["学校报到提醒", "校服、教材、学生证确认", "交通路线熟悉", "电话卡", "银行卡", "到校第一周事项"]
    }
  ],
  "入学后陪跑": [
    {
      title: "学习适应跟进",
      items: ["课堂听懂程度", "作业完成情况", "Assessment要求理解", "课堂讨论参与", "学习平台使用", "是否需要额外英文或学科支持"]
    },
    {
      title: "校园生活适应",
      items: ["作息适应", "住宿或通勤适应", "同学关系", "学校规则", "向老师求助", "澳洲校园文化适应"]
    },
    {
      title: "家长沟通",
      items: ["定期沟通孩子适应情况", "提醒关注学校邮件", "协助理解学校反馈", "判断是否需要额外支持", "必要时协助与学校沟通"]
    },
    {
      title: "问题预警与支持",
      items: ["长期不适应课堂", "作业压力过大", "持续情绪低落", "社交困难", "住宿不适应", "亲子沟通压力增加", "学习节奏跟不上", "英文/学科/学校counsellor/青少年心理辅导支持"]
    }
  ]
};

const PUBLIC_PRODUCT_FLOW = {
  title: "Year 10-12 澳洲私校申请与 AEAS 备考规划项目",
  subtitle: "从学生评估、AEAS、选校申请、面试到签证住宿与落地陪跑，把高年级私校申请放在同一条路线中管理。",
  positioning: "公开页展示私校申请方案与服务路径；具体报价仅 Advisor 登录后可见。",
  audience: [
    "当前主打：Year 10、Year 11、Year 12 高年级私校申请",
    "其他年级可以承接，但需先评估目标、英文、名额和家庭规划",
    "有英文基础，但不确定是否达到澳洲课堂要求",
    "准备参加 AEAS，或已经拿到 AEAS 成绩",
    "希望申请墨尔本及维州优质私校",
    "需要提前规划学校、住宿、签证与入学适应"
  ],
  serviceScope: SERVICE_SCOPE,
  advantages: [
    { title: "先评估，再选校", text: "先看孩子基础、目标年级和申请风险，避免盲目推荐学校。" },
    { title: "备考与申请同步规划", text: "避免考完 AEAS 才发现学校已经没有位置。" },
    { title: "高年级路径更清楚", text: "围绕英文能力、成绩单、面试表现、年级空位和课程衔接推进。" },
    { title: "减少家长信息差", text: "把考试、申请、住宿、签证、入学时间节点整合到一张计划表。" },
    { title: "后续落地有衔接", text: "Offer 不是终点，继续关注行前准备、入学适应和学习规划。" }
  ],
  steps: [
    {
      number: "01",
      title: "咨询评估",
      kicker: "先判断孩子适不适合申请",
      text: "正式申请前先评估学生与家庭情况，避免一开始就盲目选校或盲目备考。",
      items: ["当前年龄与年级", "目标申请年级与入学时间", "近1-2年成绩表现", "英文基础与口语表达", "AEAS或其他英文测试情况", "家庭预算范围", "住宿、陪读或监护需求", "地区、学校类型、寄宿和课程体系偏好"]
    },
    {
      number: "02",
      title: "学校匹配",
      kicker: "不是越有名越适合",
      text: "综合成绩、英文水平、申请年级、国际生资质、年级空位、区域、学校类型、寄宿需求、课程体系、预算与性格适应，建立清晰学校梯度。",
      items: ["冲刺校、匹配校、保底校梯度", "是否接收国际学生", "目标年级是否有位置", "VCE/IB或其他课程体系", "家庭预算与未来升学规划"]
    },
    {
      number: "03",
      title: "AEAS 备考",
      kicker: "把考试变成申请材料的一部分",
      text: "帮助学生熟悉 AEAS 考试形式，提高英文表达、答题效率和考试稳定性，为后续申请提供更有力的评估材料。",
      items: ["备考规划", "考试技巧讲解", "模拟考试", "答疑与反馈", "正式考试安排提醒"]
    },
    {
      number: "04",
      title: "材料准备",
      kicker: "材料完整度会影响申请效率",
      text: "根据每所学校要求准备和整理材料，减少因材料不完整导致的申请延误。",
      items: ["检查学校申请要求", "整理材料清单", "提醒翻译、公证或认证需求", "检查材料完整度", "按学校要求调整准备方式", "提醒材料递交截止时间"]
    },
    {
      number: "05",
      title: "申请学校",
      kicker: "正式进入学校审核流程",
      text: "学校名单、申请材料和基础准备完成后，正式进入申请递交与跟进阶段。",
      items: ["确认最终申请学校名单", "核对每所学校申请要求", "填写或协助填写申请表", "整理并上传申请材料", "提醒申请费支付", "向学校递交申请", "跟进确认邮件和补充材料"]
    },
    {
      number: "06",
      title: "面试辅导",
      kicker: "提前训练表达，不是背答案",
      text: "帮助学生提前熟悉英文面试场景，减少紧张感，提高沟通清晰度和真实表达能力。",
      items: ["英文自我介绍训练", "常见面试问题讲解", "个人经历梳理", "兴趣爱好表达", "学校匹配表达", "模拟面试", "面试后反馈"]
    },
    {
      number: "07",
      title: "Offer 获取",
      kicker: "看懂录取条件和下一步安排",
      text: "协助家庭理解 Offer 类型、录取条件、接受流程、缴费与位置保留要求，并规划签证、住宿与行前准备。",
      items: ["确认正式录取或条件录取", "核对入学年级与入学时间", "确认缴费金额与截止日期", "理解语言课程或补充材料要求", "提醒接受Offer关键时间点"]
    },
    {
      number: "08",
      title: "行前指导",
      kicker: "提前适应澳洲私校环境",
      text: "不是只告诉学生带什么行李，而是帮助学生提前了解澳洲私校学习和生活方式。",
      items: ["澳洲私校课堂形式", "课堂互动和Presentation", "作业、Assessment和学术诚信", "学校邮箱、学习平台和系统", "行前生活清单", "交通、安全、通讯、银行卡"]
    },
    {
      number: "09",
      title: "签证与住宿",
      kicker: "确保入学前关键事项衔接",
      text: "协助家庭梳理学生签证、住宿、监护和相关生活安排，并根据需要对接合规服务资源。",
      items: ["签证材料清单", "签证申请时间节点", "体检、保险和学校文件提醒", "住宿形式与学校认可安排", "寄宿、homestay或其他住宿沟通", "未满18岁welfare与监护安排"]
    },
    {
      number: "10",
      title: "到澳落地",
      kicker: "从抵达到入学的第一段适应",
      text: "帮助学生完成从入境、入住到学校报到的过渡，减少家长跨国沟通的不确定感。",
      items: ["接机安排提醒或协助", "入住住宿地点", "生活用品准备", "熟悉周边环境", "学校报到提醒", "校服、教材、学生证确认", "紧急联系人确认"]
    },
    {
      number: "11",
      title: "入学后陪跑",
      kicker: "持续关注孩子适应情况",
      text: "跟进学习、校园生活、家长沟通和问题预警，帮助孩子度过入学适应期。",
      items: ["课堂听懂程度", "作业和Assessment要求", "课堂讨论参与", "学习平台使用", "住宿或通勤适应", "同学关系和学校规则", "定期与家长沟通", "必要时建议额外支持"]
    }
  ]
};

initAdvisorProductFlow();

async function initAdvisorProductFlow() {
  const token = loadAdvisorToken();
  if (!token) {
    renderAdvisorFlow(PUBLIC_PRODUCT_FLOW, null, { showPricing: false });
    return;
  }

  try {
    const user = await window.rewardSchoolApi.getCurrentUser({ token });

    if (user?.advisor) {
      const flow = await window.rewardSchoolApi.getAdvisorProductFlow({ token });
      renderAdvisorFlow(flow || PUBLIC_PRODUCT_FLOW, user, { showPricing: true });
      return;
    }

    renderAdvisorFlow(PUBLIC_PRODUCT_FLOW, user, { showPricing: false });
  } catch (error) {
    renderAdvisorFlow(PUBLIC_PRODUCT_FLOW, null, { showPricing: false });
  }
}

function loadAdvisorToken() {
  try {
    const saved = JSON.parse(localStorage.getItem(ADVISOR_AUTH_STORAGE_KEY) || "null");
    return saved?.token || "";
  } catch (error) {
    return "";
  }
}

function renderAdvisorGate(title, message, isError = false) {
  if (!advisorApp) return;
  advisorApp.innerHTML = `
    <section class="advisor-flow-lock ${isError ? "is-error" : ""}">
      <p class="eyebrow">Advisor Only</p>
      <h1>${escapeHTML(title)}</h1>
      <p>${escapeHTML(message)}</p>
      <a class="button primary" href="profile.html">返回个人中心</a>
    </section>
  `;
}

function renderAdvisorFlow(flow, user, options = {}) {
  if (!advisorApp) return;
  const showPricing = Boolean(options.showPricing);
  const steps = Array.isArray(flow?.steps) ? flow.steps : [];
  const advantages = Array.isArray(flow?.advantages) ? flow.advantages : [];
  const audience = Array.isArray(flow?.audience) ? flow.audience : [];
  const serviceScope = Array.isArray(flow?.serviceScope) && flow.serviceScope.length ? flow.serviceScope : SERVICE_SCOPE;

  advisorApp.innerHTML = `
    <section class="advisor-flow-hero">
      <div class="advisor-flow-hero-copy">
        <p class="eyebrow">Application Plan</p>
        <h1>${escapeHTML(flow?.title || "私校申请方案")}</h1>
        <p>${escapeHTML(flow?.subtitle || "")}</p>
        <div class="advisor-flow-actions">
          <a class="button primary" href="#flow-steps">查看流程</a>
          <a class="button ghost dark" href="#year-path">Year 10/11/12规划</a>
          ${showPricing ? `<a class="button ghost dark" href="#advisor-pricing">报价体系</a>` : `<a class="button ghost dark" href="#advisor-pricing">Advisor查看价格</a>`}
          <a class="button ghost dark" href="advisor-schools.html">学校介绍</a>
          <a class="button ghost dark" href="index.html#contact">预约咨询</a>
        </div>
      </div>
      <div class="advisor-flow-brief">
        <span>${showPricing ? "Advisor logged in" : "Public view"}</span>
        <strong>${escapeHTML(showPricing ? user?.displayName || user?.email || "Advisor" : "价格仅 Advisor 可见")}</strong>
        <p>${escapeHTML(flow?.positioning || "")}</p>
      </div>
    </section>

    ${renderTimelineGraphic()}

    <section class="advisor-flow-overview">
      <div>
        <p class="eyebrow">Who It Serves</p>
        <h2>服务对象</h2>
        <div class="advisor-chip-grid">
          ${audience.map((item) => `<span>${escapeHTML(item)}</span>`).join("")}
        </div>
      </div>
      <div>
        <p class="eyebrow">Why This Product</p>
        <h2>项目优势</h2>
        <div class="advisor-advantage-list">
          ${advantages.map((item) => `
            <article>
              <strong>${escapeHTML(item.title)}</strong>
              <p>${escapeHTML(item.text)}</p>
            </article>
          `).join("")}
        </div>
      </div>
    </section>

    ${renderServiceScope(serviceScope)}

    ${renderYearEntryPlanning()}
    ${renderEnglishBridge()}
    ${showPricing ? renderAdvisorPricing(flow?.pricePackages, flow?.priceRecommendations) : renderAdvisorPricingGate()}

    <section id="flow-steps" class="advisor-flow-steps">
      <div class="section-heading center">
        <p class="eyebrow">Service Roadmap</p>
        <h2>完整服务流程</h2>
        <p>第五步已调整为申请学校，第六步为面试辅导。</p>
      </div>
      <div class="advisor-step-timeline">
        ${steps.map(renderAdvisorStep).join("")}
      </div>
    </section>
  `;
}

function renderServiceScope(scope) {
  return `
    <section class="advisor-flow-scope">
      <div class="section-heading center">
        <p class="eyebrow">Service Scope</p>
        <h2>服务地区与申请范围</h2>
      </div>
      <div class="advisor-scope-grid">
        ${scope.map((group) => `
          <article>
            <h3>${escapeHTML(group.title || "")}</h3>
            <ul>
              ${(Array.isArray(group.items) ? group.items : []).map((item) => `<li>${escapeHTML(item)}</li>`).join("")}
            </ul>
          </article>
        `).join("")}
      </div>
    </section>
  `;
}

function renderTimelineGraphic() {
  return `
    <section class="advisor-flow-visual" aria-label="1月入学倒推申请分支流程图">
      <div class="advisor-flow-visual-heading">
        <div>
          <p class="eyebrow">January Intake Pathway</p>
          <h2>1月入学倒推申请分支流程图</h2>
          <p>按1月正式入学倒推。主线是申请动作：资格初评、成绩/AEAS、申请学校、面试；学校审核后才产生A/B/C结果。HSP/ELICOS属于Conditional Offer后的条件执行，仍可能先经过面试。</p>
        </div>
        <a class="profile-secondary-button" href="advisor-schools.html">进入学校介绍</a>
      </div>
      <div class="advisor-route-legend" aria-hidden="true">
        <span class="core">动作主线：资格初评 → 材料/AEAS → 申请学校 → 面试</span>
        <span class="direct">学校结果A：直录/主课条件已满足</span>
        <span class="bridge">学校结果B：Conditional Offer，需要HSP/ELICOS或补英文</span>
        <span class="risk">学校结果C：路径需调整，改Year 10/延期/重选校</span>
        <span class="welfare">Offer后动作：welfare/guardian → CoE/CAAW → 签证</span>
      </div>
      <div class="advisor-route-scroll">
        <div class="advisor-route-map">
          <div class="advisor-route-months" aria-hidden="true">
            <span>7-10月<br />入学前18-15个月</span>
            <span>1月前后<br />入学前12个月</span>
            <span>3-4月<br />入学前10-9个月</span>
            <span>5-6月<br />入学前8-7个月</span>
            <span>6-8月<br />学校结果</span>
            <span>7-12月<br />按结果执行</span>
            <span>8-10月<br />福利/监护</span>
            <span>10-12月<br />签证/行前</span>
            <span>1月<br />正式入学</span>
          </div>

          <article class="advisor-route-card core has-next" style="grid-column: 1; grid-row: 2;">
            <span>主线</span>
            <h3>资格与目标初评</h3>
            <ul><li>确认Year 10/11与1月入学</li><li>英文、成绩、预算、住宿方向</li><li>学生年龄与当前年级审核</li></ul>
          </article>

          <article class="advisor-route-card core has-next" style="grid-column: 2; grid-row: 2;">
            <span>材料 + 诊断</span>
            <h3>成绩单 + AEAS + 初步目标</h3>
            <ul><li>请近2-3年成绩单、在读证明</li><li>初步学校目标订定</li><li>AEAS准备、模拟、正式考试</li></ul>
          </article>

          <article class="advisor-route-card core has-next" style="grid-column: 3; grid-row: 2;">
            <span>动作主线</span>
            <h3>申请学校</h3>
            <ul><li>Review申请学校目标</li><li>申请表、申请费</li><li>上传成绩单/AEAS/护照</li></ul>
          </article>

          <article class="advisor-route-card core has-next" style="grid-column: 4; grid-row: 2;">
            <span>动作主线</span>
            <h3>面试辅导 → 学校面试</h3>
            <ul><li>直录和条件录取都可能需要面试</li><li>英文自我介绍、学校匹配表达</li><li>模拟面试与反馈</li></ul>
          </article>

          <article class="advisor-route-card decision" style="grid-column: 5; grid-row: 2 / span 3;">
            <span>结果节点</span>
            <h3>学校审核后给出的结果</h3>
            <div class="advisor-route-options">
              <b class="direct">A 直录 / 主课条件满足</b>
              <b class="bridge">B Conditional Offer: 需HSP/ELICOS或补英文</b>
              <b class="risk">C 路径需调整: 改Year 10 / 延期 / 重选校</b>
            </div>
          </article>

          <article class="advisor-route-card direct" style="grid-column: 6; grid-row: 2;">
            <span>结果A</span>
            <h3>直录后Transition</h3>
            <ul><li>接受offer、缴费</li><li>澳洲课堂节奏</li><li>Assessment / Presentation、学术英文、VCE预备</li></ul>
          </article>

          <article class="advisor-route-card bridge" style="grid-column: 6; grid-row: 3;">
            <span>结果B后续</span>
            <h3>Conditional Offer + HSP / ELICOS</h3>
            <ul><li>学校给English preparation pathway</li><li>7-12月完成英文衔接</li><li>课程report / post-English test / AEAS复测</li></ul>
          </article>

          <article class="advisor-route-card risk" style="grid-column: 6; grid-row: 4;">
            <span>结果C：路径调整</span>
            <h3>调整路径</h3>
            <ul><li>改Year 10或延期</li><li>重选学校目标</li><li>保留学习连续并补英文/学术基础</li></ul>
          </article>

          <article class="advisor-route-card welfare" style="grid-column: 7; grid-row: 2 / span 2;">
            <span>Offer后动作</span>
            <h3>Welfare / Guardian路径</h3>
            <ul><li>boarding / homestay: 学校welfare与CAAW</li><li>parent guardian / DHA亲属: 不走学校homestay</li><li>guardian资格与签证材料可能更久</li></ul>
          </article>

          <article class="advisor-route-card common" style="grid-column: 8; grid-row: 2 / span 2;">
            <span>签证动作</span>
            <h3>CoE / CAAW / 签证</h3>
            <ul><li>补交最终成绩/英文条件结果</li><li>CoE、CAAW或guardian文件</li><li>OSHC、体检、GS回答、学生签证</li></ul>
          </article>

          <article class="advisor-route-card final" style="grid-column: 9; grid-row: 2 / span 2;">
            <span>1月正式入学</span>
            <h3>入境报到 / 正式入学</h3>
            <ul><li>orientation</li><li>校服、设备、选课</li><li>入学后陪跑</li></ul>
          </article>
        </div>
      </div>
    </section>
  `;
}

function renderYearEntryPlanning() {
  return `
    <section id="year-path" class="advisor-flow-planning">
      <div class="section-heading center">
        <p class="eyebrow">Year Level Planning</p>
        <h2>Year 10 / 11 / 12路径判断</h2>
      </div>
      <div class="advisor-year-plan-grid">
        ${YEAR_ENTRY_PLANS.map((item) => `
          <article>
            <div>
              <span>${escapeHTML(item.badge)}</span>
              <h3>${escapeHTML(item.title)}</h3>
            </div>
            <p>${escapeHTML(item.detail)}</p>
            <ul>
              ${item.points.map((point) => `<li>${escapeHTML(point)}</li>`).join("")}
            </ul>
          </article>
        `).join("")}
      </div>
      <div class="advisor-gap-grid">
        ${GAP_PLANS.map((item) => `
          <article>
            <span>${escapeHTML(item.tag)}</span>
            <h3>${escapeHTML(item.title)}</h3>
            <p>${escapeHTML(item.detail)}</p>
          </article>
        `).join("")}
      </div>
    </section>
  `;
}

function renderAdvisorPricing(packages = [], recommendations = []) {
  const pricePackages = Array.isArray(packages) ? packages : [];
  const priceRecommendations = Array.isArray(recommendations) ? recommendations : [];
  if (!pricePackages.length) {
    return `
      <section id="advisor-pricing" class="advisor-pricing-section advisor-pricing-lock">
        <div>
          <p class="eyebrow">Advisor Pricing</p>
          <h2>暂时没有读取到报价体系</h2>
          <p>当前账号已具备 Advisor 权限，但 API 暂时没有返回报价数据。请稍后刷新或联系管理员确认后端版本。</p>
        </div>
      </section>
    `;
  }

  return `
    <section id="advisor-pricing" class="advisor-pricing-section">
      <div class="advisor-flow-visual-heading">
        <div>
          <p class="eyebrow">Advisor Only Pricing</p>
          <h2>费用与报价体系</h2>
          <p>此模块仅在Advisor权限页面展示。公开页只展示服务层级，不展示具体价格。</p>
        </div>
      </div>
      <div class="advisor-price-grid">
        ${pricePackages.map((item) => `
          <article class="${item.code === "E" || item.code === "F" ? "is-recommended" : ""}">
            <div class="advisor-price-head">
              <span>${escapeHTML(item.code)}</span>
              <strong>${escapeHTML(item.price)}</strong>
            </div>
            <h3>${escapeHTML(item.title)}</h3>
            <p>${escapeHTML(item.scope)}</p>
            <small>${escapeHTML(item.salesUse)}</small>
          </article>
        `).join("")}
      </div>
      <div class="advisor-recommend-table">
        <div class="advisor-recommend-row heading">
          <span>推荐优先级</span>
          <span>报价方式</span>
          <span>适合对象</span>
          <span>销售表达</span>
        </div>
        ${priceRecommendations.map((item) => `
          <div class="advisor-recommend-row">
            <strong>${escapeHTML(item.level)}</strong>
            <span>${escapeHTML(item.package)}</span>
            <span>${escapeHTML(item.fit)}</span>
            <p>${escapeHTML(item.script)}</p>
          </div>
        `).join("")}
      </div>
    </section>
  `;
}

function renderAdvisorPricingGate() {
  return `
    <section id="advisor-pricing" class="advisor-pricing-section advisor-pricing-lock">
      <div>
        <p class="eyebrow">Advisor Pricing</p>
        <h2>报价体系仅 Advisor 登录后可见</h2>
        <p>公开申请方案页不展示具体价格。顾问账号登录后，会在这里看到 A-F 服务包、推荐顺序和销售表达。</p>
      </div>
      <a class="button primary" href="profile.html">登录 Advisor 账号</a>
    </section>
  `;
}

function renderEnglishBridge() {
  return `
    <section class="advisor-flow-english">
      <div class="advisor-flow-visual-heading">
        <div>
          <p class="eyebrow">English Bridge</p>
          <h2>AEAS英文水平与衔接周数</h2>
        </div>
      </div>
      <div class="advisor-english-table">
        <div class="advisor-english-row heading">
          <span>AEAS英文</span>
          <span>等级</span>
          <span>建议英文周数</span>
          <span>Year 10/11/12路径</span>
        </div>
        ${ENGLISH_PATHWAY_BANDS.map((band) => `
          <div class="advisor-english-row">
            <strong>${escapeHTML(band.score)}</strong>
            <span>${escapeHTML(band.level)}</span>
            <span>${escapeHTML(band.weeks)}</span>
            <p>${escapeHTML(band.path)}</p>
          </div>
        `).join("")}
      </div>
    </section>
  `;
}

function renderAdvisorStep(step) {
  const items = Array.isArray(step?.items) ? step.items : [];
  const details = SERVICE_DETAIL_MAP[step?.title] || [];
  return `
    <article class="advisor-step-card">
      <div class="advisor-step-number">${escapeHTML(step?.number || "")}</div>
      <div class="advisor-step-body">
        <span>${escapeHTML(step?.kicker || "")}</span>
        <h3>${escapeHTML(step?.title || "")}</h3>
        <p>${escapeHTML(step?.text || "")}</p>
        <ul>
          ${items.map((item) => `<li>${escapeHTML(item)}</li>`).join("")}
        </ul>
        ${details.length ? `
          <details class="advisor-step-details">
            <summary>展开服务细节</summary>
            <div class="advisor-step-detail-grid">
              ${details.map((group) => `
                <section>
                  <h4>${escapeHTML(group.title)}</h4>
                  <ul>
                    ${(group.items || []).map((item) => `<li>${escapeHTML(item)}</li>`).join("")}
                  </ul>
                </section>
              `).join("")}
            </div>
          </details>
        ` : ""}
      </div>
    </article>
  `;
}

function escapeHTML(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
