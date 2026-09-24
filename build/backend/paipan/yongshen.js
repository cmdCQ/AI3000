/**
 * paipan/yongshen.js —— 六爻断卦·用神层（**用神相关**的那一半）
 * =================================================================
 *
 * 真源（逐字移植，不改口径）：
 *   shushu `core/liuyao/interpreter.py`  事项匹配 / 用神取定表 / 伏神（飞伏关系）/ 世身
 *   shushu `core/liuyao/relations.py`    原神忌神仇神 / key_lines / summary
 *
 * 与 ./relations.js 的分工是**用神**这条线，不是文件大小：
 *   relations.js  只吃「六爻 + 月支 + 日支」，先定用神也照样算 → 用神无关
 *   yongshen.js   先定用神才能算（四神五行、key_lines、伏神取哪一个）→ 用神相关
 *
 * 字段名/取值一律与 shushu 逐字相同（对拍铁律「零归一」），包括断语文本、
 * severity 字面量（auspicious/warning/neutral）、`source` 引文出处。
 *
 * ── 已核实的结构事实 ─────────────────────────────────────────────
 * 「用神」在 shushu 里是**混合类型**：既可能是六亲名（妻财/官鬼/…），
 * 也可能是「世爻」「应爻」这两个位置名。全表 14 个事项里有 **6 个**
 * 的首取用神是位置名（求医疾病/出行远行/官司诉讼/找人行人/天气占候/综合），
 * 其中「综合」还是**关键词一个都不中时的默认值**。
 * 而 `relations.analyze_liuyao_deep_relations` 只按**六亲名**去卦里找爻
 * （`y.get("liu_qin") == yong_liuqin`），位置名永远找不到 →
 * `yong_yuan_ji_chou` / `key_lines` / `summary` 全空。
 * 见下方 `resolveYongShen` 与文件末「ai3000 侧偏差」。
 *
 * ── 与 shushu 的已知差异（申报，理由见 `resolveYongShen` 注） ──────
 *   a) 新增 `resolveYongShen`：把用神解析成五行（位置名 → 那一爻；六亲不上卦
 *      → 由宫五行反读六亲），作为 `yong_shen_info.wuxing` 传下去，
 *      补上 shushu 取不到五行的两类情形。用神在卦中显象时取值与 shushu
 *      的反查结果完全一致（层 6 对拍逐字证明，未申报差异 0）。
 */

'use strict';

const C = require('./constants');
const R = require('./relations');

// ─────────────────────────────────────────────────────────────
// 1. 事项匹配（interpreter.py:22-41）
// ─────────────────────────────────────────────────────────────
// ⚠ 顺序敏感：**首个命中即返回**，同一条问题可能同时命中多个事项的关键词，
//   谁在前谁说了算。JS 的对象字面量对字符串键保持书写顺序（键均为 CJK，
//   不会被当成数组下标提前），与 Python dict 的插入序一致。
const TOPIC_MAP = {
  官司诉讼: ['官司', '诉讼', '打官司', '法院', '起诉', '律师', '纠纷', '判决', '赔偿', '仲裁', '胜诉', '败诉'],
  求医疾病: ['病', '医', '健康', '手术', '治疗', '痊愈', '身体', '检查', '诊断', '康复', '药', '住院'],
  考试功名: ['考试', '功名', '学历', '文凭', '录取', '入学', '高考', '考研', '成绩', '分数', '金榜'],
  婚姻感情: ['婚', '恋', '感情', '对象', '结婚', '爱', '姻缘', '追', '分手', '离婚', '桃花', '缘分', '伴侣'],
  求官仕途: ['升职', '升迁', '晋升', '职位', '公务', '录用', '考核', '考编', '考公', '职场', '仕途', '官职',
    '升官', '求职', '工作', '找工作', '面试', '入职', '就业', '上班', '谋职', 'offer', '录取通知', '当官', '谋官'],
  求子嗣: ['孩子', '生育', '怀孕', '子嗣', '要孩子', '生孩子', '备孕', '求子'],
  找人行人: ['找人', '行人', '失踪', '下落', '联系', '寻找', '归来', '消息', '人回', '何时归', '回来', '会不会回', '回不回', '走失', '离家', '出走'],
  失物寻物: ['失物', '丢失', '找东西', '寻物', '遗失', '丢了', '寻回', '失窃'],
  家宅风水: ['家宅', '住宅', '搬家', '装修', '风水', '家庭', '房子', '居家', '买房'],
  出行远行: ['出行', '旅行', '出差', '远行', '旅游', '出门', '路途', '行程', '航班', '能否成行'],
  求财: ['财', '钱', '生意', '投资', '收入', '赚', '金融', '股', '贷款', '利润', '薪', '借', '求财', '财运'],
  天气占候: ['天气', '下雨', '晴天', '气候', '风', '雨', '明天', '后天'],
};

/** 问题文本 → 事项。全部落空时返回「综合」（即默认事项）。 */
function matchTopic(question) {
  const q = question || '';
  for (const topic of Object.keys(TOPIC_MAP)) {
    if (TOPIC_MAP[topic].some((k) => q.indexOf(k) >= 0)) return topic;
  }
  return '综合';
}

/**
 * 事项定夺（interpreter.py:784-789）——`explicit_topic` 与 `question` 的优先级。
 * 三级：显式且是已知事项 → 用它；显式但不是已知事项但能被关键词认出 → 用认出的；
 * 否则退回按 question 认。
 */
function resolveTopic(explicitTopic, question) {
  const et = explicitTopic || '';
  if (et && TOPIC_YONG_SHEN[et] !== undefined) return et;
  if (et && matchTopic(et) !== '综合') return matchTopic(et);
  return matchTopic(question || '');
}

// ─────────────────────────────────────────────────────────────
// 2. 用神取定（interpreter.py:56-119）
// ─────────────────────────────────────────────────────────────
// 古书《增删卜易》《卜筮正宗》标准表。值为**列表**：首项为主用神，余项为参看。
const TOPIC_YONG_SHEN = {
  求财: ['妻财', '子孙'],      // 妻财为用，子孙为原神（生财之源）
  求官仕途: ['官鬼', '父母'],  // 官鬼为用，父母为原神（印星生官）
  考试功名: ['父母', '官鬼'],  // 父母为用神（文书印星），官鬼为原神
  婚姻感情: ['妻财', '官鬼'],  // 按性别分（见 TOPIC_YONG_SHEN_GENDER）
  求医疾病: ['世爻', '子孙'],  // 世为本人，子孙为药、为医
  出行远行: ['世爻', '父母'],  // 世为本人，父母为车船舟舆
  官司诉讼: ['世爻', '应爻'],  // 世应相争
  求子嗣: ['子孙'],            // 子孙为子女
  找人行人: ['应爻'],          // 应爻代表远方之人
  失物寻物: ['妻财'],          // 妻财为财物
  家宅风水: ['父母', '世爻'],  // 父母为家宅，世为本人
  综合: ['世爻'],
};

// 性别覆盖：婚姻感情男占妻财、女占官鬼；求子嗣女占加官鬼（夫星）
const TOPIC_YONG_SHEN_GENDER = {
  婚姻感情: { male: ['妻财'], female: ['官鬼'] },
  求子嗣: { male: ['子孙'], female: ['子孙', '官鬼'] },
  官司诉讼: { male: ['世爻', '应爻'], female: ['世爻', '应爻'] },
};

// 代占用神：占者世爻代表问卦人，应爻代表被问者
const TOPIC_YONG_SHEN_PROXY = {
  求财: ['应爻', '妻财'],
  婚姻感情: ['应爻', '官鬼'],
  求医疾病: ['应爻', '子孙'],
  官司诉讼: ['应爻', '世爻'],
};

/** 用神名列表（可能含「世爻」「应爻」这类位置名）。 */
function getYongShen(topic, gender, isProxy) {
  if (isProxy && TOPIC_YONG_SHEN_PROXY[topic] !== undefined) {
    return TOPIC_YONG_SHEN_PROXY[topic];
  }
  const gk = (gender === 'female' || gender === '女') ? 'female' : 'male';
  const g = TOPIC_YONG_SHEN_GENDER[topic];
  if (g !== undefined) {
    return g[gk] !== undefined ? g[gk] : (TOPIC_YONG_SHEN[topic] || ['世爻']);
  }
  return TOPIC_YONG_SHEN[topic] || ['世爻'];
}

// ─────────────────────────────────────────────────────────────
// 3. 原神 / 忌神 / 仇神（relations.py:87-123）
// ─────────────────────────────────────────────────────────────
// 「谁生我 / 谁克我」表 = 生克表取逆（五行生克是一一对应，无碰撞）
const BEISHENG = {};
for (const k of Object.keys(C.SHENG)) BEISHENG[C.SHENG[k]] = k;
const BEIKE = {};
for (const k of Object.keys(C.KE)) BEIKE[C.KE[k]] = k;

/** 给定用神五行，推出原神/忌神/仇神/食神的五行。 */
function identifyYuanshenJishenChoushen(yongWx) {
  if (!yongWx) return {};
  const ji = BEIKE[yongWx] || '';
  return {
    用神_wx: yongWx,
    原神_wx: BEISHENG[yongWx] || '',   // 生用神
    忌神_wx: ji,                        // 克用神
    仇神_wx: BEISHENG[ji] || '',        // 生忌神
    食神_wx: C.SHENG[yongWx] || '',     // 用神所生（耗用神，不算坏）
  };
}

/** 从六爻中找出指定五行的所有爻。position 为爻位 1..6（升序表下标 +1）。 */
function findLinesByWuxing(yaos, wx) {
  if (!wx) return [];
  const out = [];
  yaos.forEach((y, i) => {
    const branch = (y && y.branch) || '';
    if ((C.DIZHI_WUXING[branch] || '') === wx) {
      out.push(Object.assign({}, y, { position: i + 1 }));
    }
  });
  return out;
}

// ─────────────────────────────────────────────────────────────
// 4. 深度关系（relations.py:297-388）——用神相关部分
// ─────────────────────────────────────────────────────────────
/**
 * shushu `analyze_liuyao_deep_relations` 的完整移植。
 *
 * `line_details`（逐爻十二长生/月破日破/合力）与 `changing_relations`（化变五关系）
 * 两块**用神无关**，一律委托 ./relations.js，此处不重算——本模块只补
 * shushu 里用神相关的那三块：`yong_yuan_ji_chou` / `key_lines` / `summary`。
 *
 * @param {Array} yaos           本卦六爻（键：branch / liu_qin / is_changing）
 * @param {Array} [changedYaos]  变卦六爻（恒 6 条，非动爻以本爻支补齐）
 * @param {Object} [yongShenInfo] `{liuqin, wuxing}`；wuxing 缺省时按 liuqin 反查
 */
function analyzeLiuyaoDeepRelations(yaos, changedYaos, yongShenInfo, monthZhi, dayZhi) {
  const result = {
    yong_yuan_ji_chou: {},
    key_lines: {},
    changing_relations: [],
    line_details: [],
    summary: [],
  };

  // 1. 用神五行：显式 wuxing 优先，否则拿 liuqin 去卦里找**第一个**该六亲之爻
  //    ⚠ 位置名（世爻/应爻）在这里永远找不到 → yong_wx 保持空 → 下面三块全空
  let yongWx = '';
  if (yongShenInfo) {
    yongWx = yongShenInfo.wuxing || '';
    if (!yongWx) {
      const yongLiqin = yongShenInfo.liuqin || '';
      for (const y of yaos) {
        if ((y && y.liu_qin) === yongLiqin) {
          yongWx = C.DIZHI_WUXING[(y && y.branch) || ''] || '';
          break;
        }
      }
    }
  }

  if (yongWx) {
    result.yong_yuan_ji_chou = identifyYuanshenJishenChoushen(yongWx);
    const y = result.yong_yuan_ji_chou;
    result.key_lines = {
      用神_lines: findLinesByWuxing(yaos, yongWx),
      原神_lines: findLinesByWuxing(yaos, y.原神_wx),
      忌神_lines: findLinesByWuxing(yaos, y.忌神_wx),
      仇神_lines: findLinesByWuxing(yaos, y.仇神_wx),
    };
  }

  // 2. 逐爻在月日的力量评分（用神无关，委托 relations.js）
  result.line_details = R.lineDetails(yaos, monthZhi, dayZhi);

  // 3. 动爻 → 变爻关系（用神无关，委托 relations.js）
  if (changedYaos) {
    result.changing_relations = R.changingRelations(yaos, changedYaos);
  }

  // 4. 总结
  const summary = [];
  if (Object.keys(result.yong_yuan_ji_chou).length) {
    const yyj = result.yong_yuan_ji_chou;
    summary.push(
      `用神${yyj.用神_wx}、原神${yyj.原神_wx}（生用神）、`
      + `忌神${yyj.忌神_wx}（克用神）、仇神${yyj.仇神_wx}（生忌神）`);
  }
  if (Object.keys(result.key_lines).length) {
    const kl = result.key_lines;
    if (kl.原神_lines.length) {
      const posnames = kl.原神_lines.map((l) => `第${l.position}爻(${l.liu_qin}${l.branch})`);
      summary.push(`原神出现于：${posnames.join(', ')}`);
    }
    if (kl.忌神_lines.length) {
      const posnames = kl.忌神_lines.map((l) => `第${l.position}爻(${l.liu_qin}${l.branch})`);
      summary.push(`⚠ 忌神出现于：${posnames.join(', ')} — 需重点关注其状态`);
    }
  }
  for (const cr of result.changing_relations) {
    if (cr.relation === '回头克') {
      summary.push(`⚠ 第${cr.position}爻动化回头克：${cr.interpretation}`);
    } else if (cr.relation === '回头生') {
      summary.push(`✦ 第${cr.position}爻动化回头生：${cr.interpretation}`);
    }
  }

  result.summary = summary;
  return result;
}

// ─────────────────────────────────────────────────────────────
// 5. 伏神 / 飞神（interpreter.py:127-209）
// ─────────────────────────────────────────────────────────────
/**
 * 按**用神六亲**取伏神：用神已在卦中显象则返回 null。
 *
 * 伏神出自**本宫首卦**（八纯卦）的六爻纳甲，与当前卦的爻一一对位；
 * 覆盖其上的那一爻即飞神。
 *
 * @param {Array}  yaos          本卦六爻（用 branch / liu_qin）
 * @param {number} palaceNum     本宫卦号 1..8（`C.NAJIA` 的键）
 * @param {string} palaceElement 本宫五行
 * @param {string} yongLiqin     用神的六亲名
 */
function findFuShen(yaos, palaceNum, palaceElement, yongLiqin) {
  // 用神已显象 → 无伏神
  const visible = {};
  for (const y of yaos) visible[(y && y.liu_qin) || ''] = true;
  if (visible[yongLiqin]) return null;

  // 伏神位：本宫首卦的六爻（升序 初→上）
  const palaceAll = (C.NAJIA[palaceNum] || []).slice();
  if (!palaceAll.length) return null;

  const candidates = [];
  palaceAll.forEach((palBranch, i) => {
    const palWx = C.DIZHI_WUXING[palBranch] || '';
    const palLiqin = C.getLiuQin(palaceElement, palWx);
    if (palLiqin !== yongLiqin) return;

    const pos = i + 1;
    const feiYao = i < yaos.length ? (yaos[i] || {}) : {};
    const feiZhi = feiYao.branch || '';
    const feiWx = C.DIZHI_WUXING[feiZhi] || '';
    const feiLiqin = feiYao.liu_qin || '';

    // 飞伏关系判定（古书：《增删卜易·飞伏吉凶论》）
    //   1) 飞生伏 → 伏得长生，最吉（「长生扶起」）
    //   2) 伏生飞 → 伏神泄气，凶
    //   3) 飞克伏 → 飞神压制伏神，凶（「飞来克伏，事不成」）
    //   4) 伏克飞 → 伏神反克飞神，可出，吉
    //   5) 比和   → 同类相助，待时可出
    // ⚠ 「飞伏比和」须排在「正伏」之前，且比和判定在最后——否则同五行会先落到
    //   上面的生克分支之外；顺序照抄 shushu，勿重排。
    let emerge, severity;
    if (C.SHENG[feiWx] === palWx) {
      emerge = '飞生伏 — 长生扶起，伏神得力，最吉'; severity = 'auspicious';
    } else if (C.SHENG[palWx] === feiWx) {
      emerge = '伏生飞 — 伏神泄气难出，凶'; severity = 'warning';
    } else if (C.KE[feiWx] === palWx) {
      emerge = '飞克伏 — 飞神克制伏神，事难成，凶'; severity = 'warning';
    } else if (C.KE[palWx] === feiWx) {
      emerge = '伏克飞 — 伏神反克飞出，可期，吉'; severity = 'auspicious';
    } else if (feiWx === palWx) {
      emerge = '飞伏比和 — 同类相助，待冲飞日出伏'; severity = 'neutral';
    } else {
      emerge = '正伏 — 关系一般，须冲飞神出伏'; severity = 'neutral';
    }

    candidates.push({
      position: pos,
      fu_branch: palBranch,
      fu_liuqin: palLiqin,
      fu_wx: palWx,
      fei_branch: feiZhi,
      fei_liuqin: feiLiqin,
      emerge_type: emerge,
      emerge_severity: severity,
      desc: `用神${yongLiqin}伏于第${pos}爻之下（${palBranch}），`
          + `飞神为${feiLiqin}（${feiZhi}），${emerge}。`
          + `须待${feiZhi}冲动之日，伏神方能出现应事。`,
    });
  });

  return candidates.length ? candidates[0] : null;
}

/** 取伏神用的用神六亲名（interpreter.py:806-815 的取法，与用神表不同）。 */
function fuShenLiqinOf(topic, gender) {
  const gk = (gender === 'female' || gender === '女') ? 'female' : 'male';
  const g = TOPIC_YONG_SHEN_GENDER[topic];
  if (g !== undefined) {
    const arr = g[gk] || [];
    return arr.length ? arr[0] : '';
  }
  const names = TOPIC_YONG_SHEN[topic] || ['世爻'];
  const hit = names.find((n) => n !== '世爻' && n !== '应爻');
  return hit || '';
}

// ─────────────────────────────────────────────────────────────
// 6. 世身（advanced_features.py:123-189）
// ─────────────────────────────────────────────────────────────
// 「世身者，世爻之合神，主一身吉凶藏隐」——《增删卜易·世身论》
// 世身 = 与世爻地支**六合**的那一支，再看它是否在卦中显象、月令如何。
// 注：shushu 函数体内另有一个局部 `SANHE` 表，**从未被使用**（死局部），故不移植。
function getShiShen(worldPosition, worldZhi, yaos, monthZhi, dayZhi) {
  const heZhi = C.LIU_HE[worldZhi] || '';

  let onChart = false;
  let positionInChart = null;
  if (yaos && heZhi) {
    for (let i = 0; i < yaos.length; i++) {
      const y = yaos[i] || {};
      if ((y.branch || y.zhi || '') === heZhi) {
        onChart = true;
        positionInChart = i + 1;
        break;
      }
    }
  }

  // 旺衰：以**月令**论世身（旺相休囚死）
  let wangShuai = '';
  if (heZhi && monthZhi) {
    const monthWx = C.DIZHI_WUXING[monthZhi] || '';
    const sbWx = C.DIZHI_WUXING[heZhi] || '';
    if (monthWx === sbWx) wangShuai = '旺（月令）';
    else if (C.SHENG[monthWx] === sbWx) wangShuai = '相（月令生）';
    else if (C.KE[monthWx] === sbWx) wangShuai = '囚（月令克）';
    else if (C.SHENG[sbWx] === monthWx) wangShuai = '休（月令为食伤）';
    else wangShuai = '死（月令为财）';
  }

  const parts = [];
  if (heZhi) {
    parts.push(`世爻${worldZhi}的六合之神为${heZhi}，称为「世身」`);
    if (onChart) parts.push(`世身在第${positionInChart}爻显象`);
    else parts.push('世身不上卦，主隐藏深处之事');
    if (wangShuai) parts.push(`月令断为${wangShuai}`);
    parts.push('主一身吉凶藏隐、心底真意');
  }

  return {
    world_zhi: worldZhi,
    he_zhi: heZhi,
    on_chart: onChart,
    position_in_chart: positionInChart,
    wang_shuai: wangShuai,
    desc: parts.length ? parts.join('，') + '。' : '',
    source: '《增删卜易·世身论》',
  };
}

// ─────────────────────────────────────────────────────────────
// 7. 用神落到具体爻（ai3000 侧新增，见文件头注 a）
// ─────────────────────────────────────────────────────────────
const ELEMENTS = ['木', '火', '土', '金', '水'];

/**
 * 六亲名 + 宫五行 → 该六亲的五行。
 *
 * **结构事实：固定宫五行下，六亲与五行是一一对应的**——`C.getLiuQin`
 * 把 5 个五行分别映到 兄弟/父母/子孙/妻财/官鬼 五个名字，是个双射。
 * 故「妻财在乾宫＝木」这类反读是良定义的，不带任何新口径：
 * 它就是把 `getLiuQin` 那张表倒过来读。
 */
function elementOfLiuQin(palaceElement, liuqin) {
  if (!palaceElement || !liuqin) return '';
  return ELEMENTS.find((wx) => C.getLiuQin(palaceElement, wx) === liuqin) || '';
}

/**
 * 把用神名解析成卦中具体那一爻（不上卦时仍给出其五行）。
 *
 * shushu 的用神表里「世爻」「应爻」是**位置名**而不是六亲名，
 * 而 `relations.analyze_liuyao_deep_relations` 只按六亲名去**已现身的爻**里找
 * （`y.get("liu_qin") == yong_liuqin`），于是两类情形下它取不到五行、
 * 四神五行 / key_lines / summary 恒空：
 *   ① 用神是位置名：求医疾病 / 出行远行 / 官司诉讼 / 找人行人 / 天气占候 / **综合**
 *      （「综合」是关键词全不中时的默认值，即大多数小白用户的默认路径）
 *   ② 用神是六亲名但**不上卦**（如求财而卦中无妻财）：卦里找不到那一爻
 *
 * ①②里用神的五行其实都是确定的：①位置名 → 那一爻；②六亲名 → 宫五行反读
 * （见 `elementOfLiuQin`，且 shushu 自己算伏神时取的就是同一个值）。
 * 本函数把它们解析出来，调用方以 `{liuqin, wuxing}` 传给
 * `analyzeLiuyaoDeepRelations`。用神在卦中显象时，两种取法与 shushu 的
 * 反查结果**完全一致**（已由层 6 对拍逐字证明）。
 *
 * @param {Array}  yaos    本卦六爻（升序 初→上）
 * @param {Object} palace  `C.getPalace()` 的产物（要 shi / ying / palaceElement）
 * @returns {{names:Array, primary:string, kind:string, yao:Object|null,
 *            branch:string, wuxing:string, liuqin:string, resolved_by:string}}
 */
function resolveYongShen(yaos, palace, topic, gender, isProxy) {
  const names = getYongShen(topic, gender, isProxy);
  const primary = names.length ? names[0] : '世爻';
  yaos = yaos || [];
  palace = palace || {};
  const palEl = palace.palaceElement || '';

  let yao = null;
  let kind = '';
  if (primary === '世爻') {
    yao = yaos[palace.shi - 1] || null; kind = '世应';
  } else if (primary === '应爻') {
    yao = yaos[palace.ying - 1] || null; kind = '世应';
  } else {
    yao = yaos.find((y) => y.liuqin === primary) || null; kind = '六亲';
  }

  // 五行：在卦中 → 取该爻；不在卦中 → 由宫五行反读六亲（①②两类的统一出路）
  const wuxing = yao ? yao.wuxing : (kind === '六亲' ? elementOfLiuQin(palEl, primary) : '');

  return {
    names,
    primary,
    kind,
    yao,
    branch: yao ? yao.dizhi : '',
    wuxing,
    liuqin: yao ? yao.liuqin : (kind === '六亲' ? primary : ''),
    resolved_by: yao ? 'on_chart' : (kind === '六亲' ? 'palace_liuqin' : 'position'),
  };
}

module.exports = {
  // 表
  TOPIC_MAP, TOPIC_YONG_SHEN, TOPIC_YONG_SHEN_GENDER, TOPIC_YONG_SHEN_PROXY,
  BEISHENG, BEIKE,
  // 函数
  matchTopic, resolveTopic, getYongShen,
  identifyYuanshenJishenChoushen, findLinesByWuxing,
  analyzeLiuyaoDeepRelations,
  findFuShen, fuShenLiqinOf,
  getShiShen,
  resolveYongShen,
};
