/* ============================================================
 * game.js —— 游戏引擎：关卡推进 / 本地存档 / 选关 / 判定反馈
 * ============================================================ */
(function () {
  'use strict';

  const STORE_KEY = 'hvai100.save.v1';
  const TOTAL = CaptchaLevels.TOTAL;

  const $ = (sel) => document.querySelector(sel);
  const stage = $('#challenge-stage');
  const verdict = $('#verdict');
  const btnSubmit = $('#btn-submit');
  const kindEl = $('#challenge-kind');
  const hintEl = $('#challenge-hint');
  const levelLabel = $('#level-label');
  const bestLabel = $('#best-label');
  const fill = $('#progress-fill');
  const picker = $('#level-picker');

  let save = load();
  let current = Math.min(save.current || 1, TOTAL);
  let active = null;      // 当前挑战实例
  let locked = false;     // 成功/失败动画期间锁输入
  let finished = false;

  function load() {
    try { return JSON.parse(localStorage.getItem(STORE_KEY)) || {}; }
    catch { return {}; }
  }
  function persist() {
    save.best = Math.max(save.best || 1, current);
    save.current = current;
    localStorage.setItem(STORE_KEY, JSON.stringify(save));
  }

  /* ---------- 渲染一关 ---------- */
  function loadLevel(level) {
    current = Math.max(1, Math.min(TOTAL, level));
    const ch = CaptchaLevels.buildChallenge(current);
    locked = false;
    finished = false;

    stage.innerHTML = '';
    if (active && typeof active.dispose === 'function') active.dispose();
    active = null;
    verdict.className = 'verdict hidden';
    btnSubmit.classList.add('hidden');

    kindEl.textContent = ch.kindName;
    hintEl.textContent = ch.hint;
    levelLabel.textContent = `第 ${current} / ${TOTAL} 关`;
    bestLabel.textContent = `最高解锁：${save.best || 1}`;
    fill.style.width = ((current - 1) / TOTAL * 100) + '%';

    const handlers = {
      report(ok) { finish(ok); },
      setSubmitVisible(v) { btnSubmit.classList.toggle('hidden', !v); }
    };
    active = CaptchaChallenges.render(ch, stage, handlers);
    renderPicker();
    persist();
  }

  /* ---------- 判定 ---------- */
  function finish(ok) {
    if (locked) return;
    locked = true;
    const ch = CaptchaLevels.buildChallenge(current);
    const state = active ? active.getState() : {};
    const passed = ok === undefined ? CaptchaLevels.checkAnswer(ch, state) : ok;

    if (passed) {
      verdict.className = 'verdict ok';
      verdict.textContent = '✓ 验证通过 · 你是人类';
      fill.style.width = (current / TOTAL * 100) + '%';
      save.best = Math.max(save.best || 1, current + 1);
      persist();
      if (current >= TOTAL) {
        finished = true;
        setTimeout(() => {
          alert('🎉 恭喜！你通过了全部 100 关终极人机测试，机器人没能拦住你！');
          locked = false;
          renderPicker();
        }, 900);
        return;
      }
      setTimeout(() => loadLevel(current + 1), 1100);
    } else {
      verdict.className = 'verdict no';
      verdict.textContent = '✗ 验证失败，请再试一次';
      setTimeout(() => { loadLevel(current); }, 900);
    }
  }

  /* ---------- 选关网格 ---------- */
  function renderPicker() {
    picker.innerHTML = '';
    for (let i = 1; i <= TOTAL; i++) {
      const cell = document.createElement('div');
      cell.className = 'level-cell';
      cell.textContent = i;
      const unlocked = i <= (save.best || 1);
      if (!unlocked) cell.classList.add('locked');
      if (i === current) cell.classList.add('cur');
      else if (i < (save.best || 1)) cell.classList.add('done');
      if (unlocked) {
        cell.addEventListener('click', () => {
          if (!locked) loadLevel(i);
        });
      }
      picker.append(cell);
    }
  }

  /* ---------- 事件 ---------- */
  btnSubmit.addEventListener('click', () => finish());
  $('#btn-restart').addEventListener('click', () => { if (!locked) loadLevel(current); });
  $('#btn-skip').addEventListener('click', () => {
    const ch = CaptchaLevels.buildChallenge(current);
    alert(`【第 ${current} 关 · ${ch.kindName}】\n\n${ch.hint}\n\n规则：${ruleText(ch.type)}`);
  });

  function ruleText(type) {
    const R = {
      hold: '按住复选框直到进度条走完，提前松手或瞬间打勾都会被判定为机器人。',
      grid: '点选所有符合要求的图标格子，选错/漏选都失败。',
      distort: '从干扰线条和扭曲中读出字符，输入后提交。',
      slider: '把滑块拖到与白色缺口完全重合，误差要在允许范围内。',
      seq: '按照要求的顺序依次点击，点错任意一个就清空重来。',
      math: '心算出算式结果并提交，不允许借助工具。',
      traj: '人类轨迹带自然抖动和弯曲，机器人是匀速直线，仔细分辨。',
      rotate: '把倾斜图案调到正立，角度越往后要求越精确。'
    };
    return R[type] || '';
  }

  /* ---------- 启动（支持 #关卡号 直达，如 #23） ---------- */
  const hashLv = parseInt(location.hash.replace('#', ''), 10);
  if (Number.isFinite(hashLv) && hashLv >= 1 && hashLv <= TOTAL) current = hashLv;
  loadLevel(current);
})();
