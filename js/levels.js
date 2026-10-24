/* ============================================================
 * levels.js —— 100 关难度曲线与题目生成 / 答案判定
 * 纯前端，零依赖。同一关使用 level 作为随机种子，刷新题目稳定。
 * ============================================================ */

(function (global) {
  'use strict';

  /* ---------- 可复现随机数（mulberry32） ---------- */
  function mulberry32(seed) {
    let a = seed >>> 0;
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function rand(rng, min, max) { return min + rng() * (max - min); }
  function randInt(rng, min, max) { return Math.floor(rand(rng, min, max + 1)); }
  function pick(rng, arr) { return arr[Math.floor(rng() * arr.length)]; }

  /* ---------- 8 类验证挑战，按关循环轮换 ---------- */
  const TYPES = ['hold', 'grid', 'distort', 'slider', 'seq', 'math', 'traj', 'rotate'];

  const KIND_NAME = {
    hold: '按住复选框（行为检测）',
    grid: '点选图片网格（视觉识别）',
    distort: '辨认扭曲字符（OCR 对抗）',
    slider: '滑块拼图对齐（轨迹+精度）',
    seq: '按顺序点击（注意+顺序）',
    math: '口算验证（计算力）',
    traj: '轨迹判别人 / 机（行为识别）',
    rotate: '旋转转正（空间感知）'
  };

  /* ---------- 图片网格类别池 ---------- */
  const GRID_POOL = [
    { label: '汽车', emoji: '🚗', distract: ['🚌', '🚕', '🚚', '🏍️'] },
    { label: '公交车', emoji: '🚌', distract: ['🚗', '🚚', '🚐', '🚕'] },
    { label: '自行车', emoji: '🚲', distract: ['🏍️', '🚗', '🛴'] },
    { label: '红绿灯', emoji: '🚦', distract: ['🚥', '🚏', '🗽'] },
    { label: '消防栓', emoji: '🧯', distract: ['🔥', '🪣', '🧰'] },
    { label: '小船', emoji: '⛵', distract: ['🚢', '🛶', '🎈'] },
    { label: '小鸟', emoji: '🐦', distract: ['🦋', '🐝', '🐤'] },
    { label: '猫', emoji: '🐱', distract: ['🐶', '🐰', '🦊'] },
    { label: '树', emoji: '🌳', distract: ['🌸', '🌿', '🍄'] },
    { label: '梯子', emoji: '🪜', distract: ['🪑', '🚧', '⛏️'] }
  ];

  /* ---------- 各类型题目生成 ---------- */

  function genHold(level, rng) {
    // 按住秒数 1 -> 3；40 关后要求按住过程中有微小位移（模拟人手）
    const holdSec = Math.min(1 + Math.floor(level / 20), 3);
    return {
      type: 'hold',
      params: { holdSec, needMicroMove: level > 40 },
      hint: `用手指/鼠标按住复选框保持 ${holdSec} 秒不要松开，机器人会瞬间打勾。`
    };
  }

  function genGrid(level, rng) {
    // 网格 2 -> 4；后期加噪声/模糊
    let n;
    if (level < 10) n = 2;
    else if (level < 28) n = 3;
    else if (level < 55) n = 3;
    else if (level < 80) n = 4;
    else n = 4;

    const cat = pick(rng, GRID_POOL);
    const total = n * n;
    const targetCount = Math.max(1, Math.round(total * (level < 28 ? 0.3 : 0.38)));
    const idxs = [...Array(total).keys()];
    // 洗牌
    for (let i = idxs.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [idxs[i], idxs[j]] = [idxs[j], idxs[i]];
    }
    const targetSet = new Set(idxs.slice(0, targetCount));
    const cells = [];
    for (let i = 0; i < total; i++) {
      if (targetSet.has(i)) cells.push(cat.emoji);
      else cells.push(pick(rng, cat.distract));
    }
    return {
      type: 'grid',
      params: {
        n, cells, target: cat.label,
        noise: level >= 55, blur: level >= 80
      },
      answer: [...targetSet],
      hint: `点选所有「${cat.label}」所在的格子，选完点提交。`
    };
  }

  function genDistort(level, rng) {
    const CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
    const len = Math.min(4 + Math.floor((level - 1) / 14), 8);
    let ans = '';
    for (let i = 0; i < len; i++) ans += CHARS[Math.floor(rng() * CHARS.length)];
    return {
      type: 'distort',
      params: {
        answer: ans,
        wobble: 0.4 + level / 100,   // 扭曲幅度
        noise: Math.min(level / 6, 14), // 噪声条数
        rotate: Math.min(8 + level / 6, 26) // 单字旋转角度
      },
      answer: ans,
      hint: '输入图中扭曲显示的字符（不分大小写），看不清可重试。'
    };
  }

  function genSlider(level, rng) {
    // 容差（相对轨道比例）从 0.10 收到 0.035
    const tol = Math.max(0.10 - level / 1000, 0.035);
    const gap = rand(rng, 0.18, 0.82);
    return {
      type: 'slider',
      params: { gap, tolFrac: tol },
      answer: gap,
      hint: '拖动蓝色滑块，让它对齐白色缺口，越往后允许误差越小。'
    };
  }

  function genSeq(level, rng) {
    const k = Math.min(3 + Math.floor((level - 1) / 12), 8);
    let symbols, order;
    if (level < 50) {
      // 数字升序
      const pool = [];
      while (pool.length < k) { const v = randInt(rng, 1, 30); if (!pool.includes(v)) pool.push(v); }
      symbols = pool.slice();
      order = pool.slice().sort((a, b) => a - b);
    } else if (level < 80) {
      const LET = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
      const set = new Set();
      while (set.size < k) set.add(LET[Math.floor(rng() * LET.length)]);
      symbols = [...set];
      order = [...set].sort();
    } else {
      // 数字降序
      const pool = [];
      while (pool.length < k) { const v = randInt(rng, 1, 40); if (!pool.includes(v)) pool.push(v); }
      symbols = pool.slice();
      order = pool.slice().sort((a, b) => b - a);
    }
    // 打乱展示顺序
    const display = symbols.slice();
    for (let i = display.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [display[i], display[j]] = [display[j], display[i]];
    }
    return {
      type: 'seq',
      params: { display, asc: level < 80 },
      answer: order,
      hint: level < 50 ? '按数字从小到大依次点击。'
        : level < 80 ? '按字母 A→Z 顺序依次点击。'
          : '按数字从大到小依次点击。'
    };
  }

  function genMath(level, rng) {
    let q, ans;
    if (level < 15) {
      const a = randInt(rng, 10, 99), b = randInt(rng, 10, 99);
      if (rng() < 0.5) { q = `${a} + ${b}`; ans = a + b; }
      else { q = `${a} − ${b}`; ans = a - b; }
    } else if (level < 35) {
      const a = randInt(rng, 20, 199), b = randInt(rng, 20, 199);
      if (rng() < 0.5) { q = `${a} + ${b}`; ans = a + b; }
      else { q = `${a} − ${b}`; ans = a - b; }
    } else if (level < 60) {
      const a = randInt(rng, 2, 15), b = randInt(rng, 2, 12);
      q = `${a} × ${b}`; ans = a * b;
    } else if (level < 85) {
      const b = randInt(rng, 2, 12), q2 = randInt(rng, 2, 15), a = b * q2;
      q = `${a} ÷ ${b}`; ans = q2;
    } else {
      const a = randInt(rng, 3, 20), b = randInt(rng, 2, 12), c = randInt(rng, 10, 99);
      if (rng() < 0.5) { q = `${a} × ${b} + ${c}`; ans = a * b + c; }
      else { q = `${c} + ${a} × ${b}`; ans = c + a * b; }
    }
    return { type: 'math', params: { q }, answer: ans, hint: '算出结果并填写，机器人靠查表，人类靠思考。' };
  }

  function genTraj(level, rng) {
    // 生成一条轨迹点：human=带抖动平滑曲线；bot=直线匀速（高关加微抖动迷惑）
    const isHuman = rng() < 0.5;
    const pts = [];
    const N = 24;
    const jitterBase = level > 60 ? 0.35 : 1; // 高关机器人更像人
    if (isHuman) {
      const x0 = 30, x1 = 270, midY = 60 + rand(rng, -25, 25);
      for (let i = 0; i <= N; i++) {
        const t = i / N;
        const x = x0 + (x1 - x0) * t;
        // 平滑弯曲曲线 + 人手抖动
        const y = 70 + Math.sin(t * Math.PI) * midY * 0.6 + rand(rng, -3, 3) * jitterBase;
        pts.push([x, y]);
      }
    } else {
      const x0 = 30, x1 = 270, y0 = rand(rng, 45, 95), y1 = rand(rng, 45, 95);
      for (let i = 0; i <= N; i++) {
        const t = i / N;
        const micro = level > 60 ? rand(rng, -1.2, 1.2) * jitterBase : 0;
        pts.push([x0 + (x1 - x0) * t, y0 + (y1 - y0) * t + micro]);
      }
    }
    return {
      type: 'traj',
      params: { pts },
      answer: isHuman ? 'human' : 'bot',
      hint: '观察这条移动轨迹，判断它是「人类」操作还是「机器人」程序生成。'
    };
  }

  function genRotate(level, rng) {
    const tolDeg = Math.max(24 - Math.floor(level / 6), 5);
    let start = rand(rng, -90, 90);
    // 避免起点太接近 0（保证有意义）
    if (Math.abs(start) < 12) start += start < 0 ? -18 : 18;
    return {
      type: 'rotate',
      params: { start, tolDeg, hard: level >= 70 },
      answer: 0,
      hint: '拖动滑块把倾斜的图案旋转回正立（0°），越往后容差越小。'
    };
  }

  /* ---------- 对外：构建某一关 ---------- */
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
    }
    ch.level = level;
    ch.kindName = KIND_NAME[type];
    return ch;
  }

  /* ---------- 判定：state 由挑战交互层回传 ---------- */
  function checkAnswer(ch, state) {
    switch (ch.type) {
      case 'hold': return !!state.passed;
      case 'grid': {
        const sel = new Set(state.selected || []);
        const ans = new Set(ch.answer);
        if (sel.size !== ans.size) return false;
        for (const v of ans) if (!sel.has(v)) return false;
        return true;
      }
      case 'distort': {
        const got = (state.input || '').trim().toUpperCase().replace(/\s+/g, '');
        return got === ch.answer;
      }
      case 'slider': {
        return Math.abs(state.pos - ch.answer) <= ch.params.tolFrac;
      }
      case 'seq': {
        const seq = state.ordered || [];
        if (seq.length !== ch.answer.length) return false;
        return seq.every((v, i) => v === ch.answer[i]);
      }
      case 'math': {
        const v = parseFloat(state.input);
        return Number.isFinite(v) && v === ch.answer;
      }
      case 'traj': return state.pick === ch.answer;
      case 'rotate': {
        const d = Math.abs(((state.angle % 360) + 360) % 360);
        const near = Math.min(d, 360 - d);
        return near <= ch.params.tolDeg;
      }
    }
    return false;
  }

  global.CaptchaLevels = { buildChallenge, checkAnswer, TYPES, KIND_NAME, TOTAL: 100 };
})(window);
