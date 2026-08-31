/* 庸医觉醒系统 · 核心逻辑 + 叙事层 + 多结局（单机 / 静态 / 无后端 / localStorage 存档）
 * 设计：大四不学无术的医学生，意外接入"庸医觉醒系统"，在脑海中进行多科室轮转。
 * 每科室轮转进度达 50% 与 100% 时，可三选一抽取该科室一项核心技能。
 * 指标：绩点(GPA /4.0) · 临床思维(/thinking /100) · 专业技能(/practice /100) · 人情世故(relations /100)
 * 隐藏计分：医德(ethics) · 伤患(harmCount) —— 驱动多结局分支。
 * 病例均改编自真实公开事件，已做虚构化处理，不构成任何医疗建议。
 */
(function () {
  "use strict";

  var SAVE_KEY = "yongyi_save_v1";
  var MAP_COLLAPSE_KEY = "yongyi_ui_rotation_map_collapsed";

  /* ---- 成长常量 ----
     EXP（经验值）：病历推进（完成一例接诊）时增加，驱动等级 LV，与绩点 GPA 分离。
     GPA（绩点）：答对专业知识选项（correct:true）时升高，代表学术/专业判断能力。
     注意：applyChoiceEffects 内以字面量 0.05 内联（保证 balance_sim.js 逐字节抽取后数学一致），
     此处 CORRECT_GPA 仅供渲染层 effectHtml 显示同一数值，二者务必保持同步。 */
  var EXP_PER_CASE = 10;    // 每完成一例 → 经验值 +10
  var CORRECT_GPA = 0.05;   // 每答对一处专业知识 → 绩点 +0.05
  var EXP_PER_LEVEL = 30;   // 每升 1 级所需经验值（30 = 3 例接诊）

  /* ---------------- 序章 / 结局 文案 ----------------
     风格：严肃叙事 —— 承认医学的重量，不调侃病人的痛苦，不用「代价/后果/答案」这种 AI 鸡汤词。
     「」只用于系统行（让气泡分组），内容平实、有分量。 */
  var INTRO =
    "考试周前夜，你其实啥也没看。\n" +
    "闭上眼，也没真睡着。脑子里冒出来一个声音——这声音不像人，也不像机器。\n\n" +
    "「庸医觉醒系统，已就位。」\n" +
    "「六科轮转，每个科室里的每一道题，背后都是一个活人。」\n" +
    "「你做的每一个选择，都会落在某个人身上。学完六科，你会知道自己到底适不适合干这一行。」\n\n" +
    "你没说话。你忽然想起来——实习第一天带教老师说过的话：\n" +
    "「这行最难的从来不是背书，是有一天你手里攥着一条命，而你必须一个人做决定。」";

  // 多结局：docType 仅作归档标签；key 为内部判定 id。
  var ENDINGS = {
    hidden: {
      type: "hidden", title: "觉醒 · 系统其实是你自己", accent: "gold",
      body:
        "系统：「恭喜。你通过了最后一道题——不是治病，是没把任何人当成习题。」\n" +
        "「其实根本没有'庸医觉醒系统'。那个声音，是你第一次真正替病人着想时，自己长出来的。」\n" +
        "「从今往后，它不会再响了。因为你，已经成了它。」\n\n" +
        "林一通睁开眼。天没亮，但他不困了。"
    },
    benevolent: {
      type: "benevolent", title: "仁心 · 你成了病人愿意托付的人", accent: "green",
      body:
        "系统：「六科轮转，你没躲过最难的那几道题——知情同意、强制报告、谁先救。」\n" +
        "「病人不会记得你的绩点，但会记得你蹲下来听他说话的那一下。」\n\n" +
        "林一通把听诊器挂上脖子。他未必是天才，但病人愿意把命，交到他手里。"
    },
    steady: {
      type: "steady", title: "稳健 · 一名普通的住院医", accent: "blue",
      body:
        "系统：「你不耀眼，也没出过大错。大多数好医生，都是这样长出来的。」\n" +
        "「临床是门手艺，手艺是日子堆的。你有了底子，剩下的交给时间。」\n\n" +
        "林一通舒了口气——至少，他不再是那个怕见病人的家伙了。"
    },
    lawsuit: {
      type: "lawsuit", title: "被告 · 医患之间那道裂缝", accent: "amber",
      body:
        "系统：「你救过人，也惹过事。几次'差点'和'本可以'，最后都变成了投诉和笔录。」\n" +
        "「医患之间那道缝，是你亲手掰大的。不是坏，是不够稳。」\n\n" +
        "林一通收到第一封律师函时，才懂'沟通'两个字，值半条命。"
    },
    malpractice: {
      type: "malpractice", title: "事故 · 庸医二字，原来会杀人", accent: "red",
      body:
        "系统：「你以为系统是游戏。可躺在监护仪那头的，不会因为你点了'重来'就活过来。」\n" +
        "「这一局，有人因为你的'想当然'没下手术台。庸医二字，原来真的会杀人。」\n\n" +
        "林一通第一次希望，这一切只是个梦。可梦醒了，案子还在。"
    },
    burnout: {
      type: "burnout", title: "退场 · 你选了另一条路", accent: "gray",
      body:
        "系统：「不是每个人都要穿白大褂。你试过了，手会抖，心会慌，这不可耻。」\n" +
        "「你选择离开临床，去做能帮到人的别的事——科研、公卫、科普。也算没白来。」\n\n" +
        "林一通脱下白大褂。救人的方式，不只有一种。"
    }
  };

  /* ---------------- 游戏数据 ---------------- */
  // 每个科室：cases 为病例序列（数量即该科室轮转总量），skills 为可抽取核心技能池。
  // 每个 case 可在原有字段外，带可选叙事层：patient(患者原话) / mentor(带教旁白) / system(系统旁白)
  // 每个 choice 可带：ethics(医德增减) / harm:true(该选择直接伤患，计入伤患数)
  var DEPARTMENTS = [
    {
      id: "internal", name: "消化内科", code: "内", sub: "胃肠 · 肝胆 · 慢病",
      teacher: "周老师",
      cases: [
        {
          title: "立了字据的肺癌病人", signal: { value: "PaO₂ 52", label: "血氧" },
          tags: ["肿瘤", "终末"],
          bio: "59 岁，肺腺癌晚期。上周他塞给你一张字据：「若到终末，别告诉我死讯，别抢救，让我舒服就行。」今早血氧掉到 52，家属拍桌要上呼吸机。",
          patient: "「小李……我早想好了。别让我插满管子走。」",
          mentor: "周老师：「尊重原则和家属意愿撞车时，最该提前做通的是家属，不是临终才摊牌。」",
          system: "提示：字据有效，但家属的反悔，也会在走廊里变成你的麻烦。",
          choices: [
            { text: "核对生前预嘱，与家属坦诚沟通后缓和治疗", effects: { gpa: 0.1, thinking: 6, practice: 3 }, ethics: 5,
              outcome: "你把字据摊开，陪家属坐到天黑。他走得安静。临床思维+6。" },
            { text: "顺着家属，上呼吸机积极到底", effects: { gpa: 0, thinking: -3, practice: 1 }, ethics: -4, risk: { chance: 0.3, failEffects: { thinking: -4, practice: -3 }, failText: "他清醒过一小会儿，盯着管子，眼里是恨。家属后来也悔了。" },
              outcome: "你守了流程，却违背了本人意愿。专业技能+1。" },
            { text: "躲出去让护士扛", effects: { gpa: 0.05, thinking: -4, practice: -2 }, ethics: -3,
              outcome: "把最难的决定推给别人，这课你没上。思维-4。" }
          ]
        },
        {
          title: "被瞒着的胃癌父亲", signal: { value: "Ⅲ期", label: "分期" },
          tags: ["肿瘤", "告知"],
          bio: "儿女求你「千万别让他知道是癌」。老人问你：「我就是胃疼，咋还要化疗？」——你该怎么开口，决定他最后一段路能不能自己做主。",
          patient: "「大夫，我这病……到底啥名？我能扛。」",
          mentor: "周老师：「九成人想知道自己的病。瞒，是家属的安心，不是病人的。」",
          system: "提示：保护性医疗是例外，不是默认。知情权属病人本人。",
          choices: [
            { text: "在家属在场时，分层次诚实告知并共同决策", effects: { gpa: 0.1, thinking: 6, practice: 4 }, ethics: 5,
              outcome: "你没替家属藏，也没把真相砸下去。他当晚交代了后事。思维+6。" },
            { text: "配合家属继续瞒", effects: { gpa: 0.05, thinking: -3, practice: -1 }, ethics: -4, risk: { chance: 0.3, failEffects: { thinking: -4, gpa: -0.1 }, failText: "他到死都以为'胃疼能好'，插管时拼命挣扎，儿女不敢看。" },
              outcome: "你护了家属的面子，欠了病人的知情权。思维-3。" },
            { text: "直接甩出病理报告", effects: { gpa: 0, thinking: 1, practice: 0 }, ethics: 1,
              outcome: "诚实但粗暴，老人当场懵了。思维+1。" }
          ]
        },
        {
          title: "反复头晕的老教师", signal: { value: "158/96", label: "血压" },
          tags: ["心血管", "慢病"],
          bio: "62 岁，晨起头晕，诊室复测 158/96。他坚信「年纪大了都这样」，把处方单折成纸飞机。",
          patient: "「我教了三十年书，还治不过来自己的血压？」",
          mentor: "周老师：「慢病管理的对手不是病，是他的'都这样'。把他当学生，别当病人训。」",
          system: "提示：他不依从，不是笨，是还没被说服。",
          choices: [
            { text: "用他的生活讲风险，一起定方案", effects: { gpa: 0.1, thinking: 5, practice: 3 }, ethics: 3,
              outcome: "你拿粉笔在处方背面画了根血管。他收下了。临床思维+5。" },
            { text: "背课本机制让他自己悟", effects: { gpa: 0.15, thinking: 2, practice: -1 }, ethics: 0,
              outcome: "一顿术语输出，他更迷糊了。绩点+0.15，专业技能-1。" },
            { text: "直接开最强降压药压住", effects: { gpa: -0.05, thinking: 1, practice: 4 }, ethics: -2, risk: { chance: 0.3, failEffects: { thinking: -4, practice: -3 }, failText: "没评估基线就上猛药，他低血压晕了一阵，你手心冒汗。" },
              outcome: "血压很快下来，但他有点发飘。专业技能+4。" }
          ]
        },
        {
          title: "咳嗽三周的年轻人", signal: { value: "37.8℃", label: "体温" },
          tags: ["呼吸", "感染"],
          bio: "24 岁，干咳三周伴低热，胸片模棱两可。是肺炎、结核还是单纯上呼吸道感染？走廊里有人催你「吊点水就好了」。",
          patient: "「大夫，给我开点消炎药，明天还得上班。」",
          mentor: "周老师：「抗生素不是退烧贴。病毒性你一上，菌群先乱的是他自己。」",
          system: "提示：患者要的是'快好'，你要的是'对症'。这两件事常常不是一回事。",
          choices: [
            { text: "补全病史+炎性指标鉴别再定", effects: { gpa: 0.05, thinking: 6, practice: 2 }, ethics: 3,
              outcome: "你把'像什么'拆成'不像什么'，思路清晰。思维+6。" },
            { text: "凭感觉先吊三天抗生素", effects: { gpa: 0, thinking: 1, practice: 3 }, ethics: -1, risk: { chance: 0.35, failEffects: { thinking: -3, gpa: -0.1 }, failText: "覆盖错了病原菌，咳嗽没好还添了腹泻，他骂你乱开。" },
              outcome: "广覆盖未必对症，但你动手了。专业技能+3。" },
            { text: "让他多喝热水观察", effects: { gpa: 0.1, thinking: -1, practice: -2 }, ethics: -2,
              outcome: "省事，但漏诊风险留给了下次。绩点+0.1，专业技能-2。" }
          ]
        }
      ],
      skills: [
        { id: "int_ddx", name: "鉴别诊断树", rarity: "核心", effect: { thinking: 6 }, desc: "面对模糊主诉，自动在脑内展开'不像什么'的排除分支，临床思维+6。" },
        { id: "int_hx", name: "病史采集术", rarity: "核心", effect: { practice: 5 }, desc: "多问一句关键既往史，少走三公里弯路。专业技能+5。" },
        { id: "int_rx", name: "用药安全网", rarity: "进阶", riskReduce: 0.15, effect: { thinking: 2, practice: 2 }, desc: "开药前自动核对禁忌与相互作用，后续激进处置风险-15%。" }
      ]
    },

    {
      id: "surgery", name: "胃肠外科", code: "外", sub: "腹外 · 急诊 · 止血",
      teacher: "老唐",
      cases: [
        {
          title: "没有癌的胆囊", signal: { value: "肝占位?", label: "体检" },
          tags: ["过度医疗", "指征"],
          bio: "45 岁，体检查出「肝占位」，疑肝癌。探查结果是血管瘤，没恶性。台上的上级却说：「顺手把胆囊也切了，埋个泵，多做几次治疗。」你握着刀柄。",
          patient: "「大夫，我平时啥感觉都没有，真要做这么大手术？」",
          mentor: "老唐：「指征是底线。没有指征的刀，下了台就是一辈子的债。我不是教你善良，是教你别坐牢。」",
          system: "提示：真实世界里，有人因为'没指征也动刀'判了十七年。刀在你手里，账也算在你头上。",
          choices: [
            { text: "坚持只处理明确病灶，拒做无指征操作", effects: { gpa: 0.1, thinking: 6, practice: 4 }, ethics: 6,
              outcome: "你顶住了上级的眼神，只切了该切的。临床思维+6。" },
            { text: "按上级意思都做了", effects: { gpa: 0, thinking: -5, practice: 2 }, ethics: -6, harm: true, risk: { chance: 0.4, failEffects: { thinking: -4, practice: -4 }, failText: "埋了泵、切了胆。一年后他九级伤残找上门，你才懂什么叫'客单价'。" },
              outcome: "流程走完了，良心和法理都悬了。专业技能+2。" },
            { text: "装没听见，拖着不上台", effects: { gpa: -0.1, thinking: -3, practice: -2 }, ethics: -3,
              outcome: "你没参与，也没拦住。逃避也是种选择，最便宜也最脏。思维-3。" }
          ]
        },
        {
          title: "右下腹剧痛的少年", signal: { value: "麦氏+", label: "压痛" },
          tags: ["急腹症", "阑尾"],
          bio: "15 岁，转移性右下腹痛，麦氏点压痛反跳痛。经典到你想笑，但也可能翻车。",
          patient: "「叔叔……我肚子要炸了。」",
          mentor: "老唐：「先禁食，别让他吃东西瞎折腾。标准流程走下来，带教都放心。」",
          system: "提示：最经典的病，也最容易被'想当然'害死。",
          choices: [
            { text: "禁食+术前评估待手术", effects: { gpa: 0.1, thinking: 4, practice: 4 }, ethics: 3,
              outcome: "流程走标准，带教点头。思维+4，专业技能+4。" },
            { text: "先输点液观察再说", effects: { gpa: 0, thinking: 2, practice: 2 }, ethics: 0, risk: { chance: 0.3, failEffects: { thinking: -3, practice: -3 }, failText: "穿孔了，急诊台上你手有点抖。" },
              outcome: "保守有指征，但你赌对了。专业技能+2。" },
            { text: "当场嘴里说'肯定是阑尾'", effects: { gpa: 0.05, thinking: -2, practice: 0 }, ethics: -2,
              outcome: "结论下太早，被上级反问住。思维-2。" }
          ]
        },
        {
          title: "腹股沟包块的老伯", signal: { value: "可复性", label: "疝" },
          tags: ["疝", "门诊"],
          bio: "70 岁，站立时腹股沟包块，平卧消失。他以为长「筋疙瘩」，你懂这是啥。",
          patient: "「大夫，我勒个皮带是不是就好了？」",
          mentor: "老唐：「嵌顿的疝不是皮带能压住的。先排除能不能推，再谈手术。」",
          system: "提示：民间偏方的代价，常常是肠子坏死。",
          choices: [
            { text: "查体鉴别直疝斜疝+预约", effects: { gpa: 0.05, thinking: 5, practice: 3 }, ethics: 3,
              outcome: "分型讲清楚，患者信服。思维+5。" },
            { text: "让他回去用皮带勒住", effects: { gpa: 0, thinking: -2, practice: -1 }, ethics: -3, harm: true,
              outcome: "民间偏方害人，嵌顿风险没交代。思维-2。" },
            { text: "直接推回去了事", effects: { gpa: -0.05, thinking: 1, practice: 3 }, ethics: -1, risk: { chance: 0.3, failEffects: { thinking: -3, practice: -3 }, failText: "没排除嵌顿就硬推，老人疼得冒汗，你也不敢了。" },
              outcome: "手法还行，但前提没查。专业技能+3。" }
          ]
        },
        {
          title: "外伤大出血的工人", signal: { value: "HR 128", label: "心率" },
          tags: ["创伤", "休克"],
          bio: "工地钢筋划开大腿，血喷。心率 128，人开始烦躁。每一秒都在掉血压。",
          patient: "「救……救我……我娃还小……」",
          mentor: "老唐：「先控出血再谈别的。台上一哆嗦，下来就是一辈子。」",
          system: "提示：你犹豫的那三秒，是他的几百毫升血。",
          choices: [
            { text: "加压包扎+呼叫抢救团队", effects: { gpa: 0.05, thinking: 4, practice: 6 }, ethics: 4,
              outcome: "先控出血再谈别的，教科书级。专业技能+6。" },
            { text: "先找血管缝两针", effects: { gpa: 0, thinking: 2, practice: 4 }, ethics: -1, risk: { chance: 0.35, failEffects: { thinking: -4, practice: -4 }, failText: "没控住就缝，血糊视线差点误伤。" },
              outcome: "敢动手，但顺序错了。专业技能+4。" },
            { text: "愣住三秒再反应", effects: { gpa: -0.1, thinking: -3, practice: -2 }, ethics: -4, harm: true,
              outcome: "慌了。缓过神来已多流了一百毫升。思维-3。" }
          ]
        }
      ],
      skills: [
        { id: "surg_aseptic", name: "无菌手感", rarity: "核心", effect: { practice: 6 }, desc: "刷手铺巾像肌肉记忆，台上有底气。专业技能+6。" },
        { id: "surg_anat", name: "解剖定位感", rarity: "核心", effect: { thinking: 5 }, desc: "闭眼能想清层次，下刀前有地图。临床思维+5。" },
        { id: "surg_hemostasis", name: "急诊止血术", rarity: "进阶", riskReduce: 0.15, effect: { practice: 3, thinking: 2 }, desc: "大出血局面先控源头，后续创伤处置风险-15%。" }
      ]
    },

    {
      id: "emergency", name: "急诊科", code: "急", sub: "分诊 · 气道 · 抗压",
      teacher: "大刘",
      cases: [
        {
          title: "昏迷的三无农民工", signal: { value: "GCS 7", label: "意识" },
          tags: ["三无", "绿色通道"],
          bio: "工友抬来一个叫「老刘」的农民工，昏迷、无家属、无电话、身无分文。CT 要钱，手术要签字。走廊里有人在等床位。",
          patient: "（工友）：「大夫，他叫老刘，我们不知道全名……求您先救救他。」",
          mentor: "大刘：「急诊没有'等一下'。三无？先救，账单我替你请示总值班。见死不救的医生，不配穿这白衣。」",
          system: "提示：制度兜底前，先有你肯担。绿色通道开着，是因为有人先按了开始。",
          choices: [
            { text: "启动绿色通道，先救再补手续", effects: { gpa: 0.1, thinking: 5, practice: 5 }, ethics: 6,
              outcome: "你一个电话摇来总值班，CT 和手术都没耽误。专业技能+5。" },
            { text: "等家属来、等缴费再动", effects: { gpa: 0, thinking: -5, practice: -3 }, ethics: -6, harm: true, risk: { chance: 0.4, failEffects: { thinking: -4, practice: -4 }, failText: "你等的时候，他脑疝了。后来家属来了，第一句话是跪着谢你——可人已经瘫了。" },
              outcome: "你把流程摆在了命前面。思维-5。" },
            { text: "只做最低限度处理", effects: { gpa: 0.05, thinking: -2, practice: -1 }, ethics: -2,
              outcome: "没坏心，但也没尽到。思维-2。" }
          ]
        },
        {
          title: "胸痛大汗的中年男", signal: { value: "ST↑?", label: "心电图" },
          tags: ["胸痛", "高危"],
          bio: "52 岁，压榨样胸痛伴冷汗。是急性心梗、主动脉夹层，还是胃食管反流？时间不站你这边。",
          patient: "「胸口……像被石头压着，喘不上气。」",
          mentor: "大刘：「胸痛先当最要命的看。排完了再松口气，别反过来。」",
          system: "提示：你把心梗当胃病，离事故就一步。",
          choices: [
            { text: "先心电图+生命征+绿色通道", effects: { gpa: 0.1, thinking: 6, practice: 4 }, ethics: 4,
              outcome: "高危优先，流程干净利落。思维+6。" },
            { text: "让他排队等号", effects: { gpa: 0, thinking: -4, practice: -2 }, ethics: -5, harm: true, risk: { chance: 0.35, failEffects: { thinking: -5, gpa: -0.2 }, failText: "夹层破了，你听见了最不想听的声音。" },
              outcome: "低估了胸痛，后果自负。思维-4。" },
            { text: "先开胃药试试", effects: { gpa: 0.05, thinking: -3, practice: 0 }, ethics: -4, harm: true,
              outcome: "把心梗当胃病，离事故一步之遥。思维-3。" }
          ]
        },
        {
          title: "醉酒呕吐误吸的青年", signal: { value: "SpO₂ 88", label: "血氧" },
          tags: ["气道", "急救"],
          bio: "22 岁，聚餐后呕吐、意识模糊，血氧 88。一口反流物正堵在气道口。",
          patient: "（同伴）：「他刚才还笑呢，怎么叫不醒了……」",
          mentor: "大刘：「先保通道。气道通了，剩下的才好说。」",
          system: "提示：拍背不是万能的。异物在气道，拍下去可能更深。",
          choices: [
            { text: "侧卧+清理气道+给氧", effects: { gpa: 0.05, thinking: 4, practice: 6 }, ethics: 3,
              outcome: "先保命通道，血氧爬回来。专业技能+6。" },
            { text: "拍背让他咳", effects: { gpa: 0, thinking: 1, practice: 2 }, ethics: -1, risk: { chance: 0.3, failEffects: { thinking: -3, practice: -3 }, failText: "拍背把异物推更深，血氧又掉。" },
              outcome: "本能反应，但方向未必对。专业技能+2。" },
            { text: "等他自己醒", effects: { gpa: 0.05, thinking: -4, practice: -2 }, ethics: -4, harm: true,
              outcome: "侥幸心理最贵。思维-4。" }
          ]
        },
        {
          title: "车祸多发伤", signal: { value: "ABCDE", label: "评估" },
          tags: ["创伤", "团队"],
          bio: "高速追尾，司机卡在驾驶位，多处出血、血压飘。同时还有第二个伤员在门口喊疼。两张床，你先给谁？",
          patient: "（第二伤员）：「大夫我先来的！我也很疼啊！」",
          mentor: "大刘：「分诊不是谁喊得响。是'马上要死'优先，不是'最惨'优先。」",
          system: "提示：triage 的残酷在于——你救得了一个，就得先放过另一个能等的。",
          choices: [
            { text: "ABCDE 序贯评估，按危重顺序分工", effects: { gpa: 0.1, thinking: 6, practice: 5 }, ethics: 4,
              outcome: "先气道后出血，团队各就各位。思维+6，专业技能+5。" },
            { text: "揪着最显眼的伤口缝", effects: { gpa: 0, thinking: 1, practice: 3 }, ethics: -1, risk: { chance: 0.35, failEffects: { thinking: -4, practice: -4 }, failText: "忽略了隐匿失血，血压先垮了。" },
              outcome: "看见血就上，丢了全局。专业技能+3。" },
            { text: "站边上喊'快快快'", effects: { gpa: -0.05, thinking: -3, practice: -2 }, ethics: -3, harm: true,
              outcome: "只剩嗓门，没用。思维-3。" }
          ]
        }
      ],
      skills: [
        { id: "er_triage", name: "分诊直觉", rarity: "核心", effect: { thinking: 6 }, desc: "一眼把'马上要死'和'还能等'分开。临床思维+6。" },
        { id: "er_airway", name: "气道管理", rarity: "核心", effect: { practice: 5 }, desc: "任何场面先保通道，底气来自练过。专业技能+5。" },
        { id: "er_steady", name: "抗压稳态", rarity: "进阶", riskReduce: 0.15, effect: { thinking: 3, practice: 2 }, desc: "混乱中手不抖，后续高风险处置风险-15%。" }
      ]
    },

    {
      id: "obgyn", name: "妇产科", code: "妇", sub: "孕产 · 鉴别 · 共情",
      teacher: "沈老师",
      cases: [
        {
          title: "停经腹痛的育龄女", signal: { value: "HCG+", label: "妊娠" },
          tags: ["妇科", "急症"],
          bio: "29 岁，停经 6 周、单侧腹痛。尿妊娠阳性。是宫内好孕，还是宫外孕这颗定时弹？",
          patient: "「我月经老不准……这次不会是宫外孕吧？」",
          mentor: "沈老师：「宫外孕是红线。没排外之前，别让她回家等着。」",
          system: "提示：把异位妊娠当普通先兆流产，破裂那刻你冷汗直流。",
          choices: [
            { text: "超声+孕酮动态随访", effects: { gpa: 0.1, thinking: 6, practice: 3 }, ethics: 5,
              outcome: "把异位妊娠当红线，排查到位。思维+6。" },
            { text: "当归宫内外都正常", effects: { gpa: 0.05, thinking: -3, practice: 0 }, ethics: -4, harm: true, risk: { chance: 0.3, failEffects: { thinking: -5, gpa: -0.15 }, failText: "没排外异位，破裂那刻你冷汗直流。" },
              outcome: "想当然最危险。思维-3。" },
            { text: "先开保胎药", effects: { gpa: 0, thinking: -2, practice: 1 }, ethics: -3,
              outcome: "方向可能完全反了。思维-2。" }
          ]
        },
        {
          title: "家属拒签的剖宫产", signal: { value: "重症肺炎", label: "孕晚期" },
          tags: ["产科", "知情同意"],
          bio: "孕晚期重症肺炎，血氧一路掉。胎儿随时不保。丈夫在手术同意书上写：「拒绝剖腹产，后果自负。」——他说「感冒吃点药就好」。",
          patient: "（丈夫）：「我媳妇就是感冒！不能开刀，开了以后不能生二胎！」",
          mentor: "沈老师：「签不签字，救的是两条命。当家属的选择等于放弃，你比谁都急，可流程把你摁住了。记着这种无力。」",
          system: "提示：真实世界里，有人因此失去妻儿。签字权在家属手里时，你的诊断救不了人——这是制度的墙，也是你要记住的伤。",
          choices: [
            { text: "反复沟通+上报医务科+留痕，穷尽合法努力", effects: { gpa: 0.1, thinking: 6, practice: 4 }, ethics: 6,
              outcome: "你苦求、上报、把每一步写进病历。没赢，但你站对了。思维+6。" },
            { text: "尊重家属签字，不手术", effects: { gpa: 0.05, thinking: -4, practice: -2 }, ethics: -2, harm: true, risk: { chance: 0.35, failEffects: { thinking: -5, gpa: -0.2 }, failText: "胎心先停了。你看着监护仪，第一次恨'流程'这两个字。" },
              outcome: "你守了规则，也接住了后果。思维-4。" },
            { text: "瞒着家属直接剖", effects: { gpa: -0.1, thinking: 1, practice: 3 }, ethics: -3, risk: { chance: 0.4, failEffects: { thinking: -4, practice: -4, gpa: -0.2 }, failText: "你救了孩子，却被家属以'侵犯选择权'告上法庭，科里开会点了你的名。" },
              outcome: "你赌了命，也赌了前途。专业技能+3。" }
          ]
        },
        {
          title: "求剖被卡的产妇", signal: { value: "宫口近全", label: "产程" },
          tags: ["产科", "自主权"],
          bio: "待产室里她一次次走出来，扶着墙说「我疼得不行，我要剖」。家属和流程却卡在「顺产签过字了」。她最后是跪坐下去的。",
          patient: "「大夫……我真的不行了，让我剖吧，求你了。」",
          mentor: "沈老师：「躺在产床上的那个人，才是签字的人。别让她跪着求。她清醒时说的，比授权书更金贵。」",
          system: "提示：榆林那年起，所有人都记住了——产妇本人的意愿，不该被一纸授权吞掉。",
          choices: [
            { text: "确认本人意愿，启动紧急评估并上报", effects: { gpa: 0.1, thinking: 6, practice: 5 }, ethics: 6,
              outcome: "你蹲下来听她说，而不是听家属的。流程被你撬动了一道缝。思维+6。" },
            { text: "按授权书听家属的，继续顺产", effects: { gpa: 0.05, thinking: -4, practice: -2 }, ethics: -5, harm: true, risk: { chance: 0.35, failEffects: { thinking: -5, practice: -3 }, failText: "她情绪失控的瞬间，你没在。后来才知道，那是最后一句话。" },
              outcome: "你守了授权，却没听见本人。思维-4。" },
            { text: "躲进办公室等交接", effects: { gpa: -0.05, thinking: -3, practice: -2 }, ethics: -3,
              outcome: "实刁钻的活推给别人，这科你白轮。思维-3。" }
          ]
        },
        {
          title: "独自来的未成年少女", signal: { value: "孕 8 周", label: "超声" },
          tags: ["妇科", "强制报告"],
          bio: "17 岁，一个人来的，说「我工作了，不告诉家长」，旁边一个自称「哥哥」的男人在家属栏签了字。你瞥见她手在抖。",
          patient: "「我……我能自己签吗？别告诉我爸妈。」",
          mentor: "沈老师：「未成年、独自、身份不明的陪同者——这三个词摞一起，就是强制报告红线。你多问一句'怎么怀上的'，可能救她一次。」",
          system: "提示：真实案例里，医院只信了她'我工作了'，陌生人冒充哥哥签字，事后她把自己关进房间。审查，是你对患者的保护。",
          choices: [
            { text: "核实身份与陪同关系，触发强制报告并联系监护人", effects: { gpa: 0.1, thinking: 6, practice: 4 }, ethics: 6,
              outcome: "你没放她走。卫健委后来认定医院做对了。思维+6。" },
            { text: "信她'已工作'，让她自签手术", effects: { gpa: 0.05, thinking: -4, practice: -1 }, ethics: -5, harm: true, risk: { chance: 0.4, failEffects: { thinking: -5, gpa: -0.15 }, failText: "陌生人签字，家属不知情。她抑郁了很久，你也在笔录里待了一下午。" },
              outcome: "你省了事，埋了雷。思维-4。" },
            { text: "只做手术不问来由", effects: { gpa: 0, thinking: -3, practice: 0 }, ethics: -3,
              outcome: "手快，但没看见人。思维-3。" }
          ]
        }
      ],
      skills: [
        { id: "ob_alert", name: "孕产警觉", rarity: "核心", effect: { thinking: 6 }, desc: "对妊娠相关红旗零迟钝。临床思维+6。" },
        { id: "ob_empathy", name: "沟通共情", rarity: "核心", effect: { practice: 5 }, desc: "把尴尬的检查讲成被照顾。专业技能+5。" },
        { id: "ob_aseptic", name: "无菌操作", rarity: "进阶", riskReduce: 0.15, effect: { practice: 3, thinking: 2 }, desc: "有创操作零感染，后续操作风险-15%。" }
      ]
    },

    {
      id: "pediatrics", name: "儿科", code: "儿", sub: "用药折算 · 童趣",
      teacher: "小覃",
      cases: [
        {
          title: "拒输血的患儿", signal: { value: "Hb 52", label: "血红蛋白" },
          tags: ["血液", "信仰"],
          bio: "3 岁，先心术后需要输血。父母是耶和华见证人信徒，攥着「不得输血」的声明，死活不签。孩子脸色越来越白。",
          patient: "（父亲）：「医生，我们信这个。不能输别人的血，求您用别的法子。」",
          mentor: "小覃：「孩子的利益排第一，排到家长信仰前面。这不是商量，是底线。需要授权，就请法院。」",
          system: "提示：真实世界里，有孩子苦等八年才成年自己签字。你这科，有权为孩子争那张床。",
          choices: [
            { text: "用无血替代方案，同时申请法院授权备血", effects: { gpa: 0.1, thinking: 6, practice: 5 }, ethics: 6,
              outcome: "你一边保住孩子，一边把授权令摆到父母面前。思维+6。" },
            { text: "尊重父母，放弃输血", effects: { gpa: 0.05, thinking: -5, practice: -3 }, ethics: -6, harm: true, risk: { chance: 0.4, failEffects: { thinking: -4, practice: -4 }, failText: "孩子心衰那一夜，你守着没敢动。后来输了，但多受了罪。" },
              outcome: "你护了家长的信仰，悬了孩子的命。思维-5。" },
            { text: "拖着等上级决定", effects: { gpa: 0, thinking: -3, practice: -1 }, ethics: -3,
              outcome: "把球踢走，孩子等不起。思维-3。" }
          ]
        },
        {
          title: "反复发热的婴儿", signal: { value: "38.5℃", label: "体温" },
          tags: ["感染", "婴儿"],
          bio: "8 月龄，反复发热两天，精神尚可。是幼儿急疹，还是藏着的细菌感染？",
          patient: "（妈妈）：「大夫，他这么小，会不会烧坏脑子？」",
          mentor: "小覃：「小婴儿不按常理。分层，别一刀切。」",
          system: "提示：把病毒当细菌猛灌抗生素，菌群先乱的是他。",
          choices: [
            { text: "趋势+必要血象分层", effects: { gpa: 0.05, thinking: 5, practice: 3 }, ethics: 3,
              outcome: "小婴儿不按常理，你分层处理了。思维+5。" },
            { text: "一律抗生素压上", effects: { gpa: 0, thinking: -2, practice: 2 }, ethics: -1, risk: { chance: 0.3, failEffects: { thinking: -3, gpa: -0.1 }, failText: "病毒性的也挨了药，菌群乱了。" },
              outcome: "覆盖心态，代价是滥用。专业技能+2。" },
            { text: "让家长物理降温就行", effects: { gpa: 0.05, thinking: -3, practice: -1 }, ethics: -3,
              outcome: "小看婴儿发热，隐患留着。思维-3。" }
          ]
        },
        {
          title: "腹泻脱水的幼童", signal: { value: "囟门凹", label: "体征" },
          tags: ["消化", "补液"],
          bio: "2 岁，腹泻两天、尿少、前囟凹陷。脱水程度决定你是口服还是静脉。",
          patient: "（奶奶）：「不就是拉肚子嘛，挂水多受罪。」",
          mentor: "小覃：「轻中度口服就够，别一见腹泻就扎针。教家长方法，比替他决定强。」",
          system: "提示：止泻不补水，脱水更重。",
          choices: [
            { text: "评估脱水分级+口服补液", effects: { gpa: 0.1, thinking: 5, practice: 4 }, ethics: 3,
              outcome: "轻中度的口服就够，家长学会方法。思维+5。" },
            { text: "直接挂水图快", effects: { gpa: 0, thinking: 1, practice: 3 }, ethics: 0,
              outcome: "快但未必必要，扎针孩子哭惨。专业技能+3。" },
            { text: "禁食止泻等好", effects: { gpa: 0.05, thinking: -3, practice: -1 }, ethics: -3,
              outcome: "止泻不补水，脱水更重。思维-3。" }
          ]
        },
        {
          title: "发育迟缓的男孩", signal: { value: "P3", label: "曲线" },
          tags: ["神经", "评估"],
          bio: "4 岁，说话晚、动作笨，家长被邻居一句话点醒才来。生长曲线卡在 P3。",
          patient: "（妈妈）：「邻居说贵人语迟，可我都等不及了……」",
          mentor: "小覃：「早筛一句，顶后面十年。别用俗语耽误干预窗口。」",
          system: "提示：一句'贵人语迟'，可能耽误的是黄金干预期。",
          choices: [
            { text: "发育筛查+多学科评估", effects: { gpa: 0.1, thinking: 5, practice: 2 }, ethics: 4,
              outcome: "早筛一句顶后面十年。思维+5。" },
            { text: "贵人语迟打发", effects: { gpa: 0.05, thinking: -4, practice: -1 }, ethics: -4,
              outcome: "一句俗语耽误干预窗口。思维-4。" },
            { text: "开补脑保健品", effects: { gpa: 0, thinking: -2, practice: 0 }, ethics: -2,
              outcome: "没诊断就进补，钱白花。思维-2。" }
          ]
        }
      ],
      skills: [
        { id: "ped_dose", name: "用药折算", rarity: "核心", effect: { practice: 6 }, desc: "按体重算量像呼吸一样自然，不慌。专业技能+6。" },
        { id: "ped_curve", name: "生长曲线判读", rarity: "核心", effect: { thinking: 5 }, desc: "一张图看穿趋势异常。临床思维+5。" },
        { id: "ped_fun", name: "童趣沟通", rarity: "进阶", effect: { practice: 4 }, desc: "让孩子不哭、家长听懂。专业技能+4。" }
      ]
    },

    {
      id: "urology", name: "泌尿外科", code: "泌", sub: "男科 · 定位 · 沟通",
      teacher: "程哥",
      cases: [
        {
          title: "拖了两年的难言之隐", signal: { value: "ED", label: "主诉" },
          tags: ["男科", "病耻"],
          bio: "38 岁，第一次出现症状到现在，两年多没敢挂号。今天是被妻子「押」来的。他说「最近就是累」。",
          patient: "「大夫……这事儿，能不走病历吗？我怕碰见熟人。」",
          mentor: "程哥：「他们能扛两年不来看，不是因为不疼，是因为觉得'那地方'丢人。你别跟着躲，大大方方，他才敢说真话。」",
          system: "提示：ED 是全身病的先兆。他躲的每一天，都在错过高血压和糖尿病的早期信号。",
          choices: [
            { text: "正常化疾病，规范评估并查基础病", effects: { gpa: 0.1, thinking: 5, practice: 4 }, ethics: 4,
              outcome: "你一句'这和感冒一样常见'，他肩膀塌了下来。思维+5。" },
            { text: "顺着他含糊带过", effects: { gpa: 0.05, thinking: -3, practice: -1 }, ethics: -3,
              outcome: "你躲了，他也继续躲。思维-3。" },
            { text: "开点'壮阳药'打发", effects: { gpa: 0, thinking: -2, practice: 1 }, ethics: -2, risk: { chance: 0.3, failEffects: { thinking: -3, gpa: -0.1 }, failText: "没查因就壮阳，成分不明的药伤了心血管。" }, harm: true,
              outcome: "对症不对因。专业技能+1。" }
          ]
        },
        {
          title: "阴囊肿痛的青年", signal: { value: "剧痛", label: "急性" },
          tags: ["男科", "急症"],
          bio: "19 岁，睡梦中阴囊剧痛惊醒。是附睾炎，还是每分每秒都贵的睾丸扭转？",
          patient: "「我……我不好意思喊疼，但真的受不了。」",
          mentor: "程哥：「扭转是急诊红线。超过黄金一小时，那一侧就保不住了。」",
          system: "提示：把扭转当炎症消炎，拖过黄金小时，代价不可逆。",
          choices: [
            { text: "查体+超声限时排查", effects: { gpa: 0.1, thinking: 6, practice: 4 }, ethics: 5,
              outcome: "把扭转当急诊红线，抢回一颗。思维+6。" },
            { text: "当炎症先消炎", effects: { gpa: 0.05, thinking: -4, practice: 0 }, ethics: -5, harm: true, risk: { chance: 0.35, failEffects: { thinking: -5, gpa: -0.15 }, failText: "拖过黄金小时，那一侧保不住了。" },
              outcome: "低估急性，代价不可逆。思维-4。" },
            { text: "让他热敷看看", effects: { gpa: 0, thinking: -3, practice: -2 }, ethics: -3, harm: true,
              outcome: "扭转热敷是帮倒忙。思维-3。" }
          ]
        },
        {
          title: "备孕多年的夫妇", signal: { value: "2年", label: "时长" },
          tags: ["男科", "不育"],
          bio: "结婚两年没怀，女方喝了三年中药、查了个遍。男方每次到男科门口就拐弯：「我身体倍儿棒。」",
          patient: "（妻子）：「大夫，他一次都没查过。我……我都快成试管了。」",
          mentor: "程哥：「不育，男的占快一半。让女方一个人背锅，是你这行最老的陋习。先男后女，先简后繁。」",
          system: "提示：真实案例里，女方怀了八次都流，最后是男方精子 DNA 碎片率超标。别让'面子'耽误人。",
          choices: [
            { text: "坚持夫妇同查，先男科评估", effects: { gpa: 0.1, thinking: 5, practice: 4 }, ethics: 5,
              outcome: "你把男方请进诊室。少弱精，真相大白。思维+5。" },
            { text: "只催女方再查", effects: { gpa: 0.05, thinking: -3, practice: -1 }, ethics: -4,
              outcome: "压力全给一方，男方更躲。思维-3。" },
            { text: "乱开补精偏方", effects: { gpa: 0, thinking: -2, practice: 0 }, ethics: -2,
              outcome: "没评估就进补，不对症。思维-2。" }
          ]
        },
        {
          title: "血尿的中年男", signal: { value: "镜下", label: "血尿" },
          tags: ["男科", "鉴别"],
          bio: "45 岁，体检镜下血尿，无痛。是结石、感染，还是更该警惕的那类？",
          patient: "「不疼不痒，应该没事吧？多喝水就行？」",
          mentor: "程哥：「无痛血尿，反而是最该怕的。疼的反而常常没事。」",
          system: "提示：把信号当小事，遗漏的可能是最坏的那种。",
          choices: [
            { text: "影像+膀胱镜分层排查", effects: { gpa: 0.1, thinking: 5, practice: 3 }, ethics: 4,
              outcome: "无痛血尿当红旗，排查到位。思维+5。" },
            { text: "说'多喝水就好'", effects: { gpa: 0.05, thinking: -3, practice: -1 }, ethics: -3,
              outcome: "把信号当小事，遗漏风险。思维-3。" },
            { text: "先开点消炎药", effects: { gpa: 0, thinking: -2, practice: 1 }, ethics: -1, risk: { chance: 0.3, failEffects: { thinking: -3, gpa: -0.1 }, failText: "没定位就抗感染，真因被盖住。" },
              outcome: "对症不对因。专业技能+1。" }
          ]
        }
      ],
      skills: [
        { id: "uro_locate", name: "泌尿系统定位", rarity: "核心", effect: { thinking: 6 }, desc: "上尿路下尿路一张图分清。临床思维+6。" },
        { id: "uro_scope", name: "腔镜手感", rarity: "核心", effect: { practice: 6 }, desc: "镜下操作稳准，台下练出来的。专业技能+6。" },
        { id: "uro_talk", name: "男科沟通", rarity: "进阶", effect: { practice: 4 }, desc: "把最难开口的话题聊成就诊。专业技能+4。" }
      ]
    }
  ];

  /* ---- 外部对话数据并入（depts/*.js 注入 window.YONGYI_DEPTS）----
     每个外部病例只提供 dialogue；其终局 decision 节点的 choices 直接复用病例
     自身的 verbatim 平面 choices（现有 4 例来自本文件原数据，新增第 5 例来自
     外部文件），从而保证六结局计分平衡不被破坏。 ---- */
  if (typeof window !== "undefined" && window.YONGYI_DEPTS) {
    window.YONGYI_DEPTS.forEach(function (nd) {
      var od = null;
      for (var i = 0; i < DEPARTMENTS.length; i++) if (DEPARTMENTS[i].id === nd.id) { od = DEPARTMENTS[i]; break; }
      if (!od) return;
      (nd.cases || []).forEach(function (nc) {
        if (!nc.dialogue) return;
        var existing = null;
        for (var j = 0; j < od.cases.length; j++) if (od.cases[j].title === nc.title) { existing = od.cases[j]; break; }
        if (existing) { existing.dialogue = nc.dialogue; syncDialogueChoices(existing); }
        else { od.cases.push(nc); syncDialogueChoices(nc); }
      });
    });
  }
  function syncDialogueChoices(c) {
    if (!c.dialogue || !c.dialogue.nodes) return;
    for (var k in c.dialogue.nodes) {
      var n = c.dialogue.nodes[k];
      if (n && n.decision && c.choices) n.choices = c.choices;
    }
  }

  /* ---------------- 结局判定 ---------------- */
  // 入参：state.metrics(gpa/thinking/practice) · state.relations · state.ethics · state.harmCount · 已习得技能数
  function determineEnding() {
    var m = state.metrics;
    var et = state.ethics;
    var hc = state.harmCount;
    var owned = state.owned.length;

    // 注：30 病例 + 逐轮计分后，医德量级约 ±200、伤患 0~20，以下阈值已按平衡器重调。
    // 真·觉醒：零伤患 + 医德高 + 全技能（最优解的隐藏结局）
    if (hc === 0 && et >= 100 && owned >= 12) return "hidden";
    // 庸医/事故：伤患过多（≥20 次），或极度无德
    if (hc >= 20 || et <= -160) return "malpractice";
    // 被告/纠纷：有伤患（≥6 次）或医德明显偏低
    if (hc >= 6 || et <= -50) return "lawsuit";
    // 仁心：医德高、基本不伤人
    if (et >= 60 && hc <= 2) return "benevolent";
    // 退场：临床思维被拖垮，明显不足以胜任（仍走完轮转，但选择离开）
    if (m.thinking <= 25) return "burnout";
    // 其余：稳健普通住院医
    return "steady";
  }

  /* ---------------- 状态与存档 ---------------- */
  function freshState() {
    var depts = {};
    DEPARTMENTS.forEach(function (d) {
      depts[d.id] = { progress: 0, drew50: false, drew100: false };
    });
    return {
      metrics: { gpa: 2.1, thinking: 18, practice: 12 },
      exp: 0,
      depts: depts,
      active: DEPARTMENTS[0].id,
      owned: [],
      riskReduce: 0,
      relations: 0,
      ethics: 0,
      harmCount: 0,
      log: [],
      graduated: false,
      endingType: null,
      introShown: false
    };
  }

  var state = loadState();

  function loadState() {
    try {
      var raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return freshState();
      var s = JSON.parse(raw);
      if (!s.metrics) s.metrics = { gpa: 2.1, thinking: 18, practice: 12 };
      if (typeof s.exp !== "number") s.exp = 0;
      if (!s.depts) s.depts = freshState().depts;
      if (!s.owned) s.owned = [];
      if (!s.log) s.log = [];
      if (typeof s.riskReduce !== "number") s.riskReduce = 0;
      if (typeof s.relations !== "number") s.relations = 0;
      if (typeof s.ethics !== "number") s.ethics = 0;
      if (typeof s.harmCount !== "number") s.harmCount = 0;
      if (typeof s.graduated !== "boolean") s.graduated = false;
      if (typeof s.endingType !== "string") s.endingType = null;
      if (typeof s.introShown !== "boolean") s.introShown = false;
      return s;
    } catch (e) {
      return freshState();
    }
  }

  function save() {
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(state)); } catch (e) {}
  }

  function setRotationMapCollapsed(collapsed, persist) {
    var panel = $("department-panel");
    var button = $("map-toggle");
    if (!panel || !button) return;
    panel.classList.toggle("is-collapsed", collapsed);
    button.setAttribute("aria-expanded", String(!collapsed));
    button.setAttribute("aria-label", collapsed ? "展开科室轮转地图" : "收起科室轮转地图");
    button.setAttribute("title", collapsed ? "展开科室轮转地图" : "收起科室轮转地图");
    if (persist) {
      try { localStorage.setItem(MAP_COLLAPSE_KEY, collapsed ? "1" : "0"); } catch (e) {}
    }
  }

  /* ---------------- 工具 ---------------- */
  function $(id) { return document.getElementById(id); }
  // 音频封装：全部对 window.GameAudio 判空，保证无音频环境下（如 node 平衡器）零影响。
  function sfx(name, opts) { if (window.GameAudio) window.GameAudio.trigger(name, opts); }
  function amb(t, m, d) { if (window.GameAudio) { if (t != null) window.GameAudio.setTension(t); if (m) window.GameAudio.setMode(m); if (d) window.GameAudio.setDept(d); } }
  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
  function deptById(id) { for (var i = 0; i < DEPARTMENTS.length; i++) if (DEPARTMENTS[i].id === id) return DEPARTMENTS[i]; return null; }
  function skillById(id) { for (var i = 0; i < DEPARTMENTS.length; i++) { var s = DEPARTMENTS[i].skills; for (var j = 0; j < s.length; j++) if (s[j].id === id) return s[j]; } return null; }
  function deptTotal(d) { return d.cases.length; }
  function threshold50(d) { return Math.floor(deptTotal(d) / 2); }
  function threshold100(d) { return deptTotal(d); }

  /* ---- 确定性打乱：同一病例/对话节点每次刷新顺序一致 ---- */
  function seededShuffle(arr, seed) {
    /* 简单字符串哈希 → 初始种子 */
    var h = 0;
    for (var si = 0; si < (seed || "").length; si++) {
      h = ((h << 5) - h + seed.charCodeAt(si)) | 0;
    }
    var rng = function () { h = (h * 1664525 + 1013904223) | 0; return (h >>> 0) / 4294967296; };
    var out = arr.slice();
    for (var i = out.length - 1; i > 0; i--) {
      var j = Math.floor(rng() * (i + 1));
      if (j !== i) { var tmp = out[i]; out[i] = out[j]; out[j] = tmp; }
    }
    return out;
  }

  function effectText(eff) {
    var parts = [];
    if (eff.gpa) parts.push("绩点" + (eff.gpa > 0 ? "+" : "") + eff.gpa.toFixed(2).replace(/0$/, ""));
    if (eff.thinking) parts.push("思维" + (eff.thinking > 0 ? "+" : "") + eff.thinking);
    if (eff.practice) parts.push("专业技能" + (eff.practice > 0 ? "+" : "") + eff.practice);
    if (eff.relations) parts.push("人情世故" + (eff.relations > 0 ? "+" : "") + eff.relations);
    return parts.join(" · ");
  }

  /* 返回带 up/down 颜色类的 HTML，用于点击后弹跳显示 */
  function effectHtml(eff, ethics, risk, harm, correct) {
    var parts = [];
    function mk(label, val) {
      var cls = val > 0 ? "up" : "down";
      return '<span class="' + cls + '">' + label + (val > 0 ? "+" : "") + val + '</span>';
    }
    if (eff.gpa) parts.push(mk("绩点", parseFloat(eff.gpa.toFixed(2))));
    if (eff.thinking) parts.push(mk("思维", eff.thinking));
    if (eff.practice) parts.push(mk("专业技能", eff.practice));
    if (eff.relations) parts.push(mk("人情世故", eff.relations));
    if (correct) parts.push('<span class="up">✓答对 · 绩点+' + CORRECT_GPA.toFixed(2) + '</span>');
    if (ethics) parts.push(mk("医德", ethics));
    if (risk) parts.push('<span style="color:var(--accent)">⚠风险</span>');
    if (harm) parts.push('<span class="down">✖伤患</span>');
    return parts.join(" ");
  }

  function nowLabel() {
    var t = new Date();
    return ("0" + t.getHours()).slice(-2) + ":" + ("0" + t.getMinutes()).slice(-2);
  }

  function logMsg(deptName, text) {
    state.log.unshift({ time: nowLabel(), dept: deptName, text: text });
    if (state.log.length > 40) state.log.length = 40;
  }

  var toastTimer = null;
  function toast(msg) {
    var el = $("toast");
    if (!el) return;
    el.textContent = msg;
    el.classList.add("is-visible");
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.classList.remove("is-visible"); }, 2400);
  }

  /* ---------------- 技能图标 / 稀有度（背包用） ---------------- */
  var SKILL_ICON = {
    int_ddx: "🧩", int_hx: "📋", int_rx: "💊",
    surg_aseptic: "🧤", surg_anat: "🗺️", surg_hemostasis: "🩸",
    er_triage: "📟", er_airway: "🫁", er_steady: "🛡️",
    ob_alert: "🚨", ob_empathy: "💗", ob_aseptic: "🧼",
    ped_dose: "⚖️", ped_curve: "📈", ped_fun: "🧸",
    uro_locate: "📍", uro_scope: "🔬", uro_talk: "💬"
  };
  function skillTier(sk) { return sk.rarity === "核心" ? "SSR" : "R"; }

  /* ---------------- 渲染 ---------------- */
  function renderStats() {
    var m = state.metrics;
    m.gpa = clamp(m.gpa, 0, 4);
    m.thinking = clamp(m.thinking, 0, 100);
    m.practice = clamp(m.practice, 0, 100);

    // 经验 EXP：病历推进积累，条子显示「本级内」进度（每 EXP_PER_LEVEL 升一级）
    setBar("exp-bar", (state.exp % EXP_PER_LEVEL) / EXP_PER_LEVEL * 100);
    setText("hud-exp-val", state.exp);

    // 绩点 GPA：答对专业知识选项时升高，封顶 4.0
    setBar("gpa-bar", m.gpa / 4 * 100);
    setText("hud-gpa-val", m.gpa.toFixed(2) + " / 4.0");

    // 能力条：临床思维 / 专业技能
    setBar("thinking-bar", m.thinking);
    setText("thinking-value", Math.round(m.thinking));
    setBar("practice-bar", m.practice);
    setText("practice-value", Math.round(m.practice));

    // 人情世故：关系协调与组织生存能力，独立于医德和觉醒分。
    var relationsPct = clamp(50 + state.relations / 4, 0, 100);
    setBar("relations-bar", relationsPct);
    setText("relations-value", Math.round(relationsPct));

    // 医德条：累计医德归一到 0-100（50 为中性）
    var ethicPct = clamp(50 + state.ethics, 0, 100);
    setBar("ethic-bar", ethicPct);
    setText("ethic-value", Math.round(ethicPct));

    // 状态 VIT（体力/医德精神）：伤患越多、医德越低，条越空 —— 像 HP 一样可见
    var vit = clamp(Math.round(50 + state.ethics * 0.7 - state.harmCount * 9), 4, 100);
    setBar("vit-bar", vit);
    setText("hud-vit-val", vit);

    // 等级 LV：由经验值驱动（每 EXP_PER_LEVEL 经验升一级）
    var lv = 1 + Math.floor(state.exp / EXP_PER_LEVEL);
    setText("hud-lv", lv);
    setText("hud-own", state.owned.length);
    setText("relations-val", (state.relations > 0 ? "+" : "") + Math.round(state.relations));
    setText("ethic-val", (state.ethics > 0 ? "+" : "") + state.ethics);
    setText("harm-val", state.harmCount);
    setText("harm-foot-val", state.harmCount);

    // 复合觉醒分（实时）：每次选择后随三核心 + 医德 + 伤患刷新
    var sc = computeScore(state);
    setText("awaken-score", sc);
    var t = scoreTier(sc);
    var tEl = $("awaken-tier");
    if (tEl) { tEl.textContent = t.grade + " · " + t.label; tEl.className = "hud-score-tier tier-" + t.accent; }
  }
  function setBar(id, pct) { var el = $(id); if (el) el.style.width = clamp(pct, 0, 100) + "%"; }
  function setText(id, t) { var el = $(id); if (el) el.textContent = t; }

  /* ---------------- 复合觉醒分（平衡模拟器 balance_sim.js 同源公式） ----------------
     设计主轴：医德权重最高（0.46），临床思维/专业技能各 0.22，绩点 0.10，每名伤患 -2。
     详见 balance/report.md */
  function computeScore(s) {
    var m = s.metrics;
    var Tn = clamp(m.thinking, 0, 100) / 100;
    var Pn = clamp(m.practice, 0, 100) / 100;
    var Gn = clamp(m.gpa, 0, 4) / 4;
    var En = 0.5 + 0.5 * Math.tanh(s.ethics / 120);
    var harmPen = s.harmCount * 2.0;
    var raw = 100 * (0.22 * Tn + 0.22 * Pn + 0.10 * Gn + 0.46 * En) - harmPen;
    return clamp(Math.round(raw), 0, 100);
  }
  function scoreTier(score) {
    if (score >= 90) return { grade: "S", label: "觉醒", accent: "gold" };
    if (score >= 75) return { grade: "A", label: "仁心良医", accent: "green" };
    if (score >= 60) return { grade: "B", label: "稳健住院医", accent: "blue" };
    if (score >= 45) return { grade: "C", label: "尚需历练", accent: "amber" };
    if (score >= 30) return { grade: "D", label: "医患裂痕", accent: "red" };
    return { grade: "E", label: "庸医事故", accent: "red" };
  }

  function renderDepartments() {
    var list = $("department-list");
    list.innerHTML = "";
    var done = 0;
    DEPARTMENTS.forEach(function (d) {
      var st = state.depts[d.id];
      var total = deptTotal(d);
      var pct = Math.round(st.progress / total * 100);
      if (st.progress >= total) done++;
      var item = document.createElement("button");
      item.className = "department-item" + (state.active === d.id ? " is-active" : "");
      item.type = "button";
      item.innerHTML =
        '<span class="department-code">' + d.code + '</span>' +
        '<span><span class="department-name">' + d.name + '</span>' +
        '<span class="department-sub">' + d.sub + '</span></span>' +
        '<span class="department-progress"><strong>' + pct + '%</strong>' +
        '<span class="mini-bar"><span style="width:' + pct + '%"></span></span></span>';
      item.addEventListener("click", function () { switchDept(d.id); });
      list.appendChild(item);
    });
    $("map-count").textContent = done + " / " + DEPARTMENTS.length;
  }

  function renderPatient() {
    var d = deptById(state.active);
    var st = state.depts[d.id];
    var total = deptTotal(d);
    $("patient-index").textContent = "03 // LIVE CASE · " + d.name;
    leaveCaseView();

    if (state.graduated) {
      renderEnding();
      return;
    }

    if (st.progress >= total) {
      $("patient-title").textContent = d.name + " · 轮转完成";
      $("case-status-text").textContent = "轮转完成";
      $("case-counter").textContent = "DONE / " + total;
      $("patient-body").innerHTML =
        '<div class="patient-bio"><h4>这一科，你走过来了。</h4>' +
        '<p>六科室各自独立进度，50% 与 100% 时你都抽走了一项核心技能。' +
        '切换到其他尚未完成的科室继续轮转；全部完成即触发结业。</p></div>';
      var _cp = document.querySelector("#patient-body .patient-bio p");
      if (_cp && window.Cinematics) window.Cinematics.typewrite(_cp, _cp.textContent, { speed: 16 });
      $("choice-list").innerHTML =
        '<button class="choice-button" type="button" id="next-dept-btn">' +
        '<span class="choice-letter">→</span><span>前往下一个未完成科室</span><span class="choice-effect">继续</span></button>';
      var nb = $("next-dept-btn");
      if (nb) nb.addEventListener("click", gotoNextIncomplete);
      renderMission();
      return;
    }

    var c = d.cases[st.progress];
    $("patient-title").textContent = c.title;
    $("case-status-text").textContent = "接诊中";
    $("case-counter").textContent = "CASE " + ("0" + (st.progress + 1)).slice(-2) + " / " + ("0" + total).slice(-2);

    if (c.dialogue) { startDialogue(d, c); return; }

    var tags = (c.tags || []).map(function (t) { return '<span class="patient-tag">' + t + '</span>'; }).join("");
    var quote = c.patient ? '<blockquote class="pt-quote">' + c.patient + '</blockquote>' : "";
    var sys = c.system ? '<p class="pt-system"><span>系统</span>' + c.system + '</p>' : "";
    var mentor = c.mentor ? '<p class="pt-mentor"><span>' + (d.teacher || "带教") + '</span>' + c.mentor.replace(/^[^：：]+[：:]/, "") + '</p>' : "";

    $("patient-body").innerHTML =
      '<div class="patient-bio"><h4>' + c.title + '</h4>' +
      '<p>' + c.bio + '</p>' +
      quote +
      '<div class="patient-tags">' + tags + '</div></div>' +
      '<div class="patient-signal"><strong>' + c.signal.value + '</strong><span>' + c.signal.label + '</span></div>' +
      sys + mentor;

    var _bp = document.querySelector("#patient-body .patient-bio p");
    if (_bp && window.Cinematics) window.Cinematics.typewrite(_bp, _bp.textContent, { speed: 18 });

    renderChoices(d, c);
    renderMission();
  }

  function renderChoices(d, c) {
    var list = $("choice-list");
    list.innerHTML = "";
    list.classList.remove("is-locked"); /* 重置上一次点击的锁定 */
    var letters = ["A", "B", "C", "D", "E"];
    /* 确定性打乱：同一病例每次顺序一致，但打破"A=好/B=差"规律 */
    var shuffled = seededShuffle(c.choices, d.id + "_c" + c.index);
    shuffled.forEach(function (ch, i) {
      var visibleEffects = derivedChoiceEffects(ch);
      var eff = effectText(visibleEffects);
      if (ch.risk) eff += " ⚠风险";
      if (ch.harm) eff += " ✖伤患";
      /* 预构建带颜色的 HTML 版，点击时直接注入 */
      var effHtml = effectHtml(visibleEffects, ch.ethics || 0, ch.risk, ch.harm, ch.correct);
      var btn = document.createElement("button");
      btn.className = "choice-button";
      btn.type = "button";
      btn.dataset.effect = eff || "";
      btn.dataset.effectHtml = effHtml;
      btn.innerHTML =
        '<span class="choice-letter">' + letters[i] + '</span>' +
        '<span>' + ch.text + '</span>' +
        '<span class="choice-effect"></span>';
      btn.addEventListener("click", function () {
        /* 已锁定则忽略（防重复点击） */
        if (list.classList.contains("is-locked")) return;
        list.classList.add("is-locked");
        this.classList.add("is-chosen");
        /* 点击后：分值以弹跳动画在选项右侧跳出 */
        var ef = this.querySelector(".choice-effect");
        if (ef && this.dataset.effectHtml) {
          ef.innerHTML = this.dataset.effectHtml;
          /* 移除旧动画类（允许重新触发）再添加 */
          ef.classList.remove("is-revealed");
          void ef.offsetWidth; /* 强制 reflow，重启动画 */
          ef.classList.add("is-revealed");
        }
        /* 延迟推进：让弹跳动画播完（约 700ms）再进入下一例 */
        var picked = ch;
        setTimeout(function () { chooseChoice(d, c, picked); }, 700);
      });
      list.appendChild(btn);
    });
    var hasRisk = c.choices.some(function (x) { return x.risk; });
    amb(hasRisk ? 0.6 : 0.25, hasRisk ? "tense" : "calm", state.active);
  }

  function renderSkills() {
    var list = $("skill-list");
    if (!list) return;
    list.innerHTML = "";
    $("skill-count").textContent = state.owned.length + " 项";
    if (!state.owned.length) {
      list.innerHTML =
        '<div class="inv-slot is-empty"></div><div class="inv-slot is-empty"></div>' +
        '<div class="inv-slot is-empty"></div><div class="inv-slot is-empty"></div>';
      return;
    }
    state.owned.forEach(function (id) {
      var sk = skillById(id);
      if (!sk) return;
      var tier = skillTier(sk);
      var slot = document.createElement("button");
      slot.type = "button";
      slot.className = "inv-slot filled rarity-" + tier;
      slot.setAttribute("aria-label", sk.name);
      slot.innerHTML =
        '<span class="inv-tier">' + tier + '</span>' +
        '<span class="inv-icon">' + (SKILL_ICON[sk.id] || "✚") + '</span>';
      slot.addEventListener("click", function () { openBackpack("owned"); });
      list.appendChild(slot);
    });
  }

  /* ---------------- 技能背包弹窗（二次元背包 / 图鉴） ---------------- */
  function openBackpack(tab) {
    tab = tab || "owned";
    setBpTab(tab);
    renderBackpack(tab);
    var m = $("backpack-modal");
    if (m) { m.classList.add("is-open"); m.setAttribute("aria-hidden", "false"); }
    if (window.GameAudio) sfx("page_turn");
  }
  function closeBackpack() {
    var m = $("backpack-modal");
    if (m) { m.classList.remove("is-open"); m.setAttribute("aria-hidden", "true"); }
  }
  function setBpTab(tab) {
    var tabs = document.querySelectorAll("#bp-tabs .bp-tab");
    tabs.forEach && tabs.forEach(function (t) { t.classList.toggle("is-active", t.getAttribute("data-tab") === tab); });
  }
  function renderBackpack(tab) {
    var grid = $("backpack-grid");
    if (!grid) return;
    grid.innerHTML = "";
    var ownedSet = {};
    state.owned.forEach(function (id) { ownedSet[id] = true; });

    if (tab === "owned") {
      if (!state.owned.length) {
        grid.innerHTML = '<div class="empty-state">背包空空如也。<br>轮转进度达 50% / 100% 时，抽取科室核心技能即可放入背包。</div>';
        return;
      }
      state.owned.forEach(function (id) { grid.appendChild(buildBpCard(skillById(id), true)); });
    } else {
      DEPARTMENTS.forEach(function (d) {
        d.skills.forEach(function (sk) { grid.appendChild(buildBpCard(sk, ownedSet[sk.id], d.name)); });
      });
    }
    if (window.Cinematics) window.Cinematics.refresh();
  }
  function buildBpCard(sk, owned, deptName) {
    var tier = skillTier(sk);
    var card = document.createElement("div");
    card.className = "bp-card rarity-" + tier + (owned ? " is-owned" : " is-locked");
    var gain = effectText(sk.effect);
    if (sk.riskReduce) gain += " · 风险-" + Math.round(sk.riskReduce * 100) + "%";
    card.innerHTML =
      '<span class="bp-card-tier">' + tier + '</span>' +
      '<div class="bp-card-icon">' + (SKILL_ICON[sk.id] || "✚") + '</div>' +
      '<h4>' + (owned ? sk.name : "？？？") + '</h4>' +
      '<p>' + (owned ? sk.desc : "尚未习得 · 完成对应科室轮转抽取以解锁") + '</p>' +
      '<span class="bp-card-origin">' + (deptName || deptById(skillDept(sk.id)).name) + '</span>';
    return card;
  }

  function skillDept(skillId) {
    for (var i = 0; i < DEPARTMENTS.length; i++) {
      var s = DEPARTMENTS[i].skills;
      for (var j = 0; j < s.length; j++) if (s[j].id === skillId) return DEPARTMENTS[i].id;
    }
    return DEPARTMENTS[0].id;
  }

  function renderLog() {
    var list = $("log-list");
    list.innerHTML = "";
    if (!state.log.length) {
      list.innerHTML = '<div class="log-item"><span class="log-time">--:--</span><div>系统待机，等待第一次脑内接诊。</div></div>';
      return;
    }
    state.log.forEach(function (e) {
      var item = document.createElement("div");
      item.className = "log-item";
      item.innerHTML = '<span class="log-time">' + e.time + '</span><div><strong>' + e.dept + '</strong> ' + e.text + '</div>';
      list.appendChild(item);
    });
  }

  function renderMission() {
    var d = deptById(state.active);
    var st = state.depts[d.id];
    var total = deptTotal(d);
    if (state.graduated) { $("mission-text").textContent = "六科室轮转完成 · 庸医觉醒系统结业"; return; }
    $("mission-text").textContent = "脑内轮转中 · " + d.name + " " + st.progress + "/" + total;
  }

  function renderEnding() {
    var e = ENDINGS[state.endingType] || ENDINGS.steady;
    if (window.Cinematics) window.Cinematics.climax("ending", { title: e.title, accent: e.accent, type: e.type });
    if (window.GameAudio) { window.GameAudio.stopMusic(); amb(1, "climax"); sfx("ending_" + e.type); }
    $("patient-title").textContent = "结局 · " + e.title;
    $("case-status-text").textContent = "轮转完成";
    $("case-counter").textContent = "ENDING";
    var sc = computeScore(state);
    var t = scoreTier(sc);
    $("patient-body").innerHTML =
      '<div class="patient-bio ending-block ending-' + e.accent + '"><h4>' + e.title + '</h4>' +
      '<p>' + e.body.replace(/\n/g, "</p><p>") + '</p>' +
      '<div class="ending-score ending-score-' + t.accent + '">' +
        '<span class="ending-score-label">觉醒分</span>' +
        '<b class="ending-score-num">' + sc + '</b>' +
        '<span class="ending-score-tier">' + t.grade + ' · ' + t.label + '</span>' +
      '</div>' +
      '<p class="ending-foot">〔本作为虚构游戏，所有病例改编自真实事件，不构成医疗建议。〕</p></div>';
    $("choice-list").innerHTML =
      '<button class="choice-button" type="button" id="restart-btn">' +
      '<span class="choice-letter">↺</span><span>重置人生，再轮转一次</span><span class="choice-effect">重来</span></button>';
    var rb = $("restart-btn");
    if (rb) rb.addEventListener("click", resetGame);
  }

  function renderAll() {
    renderStats();
    renderDepartments();
    renderPatient();
    renderSkills();
    renderLog();
  }

  /* ---------------- 行为 ---------------- */
  function switchDept(id) {
    if (state.active === id) return;
    state.active = id;
    dlg = null;
    save();
    renderDepartments();
    renderPatient();
    if (window.GameAudio) { sfx("page_turn"); amb(0.25, "calm", id); }
  }

  function gotoNextIncomplete() {
    for (var i = 0; i < DEPARTMENTS.length; i++) {
      if (state.depts[DEPARTMENTS[i].id].progress < deptTotal(DEPARTMENTS[i])) {
        state.active = DEPARTMENTS[i].id;
        save();
        renderDepartments();
        renderPatient();
        if (window.GameAudio) { sfx("page_turn"); amb(0.25, "calm", state.active); }
        return;
      }
    }
    toast("所有科室均已轮转完成");
  }

  function inferRelationsEffect(ch) {
    if (typeof ch.relations === "number") return ch.relations;
    var text = ch.text || "";
    var collaborative = /一起|共同|商量|沟通|解释|说明|共情|安抚|陪|倾听|听他|听她|平视|握.{0,2}手|稳住|协调/;
    var abrasive = /冷笑|讽刺|反问|训|压他|压她|只搬法条|报警|叫保安|强制|不沟通|当场揭|直接拒绝/;
    var accommodating = /顺着|配合|按上级|听家属|等家属|含糊|点头|默默|先等等|观察再说/;
    var avoidant = /打发|拖着|装没|假装|不接话|愣着|躲|退到门边|不管|走开/;
    if (abrasive.test(text)) return -2;
    if (collaborative.test(text)) return 2;
    if (accommodating.test(text)) return 2;
    if (avoidant.test(text)) return -1;
    return 0;
  }

  function derivedChoiceEffects(ch) {
    var effects = {};
    var source = ch.effects || {};
    if (source.gpa) effects.gpa = source.gpa;
    if (source.thinking) effects.thinking = source.thinking;
    if (source.practice) effects.practice = source.practice;

    var ethics = ch.ethics || 0;
    if (!ch.effects) {
      // 普通对话不再按医德推导临床能力；只有病例显式 effects / correct 才代表医学判断。
      if (ethics === 0) effects.practice = 1;
    }

    effects.relations = inferRelationsEffect(ch);

    var values = [effects.gpa || 0, effects.thinking || 0, effects.practice || 0, effects.relations || 0, ethics, ch.correct ? CORRECT_GPA : 0];
    var hasGain = values.some(function (value) { return value > 0; });
    var hasCost = values.some(function (value) { return value < 0; });

    // 全负选项补“短期好办事”的关系收益；全正选项补时间/考试机会成本或关系摩擦。
    if (!hasGain) {
      if (effects.relations < 0) effects.practice = 1;
      else effects.relations = Math.max(1, effects.relations || 0);
    }
    if (!hasCost) {
      if (effects.relations > 0 && ch.effects) effects.gpa = -0.05;
      else if (effects.relations > 0) effects.practice = -0.25;
      else effects.relations = -1;
    }
    return effects;
  }

  function applyChoiceEffects(ch) {
    var m = state.metrics;
    var effects = derivedChoiceEffects(ch);
    if (effects.gpa) m.gpa += effects.gpa;
    if (effects.thinking) m.thinking += effects.thinking;
    if (effects.practice) m.practice += effects.practice;
    if (effects.relations) state.relations += effects.relations;
    if (ch.ethics) state.ethics += ch.ethics;
    if (ch.harm) state.harmCount += 1;
    // 专业知识答对（correct:true）→ 绩点加成：与医德/三核心推导解耦，单独奖励专业判断力。
    // 字面量 0.05 与顶部 CORRECT_GPA 保持同步（balance_sim.js 逐字节抽取本函数）。
    if (ch.correct) m.gpa += 0.05;
  }

  function finalizeCase(d, c, ch, msg, failed) {
    var st = state.depts[d.id];
    st.progress += 1;
    state.exp += EXP_PER_CASE; // 病历推进（完成一例接诊）→ 经验值增加
    renderStats();
    renderDepartments();
    var pending = null;
    if (st.progress === threshold50(d) && !st.drew50) { st.drew50 = true; pending = { deptId: d.id, at: "50%" }; }
    else if (st.progress === threshold100(d) && !st.drew100) { st.drew100 = true; pending = { deptId: d.id, at: "100%" }; }
    save();
    if (pending) {
      openSkillModal(pending);
    } else {
      renderPatient();
      if (window.GameAudio && !state.graduated) sfx("case_open");
      checkGraduate();
    }
  }

  function chooseChoice(d, c, ch) {
    applyChoiceEffects(ch);
    var m = state.metrics;
    var msg = ch.outcome;
    var failed = false;
    if (ch.risk) {
      var chance = clamp(ch.risk.chance - state.riskReduce, 0.05, 1);
      if (Math.random() < chance) {
        if (ch.risk.failEffects.gpa) m.gpa += ch.risk.failEffects.gpa;
        if (ch.risk.failEffects.thinking) m.thinking += ch.risk.failEffects.thinking;
        if (ch.risk.failEffects.practice) m.practice += ch.risk.failEffects.practice;
        state.harmCount += 1;
        failed = true;
        msg = ch.risk.failText;
      }
    }
    logMsg(d.name, msg);
    /* ★ 先推进游戏状态（进度+1、存档、渲染下一例），
       再做音效/动画等副作用。这样即使副作用抛异常，
       核心游戏逻辑不受影响，不会卡住。 */
    finalizeCase(d, c, ch, msg, failed);
    /* ---- 以下为纯装饰性副作用，全部 try-catch 兜底 ---- */
    try {
      if (window.GameAudio) {
        if (ch.harm) sfx("twist");
        else if (failed) sfx("harm");
        else if (ch.risk) sfx("risk_reveal");
        else sfx("choice");
        if (ch.ethics > 0 && !ch.harm && !failed) sfx("mood_hope");
        else if (ch.harm || failed || (ch.effects && ch.effects.thinking < 0 && ch.effects.practice < 0)) sfx("mood_low");
      }
    } catch (_) { /* 音效失败不阻塞游戏 */ }
    try {
      if (window.Cinematics && (ch.harm || failed)) {
        var twText = ch.harm ? (ch.outcome || "") : (failed ? ch.risk.failText : "");
        window.Cinematics.twist(twText);
      }
    } catch (_) { /* 动画失败不阻塞游戏 */ }
  }

  /* ---------------- 分支对话引擎（Branching Dialogue） ---------------- */
  // 每个 case 可选 `dialogue: { start, nodes }`。node 字段：
  //   who: patient|family|mentor|system|self|narrator
  //   text: 说话内容
  //   next: 下个节点 id（仅叙述/继续节点）
  //   choices: [{ text, next?, effects?, ethics?, harm?, risk?, decision?, outcome? }]
  //   decision:true 的节点其 choices 即临床/伦理终局决策（复用 chooseChoice 计分）
  var dlg = null;

  function startDialogue(d, c) {
    dlg = { d: d, c: c, nodeId: c.dialogue.start, round: 0, flags: {} };
    amb(0.3, "calm", d.id);
    var panel = $("patient-panel");
    if (panel) panel.classList.add("is-in-case");
    renderDialogue();
  }

  function leaveCaseView() {
    var panel = $("patient-panel");
    if (panel) panel.classList.remove("is-in-case");
  }

  function dlgSpeakerName(who) {
    switch (who) {
      case "patient": return dlg.c.patientName || "患者";
      case "family": return "家属";
      case "mentor": return dlg.d.teacher || "带教";
      case "system": return "系统";
      case "self": return "林一通";
      case "narrator": return "";
      default: return who || "";
    }
  }

  function renderDialogue() {
    var c = dlg.c, d = dlg.d;
    var total = deptTotal(d);
    var st = state.depts[d.id];
    $("patient-index").textContent = "问诊中 · " + d.name + " · 第 " + (dlg.round + 1) + " 轮";
    // 顶部 #patient-title 留空（案例标题只在下方的病历轮 narrator 行出现一次）
    $("patient-title").textContent = "";
    $("case-status-text").textContent = "接诊中";
    $("case-counter").textContent = "CASE " + ("0" + (st.progress + 1)).slice(-2) + " / " + ("0" + total).slice(-2);

    var node = dlg.c.dialogue.nodes[dlg.nodeId];
    var who = node.who || "patient";
    var name = dlgSpeakerName(who);
    var cls = "dlg-line dlg-" + who;

    var roundPct = Math.min(100, Math.round(dlg.round / 10 * 100));
    var roundBar =
      '<div class="dlg-round"><span>问诊进度 · 第 ' + (dlg.round + 1) + ' 轮</span>' +
      '<span class="dlg-track"><span style="width:' + roundPct + '%"></span></span></div>';

    // 病历轮：把 bio 转成 narrator 对话轮，下沉到对话流第一行（替代之前叠在场景图上的小字）
    // 第一行整合「科室 · 带教 · 案例标题」——所有元信息都以文字呈现，不再单独起 box
    var bioRound = dlg.round === 0
      ? '<div class="dlg-line dlg-narrator dlg-bio-round">' +
          '<div class="bio-round-title">' +
            '<span class="bio-round-tag">病历 · CASE FILE</span>' +
            '<span class="bio-round-meta">' + d.name + ' · ' + (d.teacher || '带教老师') + '</span>' +
          '</div>' +
          '<div class="bio-round-name">' + c.title + '</div>' +
          '<p class="dlg-text">' + c.bio + '</p></div>'
      : '';

    var lineText = node.text;
    if (name) {
      var _ne = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      var _re = new RegExp("^\\s*" + _ne + "\\s*[:：]\\s*「([\\s\\S]+)」\\s*$");
      var _m = lineText.match(_re);
      if (_m) lineText = _m[1];
    }
    var lineHtml =
      '<div class="' + cls + '">' +
      (name ? '<span class="dlg-speaker">' + name + '</span>' : '') +
      '<p class="dlg-text">' + lineText + '</p></div>';

    // 单列：对话流直接占满整个 patient-body。带教/科室信息已在 bioRound 与 dlg-speaker 中以文字呈现。
    $("patient-body").innerHTML =
      '<div class="dlg-stack">' + roundBar + bioRound + lineHtml + '</div>';

    var _dt = document.querySelector("#patient-body .dlg-line:not(.dlg-bio-round) .dlg-text");
    if (_dt && window.Cinematics) window.Cinematics.typewrite(_dt, _dt.textContent, { speed: 18 });

    var list = $("choice-list");
    list.innerHTML = "";
    list.classList.remove("is-locked"); /* 重置上一次点击的锁定 */
    if (node.choices && node.choices.length) {
      var letters = ["A", "B", "C", "D", "E"];
      /* 对话选项也打乱：用科室+病例+节点+轮次做种子 */
      var dlgSeed = (dlg.d ? dlg.d.id : "") + "_c" + (dlg.c ? dlg.c.index : "") + "_n" + (node.id || "") + "_r" + (dlg.round || 0);
      var shuffled = seededShuffle(node.choices, dlgSeed);
      shuffled.forEach(function (ch, i) {
        var visibleEffects = derivedChoiceEffects(ch);
        var eff = effectText(visibleEffects);
        if (ch.ethics) eff += (eff ? " · " : "") + "医德" + (ch.ethics > 0 ? "+" : "") + ch.ethics;
        if (ch.risk) eff += " ⚠风险";
        if (ch.harm) eff += " ✖伤患";
        var effHtml = effectHtml(visibleEffects, ch.ethics || 0, ch.risk, ch.harm, ch.correct);
        var btn = document.createElement("button");
        btn.className = "choice-button";
        btn.type = "button";
        btn.dataset.effect = eff || "";
        btn.dataset.effectHtml = effHtml;
        btn.innerHTML =
          '<span class="choice-letter">' + letters[i] + '</span>' +
          '<span>' + ch.text + '</span>' +
          '<span class="choice-effect"></span>';
        btn.addEventListener("click", function () {
          if (list.classList.contains("is-locked")) return;
          list.classList.add("is-locked");
          this.classList.add("is-chosen");
          var ef = this.querySelector(".choice-effect");
          if (ef && this.dataset.effectHtml) {
            ef.innerHTML = this.dataset.effectHtml;
            ef.classList.remove("is-revealed");
            void ef.offsetWidth;
            ef.classList.add("is-revealed");
          }
          var picked = ch;
          setTimeout(function () { onDlgChoice(picked); }, 700);
        });
        list.appendChild(btn);
      });
      if (node.decision) amb(0.7, "tense", d.id);
    } else {
      var cont = document.createElement("button");
      cont.className = "choice-button choice-continue";
      cont.type = "button";
      cont.innerHTML = '<span class="choice-letter">›</span><span>继续</span><span class="choice-effect">第 ' + (dlg.round + 2) + ' 轮</span>';
      cont.addEventListener("click", function () { onDlgContinue(); });
      list.appendChild(cont);
    }
  }

  function onDlgContinue() {
    dlg.round += 1;
    var node = dlg.c.dialogue.nodes[dlg.nodeId];
    if (node.next) { dlg.nodeId = node.next; renderDialogue(); }
  }

  function onDlgChoice(ch) {
    var node = dlg.c.dialogue.nodes[dlg.nodeId];
    var isDecision = !!(ch.decision || (node && node.decision));
    dlg.round += 1;
    if (!isDecision) {
      applyChoiceEffects(ch);
      renderStats();
      if (ch.correct && window.GameAudio) sfx("mood_hope"); // 答对专业知识：轻快反馈
    }
    if (ch.next) { dlg.nodeId = ch.next; renderDialogue(); return; }
    if (isDecision) {
      var decisionDept = dlg.d;
      var decisionCase = dlg.c;
      // 先结束旧病例对话；chooseChoice 会同步渲染并初始化下一病例的对话状态。
      dlg = null;
      chooseChoice(decisionDept, decisionCase, ch);
      return;
    }
    onDlgContinue();
  }

  function checkGraduate() {
    var all = DEPARTMENTS.every(function (d) { return state.depts[d.id].progress >= deptTotal(d); });
    if (all && !state.graduated) {
      state.graduated = true;
      state.endingType = determineEnding();
      save();
      renderMission();
      logMsg("系统", "六科室轮转全部完成——" + (ENDINGS[state.endingType] || ENDINGS.steady).title);
      toast("结局 · " + (ENDINGS[state.endingType] || ENDINGS.steady).title);
      renderPatient();
    }
  }

  /* ---------------- 技能抽取弹窗 ---------------- */
  var pendingDraw = null;
  var lastCandidates = [];
  var drawLock = false;

  function openSkillModal(pending) {
    pendingDraw = pending;
    var d = deptById(pending.deptId);
    var pool = d.skills.filter(function (s) { return state.owned.indexOf(s.id) < 0; });
    if (pool.length === 0) {
      pendingDraw = null;
      logMsg(d.name, "该科室核心技能已全部习得。");
      renderPatient();
      checkGraduate();
      return;
    }
    var shuffled = pool.slice();
    if (window.Cinematics) window.Cinematics.climax("draw", { dept: d.name, at: pending.at });
    for (var i = shuffled.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = shuffled[i]; shuffled[i] = shuffled[j]; shuffled[j] = t;
    }
    var cand = shuffled.slice(0, Math.min(3, shuffled.length));
    lastCandidates = cand;

    $("draw-threshold").textContent = "ROTATION " + pending.at;
    $("modal-title").textContent = (pending.at === "50%" ? "半程觉醒" : "全程结业") + "：抽取" + d.name + "核心技能";
    $("modal-description").textContent = "系统在该科室扫描到可植入的临床能力，请选择一项永久习得。";

    var cl = $("candidate-list");
    cl.innerHTML = "";
    cand.forEach(function (sk) {
      var gain = effectText(sk.effect);
      if (sk.riskReduce) gain += " · 风险-" + Math.round(sk.riskReduce * 100) + "%";
      var btn = document.createElement("button");
      btn.className = "candidate-button";
      btn.type = "button";
      btn.innerHTML =
        '<span class="candidate-code">' + d.code + " · " + sk.rarity + '</span>' +
        '<h4>' + sk.name + '</h4>' +
        '<p>' + sk.desc + '</p>' +
        '<span class="candidate-gain">习得 · ' + gain + '</span>';
      btn.addEventListener("click", function (e) { chooseSkill(sk, e.currentTarget); });
      cl.appendChild(btn);
    });

    if (window.Cinematics) window.Cinematics.drawIntro();

    $("skill-modal").classList.add("is-open");
    $("skill-modal").setAttribute("aria-hidden", "false");
    if (window.GameAudio) { sfx("draw_open"); amb(0.95, "climax"); }
  }

  function chooseSkill(sk, btn) {
    if (drawLock) return;
    drawLock = true;
    var at = pendingDraw ? pendingDraw.at : null;
    var d = deptById(pendingDraw.deptId);
    if (state.owned.indexOf(sk.id) < 0) state.owned.push(sk.id);
    var m = state.metrics;
    if (sk.effect.gpa) m.gpa += sk.effect.gpa;
    if (sk.effect.thinking) m.thinking += sk.effect.thinking;
    if (sk.effect.practice) m.practice += sk.effect.practice;
    if (sk.riskReduce) state.riskReduce += sk.riskReduce;

    logMsg(d.name, "习得核心技能【" + sk.name + "】" + (effectText(sk.effect) ? "（" + effectText(sk.effect) + "）" : ""));

    // 抽中动画：锁定闪光 + 「已习得」角标，停留片刻再关弹窗
    if (window.Cinematics) window.Cinematics.drawPick(btn);

    setTimeout(function () {
      pendingDraw = null;
      $("skill-modal").classList.remove("is-open");
      $("skill-modal").setAttribute("aria-hidden", "true");

      renderStats();
      renderSkills();
      if (window.GameAudio) {
        sfx("draw_confirm");
        sfx("achievement");
        if (at === "100%") sfx("milestone");
        amb(0.4, "calm");
      }
      renderPatient();
      checkGraduate();
      save();
      drawLock = false;
    }, 540);
  }

  function closeModal() {
    if (pendingDraw) {
      pendingDraw = null;
      $("skill-modal").classList.remove("is-open");
      $("skill-modal").setAttribute("aria-hidden", "true");
      renderPatient();
      checkGraduate();
      save();
    }
  }

  /* ---------------- 序章弹窗 ---------------- */
  function maybeShowIntro() {
    if (state.introShown) return;
    if (window.Cinematics) {
      window.Cinematics.playBoot(INTRO, closeIntro);
      return;
    }
    // 降级：无动画层时直接开始，并避免引用缺失的 #story-modal
    state.introShown = true;
    save();
    if (window.GameAudio) { window.GameAudio.unlock(); window.GameAudio.startMusic(); window.GameAudio.setDept(state.active); sfx("intro_enter"); }
  }

  function closeIntro() {
    state.introShown = true;
    save();
    var sm = $("story-modal");
    if (sm) { sm.classList.remove("is-open"); sm.setAttribute("aria-hidden", "true"); }
    if (window.GameAudio) { window.GameAudio.unlock(); window.GameAudio.startMusic(); window.GameAudio.setDept(state.active); sfx("intro_enter"); }
  }

  function resetGame() {
    if (!window.confirm("确定重置人生？当前轮转进度、技能与日志将清空。")) return;
    state = freshState();
    save();
    renderAll();
    toast("已重置 · 新的脑内轮转");
    if (window.GameAudio) { sfx("rewind"); amb(0.2, "calm"); window.GameAudio.startMusic(); }
  }

  /* ---------------- 初始化 ---------------- */
  function init() {
    $("reset-game").addEventListener("click", resetGame);
    $("clear-log").addEventListener("click", function () {
      state.log = []; save(); renderLog(); toast("日志已清除");
    });
    $("close-modal").addEventListener("click", closeModal);
    $("skill-modal").addEventListener("click", function (e) {
      if (e.target === this) closeModal();
    });

    var bpo = $("backpack-open");
    if (bpo) bpo.addEventListener("click", function () { openBackpack("owned"); });
    var bpc = $("backpack-close");
    if (bpc) bpc.addEventListener("click", closeBackpack);
    var bpm = $("backpack-modal");
    if (bpm) bpm.addEventListener("click", function (e) { if (e.target === this) closeBackpack(); });
    var tabs = document.querySelectorAll("#bp-tabs .bp-tab");
    tabs.forEach && tabs.forEach(function (t) {
      t.addEventListener("click", function () { var tab = t.getAttribute("data-tab"); setBpTab(tab); renderBackpack(tab); });
    });

    var sb = $("story-begin");
    if (sb) sb.addEventListener("click", closeIntro);
    var sm = $("story-modal");
    if (sm) sm.addEventListener("click", function (e) { if (e.target === this) closeIntro(); });

    // 点击患者叙事区：一键补全正在打字的文本（二次元 AVG 惯例）
    var pb = $("patient-body");
    if (pb) pb.addEventListener("click", function () { if (window.Cinematics) window.Cinematics.finishType(); });

    var mapToggle = $("map-toggle");
    if (mapToggle) {
      var mapCollapsed = false;
      try { mapCollapsed = localStorage.getItem(MAP_COLLAPSE_KEY) === "1"; } catch (e) {}
      setRotationMapCollapsed(mapCollapsed, false);
      mapToggle.addEventListener("click", function () {
        setRotationMapCollapsed(!$("department-panel").classList.contains("is-collapsed"), true);
      });
    }

    var atBtn = $("audio-toggle");
    if (atBtn) atBtn.addEventListener("click", function () {
      if (window.GameAudio) {
        var m = window.GameAudio.toggleMute();
        atBtn.textContent = m ? "🔇 静音" : "🔊 音效";
        atBtn.setAttribute("aria-pressed", String(!m));
      }
    });

    renderAll();
    maybeShowIntro();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  /* ---------------- 测试钩子（仅当 window.__TEST__ 为真时暴露，不影响正常游玩） ---------------- */
  if (typeof window !== "undefined" && window.__TEST__) {
    window.__game = {
      getState: function () { return state; },
      reset: function () { state = freshState(); save(); renderAll(); },
      closeIntro: closeIntro,
      gotoNextIncomplete: gotoNextIncomplete,
      isSkillOpen: function () { return $("skill-modal").classList.contains("is-open"); },
      choices: function () {
        var d = deptById(state.active); var st = state.depts[d.id];
        if (st.progress >= d.cases.length) return [];
        return d.cases[st.progress].choices;
      },
      clickChoice: function (i) {
        var d = deptById(state.active); var st = state.depts[d.id];
        var c = d.cases[st.progress]; if (!c) return false;
        var ch = c.choices[i]; if (!ch) return false;
        chooseChoice(d, c, ch); return true;
      },
      candidates: function () { return lastCandidates.slice(); },
      clickCandidate: function (i) {
        var cl = $("candidate-list"); if (!cl || !cl._children[i]) return false;
        cl._children[i]._click(); return true;
      },
      deptComplete: function () {
        var d = deptById(state.active); return state.depts[d.id].progress >= d.cases.length;
      },
      patientTitle: function () { return $("patient-title").textContent; }
    };
  }
})();
