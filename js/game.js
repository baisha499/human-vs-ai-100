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
  const timerEl = $('#timer');

  let save = load();
  let current = Math.min(save.current || 1, TOTAL);
  let active = null;      // 当前挑战实例
  let locked = false;     // 成功/失败动画期间锁输入
  let finished = false;
  let countdownId = null; // 本关倒计时

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
    stopTimer();
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
    startTimer(ch);
    renderPicker();
    persist();
  }

  /* ---------- 统一倒计时 ---------- */
  function stopTimer() {
    if (countdownId) { clearInterval(countdownId); countdownId = null; }
    timerEl.textContent = '';
    timerEl.classList.remove('urgent');
  }
  function startTimer(ch) {
    stopTimer();
    const limit = ch.params && ch.params.timeLimit;
    if (!limit) return;
    let remain = limit;
    const tick = () => {
      remain -= 0.1;
      if (remain <= 0) {
        stopTimer();
        finish(false, '超时');
        return;
      }
      timerEl.textContent = `⏱ ${remain.toFixed(1)}s`;
      timerEl.classList.toggle('urgent', remain <= 5);
    };
    tick();
    countdownId = setInterval(tick, 100);
  }

  /* ---------- 判定 ---------- */
  function finish(ok, reason) {
    if (locked) return;
    stopTimer();
    locked = true;
    const ch = CaptchaLevels.buildChallenge(current);
    const state = active && typeof active.getState === 'function' ? active.getState() : {};
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
      verdict.textContent = reason === '超时' ? '✗ 超时未完成，重试' : '✗ 验证失败，请再试一次';
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
      grid: '点选所有符合要求的图标格子，选错/漏选都失败，限时。',
      distort: '从干扰线条和扭曲中读出字符，输入后提交，限时。',
      slider: '把滑块拖到与白色缺口精确重合，误差要求越来越小，限时。',
      seq: '按要求顺序依次点击，点错任意一个就清空重来，限时。',
      math: '心算结果并提交，多步/数列题限时，不允许借助工具。',
      traj: '人类轨迹带自然抖动弯曲，机器人是匀速直线，后期机器人会伪装，限时。',
      rotate: '把倾斜图案调到正立，角度要求越来越精确，限时。',
      reflex: '按钮变蓝后立刻点，提前点判负，反应超过毫秒阈值也判负。',
      dice: '快速数出所有骰子总点数并提交，骰子越小越密集，限时。',
      memory: '翻牌配对，把所有相同图案找出，错配翻回，限时。',
      impulse: '倒计时内坚决不要按黑钮，提前按下判负。',
      compare: '比较左右两个数大小，点 >、< 或 =。',
      common: '从四个选项里选出正确常识答案。',
      memorySeq: '记住闪现的数字，消失后按顺序输入。',
      colorPick: '点选出所有指定颜色的格子。',
      mirror: '点选出所有朝上的箭头。',
      spot: '点选出形状与众不同的格子。',
      car: '点左/右半屏变道躲开车辆，前进到目标距离即过。',
      crosswalk: '点向前按钮一步一步走，躲开横向来车走到顶。'
    };
    return R[type] || '';
  }

  /* ---------- 启动（支持 #关卡号 直达，如 #23） ---------- */
  const hashLv = parseInt(location.hash.replace('#', ''), 10);
  if (Number.isFinite(hashLv) && hashLv >= 1 && hashLv <= TOTAL) current = hashLv;
  loadLevel(current);
})();
