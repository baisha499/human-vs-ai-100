/* ============================================================
 * levels.js —— 100 关难度曲线 / 题目生成 / 答案判定（加难版）
 * 纯前端零依赖。level 作随机种子，同关题目稳定。
 * 每关 params.timeLimit 为秒，由 game.js 统一倒计时，超时判负。
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

  /* 11 类验证挑战，按关循环轮换 */
  const TYPES = ['hold', 'grid', 'distort', 'slider', 'seq', 'math', 'traj', 'rotate', 'reflex', 'dice', 'memory'];

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
    memory: '记忆配对（工作记忆）'
  };

  /* 图片网格：目标 emoji + 高相似干扰（刁钻边界） */
  const GRID_POOL = [
    { label: '汽车', emoji: '🚗', distract: ['🚕', '🚙', '🚐', '🏎️'] },
    { label: '公交车', emoji: '🚌', distract: ['🚍', '🚎', '🚐', '🚋'] },
    { label: '卡车', emoji: '🚚', distract: ['🚛', '🛻', '🚐', '🚗'] },
    { label: '自行车', emoji: '🚲', distract: ['🛴', '🚵', '🛺', '🚴'] },
    { label: '摩托车', emoji: '🏍️', distract: ['🛵', '🚲', '🚗', '🛹'] },
    { label: '红绿灯', emoji: '🚦', distract: ['🚥', '🗽', '🚏', '⚡'] },
    { label: '消防栓', emoji: '🧯', distract: ['🔥', '🪣', '🧰', '🚒'] },
    { label: '小船', emoji: '⛵', distract: ['🚢', '🛶', '🎈', '🛟'] },
    { label: '公交车站', emoji: '🚏', distract: ['🚦', '🗽', '🚧', '🚍'] },
    { label: '自行车运动员', emoji: '🚵', distract: ['🚴', '🏍️', '🚲', '🛹'] }
  ];

  /* ---------- 各类型题目 ---------- */

  function genHold(level, rng) {
    const holdSec = Math.min(1 + level / 28, 3.5);
    return {
      type: 'hold',
      params: { holdSec: +holdSec.toFixed(1), needMicroMove: level > 25, timeLimit: holdSec + 3 },
      hint: `用手指/鼠标按住复选框保持 ${holdSec.toFixed(1)} 秒别松开，瞬间打勾=机器人。`
    };
  }

  function genGrid(level, rng) {
    let n;
    if (level < 8) n = 2;
    else if (level < 22) n = 3;
    else if (level < 45) n = 3;
    else if (level < 72) n = 4;
    else n = 4;

    const cat = pick(rng, GRID_POOL);
    const total = n * n;
    const targetCount = Math.max(1, Math.round(total * (level < 22 ? 0.34 : 0.42)));
    const idxs = [...Array(total).keys()];
    for (let i = idxs.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [idxs[i], idxs[j]] = [idxs[j], idxs[i]]; }
    const targetSet = new Set(idxs.slice(0, targetCount));
    const cells = [];
    for (let i = 0; i < total; i++) cells.push(targetSet.has(i) ? cat.emoji : pick(rng, cat.distract));
    return {
      type: 'grid',
      params: { n, cells, target: cat.label, noise: level >= 45, blur: level >= 72, timeLimit: Math.max(30 - level / 5, 12) },
      answer: [...targetSet],
      hint: `点选所有「${cat.label}」（含半个/边缘也算），选错漏选都失败，注意限时。`
    };
  }

  function genDistort(level, rng) {
    const CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
    const len = Math.min(4 + Math.floor((level - 1) / 12), 8);
    let ans = '';
    for (let i = 0; i < len; i++) ans += CHARS[Math.floor(rng() * CHARS.length)];
    return {
      type: 'distort',
      params: {
        answer: ans, wobble: 0.5 + level / 90, noise: Math.min(8 + level / 3, 18),
        rotate: Math.min(10 + level / 5, 30), timeLimit: Math.max(25 - level / 5, 10)
      },
      answer: ans,
      hint: '从淹没的干扰线和扭曲中读出字符（不分大小写），限时提交。'
    };
  }

  function genSlider(level, rng) {
    const tol = Math.max(0.10 - level / 1200, 0.02);
    const gap = rand(rng, 0.15, 0.85);
    return {
      type: 'slider',
      params: { gap, tolFrac: tol, timeLimit: Math.max(20 - level / 6, 8) },
      answer: gap,
      hint: '拖动滑块精确对齐白色缺口，误差越小越往后越苛刻，限时。'
    };
  }

  function genSeq(level, rng) {
    const k = Math.min(3 + Math.floor((level - 1) / 11), 8);
    let symbols, order, hint;
    if (level < 33) {
      const pool = [];
      while (pool.length < k) { const v = randInt(rng, 1, 40); if (!pool.includes(v)) pool.push(v); }
      symbols = pool.slice(); order = pool.slice().sort((a, b) => a - b);
      hint = '按数字从小到大依次点击。';
    } else if (level < 66) {
      const LET = 'ABCDEFGHJKLMNPQRSTUVWXYZ'; const set = new Set();
      while (set.size < k) set.add(LET[Math.floor(rng() * LET.length)]);
      symbols = [...set]; order = [...set].sort();
      hint = '按字母 A→Z 顺序依次点击。';
    } else {
      const pool = [];
      while (pool.length < k) { const v = randInt(rng, 1, 60); if (!pool.includes(v)) pool.push(v); }
      symbols = pool.slice(); order = pool.slice().sort((a, b) => b - a);
      hint = '按数字从大到小依次点击。';
    }
    const display = symbols.slice();
    for (let i = display.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [display[i], display[j]] = [display[j], display[i]]; }
    return {
      type: 'seq',
      params: { display, timeLimit: Math.max(20 - level / 6, 9) },
      answer: order,
      hint
    };
  }

  function genMath(level, rng) {
    let q, ans;
    if (level < 12) {
      const a = randInt(rng, 20, 199), b = randInt(rng, 20, 199);
      if (rng() < 0.5) { q = `${a} + ${b}`; ans = a + b; } else { q = `${a} − ${b}`; ans = a - b; }
    } else if (level < 30) {
      const a = randInt(rng, 2, 15), b = randInt(rng, 2, 12);
      q = `${a} × ${b}`; ans = a * b;
    } else if (level < 52) {
      const b = randInt(rng, 2, 12), q2 = randInt(rng, 3, 15), a = b * q2;
      q = `${a} ÷ ${b}`; ans = q2;
    } else if (level < 76) {
      const a = randInt(rng, 4, 20), b = randInt(rng, 2, 12), c = randInt(rng, 20, 99);
      q = `${a} × ${b} + ${c}`; ans = a * b + c;
    } else {
      const d = randInt(rng, 2, 9), first = randInt(rng, 1, 9);
      const seq = [first, first + d, first + 2 * d, first + 3 * d];
      q = seq.join(', ') + ', ?'; ans = first + 4 * d;
    }
    return { type: 'math', params: { q, timeLimit: Math.max(20 - level / 6, 8) }, answer: ans, hint: '心算结果填答案，多步/数列题限时，不允许借助工具。' };
  }

  function genTraj(level, rng) {
    const isHuman = rng() < 0.5;
    const pts = []; const N = 24;
    const jitterBase = level > 45 ? 0.3 : 1;
    if (isHuman) {
      const x0 = 30, x1 = 270, midY = 60 + rand(rng, -25, 25);
      for (let i = 0; i <= N; i++) { const t = i / N;
        pts.push([x0 + (x1 - x0) * t, 70 + Math.sin(t * Math.PI) * midY * 0.6 + rand(rng, -3, 3) * jitterBase]); }
    } else {
      const x0 = 30, x1 = 270, y0 = rand(rng, 45, 95), y1 = rand(rng, 45, 95);
      for (let i = 0; i <= N; i++) { const t = i / N;
        pts.push([x0 + (x1 - x0) * t, y0 + (y1 - y0) * t + (level > 45 ? rand(rng, -1.2, 1.2) * jitterBase : 0)]); }
    }
    return {
      type: 'traj',
      params: { pts, timeLimit: Math.max(15 - level / 8, 6) },
      answer: isHuman ? 'human' : 'bot',
      hint: '判断轨迹是人类（自然抖动曲线）还是机器人（匀速直线），限时，后期机器人会伪装。'
    };
  }

  function genRotate(level, rng) {
    const tolDeg = Math.max(24 - level / 5, 4);
    let start = rand(rng, -90, 90);
    if (Math.abs(start) < 12) start += start < 0 ? -18 : 18;
    return {
      type: 'rotate',
      params: { start, tolDeg, timeLimit: Math.max(20 - level / 6, 8) },
      answer: 0,
      hint: '把倾斜图案转回正立（0°），容差很小，限时。'
    };
  }

  function genReflex(level, rng) {
    const maxMs = Math.max(620 - level * 3.5, 240);
    return {
      type: 'reflex',
      params: { waitMin: 1200, waitMax: 3800, maxMs: +maxMs.toFixed(0), timeLimit: 3.8 + 2 },
      hint: '按钮变蓝后以最快速度点击；提前点判负，反应超过阈值也判负，阈值随关收紧。'
    };
  }

  function genDice(level, rng) {
    const count = Math.min(3 + Math.floor((level - 1) / 10), 9);
    const dice = []; let sum = 0;
    for (let i = 0; i < count; i++) { const v = randInt(rng, 1, 6); dice.push(v); sum += v; }
    return {
      type: 'dice',
      params: { dice, small: level >= 60, timeLimit: Math.max(20 - level / 6, 9) },
      answer: sum,
      hint: '快速数出所有骰子的总点数，骰子越小越密集，限时。'
    };
  }

  function genMemory(level, rng) {
    const pairs = Math.min(3 + Math.floor((level - 1) / 14), 7);
    const ICONS = ['🚗', '🚦', '🚌', '🚲', '🔥', '🍕', '🧠', '🤖', '🎵', '🔑', '❤️', '🌳'];
    const chosen = [];
    while (chosen.length < pairs) { const s = pick(rng, ICONS); if (!chosen.includes(s)) chosen.push(s); }
    const faces = [...chosen, ...chosen];
    for (let i = faces.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [faces[i], faces[j]] = [faces[j], faces[i]]; }
    return {
      type: 'memory',
      params: { faces, pairs, timeLimit: Math.max(60 - level / 3, 35) },
      answer: chosen,
      hint: '翻牌找出所有相同图案并配对，限时，错配会翻回。'
    };
  }

  function buildChallenge(level) {
    const rng = mulberry32(level * 9973 + 7);
    const type = TYPES[(level - 1) % TYPES.length];
    let ch;
    switch (type) {
      case 'hold': ch = genHold(level, rng); break;
      case 'grid': ch = genGrid(level, rng); break;
      case 'distort': ch = genDistort(level, rng); break;
      case 'slider': ch = genSlider(level, rng); break;
      case 'seq': ch = genSeq(level, rng); break;
      case 'math': ch = genMath(level, rng); break;
      case 'traj': ch = genTraj(level, rng); break;
      case 'rotate': ch = genRotate(level, rng); break;
      case 'reflex': ch = genReflex(level, rng); break;
      case 'dice': ch = genDice(level, rng); break;
      case 'memory': ch = genMemory(level, rng); break;
    }
    ch.level = level;
    ch.kindName = KIND_NAME[type];
    return ch;
  }

  function checkAnswer(ch, state) {
    switch (ch.type) {
      case 'hold': return !!state.passed;
      case 'grid': {
        const sel = new Set(state.selected || []), ans = new Set(ch.answer);
        if (sel.size !== ans.size) return false;
        for (const v of ans) if (!sel.has(v)) return false;
        return true;
      }
      case 'distort': return (state.input || '').trim().toUpperCase().replace(/\s+/g, '') === ch.answer;
      case 'slider': return Math.abs(state.pos - ch.answer) <= ch.params.tolFrac;
      case 'seq': {
        const seq = state.ordered || [];
        return seq.length === ch.answer.length && seq.every((v, i) => v === ch.answer[i]);
      }
      case 'math': { const v = parseFloat(state.input); return Number.isFinite(v) && v === ch.answer; }
      case 'traj': return state.pick === ch.answer;
      case 'rotate': { const d = Math.abs(((state.angle % 360) + 360) % 360); return Math.min(d, 360 - d) <= ch.params.tolDeg; }
      case 'dice': { const v = parseFloat(state.input); return Number.isFinite(v) && v === ch.answer; }
    }
    return false;
  }

  global.CaptchaLevels = { buildChallenge, checkAnswer, TYPES, KIND_NAME, TOTAL: 100 };
})(window);
