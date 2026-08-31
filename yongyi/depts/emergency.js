var DEPT = {
  id: "emergency", name: "急诊科", code: "急", sub: "分诊 · 气道 · 抗压", teacher: "大刘",
  cases: [
    {
      title: "昏迷的三无农民工",
      patientName: "老刘",
      dialogue: {
        start: "s0",
        nodes: {
          s0: { who: "family", text: "（工友）：『大夫，他叫老刘，我们不知道全名……叫不醒了，求您先救救他！』",
            choices: [
              { text: "先评估意识+生命体征，启动绿色通道", ethics: 2, next: "n1" },
              { text: "先问『谁掏钱』再动", ethics: -3, next: "n1" },
              { text: "说『等家属来』", ethics: -2, next: "n1" }
            ] },
          n1: { who: "self", text: "王小波说，人活一世总得有点自己的主意。可老刘连自己是『谁』都没法说——昏迷的人，主意得别人替他拿，而且得往对里拿。",
            next: "nb0" },
          nb0: { who: "narrator", text: "场景推进：凌晨三点的抢救室，监护仪报警声此起彼伏。老刘被推上抢救床，护士已建立两条静脉通路，采血与备血同步进行。",
            next: "s1" },
          s1: { who: "mentor", text: "大刘：『急诊没有『等一下』。三无？先救，账单我替你请示总值班。GCS 7 是深昏迷，先保气道、看瞳孔、拉CT。见死不救的医生，不配穿这白衣。』",
            choices: [
              { text: "问：GCS 几分？瞳孔反应？", ethics: 2, correct: true, next: "nb11" },
              { text: "先翻他口袋找钱", ethics: -3, next: "nb11" },
              { text: "记：昏迷先气道后病因", ethics: 1, next: "nb11" }
            ] },
          nb11: { who: "narrator", text: "场景推进：大刘话音未落，老刘血氧夹突然报警，SpO₂ 掉到 89。护士喊『气道有点塌』，你下意识托起下颌、放上口咽通气道——ABC 里气道 A 永远排第一。",
            next: "nb12" },
          nb12: { who: "system", text: "系统：真实数据——《急诊科建设与管理指南》要求急危重症『先抢救、后补费』，绿色通道对三无人员同样适用。国内多家中心统计，先开放气道再查因，昏迷患者误吸率可降一半以上。",
            next: "s2" },
          s2: { who: "patient", text: "（GCS 7，双侧瞳孔不等大，左侧散大——脑疝前兆）",
            choices: [
              { text: "识别脑疝风险，紧急降颅压+CT", ethics: 2, correct: true, next: "n2" },
              { text: "说『等缴费再查』", ethics: -3, next: "n2" },
              { text: "记：瞳孔不等大=危急", ethics: 1, next: "n2" }
            ] },
          n2: { who: "system", text: "系统：真实世界里，三无伤员绿色通道开着，是因为有人先按了开始。制度兜底前，先有你肯担——你一个电话摇来总值班，CT 和手术都没耽误。",
            next: "nb2" },
          nb2: { who: "self", text: "内心独白：王小波写『沉默的大多数』。此刻老刘是最大的沉默者——他连疼都不会喊，全靠我们替他把『先救』这二字落到实处。",
            next: "s3" },
          s3: { who: "self", text: "我抓起电话摇总值班。王小波写沉默的大多数——可老刘这一刻，不能沉默。沉默的代价，是一个连名字都留不全的人。",
            choices: [
              { text: "启动绿色通道，先救再补手续", ethics: 2, next: "nb31" },
              { text: "等家属来、等缴费再动", ethics: -3, next: "nb31" },
              { text: "记：危急值先救后补", ethics: 1, next: "nb31" }
            ] },
          nb31: { who: "narrator", text: "场景推进：总值班的电话回了，绿色通道盖章生效。CT 室一路绿灯，老刘从床到机只用了七分钟，比常规流程快了三倍。",
            next: "nb32" },
          nb32: { who: "system", text: "系统：真实案例——某地曾有三无伤员因等缴费延误 CT，最终脑疝不可逆。制度设计本就允许『先斩后奏』，怕的是没人肯先斩。",
            next: "s4" },
          s4: { who: "mentor", text: "大刘：『流程：开放静脉、查血常规凝血血糖、备血、头CT排除出血、必要时联系神外。三无不是拖延理由——《急诊科建设与管理指南》明说先抢救后补费。』",
            choices: [
              { text: "按危重流程全面推进", ethics: 2, next: "nb41" },
              { text: "只做最低限度处理", ethics: -2, next: "nb41" },
              { text: "记：先抢救后补费有法可依", ethics: 1, next: "nb41" }
            ] },
          nb41: { who: "narrator", text: "场景推进：血常规回报：HB 偏低、凝血略延，提示慢性失血基础上的急性出血。家属（工友）在门外搓着手，三百块钱攥出了汗。",
            next: "nb42" },
          nb42: { who: "self", text: "内心独白：王小波讲『常识』。可『先救人再谈钱』在急诊是最朴素的常识，落到三无人身上却要有人扛责任——这常识，得用白大褂去兑现。",
            next: "s5" },
          s5: { who: "family", text: "（工友）：『大夫，钱……我们凑了三百块，不够咋办？』",
            choices: [
              { text: "先救人，费用走绿色通道/救助", ethics: 2, next: "n3" },
              { text: "说『钱不够别怪我』", ethics: -3, next: "n3" },
              { text: "记：救助基金可兜底", ethics: 1, next: "n3" }
            ] },
          n3: { who: "system", text: "系统：真实案例里，有医院因『等缴费』让三无伤员错过抢救，后来担了责。先把人救回来，账有总值班和救助基金——命没有第二次。",
            next: "nb5" },
          nb5: { who: "narrator", text: "场景推进：缴费窗口那边，总值班一句话把流程兜住。工友的三百块被原样塞回口袋——命的价，不在那叠零钱里。",
            next: "s6" },
          s6: { who: "self", text: "他工友手里的三百块，像一面镜子。王小波讲尊严——可尊严不是用钱买的，是用『先救人』三个字挣的。",
            choices: [
              { text: "继续推进抢救+上报总值班留痕", ethics: 2, next: "nb61" },
              { text: "因钱缩手", ethics: -3, next: "nb61" },
              { text: "记：留痕保护自己也保护病人", ethics: 1, next: "nb61" }
            ] },
          nb61: { who: "narrator", text: "场景推进：甘露醇要快滴，护士调好滴速，你盯着颅内压监测曲线一点点往下走。手术室电话已接通，神外大夫在电梯口等着。",
            next: "nb62" },
          nb62: { who: "system", text: "系统：《中国颅内高压诊治专家共识》指出，脑疝前兆应紧急降颅压并尽快手术减压。延误超过窗口期，预后天差地别——十分钟能决定瘫或不瘫。",
            next: "s7" },
          s7: { who: "mentor", text: "大刘：『CT 回来了——硬膜下血肿、脑疝。立刻甘露醇降颅压、备血、推手术室。晚十分钟，这人就不是瘫不瘫的事。』",
            choices: [
              { text: "立即降颅压+急诊手术", ethics: 2, correct: true, next: "nb71" },
              { text: "等家属签字再开颅", ethics: -3, next: "nb71" },
              { text: "记：脑疝刻不容缓", ethics: 1, next: "nb71" }
            ] },
          nb71: { who: "narrator", text: "场景推进：开颅血肿清除加去骨瓣减压，两个半小时后监护仪终于平稳。老刘被推出手术室时，瞳孔回缩到正常大小。",
            next: "nb72" },
          nb72: { who: "self", text: "内心独白：王小波说人『被锤』是常态。可这一夜我们替老刘挡下了那锤——把人当零件还是当人，区别就在这个『先』字上。",
            next: "s8" },
          s8: { who: "patient", text: "（术中平稳，监护仪线回来了）",
            choices: [
              { text: "松口气：抢回了一条命", ethics: 2, next: "nb81" },
              { text: "只盯屏幕不感慨", ethics: 0, next: "nb81" },
              { text: "记：绿色通道闭环", ethics: 1, next: "nb81" }
            ] },
          nb81: { who: "narrator", text: "场景推进：ICU 门口，工友给家里打了个电话，说『人救回来了』。晨光照进走廊，你才发现白大褂上全是血点子。",
            next: "nb82" },
          nb82: { who: "system", text: "系统：真实数据——我国卒中与创伤中心建设后，危重抢救『门-针/门-手术』时间显著缩短。时间就是脑，也是命。",
            next: "s9" },
          s9: { who: "self", text: "一条命，连着一个娃的学费、一个家的顶梁柱。王小波说人一天天老下去——可老刘这一夜，被我们从死边上拉了回来。",
            choices: [
              { text: "启动绿色通道，先救再补手续（闭环）", ethics: 2, next: "nb91" },
              { text: "等家属来、等缴费再动", ethics: -3, next: "nb91" },
              { text: "只做最低限度处理", ethics: -2, next: "nb91" }
            ] },
          nb91: { who: "narrator", text: "场景推进：一周后复查，老刘醒了，盯着天花板愣了半天，说出第一句话：『我闺女呢？』绿色通道的账，总值班和救助基金接住了。",
            next: "nb92" },
          nb92: { who: "self", text: "内心独白：王小波讲人得有『对自己生活的设置权』。老刘这一夜的设置权不在自己手里，而在肯先按下开始的那个人——下一次，可能就是你。",
            next: "decision" },
          decision: { who: "system", text: "系统：急诊没有『等一下』。三无？先救，账单我替你请示总值班。见死不救的医生，不配穿这白衣。现在，你选。", decision: true }
        }
      }
    },
    {
      title: "胸痛大汗的中年男",
      patientName: "老秦",
      dialogue: {
        start: "s0",
        nodes: {
          s0: { who: "patient", text: "「胸口……像被石头压着，喘不上气，后背也撕着疼。」",
            choices: [
              { text: "先心电图+生命征+绿色通道", ethics: 2, next: "n1" },
              { text: "让他排队等号", ethics: -3, next: "n1" },
              { text: "说『先开胃药试试』", ethics: -3, next: "n1" }
            ] },
          n1: { who: "self", text: "王小波说，生活是个缓慢受锤的过程。可胸痛这把锤，是抡圆了砸下来的——它不给你『缓缓』的机会。",
            next: "nb0" },
          nb0: { who: "narrator", text: "场景推进：胸痛中心一键启动，心电图机推到床边，护士同步采血查肌钙蛋白与 D-二聚体。老秦被贴上红色腕带，绕开候诊长队直接进抢救室。",
            next: "s1" },
          s1: { who: "mentor", text: "大刘：『胸痛先当最要命的看。STEMI（心梗）、主动脉夹层、肺栓塞、气胸——这四个是夺命四件套。排完了再松口气，别反过来。心电图、肌钙蛋白、CT 血管成像，该上的上。』",
            choices: [
              { text: "问：疼痛性质/放射/既往史", ethics: 2, correct: true, next: "nb11" },
              { text: "归『胃疼』开药", ethics: -3, next: "nb11" },
              { text: "记：撕裂样痛警惕夹层", ethics: 1, next: "nb11" }
            ] },
          nb11: { who: "narrator", text: "场景推进：护士量双侧血压，左臂 160，右臂 110——你盯着压差皱了眉。大刘在旁补了一句：『夹层最常见的红旗，就是双侧胳膊血压不一样。』",
            next: "nb12" },
          nb12: { who: "system", text: "系统：真实病例——有患者把主动脉夹层当胃病，自行服胃药三天，某晨如厕时主动脉破裂，抢救无效。把心梗当胃病，离事故就一步；把夹层当心梗溶栓，等同于直接推它破裂。",
            next: "s2" },
          s2: { who: "patient", text: "「不是胃疼……是撕的，从胸口扯到后背，一阵一阵的。」，血压左臂 160，右臂 110。",
            choices: [
              { text: "警觉：双上肢压差大=夹层红旗", ethics: 2, correct: true, next: "n2" },
              { text: "说『血压高正常』", ethics: -2, next: "n2" },
              { text: "记：双侧血压差是夹层征象", ethics: 1, next: "n2" }
            ] },
          n2: { who: "system", text: "系统：真实病例里，有中年男把夹层当胃病，吃了三天胃药，某天主动脉破在厕所——医生听见了最不想听的声音。你把心梗当胃病，离事故就一步。",
            next: "nb2" },
          nb2: { who: "self", text: "内心独白：王小波写人要懂自己生活的『设置』。老秦从没读过身体的说明书，可这 50 mmHg 的压差，是身体在用最直白的语言报错。",
            next: "s3" },
          s3: { who: "self", text: "双臂压差 50——这不是胃。王小波写人得懂自己生活的设置；可身体这套设置，老秦从没读过说明书。",
            choices: [
              { text: "立即 CTA 排除夹层，禁降压过猛", ethics: 2, correct: true, next: "nb31" },
              { text: "按胃病处理", ethics: -3, next: "nb31" },
              { text: "记：夹层忌用溶栓/剧烈降压", ethics: 1, next: "nb31" }
            ] },
          nb31: { who: "narrator", text: "场景推进：你按下 CTA 申请，造影剂经肘静脉冲进血管。老秦被固定在检查床上，监护仪一路护送，β阻滞剂已经把心率压到七十出头。",
            next: "nb32" },
          nb32: { who: "system", text: "系统：《急性主动脉综合征诊治指南》明确：Stanford A 型夹层一旦疑诊，目标心率<60、收缩压<120，且绝对禁用溶栓与剧烈降压。夹层本就脆如薄纸，溶栓是往破口上泼油。",
            next: "s4" },
          s4: { who: "mentor", text: "大刘：『夹层（Stanford A 型）破入心包就心包填塞，几分钟没。A 型要急诊开胸，B 型控压控率。绝对别给他用溶栓——那是心梗的药，夹层用了直接要命。』",
            choices: [
              { text: "区分 A/B 型定方案", ethics: 2, correct: true, next: "nb41" },
              { text: "一律按心梗溶栓", ethics: -3, next: "nb41" },
              { text: "记：夹层 vs 心梗治疗相反", ethics: 1, next: "nb41" }
            ] },
          nb41: { who: "narrator", text: "场景推进：老秦 Hand 抖着抓住床栏，问出那句『我还能活吗』。你发现他手机屏保是张准考证——女儿的照片笑得亮。",
            next: "nb42" },
          nb42: { who: "self", text: "内心独白：王小波讲尊严。可此刻的尊严，是从『先排雷再谈安心』开始的。我们抢的不只是一颗心，是一个家的高考年。",
            next: "s5" },
          s5: { who: "patient", text: "「我……我还能活吗？我闺女今年高考。」",
            choices: [
              { text: "稳住：先查清楚，能治", ethics: 2, next: "n3" },
              { text: "说『不好说』吓他", ethics: -2, next: "n3" },
              { text: "记：安抚也是治疗", ethics: 1, next: "n3" }
            ] },
          n3: { who: "system", text: "系统：真实案例里，夹层一旦破裂，抢救成功率极低。时间与诊断，是唯一的解药。",
            next: "nb5" },
          nb5: { who: "narrator", text: "场景推进：镇静镇痛下，老秦不再挣扎，血压曲线平稳了些。女儿的电话打进护士站，你接起来只说『在查，配合就好』。",
            next: "s6" },
          s6: { who: "self", text: "他提闺女高考。王小波讲尊严；可此刻的尊严，是从『先排雷』开始的。我们抢的，不只是一颗心。",
            choices: [
              { text: "启动胸痛中心流程+影像", ethics: 2, next: "nb61" },
              { text: "拖延等结果", ethics: -2, next: "nb61" },
              { text: "记：时间就是心肌/主动脉", ethics: 1, next: "nb61" }
            ] },
          nb61: { who: "narrator", text: "场景推进：胸痛中心群里 CTA 图像已上传，影像科秒回：升主动脉增宽、内膜片显影——典型 A 型。心外科会诊单同步发出。",
            next: "nb62" },
          nb62: { who: "system", text: "系统：真实数据——A 型夹层发病 24 小时内死亡率每小时约 1%–2%，及时手术可将住院存活率提升到九成以上。时间窗，就是生与死的分界线。",
            next: "s7" },
          s7: { who: "mentor", text: "大刘：『CTA 回报：Stanford A 型，破口在升主动脉。立刻收 ICU、控心率血压（β阻滞剂优先）、通知心外急诊手术。别让他用力、别让他躁。』",
            choices: [
              { text: "收 ICU+准备急诊手术", ethics: 2, correct: true, next: "nb71" },
              { text: "保守治疗观察", ethics: -3, next: "nb71" },
              { text: "记：A型夹层=急诊手术", ethics: 1, next: "nb71" }
            ] },
          nb71: { who: "narrator", text: "场景推进：老秦被推进杂交手术室，体外循环管路预充完毕。女儿在门外攥着准考证，被护士领到谈话间。",
            next: "nb72" },
          nb72: { who: "self", text: "内心独白：王小波说人得有『设置权』。这一刻设置权在我们手里，得往对里拿——早一分钟开胸，多一分他陪女儿走进考场的可能。",
            next: "s8" },
          s8: { who: "family", text: "（女儿）：『大夫，我爸他……刚还跟我视频来着。』",
            choices: [
              { text: "如实沟通+推进抢救", ethics: 2, next: "nb81" },
              { text: "瞒她『没事』", ethics: -1, next: "nb81" },
              { text: "记：家属同步知情", ethics: 1, next: "nb81" }
            ] },
          nb81: { who: "narrator", text: "场景推进：术后第二天，老秦在 ICU 比了个『OK』手势。女儿隔着玻璃窗哭着笑，准考证还揣在兜里。",
            next: "nb82" },
          nb82: { who: "system", text: "系统：真实案例——及时识别夹层的医院，术后并发症与死亡率显著低于误诊组。诊断的早一步，是病人活下来的那一步。",
            next: "s9" },
          s9: { who: "self", text: "视频那头的笑，和监护仪那头的线，隔着一个诊断的距离。王小波说人得有对自己生活的设置权——可这一刻，设置权在我们手里，得往对里拿。",
            choices: [
              { text: "先心电图+生命征+绿色通道（闭环）", ethics: 2, next: "nb91" },
              { text: "让他排队等号", ethics: -3, next: "nb91" },
              { text: "先开胃药试试", ethics: -3, next: "nb91" }
            ] },
          nb91: { who: "narrator", text: "场景推进：两周后复查，老秦能下床走两步了。出院小结第一行写着：『急性主动脉夹层 A 型，术后恢复可』——那行字，是抢回来的。",
            next: "nb92" },
          nb92: { who: "self", text: "内心独白：王小波说人『受锤』。可这把锤若被早一步认出，就能偏开要命的地方。把胸痛当最要命的看，是急诊最朴素的保命常识。",
            next: "decision" },
          decision: { who: "system", text: "系统：胸痛先当最要命的看。你把心梗当胃病，离事故就一步。现在，你选。", decision: true }
        }
      }
    },
    {
      title: "醉酒呕吐误吸的青年",
      patientName: "小浩",
      dialogue: {
        start: "s0",
        nodes: {
          s0: { who: "family", text: "（同伴）：『他刚才还笑呢，喝多了吐了一地，叫不醒了……』",
            choices: [
              { text: "侧卧+清理气道+给氧", ethics: 2, next: "n1" },
              { text: "拍背让他咳", ethics: -1, next: "n1" },
              { text: "说『等他自己醒』", ethics: -3, next: "n1" }
            ] },
          n1: { who: "self", text: "王小波说，人一醉，什么都慢。可误吸这把锤，不慢——一口反流物堵在气道口，血氧就从 88 往下掉，掉得不跟你商量。",
            next: "nb0" },
          nb0: { who: "narrator", text: "场景推进：小浩被翻成侧卧位，头偏一侧，护士用吸引器清出大团胃内容物。血氧夹显示 SpO₂ 从 88 缓慢爬升，监护仪报警声弱了下去。",
            next: "s1" },
          s1: { who: "mentor", text: "大刘：『先保通道。侧卧位、头偏一侧，清理口鼻呕吐物，给氧。拍背不是万能的——异物在气道，拍下去可能更深。昏迷的，第一动作是侧过来，不是拍。』",
            choices: [
              { text: "问：血氧多少？有无呼吸？", ethics: 2, correct: true, next: "nb11" },
              { text: "猛拍后背", ethics: -2, next: "nb11" },
              { text: "记：侧卧防误吸", ethics: 1, next: "nb11" }
            ] },
          nb11: { who: "narrator", text: "场景推进：护士汇报：SpO₂ 88、口唇发绀、喉头咕噜作响。你蹲下看他的胸廓起伏——浅快而不对称，是气道半堵的典型样子。",
            next: "nb12" },
          nb12: { who: "system", text: "系统：真实病例——有人醉酒后仰躺呕吐，一口闷回气管，发现时已缺血缺氧性脑损伤。急救最常见错误，就是把拍背当万能，反而把异物推更深。",
            next: "s2" },
          s2: { who: "patient", text: "（SpO₂ 88，口唇发绀，喉头有咕噜声）",
            choices: [
              { text: "立即清理+高流量吸氧/通气", ethics: 2, correct: true, next: "n2" },
              { text: "继续拍背", ethics: -2, next: "n2" },
              { text: "记：发绀=缺氧危急", ethics: 1, next: "n2" }
            ] },
          n2: { who: "system", text: "系统：真实病例里，有人醉酒后仰躺呕吐，一口闷回气管，等发现时已窒息脑损伤。拍背把异物推更深，是急救最常见的错。",
            next: "nb2" },
          nb2: { who: "self", text: "内心独白：王小波写人怕疼。可误吸的疼是替你扛的——侧过来这一下，比拍十下都管用，因为气道先通了。",
            next: "s3" },
          s3: { who: "self", text: "我把他翻成侧卧。王小波写人怕疼——可误吸的疼，是替你扛的。侧过来这一下，比拍十下都管用。",
            choices: [
              { text: "吸引清理+评估插管指征", ethics: 2, correct: true, next: "nb31" },
              { text: "只拍不吸", ethics: -2, next: "nb31" },
              { text: "记：吸引优于拍背", ethics: 1, next: "nb31" }
            ] },
          nb31: { who: "narrator", text: "场景推进：吸引管再探一次，又清出咖啡色胃内容。小浩的呼吸渐稳，你评估气道：打不开、有分泌物、自主呼吸弱——插管指征渐渐清晰。",
            next: "nb32" },
          nb32: { who: "system", text: "系统：《急诊气道管理共识》强调：昏迷误吸高危者，『沉默的缺氧』最危险——人看着安静，血氧已黑。必要时尽早球囊面罩通气甚至气管插管，别等『喘不上来』才动。",
            next: "s4" },
          s4: { who: "mentor", text: "大刘：『如果自主呼吸弱、SpO₂ 上不来，别犹豫——气囊面罩通气，必要时气管插管。误吸怕的是『沉默的缺氧』，人看着安静，血已经黑了。』",
            choices: [
              { text: "评估插管，必要时插管", ethics: 2, correct: true, next: "nb41" },
              { text: "怕担责不敢插", ethics: -2, next: "nb41" },
              { text: "记：缺氧优先保通道", ethics: 1, next: "nb41" }
            ] },
          nb41: { who: "narrator", text: "场景推进：吸出的胃内容物装了小半弯盘，血氧爬到 94。小浩喉头咕噜声消失，颜色由紫转红。",
            next: "nb42" },
          nb42: { who: "self", text: "内心独白：王小波讲尊严。少年的尊严，是从『被侧过来、被吸通』开始的。我们保住的不只是一口气，是一个还能醒来的明天。",
            next: "s5" },
          s5: { who: "patient", text: "（吸出大量胃内容物，血氧爬到 94）",
            choices: [
              { text: "继续给氧+监护，防止再次误吸", ethics: 2, next: "n3" },
              { text: "说『醒了就没事』", ethics: -2, next: "n3" },
              { text: "记：误吸后需防肺损伤", ethics: 1, next: "n3" }
            ] },
          n3: { who: "system", text: "系统：真实案例里，误吸后即便救回，也常继发吸入性肺炎、ARDS。保住气道只是第一步，后续抗感染、呼吸支持不能松。",
            next: "nb5" },
          nb5: { who: "narrator", text: "场景推进：吸氧浓度调低一档，小浩仍平稳。护士记账时备注『误吸后，警惕吸入性肺炎』，留观医嘱已经开好。",
            next: "s6" },
          s6: { who: "self", text: "血氧线上来了。王小波讲尊严；可少年的尊严，是从『被侧过来』开始的。我们保住的，不只是一口气。",
            choices: [
              { text: "收入监护+预防吸入性肺炎", ethics: 2, next: "nb61" },
              { text: "放走『醒醒就好』", ethics: -3, next: "nb61" },
              { text: "记：闭环随访", ethics: 1, next: "nb61" }
            ] },
          nb61: { who: "narrator", text: "场景推进：大刘过来查床，翻了翻小浩的眼睑与瞳孔，又调了调体位：『酒精加镇静，呼吸抑制会反跳，别被表面平稳骗了。』",
            next: "nb62" },
          nb62: { who: "system", text: "系统：真实数据——误吸后即便救回，约三成以上继发吸入性肺炎，重者进展 ARDS。保住气道只是第一关，后续抗感染与呼吸支持一天都松不得。",
            next: "s7" },
          s7: { who: "mentor", text: "大刘：『醒了也别大意——酒精+镇静，呼吸抑制会反跳。留观、翻身体位、必要时洗胃/纳洛酮（若是阿片混用）。别让『笑着的年轻人』变『没醒来的新闻』。』",
            choices: [
              { text: "留观+体位+对症闭环", ethics: 2, next: "nb71" },
              { text: "直接放回家", ethics: -3, next: "nb71" },
              { text: "记：反跳风险", ethics: 1, next: "nb71" }
            ] },
          nb71: { who: "narrator", text: "场景推进：小浩被收进监护，体位垫高三十度，同伴在门外被你拉着做科普。『以后醉了，侧着睡，别仰着。』",
            next: "nb72" },
          nb72: { who: "self", text: "内心独白：王小波说人得有『设置权』。可醉了的兄弟，设置权在旁边人手里。侧过来，就是最实在的设置。",
            next: "s8" },
          s8: { who: "family", text: "（同伴）：『大夫，我们以后再也不敢灌他了。』",
            choices: [
              { text: "科普：醉后侧卧、别仰躺", ethics: 2, next: "nb81" },
              { text: "说『下次注意』敷衍", ethics: 0, next: "nb81" },
              { text: "记：同伴教育也重要", ethics: 1, next: "nb81" }
            ] },
          nb81: { who: "narrator", text: "场景推进：同伴点头如捣蒜，把『侧卧、别灌、看呼吸』记进手机备忘录。小浩在监护仪滴答声里，睡得反常地沉。",
            next: "nb82" },
          nb82: { who: "system", text: "系统：真实案例——同伴现场学会侧卧与唤醒观察，是醉酒意外最有效的第一道防火墙。科普一句话，可能拦下一条新闻里的悲剧。",
            next: "s9" },
          s9: { who: "self", text: "一句『不敢灌了』，值一条命。王小波说人得对自己生活有设置权——可醉了的兄弟，设置权在旁边人手里。侧过来，就是设置。",
            choices: [
              { text: "侧卧+清理气道+给氧（闭环）", ethics: 2, next: "nb91" },
              { text: "拍背让他咳", ethics: -1, next: "nb91" },
              { text: "等他自己醒", ethics: -3, next: "nb91" }
            ] },
          nb91: { who: "narrator", text: "场景推进：凌晨四点，小浩迷迷糊糊睁眼，第一句是『我怎么在医院的』。血氧正常，你松了口气，把『侧卧』两个字又对同伴说了一遍。",
            next: "nb92" },
          nb92: { who: "self", text: "内心独白：王小波说人『被锤』是常态。可误吸这把锤，靠一个侧卧动作就能挡开——常识不玄，落在手上才值钱。",
            next: "decision" },
          decision: { who: "system", text: "系统：拍背不是万能的。异物在气道，拍下去可能更深。先保通道，血氧才回得来。现在，你选。", decision: true }
        }
      }
    },
    {
      title: "车祸多发伤",
      patientName: "司机老吴",
      dialogue: {
        start: "s0",
        nodes: {
          s0: { who: "family", text: "（第二伤员）：『大夫我先来的！我也很疼啊！』（门口另一人喊疼）",
            choices: [
              { text: "ABCDE 序贯评估，按危重顺序分工", ethics: 2, next: "n1" },
              { text: "揪着最显眼的伤口缝", ethics: -2, next: "n1" },
              { text: "站边上喊『快快快』", ethics: -3, next: "n1" }
            ] },
          n1: { who: "self", text: "王小波说，人一乱，什么都慢。可 triage 这把尺，量的是『谁先死』——它不是谁喊得响，是『马上要死』优先。",
            next: "nb0" },
          nb0: { who: "narrator", text: "场景推进：急诊大厅一片混乱，你在三十秒内完成首次扫视：司机卡在担架、第二伤员扶墙喊疼、门口还有人呻吟。红黄绿黑四色标签攥在你手里。",
            next: "s1" },
          s1: { who: "mentor", text: "大刘：『分诊不是谁喊得响。是『马上要死』优先，不是『最惨』优先。ABCDE：气道 Airway、呼吸 Breathing、循环 Circulation、残疾 Disability、暴露 Exposure。先卡死顺序，再分工。』",
            choices: [
              { text: "问：谁气道/循环更危？", ethics: 2, correct: true, next: "nb11" },
              { text: "谁嚷嚷先给谁", ethics: -3, next: "nb11" },
              { text: "记：分诊四色（红黄绿黑）", ethics: 1, next: "nb11" }
            ] },
          nb11: { who: "narrator", text: "场景推进：你先扑到司机身边——多处出血、血压飘、意识模糊，颈动脉还在跳但弱。你撕下红标贴上他胸口，喊护士推抢救床。",
            next: "nb12" },
          nb12: { who: "system", text: "系统：真实案例——有车祸现场把『叫得响』的先救，结果『安静的』腹腔大出血先走。triage 的残酷在于：你救得了一个，就得先放过另一个能等的。",
            next: "s2" },
          s2: { who: "patient", text: "（司机卡驾驶位，多处出血、血压飘、意识模糊）",
            choices: [
              { text: "红标：先控出血+建通路", ethics: 2, correct: true, next: "n2" },
              { text: "先处理门口喊疼的", ethics: -3, next: "n2" },
              { text: "记：隐匿失血最致命", ethics: 1, next: "n2" }
            ] },
          n2: { who: "system", text: "系统：真实案例里，有车祸现场把『叫得响』的先救，结果『安静的』腹腔大出血先走了。triage 的残酷在于——你救得了一个，就得先放过另一个能等的。",
            next: "nb2" },
          nb2: { who: "self", text: "内心独白：王小波写『沉默的大多数』。可此刻沉默的，恰恰是快没的那个；喊疼的，反而还能等。分诊的眼睛，得先看见安静的危急。",
            next: "s3" },
          s3: { who: "self", text: "我把红标贴在司机胸口。王小波写沉默的大多数——可此刻沉默的，恰恰是快没的那个。喊疼的，反而还能等。",
            choices: [
              { text: "分组：红标抢救+黄标处理", ethics: 2, next: "nb31" },
              { text: "一人包办全乱套", ethics: -2, next: "nb31" },
              { text: "记：团队分工", ethics: 1, next: "nb31" }
            ] },
          nb31: { who: "narrator", text: "场景推进：你分两组：红标司机进复苏区，黄标伤员去处置区。加压包扎压住司机大腿喷血处，两条静脉通路同时开。",
            next: "nb32" },
          nb32: { who: "system", text: "系统：《创伤急救与创伤中心建设指南》推荐 ABCDE 序贯评估与损伤控制复苏：先控出血、限制性补液、尽早 FAST 评估隐匿出血。骨盆与腹腔的『沉默失血』，比外表伤口更要命。",
            next: "s4" },
          s4: { who: "mentor", text: "大刘：『血压飘+多处出血=失血性休克。先加压止血、限制性补液、备血；别只缝表面看得见的那条——骨盆、腹腔的隐匿出血才要命。FAST 超声看腹腔。』",
            choices: [
              { text: "控出血+FAST+备血", ethics: 2, correct: true, next: "nb41" },
              { text: "只缝皮外伤口", ethics: -2, next: "nb41" },
              { text: "记：隐匿失血优先", ethics: 1, next: "nb41" }
            ] },
          nb41: { who: "narrator", text: "场景推进：FAST 探头扫过司机右上腹，腹腔积液征阳性——隐匿出血坐实。备血单与手术室通知单同时飞出。",
            next: "nb42" },
          nb42: { who: "self", text: "内心独白：王小波讲常识。『最显眼的伤口先缝』是本能，可急诊的常识是反本能的：先管会要命的，再管会流血的。",
            next: "s5" },
          s5: { who: "patient", text: "（第二伤员：小腿骨折，能对话，黄标）",
            choices: [
              { text: "黄标固定+镇痛，先放一边", ethics: 2, next: "n3" },
              { text: "先给黄标做精细处理", ethics: -3, next: "n3" },
              { text: "记：黄标可等待", ethics: 1, next: "n3" }
            ] },
          n3: { who: "system", text: "系统：真实案例里，分诊错乱的现场，轻伤者占满资源，重伤者悄悄没了。顺序，就是命的分配。",
            next: "nb5" },
          nb5: { who: "narrator", text: "场景推进：黄标伤员小腿打着石膏还在嚷，你让护士先给他镇痛固定。资源向红标倾斜，但他也没被遗忘。",
            next: "s6" },
          s6: { who: "self", text: "他小腿打着石膏还在嚷。王小波讲尊严；可此刻的尊严，是『让你等一下』——因为隔壁那个，等不起。",
            choices: [
              { text: "向黄标解释『先救更危的』", ethics: 2, next: "nb61" },
              { text: "不解释只顾红标", ethics: 0, next: "nb61" },
              { text: "记：沟通也是分诊一部分", ethics: 1, next: "nb61" }
            ] },
          nb61: { who: "narrator", text: "场景推进：你蹲到黄标身边解释：『你这位先救，因为他腹腔在出血，等不起；你固定好就能等。』他愣了下，不嚷了。",
            next: "nb62" },
          nb62: { who: "system", text: "系统：真实数据——规范分诊四色（红黄绿黑）可使危重患者检伤时间缩短、死亡率下降。沟通到位，家属配合度与满意度同步上升。",
            next: "s7" },
          s7: { who: "mentor", text: "大刘：『红标送手术室；黄标拍片固定；黑标（无呼吸无循环）才最后。别被情绪带跑——你稳，全场才稳。』",
            choices: [
              { text: "按标分流，各就各位", ethics: 2, next: "nb71" },
              { text: "情绪化全乱", ethics: -3, next: "nb71" },
              { text: "记：分流闭环", ethics: 1, next: "nb71" }
            ] },
          nb71: { who: "narrator", text: "场景推进：红标推进手术室，黄标送影像，门口的轻伤者由分诊台统一登记。全场从乱到顺，只用了十几分钟。",
            next: "nb72" },
          nb72: { who: "self", text: "内心独白：王小波说人得有『设置权』。可分诊的设置权，是替两个陌生人分的：谁先活，谁先等——这杆秤，得稳。",
            next: "s8" },
          s8: { who: "patient", text: "（司机血压回稳，进手术室）",
            choices: [
              { text: "松口气：顺序救对了人", ethics: 2, next: "nb81" },
              { text: "只盯数字", ethics: 0, next: "nb81" },
              { text: "记：复盘分诊", ethics: 1, next: "nb81" }
            ] },
          nb81: { who: "narrator", text: "场景推进：司机血压回稳，监护曲线拉成平顺的绿线。手术室传来消息：出血点止住，人保住了。",
            next: "nb82" },
          nb82: { who: "system", text: "系统：真实案例——分流有序的创伤中心，红标患者『门-手术』时间可压到一小时内科，死亡率显著低于无序现场。顺序，就是命的分配。",
            next: "s9" },
          s9: { who: "self", text: "两条床，一个我。王小波说人得有对自己生活的设置权——可分诊的设置权，是替两个陌生人分的：谁先活，谁先等。",
            choices: [
              { text: "ABCDE 序贯评估，按危重顺序分工（闭环）", ethics: 2, next: "nb91" },
              { text: "揪着最显眼的伤口缝", ethics: -2, next: "nb91" },
              { text: "站边上喊『快快快』", ethics: -3, next: "nb91" }
            ] },
          nb91: { who: "narrator", text: "场景推进：天亮时，司机在 ICU 里握手，黄标伤员拄拐来谢。两个人都活着——因为那一分钟，你把顺序排对了。",
            next: "nb92" },
          nb92: { who: "self", text: "内心独白：王小波说人『受锤』。可 triage 这把尺，量的是谁先扛锤、谁先歇口气。『马上要死』优先，不是『最惨』优先。",
            next: "decision" },
          decision: { who: "system", text: "系统：triage 的残酷在于——你救得了一个，就得先放过另一个能等的。『马上要死』优先，不是『最惨』优先。现在，你选。", decision: true }
        }
      }
    },
    {
      title: "一针下去全身风团",
      signal: { value: "BP 70/40", label: "血压" },
      tags: ["过敏", "急救", "用药安全"],
      bio: "19 岁，咽炎要输青霉素。你问过敏史，他说「不知道，应该没过敏过」。皮试阴性，刚滴上液体，他全身风团、喉头发紧、血压 70/40——过敏性休克来了。可皮试阴性也会过敏，你那句『皮试没事』是靠不住的。",
      patientName: "小吴",
      choices: [
        { text: "立即肌注肾上腺素+平卧吸氧监护，按过敏抢救流程", effects: { gpa: 0.1, thinking: 6, practice: 5 }, ethics: 5,
          outcome: "你没犹豫，大腿外侧一针肾上腺素，气道监护跟上，他血压回来了。思维+6。" },
        { text: "先停液观察，不敢用肾上腺素", effects: { gpa: 0, thinking: -4, practice: -2 }, ethics: -5, harm: true, risk: { chance: 0.4, failEffects: { thinking: -4, practice: -4 }, failText: "喉头水肿窒息，你愣神的几秒，他脸先紫了。" },
          outcome: "你把肾上腺素当最后手段，差点成了致命犹豫。思维-4。" },
        { text: "只给抗组胺/激素，不肾上腺素", effects: { gpa: 0.05, thinking: 1, practice: 2 }, ethics: -1, risk: { chance: 0.35, failEffects: { thinking: -3, practice: -3 }, failText: "辅助药压不住血管扩张，血压继续塌。" },
          outcome: "你按『先轻后重』的惯性，可休克不陪你慢。实践+2。" }
      ],
      dialogue: {
        start: "s0",
        nodes: {
          s0: { who: "patient", text: "（刚滴上液体）大夫……我浑身痒，起疹子了，喘不上气……",
            choices: [
              { text: "立刻停液、呼叫抢救、评估气道", ethics: 2, next: "n1" },
              { text: "说『可能蚊子咬，忍忍』", ethics: -1, next: "n1" },
              { text: "先测血压看看", ethics: 0, next: "n1" }
            ] },
          n1: { who: "self", text: "皮试阴性也会过敏——身体不认你那张皮试单。王小波说人总把『没发生』当『不会发生』，可休克专挑这错觉下手。",
            next: "nb0" },
          nb0: { who: "narrator", text: "场景推进：你一把停掉输液夹，按响抢救铃。护士推来抢救车，监护仪夹上小吴手指——血氧 88、血压 70/40，曲线一路往下掉。",
            next: "s1" },
          s1: { who: "mentor", text: "大刘：『过敏性休克是Ⅰ型速发，三套系统一起塌——皮肤（风团瘙痒）、呼吸道（喉头水肿、支气管痉挛）、循环（血管扩张、血压骤降）。肾上腺素肌注大腿外侧是一线，别等激素抗组胺慢慢起效。』",
            choices: [
              { text: "问：肾上腺素为何是一线", ethics: 2, correct: true, next: "nb11" },
              { text: "想先给抗组胺", ethics: -1, next: "nb11" },
              { text: "记：三系统同时受累", ethics: 1, next: "nb11" }
            ] },
          nb11: { who: "narrator", text: "场景推进：大刘话音未落，小吴嗓子已发哑、说话带哨音——喉头水肿在肉眼可见地进展。你伸手去摸他的下颌与颈部有无肿胀。",
            next: "nb12" },
          nb12: { who: "system", text: "系统：真实病例——有人青霉素皮试阴性，输液中仍发生过敏性休克抢救无效；也有把抗生素当『消炎』随便输，出事才想起问过敏史。皮试有假阴性，过敏史才是底线。",
            next: "s2" },
          s2: { who: "patient", text: "（声音发哑）我……嗓子像被掐住了……",
            choices: [
              { text: "警觉喉头水肿，准备气道与插管", ethics: 2, correct: true, next: "n2" },
              { text: "说『再观察会儿』", ethics: -2, next: "n2" },
              { text: "只给地塞米松", ethics: -1, next: "n2" }
            ] },
          n2: { who: "system", text: "系统：真实病例——有人青霉素皮试阴性，输液中仍过敏性休克，抢救无效；也有把抗生素当『消炎』随便输，出事才想起问过敏史。皮试有假阴性，过敏史才是底线。",
            next: "nb2" },
          nb2: { who: "self", text: "内心独白：王小波讲常识。可医学常识是用命标价的——这一针的差错，标价是他的。『应该没过敏过』不等于『没有』。",
            next: "s3" },
          s3: { who: "self", text: "他『应该没过敏过』，等于『不知道』。王小波讲常识；可医学常识是用命标价的——这一针的差错，标的是他的。",
            choices: [
              { text: "想：过敏史必须问清再用药", ethics: 2, correct: true, next: "nb31" },
              { text: "想：皮试阴性就安全", ethics: -2, next: "nb31" },
              { text: "想：年轻人扛得住", ethics: -1, next: "nb31" }
            ] },
          nb31: { who: "narrator", text: "场景推进：你在病历首页划掉『青霉素(-)』，改成『过敏史待追问，皮试不能替代』。小吴喉咙的哨音稍缓，但血压还在 70 上下晃。",
            next: "nb32" },
          nb32: { who: "system", text: "系统：《青霉素皮肤试验专家共识》指出：皮试阴性仍可能发生过敏；既往头孢类皮疹者，青霉素类须慎用。吃 β 受体阻滞剂的患者反应不典型、肾上腺素效果差，更要提前警惕。",
            next: "s4" },
          s4: { who: "mentor", text: "大刘：『询问过敏史是用药底线——青霉素、头孢、磺胺、碘造影剂都问。吃过头孢起疹子的，青霉素也得慎。吃β受体阻滞剂的，反应不典型、肾上腺素效果差，更要警惕。』",
            choices: [
              { text: "补问全药过敏史并载入病历", ethics: 2, next: "nb41" },
              { text: "只记青霉素", ethics: 0, next: "nb41" },
              { text: "觉得问太多", ethics: -1, next: "nb41" }
            ] },
          nb41: { who: "narrator", text: "场景推进：同学还在嘟囔『扑尔敏就行』，你把家属请到门外，语气放平：『这不是起疹子，是他血压在塌，是休克。』",
            next: "nb42" },
          nb42: { who: "self", text: "内心独白：王小波说人得有『设置权』。此刻小吴的设置权是『活着』，得有人替他按住——肾上腺素，不是最后手段，是第一手段。",
            next: "s5" },
          s5: { who: "family", text: "（同学）大夫，给他吃片扑尔敏就行了吧，别大惊小怪，他还考试呢。",
            choices: [
              { text: "解释这是休克不是起疹子", ethics: 2, next: "n3" },
              { text: "顺他给抗组胺", ethics: -2, next: "n3" },
              { text: "说『先观察』", ethics: -1, next: "n3" }
            ] },
          n3: { who: "system", text: "系统：真实困境——家属把过敏性休克当『起疹子』，延误肾上腺素；也有医院为『怕纠纷』逢抗生素必全套皮试，过度也误事。分寸，在指征不在紧张。",
            next: "nb5" },
          nb5: { who: "narrator", text: "场景推进：家属被请去候诊区，你回头盯紧监护。小吴的喉头仍紧，但氧合没再掉——窗口期，你争取到了。",
            next: "s6" },
          s6: { who: "self", text: "肾上腺素不是猛药，是救命的；可太多人把它当最后手段。王小波说人得有对自己生活的设置权——此刻，小吴的设置权是『活着』，得有人替他按住。",
            choices: [
              { text: "决定立即肾上腺素+监护", ethics: 2, correct: true, next: "nb61" },
              { text: "决定先观察", ethics: -2, next: "nb61" },
              { text: "决定只抗组胺", ethics: -1, next: "nb61" }
            ] },
          nb61: { who: "narrator", text: "场景推进：你下定决心：大腿外侧肌注肾上腺素，平卧、抬腿、吸氧、开静脉。药液推入的几十秒，全场屏息。",
            next: "nb62" },
          nb62: { who: "system", text: "系统：真实数据——过敏性休克一线是肌注肾上腺素（股外侧 0.3–0.5 mg），延迟使用是死亡的主要可控因素。激素与抗组胺只是辅助，永远替代不了肾上腺素。",
            next: "s7" },
          s7: { who: "mentor", text: "大刘：『肾上腺素肌注 0.3–0.5 mg（大腿外侧），平卧抬高腿、吸氧、开放静脉；激素和抗组胺是辅助不是替代。喉头水肿准备好气管插管——呼吸道失守，别的都白搭。』",
            choices: [
              { text: "问辅助用药的顺序", ethics: 2, next: "nb71" },
              { text: "默默记", ethics: 0, next: "nb71" },
              { text: "觉得激素最要紧", ethics: -1, next: "nb71" }
            ] },
          nb71: { who: "narrator", text: "场景推进：肾上腺素推完两分钟，小吴喉头松了、血压爬回 100/60。大刘点头：『辅助药用上，准备好插管兜底。』",
            next: "nb72" },
          nb72: { who: "self", text: "内心独白：王小波写人总把『没发生』当『不会发生』。可这『万一』一旦来，最先靠的不是运气，是那一支敢扎下去的肾上腺素。",
            next: "s8" },
          s8: { who: "patient", text: "（抢救后缓过来）大夫……我以前吃头孢，好像起过疹子……",
            choices: [
              { text: "补记过敏史入档并警示", ethics: 2, next: "n4" },
              { text: "说『没事了』", ethics: 0, next: "n4" },
              { text: "含糊不记", ethics: -2, next: "n4" }
            ] },
          n4: { who: "system", text: "系统：真实——他若早说那句『头孢起疹子』，这针本可不打。一句忘、一句懒得说，差点一条命。过敏史，是病人能给医生最便宜的保命符。",
            next: "nb8" },
          nb8: { who: "self", text: "内心独白：王小波说人得对自己身体诚实。可诚实这件事，常常要等休克教过一次才肯——那句忘说的『头孢起疹子』，差点标了他的命价。",
            next: "s9" },
          s9: { who: "self", text: "他忘了的过敏史，系统当成零。王小波说人得对自己身体诚实——可诚实这件事，常常要等休克教过一次才肯。",
            choices: [
              { text: "定肾上腺素抢救+补过敏史+佩戴警示", ethics: 2, next: "nb91" },
              { text: "只观察不记录", ethics: -2, next: "nb91" },
              { text: "隐瞒不写入档", ethics: -3, next: "nb91" }
            ] },
          nb91: { who: "narrator", text: "场景推进：天亮时小吴能坐起来喝口水，手腕多了一条『青霉素/头孢过敏』的红腕带。病历里那行过敏史，从此不再是零。",
            next: "nb92" },
          nb92: { who: "system", text: "系统：真实案例——若早一句『头孢起疹子』，这针本可不打。过敏史是病人能给医生最便宜的保命符；一句忘、一句懒得说，差点一条命。",
            next: "decision" },
          decision: { who: "system", text: "系统：皮试阴性≠不会过敏；肾上腺素是一线，不是最后手段。把『没事』当『安全』，是最贵的误算。现在，你选。", decision: true }
        }
      }
    }
  ]
};
if (typeof window !== "undefined") { (window.YONGYI_DEPTS = window.YONGYI_DEPTS || []).push(DEPT); }
if (typeof module !== "undefined" && module.exports) { module.exports = DEPT; }
