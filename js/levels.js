/* ============================================================
 * levels.js —— 100 关：20 类挑战，伪随机排布不相邻重复，难度递增，限时
 * 纯前端零依赖。level 作随机种子，同关题目稳定。
 * ============================================================ */
(function (global) {
  'use strict';

  function mulberry32(seed) {
    let a = seed >>> 0;
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const rand = (rng, min, max) => min + rng() * (max - min);
  const randInt = (rng, min, max) => Math.floor(rand(rng, min, max + 1));
  const pick = (rng, arr) => arr[Math.floor(rng() * arr.length)];
  const shuffle = (rng, arr) => { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

  /* 20 类挑战 */
  const TYPES = [
    'hold', 'grid', 'distort', 'slider', 'seq', 'math', 'traj', 'rotate',
    'reflex', 'dice', 'memory', 'impulse', 'compare', 'common', 'memorySeq',
    'colorPick', 'mirror', 'spot', 'car', 'crosswalk'
  ];
  // 动作类（只放在中后段）
  const ACTION = ['car', 'crosswalk'];

  const KIND_NAME = {
    hold: '按住复选框（行为检测）',
    grid: '点选图片网格（视觉识别）',
    distort: '辨认扭曲字符（OCR 对抗）',
    slider: '滑块拼图对齐（轨迹+精度）',
    seq: '顺序点击（Click Order）',
    math: '口算 / 数列（计算力）',
    traj: '轨迹判别人 / 机（行为识别）',
    rotate: '旋转转正（空间感知）',
    reflex: '反应时测试（Human Reflex）',
    dice: '骰子计数（数感）',
    memory: '记忆配对（工作记忆）',
    impulse: '忍住别按（冲动控制）',
    compare: '算式比大小（速判）',
    common: '常识问答（世界知识）',
    memorySeq: '记忆复述（序列）',
    colorPick: '颜色 / 分类点选',
    mirror: '朝向判断（箭头）',
    spot: '找不同（差异定位）',
    car: '开车躲避（动作）',
    crosswalk: '过马路躲避（动作）'
  };

  /* ---------- 100 关伪随机类型序列（每类5次，不相邻，动作类靠后） ---------- */
  let PLAN = null;
  function buildPlan() {
    const rng = mulberry32(20261024);
    const acts = [], normal = [];
    TYPES.forEach(t => { for (let k = 0; k < 5; k++) (ACTION.includes(t) ? acts : normal).push(t); });
    const slots = new Array(100);
    // 动作类先放到第26关以后的随机空位
    const actSlots = shuffle(rng, [...Array(75).keys()].map(i => i + 25));
    acts.forEach((a, i) => slots[actSlots[i]] = a);
    // 非动作类填满其余空位
    const empty = []; for (let i = 0; i < 100; i++) if (slots[i] == null) empty.push(i);
    const nm = shuffle(rng, normal);
    empty.forEach((s, i) => slots[s] = nm[i]);
    // 多轮修复相邻重复：遇相同就与后面一个合适位置交换
    for (let pass = 0; pass < 40; pass++) {
      let changed = false;
      for (let i = 1; i < 100; i++) {
        if (slots[i] === slots[i - 1]) {
          for (let j = i + 1; j < 100; j++) {
            if (ACTION.includes(slots[j]) && j < 25) continue; // 动作类不挪到前段
            const ok = slots[j] !== slots[i - 1] && slots[j] !== (slots[i + 1] || null)
              && slots[i] !== slots[j - 1] && slots[j] !== slots[i + 1];
            if (ok) { [slots[i], slots[j]] = [slots[j], slots[i]]; changed = true; break; }
          }
        }
      }
      if (!changed) break;
    }
    return slots;
  }

  /* ---------- 题目素材池（多样化） ---------- */
  const GRID_POOL = [
    { label: '汽车', emoji: '🚗', distract: ['🚕', '🚙', '🚐', '🏎️'] },
    { label: '公交车', emoji: '🚌', distract: ['🚍', '🚎', '🚐', '🚋'] },
    { label: '卡车', emoji: '🚚', distract: ['🚛', '🛻', '🚐', '🚗'] },
    { label: '自行车', emoji: '🚲', distract: ['🛴', '🚵', '🛺', '🚴'] },
    { label: '摩托车', emoji: '🏍️', distract: ['🛵', '🚲', '🚗', '🛹'] },
    { label: '红绿灯', emoji: '🚦', distract: ['🚥', '🗽', '🚏', '⚡'] },
    { label: '消防栓', emoji: '🧯', distract: ['🔥', '🪣', '🧰', '🚒'] },
    { label: '小船', emoji: '⛵', distract: ['🚢', '🛶', '🎈', '🛟'] },
    { label: '出租车', emoji: '🚕', distract: ['🚗', '🚙', '🚐', '🏎️'] },
    { label: '救护车', emoji: '🚑', distract: ['🚒', '🚐', '🚓', '🚗'] },
    { label: '直升机', emoji: '🚁', distract: ['✈️', '🛩️', '🚀', '🎈'] },
    { label: '帆船', emoji: '⛵', distract: ['🚢', '🛶', '🛟', '🎈'] },
    { label: '小狗', emoji: '🐶', distract: ['🐱', '🐰', '🦊', '🐻'] },
    { label: '小猫', emoji: '🐱', distract: ['🐶', '🐰', '🦊', '🐯'] },
    { label: '小鸟', emoji: '🐦', distract: ['🦋', '🐝', '🐤', '🦜'] },
    { label: '汽车喇叭', emoji: '📢', distract: ['🔔', '📣', '🔊', '🗣️'] }
  ];

  const COMMON = [
    { q: '太阳从哪个方向升起？', opts: ['东', '西', '南', '北'], a: 0 },
    { q: '水在多少摄氏度结冰？', opts: ['0℃', '10℃', '100℃', '-10℃'], a: 0 },
    { q: '人体最大的器官是？', opts: ['皮肤', '肝脏', '心脏', '大脑'], a: 0 },
    { q: '一年有多少个月？', opts: ['12', '10', '11', '13'], a: 0 },
    { q: '彩虹有几种颜色？', opts: ['7', '5', '6', '8'], a: 0 },
    { q: '哪个动物会喵喵叫？', opts: ['猫', '狗', '牛', '鸭'], a: 0 },
    { q: '地球绕着什么转？', opts: ['太阳', '月亮', '火星', '自己'], a: 0 },
    { q: '冰融化会变成？', opts: ['水', '蒸汽', '火', '油'], a: 0 },
    { q: '一年中最热的季节是？', opts: ['夏', '春', '秋', '冬'], a: 0 },
    { q: '蜜蜂会酿造？', opts: ['蜂蜜', '牛奶', '酱油', '醋'], a: 0 },
    { q: '哪个是乐器？', opts: ['钢琴', '桌子', '椅子', '杯子'], a: 0 },
    { q: '鱼用什么呼吸？', opts: ['鳃', '肺', '皮肤', '鼻子'], a: 0 },
    { q: '红绿灯通常先亮哪种颜色停？', opts: ['红', '绿', '黄', '蓝'], a: 0 },
    { q: '晚上月亮旁边最亮的星常是？', opts: ['金星', '火星', '彗星', '流星'], a: 0 },
    { q: '人类有多少只手？', opts: ['2', '1', '3', '4'], a: 0 }
  ];

  /* ---------- 各类型题目生成 ---------- */
  function genHold(level, rng) {
    const holdSec = Math.min(1 + level / 28, 3.5);
    return { type: 'hold', params: { holdSec: +holdSec.toFixed(1), needMicroMove: level > 25, timeLimit: holdSec + 3 },
      hint: `按住复选框保持 ${holdSec.toFixed(1)} 秒别松开，瞬间打勾=机器人。` };
  }
  function genGrid(level, rng) {
    const n = level < 8 ? 2 : level < 22 ? 3 : level < 45 ? 3 : 4;
    const cat = pick(rng, GRID_POOL);
    const total = n * n;
    const targetCount = Math.max(1, Math.round(total * (level < 22 ? 0.34 : 0.42)));
    const idxs = shuffle(rng, [...Array(total).keys()]);
    const targetSet = new Set(idxs.slice(0, targetCount));
    const cells = [];
    for (let i = 0; i < total; i++) cells.push(targetSet.has(i) ? cat.emoji : pick(rng, cat.distract));
    return { type: 'grid', params: { n, cells, target: cat.label, noise: level >= 45, blur: level >= 72, timeLimit: Math.max(30 - level / 5, 12) },
      answer: [...targetSet], hint: `点选所有「${cat.label}」（含边缘），选错漏选都失败，限时。` };
  }
  function genDistort(level, rng) {
    const CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
    const len = Math.min(4 + Math.floor((level - 1) / 12), 8);
    let ans = '';
    for (let i = 0; i < len; i++) ans += CHARS[Math.floor(rng() * CHARS.length)];
    return { type: 'distort', params: { answer: ans, wobble: 0.5 + level / 90, noise: Math.min(8 + level / 3, 18), rotate: Math.min(10 + level / 5, 30), timeLimit: Math.max(25 - level / 5, 10) },
      answer: ans, hint: '从干扰线和扭曲中读出字符（不分大小写），限时。' };
  }
  function genSlider(level, rng) {
    const tol = Math.max(0.10 - level / 1200, 0.02);
    const gap = rand(rng, 0.15, 0.85);
    return { type: 'slider', params: { gap, tolFrac: tol, timeLimit: Math.max(20 - level / 6, 8) }, answer: gap, hint: '拖动滑块精确对齐白色缺口，误差很小，限时。' };
  }
  function genSeq(level, rng) {
    const k = Math.min(3 + Math.floor((level - 1) / 11), 8);
    let symbols, order, hint;
    if (level < 33) {
      const pool = []; while (pool.length < k) { const v = randInt(rng, 1, 40); if (!pool.includes(v)) pool.push(v); }
      symbols = pool.slice(); order = pool.slice().sort((a, b) => a - b); hint = '按数字从小到大依次点击。';
    } else if (level < 66) {
      const LET = 'ABCDEFGHJKLMNPQRSTUVWXYZ'; const set = new Set();
      while (set.size < k) set.add(LET[Math.floor(rng() * LET.length)]);
      symbols = [...set]; order = [...set].sort(); hint = '按字母 A→Z 顺序依次点击。';
    } else {
      const pool = []; while (pool.length < k) { const v = randInt(rng, 1, 60); if (!pool.includes(v)) pool.push(v); }
      symbols = pool.slice(); order = pool.slice().sort((a, b) => b - a); hint = '按数字从大到小依次点击。';
    }
    const display = shuffle(rng, symbols);
    return { type: 'seq', params: { display, timeLimit: Math.max(20 - level / 6, 9) }, answer: order, hint };
  }
  function genMath(level, rng) {
    let q, ans;
    if (level < 12) { const a = randInt(rng, 20, 199), b = randInt(rng, 20, 199); if (rng() < 0.5) { q = `${a} + ${b}`; ans = a + b; } else { q = `${a} − ${b}`; ans = a - b; } }
    else if (level < 30) { const a = randInt(rng, 2, 15), b = randInt(rng, 2, 12); q = `${a} × ${b}`; ans = a * b; }
    else if (level < 52) { const b = randInt(rng, 2, 12), q2 = randInt(rng, 3, 15), a = b * q2; q = `${a} ÷ ${b}`; ans = q2; }
    else if (level < 76) { const a = randInt(rng, 4, 20), b = randInt(rng, 2, 12), c = randInt(rng, 20, 99); q = `${a} × ${b} + ${c}`; ans = a * b + c; }
    else { const d = randInt(rng, 2, 9), first = randInt(rng, 1, 9); const s = [first, first + d, first + 2 * d, first + 3 * d]; q = s.join(', ') + ', ?'; ans = first + 4 * d; }
    return { type: 'math', params: { q, timeLimit: Math.max(20 - level / 6, 8) }, answer: ans, hint: '心算结果填答案，多步/数列限时，不借助工具。' };
  }
  function genTraj(level, rng) {
    const isHuman = rng() < 0.5; const pts = []; const N = 24; const jb = level > 45 ? 0.3 : 1;
    if (isHuman) { const x0 = 30, x1 = 270, my = 60 + rand(rng, -25, 25);
      for (let i = 0; i <= N; i++) { const t = i / N; pts.push([x0 + (x1 - x0) * t, 70 + Math.sin(t * Math.PI) * my * 0.6 + rand(rng, -3, 3) * jb]); } }
    else { const x0 = 30, x1 = 270, y0 = rand(rng, 45, 95), y1 = rand(rng, 45, 95);
      for (let i = 0; i <= N; i++) { const t = i / N; pts.push([x0 + (x1 - x0) * t, y0 + (y1 - y0) * t + (level > 45 ? rand(rng, -1.2, 1.2) * jb : 0)]); } }
    return { type: 'traj', params: { pts, timeLimit: Math.max(15 - level / 8, 6) }, answer: isHuman ? 'human' : 'bot', hint: '判断轨迹是人类（抖动曲线）还是机器人（匀速直线），限时，后期机器人会伪装。' };
  }
  function genRotate(level, rng) {
    const tolDeg = Math.max(24 - level / 5, 4);
    let start = rand(rng, -90, 90); if (Math.abs(start) < 12) start += start < 0 ? -18 : 18;
    return { type: 'rotate', params: { start, tolDeg, timeLimit: Math.max(20 - level / 6, 8) }, answer: 0, hint: '把倾斜图案转回正立（0°），容差很小，限时。' };
  }
  function genReflex(level, rng) {
    const maxMs = Math.max(620 - level * 3.5, 240);
    return { type: 'reflex', params: { waitMin: 1200, waitMax: 3800, maxMs: +maxMs.toFixed(0), timeLimit: 5.8 },
      hint: '按钮变蓝后立刻点；提前点判负，反应超过阈值也判负，阈值随关收紧。' };
  }
  function genDice(level, rng) {
    const count = Math.min(3 + Math.floor((level - 1) / 10), 9);
    const dice = []; let sum = 0;
    for (let i = 0; i < count; i++) { const v = randInt(rng, 1, 6); dice.push(v); sum += v; }
    return { type: 'dice', params: { dice, small: level >= 60, timeLimit: Math.max(20 - level / 6, 9) }, answer: sum, hint: '快速数出所有骰子总点数，越小越密集，限时。' };
  }
  function genMemory(level, rng) {
    const pairs = Math.min(3 + Math.floor((level - 1) / 14), 7);
    const ICONS = ['🚗', '🚦', '🚌', '🚲', '🔥', '🍕', '🧠', '🤖', '🎵', '🔑', '❤️', '🌳', '🐶', '🚁', '⛵'];
    const chosen = []; while (chosen.length < pairs) { const s = pick(rng, ICONS); if (!chosen.includes(s)) chosen.push(s); }
    const faces = shuffle(rng, [...chosen, ...chosen]);
    return { type: 'memory', params: { faces, pairs, timeLimit: Math.max(60 - level / 3, 35) }, answer: chosen, hint: '翻牌找出所有相同图案并配对，限时，错配翻回。' };
  }
  function genImpulse(level, rng) {
    const wait = Math.min(3 + level / 12, 8);
    return { type: 'impulse', params: { wait, tempt: level > 40, timeLimit: wait + 2 },
      hint: `保持手别碰黑钮，坚持 ${wait.toFixed(0)} 秒不点即过；提前按下判负。` };
  }
  function genCompare(level, rng) {
    let a, b, ans;
    const op = rng();
    if (op < 0.4) { a = randInt(rng, 20, 199); b = randInt(rng, 20, 199); }
    else if (op < 0.7) { a = randInt(rng, 2, 15) * randInt(rng, 2, 12); b = randInt(rng, 20, 199); }
    else { a = randInt(rng, 20, 199); b = randInt(rng, 2, 15) * randInt(rng, 2, 12); }
    ans = a === b ? '=' : (a > b ? '>' : '<');
    return { type: 'compare', params: { a, b, timeLimit: Math.max(12 - level / 12, 5) }, answer: ans, hint: '判断左边算式与右边大小，点 >、< 或 =，限时。' };
  }
  function genCommon(level, rng) {
    const c = pick(rng, COMMON);
    const opts = shuffle(rng, c.opts.map((o, i) => ({ o, a: i === c.a })));
    const answer = opts.findIndex(x => x.a);
    return { type: 'common', params: { q: c.q, opts: opts.map(x => x.o), timeLimit: Math.max(15 - level / 15, 8) }, answer, hint: '选出正确答案，限时。' };
  }
  function genMemorySeq(level, rng) {
    const len = Math.min(3 + Math.floor((level - 1) / 12), 8);
    const seq = []; for (let i = 0; i < len; i++) seq.push(randInt(rng, 0, 9));
    return { type: 'memorySeq', params: { seq, timeLimit: Math.max(25 - level / 8, 12) }, answer: seq.join(''), hint: '记住屏幕闪现的数字，消失后按顺序输入，限时。' };
  }
  function genColorPick(level, rng) {
    const COLORS = ['🔴', '🔵', '🟢', '🟡', '🟣', '🟠'];
    const target = pick(rng, COLORS);
    const n = level < 40 ? 4 : 6;
    const total = n * n;
    const cells = []; const targetSet = new Set();
    const need = Math.max(2, Math.round(total * 0.35));
    const idxs = shuffle(rng, [...Array(total).keys()]);
    idxs.slice(0, need).forEach(i => targetSet.add(i));
    for (let i = 0; i < total; i++) {
      if (targetSet.has(i)) cells.push(target);
      else { let d = pick(rng, COLORS); while (d === target) d = pick(rng, COLORS); cells.push(d); }
    }
    return { type: 'colorPick', params: { n, cells, target, timeLimit: Math.max(20 - level / 6, 9) }, answer: [...targetSet], hint: `点选所有${target}（同色），限时。` };
  }
  function genMirror(level, rng) {
    const ARROWS = ['⬆️', '⬇️', '⬅️', '➡️'];
    const n = level < 40 ? 4 : 5; const total = n * n;
    const cells = []; const targetSet = new Set();
    const need = Math.max(2, Math.round(total * 0.35));
    const idxs = shuffle(rng, [...Array(total).keys()]);
    idxs.slice(0, need).forEach(i => targetSet.add(i));
    for (let i = 0; i < total; i++) {
      cells.push(targetSet.has(i) ? '⬆️' : pick(rng, ['⬇️', '⬅️', '➡️']));
    }
    return { type: 'mirror', params: { n, cells, timeLimit: Math.max(20 - level / 6, 9) }, answer: [...targetSet], hint: '点选所有朝上（⬆️）的箭头，限时。' };
  }
  function genSpot(level, rng) {
    // 两格阵列，找出“与参考不同”的格子（用符号轻微变化模拟）
    const n = level < 40 ? 4 : 5; const total = n * n;
    const base = shuffle(rng, [...Array(total).keys()]);
    const diff = new Set(base.slice(0, Math.max(2, Math.round(total * 0.18))));
    const cells = [];
    for (let i = 0; i < total; i++) cells.push(diff.has(i) ? '🔺' : '🔵');
    return { type: 'spot', params: { n, cells, timeLimit: Math.max(20 - level / 6, 9) }, answer: [...diff], hint: '点选出形状与众不同（🔺）的格子，限时。' };
  }
  function genCar(level, rng) {
    const goal = Math.min(80 + level, 200); // 需要前进米数
    const speed = Math.min(2.2 + level / 18, 5); // 障碍下移速度
    const density = Math.min(0.25 + level / 300, 0.55); // 障碍出现概率
    return { type: 'car', params: { goal, speed, density, timeLimit: 40 }, answer: goal,
      hint: '点左/右半屏变道躲开车辆，前进到目标距离即过，手机点按即可。' };
  }
  function genCrosswalk(level, rng) {
    const lanes = Math.min(3 + Math.floor(level / 25), 6);
    const speed = Math.min(1.5 + level / 20, 4.5);
    return { type: 'crosswalk', params: { lanes, speed, timeLimit: 30 }, answer: lanes,
      hint: '点上箭头一步一步向前，躲开横向来车走到顶即过。' };
  }

  const GENS = { hold: genHold, grid: genGrid, distort: genDistort, slider: genSlider, seq: genSeq, math: genMath, traj: genTraj, rotate: genRotate, reflex: genReflex, dice: genDice, memory: genMemory, impulse: genImpulse, compare: genCompare, common: genCommon, memorySeq: genMemorySeq, colorPick: genColorPick, mirror: genMirror, spot: genSpot, car: genCar, crosswalk: genCrosswalk };

  function buildChallenge(level) {
    if (!PLAN) PLAN = buildPlan();
    const rng = mulberry32(level * 9973 + 7);
    const type = PLAN[(level - 1) % 100];
    const ch = GENS[type](level, rng);
    ch.level = level;
    ch.kindName = KIND_NAME[type];
    return ch;
  }

  function checkAnswer(ch, state) {
    switch (ch.type) {
      case 'hold': return !!state.passed;
      case 'grid': case 'colorPick': case 'mirror': case 'spot': {
        const sel = new Set(state.selected || []), ans = new Set(ch.answer);
        if (sel.size !== ans.size) return false;
        for (const v of ans) if (!sel.has(v)) return false;
        return true;
      }
      case 'distort': return (state.input || '').trim().toUpperCase().replace(/\s+/g, '') === ch.answer;
      case 'slider': return Math.abs(state.pos - ch.answer) <= ch.params.tolFrac;
      case 'seq': { const s = state.ordered || []; return s.length === ch.answer.length && s.every((v, i) => v === ch.answer[i]); }
      case 'math': case 'dice': { const v = parseFloat(state.input); return Number.isFinite(v) && v === ch.answer; }
      case 'traj': return state.pick === ch.answer;
      case 'rotate': { const d = Math.abs(((state.angle % 360) + 360) % 360); return Math.min(d, 360 - d) <= ch.params.tolDeg; }
      case 'compare': return state.pick === ch.answer;
      case 'common': return state.pick === ch.answer;
      case 'memorySeq': return (state.input || '').replace(/\s+/g, '') === ch.answer;
    }
    return false;
  }

  global.CaptchaLevels = { buildChallenge, checkAnswer, TYPES, KIND_NAME, TOTAL: 100 };
})(window);
