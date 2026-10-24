/* ============================================================
 * challenges.js —— 8 类验证挑战的渲染 / 交互 / 状态采集
 * 由 game.js 调用 render(ch, stage, handlers)，返回 { getState }
 * ============================================================ */
(function (global) {
  'use strict';

  const NS = 'http://www.w3.org/1999/xhtml';
  function el(tag, cls, html) {
    const d = document.createElement(tag);
    if (cls) d.className = cls;
    if (html != null) d.innerHTML = html;
    return d;
  }

  /* ================= 1. 按住复选框 ================= */
  function renderHold(ch, stage, h) {
    const p = ch.params;
    let held = false, t0 = 0, moveDist = 0, lastXY = null, raf = null, passed = false;

    const row = el('div', 'check-row');
    const box = el('div', 'big-checkbox');
    const label = el('div', 'check-label', '我不是机器人');
    row.append(box, label);
    const track = el('div', 'hold-track');
    const fill = el('div');
    track.append(fill);
    stage.append(row, track);

    const tick = () => {
      if (!held) return;
      const dt = (performance.now() - t0) / 1000;
      const ratio = Math.min(dt / p.holdSec, 1);
      fill.style.width = (ratio * 100) + '%';
      const microOk = !p.needMicroMove || moveDist > 6;
      if (ratio >= 1 && microOk) {
        passed = true; held = false;
        box.classList.add('checked');
        h.report(true);
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    const down = (e) => {
      e.preventDefault();
      held = true; t0 = performance.now(); moveDist = 0;
      lastXY = [e.clientX, e.clientY];
      box.setPointerCapture && box.setPointerCapture(e.pointerId);
      raf = requestAnimationFrame(tick);
    };
    const move = (e) => {
      if (!held || !lastXY) return;
      moveDist += Math.abs(e.clientX - lastXY[0]) + Math.abs(e.clientY - lastXY[1]);
      lastXY = [e.clientX, e.clientY];
    };
    const up = () => {
      if (held) { held = false; fill.style.width = '0%'; }
    };
    box.addEventListener('pointerdown', down);
    box.addEventListener('pointermove', move);
    box.addEventListener('pointerup', up);
    box.addEventListener('pointercancel', up);

    return {
      getState: () => ({ passed }),
      dispose: () => cancelAnimationFrame(raf)
    };
  }

  /* ================= 2. 点选图片网格 ================= */
  function renderGrid(ch, stage, h) {
    const p = ch.params;
    const selected = new Set();
    const wrap = el('div', 'grid-wrap');
    wrap.style.gridTemplateColumns = `repeat(${p.n},1fr)`;

    p.cells.forEach((emoji, i) => {
      const cell = el('div', 'grid-cell');
      const cv = document.createElement('canvas');
      const size = 120;
      cv.width = size; cv.height = size;
      const ctx = cv.getContext('2d');
      if (p.blur) ctx.filter = 'blur(1.5px)';
      ctx.font = '64px serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(emoji, size / 2, size / 2 + 4);
      if (p.noise) {
        for (let k = 0; k < 26; k++) {
          ctx.fillStyle = `rgba(0,0,0,${Math.random() * 0.18})`;
          ctx.fillRect(Math.random() * size, Math.random() * size, 2, 2);
        }
      }
      cell.append(cv);
      cell.addEventListener('click', () => {
        if (selected.has(i)) { selected.delete(i); cell.classList.remove('sel'); }
        else { selected.add(i); cell.classList.add('sel'); }
      });
      wrap.append(cell);
    });
    stage.append(wrap);
    h.setSubmitVisible(true);
    return { getState: () => ({ selected: [...selected] }) };
  }

  /* ================= 3. 扭曲字符 ================= */
  function renderDistort(ch, stage, h) {
    const p = ch.params;
    const wrap = el('div', 'distort-wrap');
    const cv = document.createElement('canvas');
    cv.width = 340; cv.height = 96;
    cv.className = 'distort-canvas';
    const ctx = cv.getContext('2d');
    ctx.clearRect(0, 0, cv.width, cv.height);
    // 噪声线
    for (let n = 0; n < p.noise; n++) {
      ctx.strokeStyle = `rgba(80,80,80,${0.15 + Math.random() * 0.25})`;
      ctx.beginPath();
      ctx.moveTo(Math.random() * cv.width, Math.random() * cv.height);
      ctx.bezierCurveTo(Math.random() * cv.width, Math.random() * cv.height,
        Math.random() * cv.width, Math.random() * cv.height,
        Math.random() * cv.width, Math.random() * cv.height);
      ctx.stroke();
    }
    const n = p.answer.length;
    const step = cv.width / (n + 1);
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    for (let i = 0; i < n; i++) {
      const chx = p.answer[i];
      const x = step * (i + 1);
      const y = cv.height / 2 + Math.sin(i * 1.7) * 12 * p.wobble;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate((Math.random() - 0.5) * p.rotate * Math.PI / 90);
      ctx.font = 'bold 52px "Courier New", monospace';
      ctx.fillStyle = '#333';
      ctx.fillText(chx, 0, 0);
      ctx.restore();
    }
    const input = document.createElement('input');
    input.className = 'text-input';
    input.maxLength = n;
    input.placeholder = '输入看到的字符';
    wrap.append(cv, input);
    stage.append(wrap);
    h.setSubmitVisible(true);
    return { getState: () => ({ input: input.value }) };
  }

  /* ================= 4. 滑块拼图 ================= */
  function renderSlider(ch, stage, h) {
    const p = ch.params;
    const box = el('div', 'slider-box');
    const track = el('div', 'slider-track');
    const gap = el('div', 'slider-gap');
    gap.style.left = (p.gap * 100) + '%';
    const knob = el('div', 'slider-knob', '⟨ ⟩');
    let pos = 0;
    knob.style.left = '0%';
    track.append(gap, knob);
    box.append(track);
    stage.append(box);
    h.setSubmitVisible(true);

    const update = (clientX) => {
      const r = track.getBoundingClientRect();
      pos = Math.min(1, Math.max(0, (clientX - r.left) / r.width));
      knob.style.left = (pos * 100) + '%';
    };
    knob.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      knob.setPointerCapture && knob.setPointerCapture(e.pointerId);
      const mv = (ev) => update(ev.clientX);
      const up = () => {
        knob.removeEventListener('pointermove', mv);
        knob.removeEventListener('pointerup', up);
      };
      knob.addEventListener('pointermove', mv);
      knob.addEventListener('pointerup', up);
    });
    return { getState: () => ({ pos }) };
  }

  /* ================= 5. 顺序点击 ================= */
  function renderSeq(ch, stage, h) {
    const p = ch.params;
    const wrap = el('div', 'seq-wrap');
    const ordered = [];
    const pills = [];
    p.display.forEach((sym) => {
      const pill = el('div', 'seq-pill', String(sym));
      pill.addEventListener('click', () => {
        if (pill.classList.contains('done')) return;
        const expect = ch.answer[ordered.length];
        if (sym === expect) {
          ordered.push(sym);
          pill.classList.add('done');
          if (ordered.length === ch.answer.length) h.report(true);
        } else {
          // 点错：清空重来
          pills.forEach(x => x.classList.remove('done', 'wrong'));
          pill.classList.add('wrong');
          ordered.length = 0;
          setTimeout(() => pill.classList.remove('wrong'), 400);
        }
      });
      pills.push(pill);
      wrap.append(pill);
    });
    stage.append(wrap);
    return { getState: () => ({ ordered }) };
  }

  /* ================= 6. 口算 ================= */
  function renderMath(ch, stage, h) {
    const wrap = el('div', 'math-wrap');
    const q = el('div', 'math-q', ch.params.q + ' = ?');
    const input = document.createElement('input');
    input.className = 'math-input';
    input.type = 'number';
    input.inputMode = 'numeric';
    input.placeholder = '答案';
    wrap.append(q, input);
    stage.append(wrap);
    h.setSubmitVisible(true);
    input.focus && input.focus();
    return { getState: () => ({ input: input.value }) };
  }

  /* ================= 7. 轨迹判别人/机 ================= */
  function renderTraj(ch, stage, h) {
    const p = ch.params;
    const wrap = el('div', 'traj-wrap');
    const cv = document.createElement('canvas');
    cv.width = 300; cv.height = 140;
    cv.className = 'traj-canvas';
    const ctx = cv.getContext('2d');
    ctx.clearRect(0, 0, 300, 140);
    ctx.strokeStyle = '#1a73e8'; ctx.lineWidth = 2;
    ctx.beginPath();
    p.pts.forEach(([x, y], i) => i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y));
    ctx.stroke();
    // 点
    p.pts.forEach(([x, y]) => {
      ctx.fillStyle = '#1a73e8';
      ctx.beginPath(); ctx.arc(x, y, 2.5, 0, Math.PI * 2); ctx.fill();
    });
    ctx.fillStyle = '#188038'; ctx.beginPath(); ctx.arc(p.pts[0][0], p.pts[0][1], 5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#d93025'; ctx.beginPath(); ctx.arc(p.pts[p.pts.length - 1][0], p.pts[p.pts.length - 1][1], 5, 0, Math.PI * 2); ctx.fill();

    const btns = el('div', 'traj-btns');
    let pick = null;
    const bHuman = el('button', 'btn', '这是人类');
    const botHuman = el('button', 'btn', '这是机器人');
    bHuman.addEventListener('click', () => { pick = 'human'; h.report(pick === ch.answer); });
    botHuman.addEventListener('click', () => { pick = 'bot'; h.report(pick === ch.answer); });
    btns.append(bHuman, botHuman);
    wrap.append(cv, btns);
    stage.append(wrap);
    return { getState: () => ({ pick }) };
  }

  /* ================= 8. 旋转转正 ================= */
  function renderRotate(ch, stage, h) {
    const p = ch.params;
    const wrap = el('div', 'rotate-wrap');
    const cv = document.createElement('canvas');
    cv.width = 220; cv.height = 220;
    cv.className = 'rot-canvas';
    const ctx = cv.getContext('2d');
    let angle = p.start;

    const draw = () => {
      ctx.clearRect(0, 0, 220, 220);
      ctx.save();
      ctx.translate(110, 110);
      ctx.rotate(angle * Math.PI / 180);
      // 画一个指向正上方的箭头 + 标记底部
      ctx.fillStyle = '#1a73e8';
      ctx.beginPath();
      ctx.moveTo(0, -70);
      ctx.lineTo(34, 0);
      ctx.lineTo(14, 0);
      ctx.lineTo(14, 50);
      ctx.lineTo(-14, 50);
      ctx.lineTo(-14, 0);
      ctx.lineTo(-34, 0);
      ctx.closePath();
      ctx.fill();
      // 底部红点，帮助判断正立
      ctx.fillStyle = '#d93025';
      ctx.beginPath(); ctx.arc(0, 62, 7, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    };
    draw();

    const slider = document.createElement('input');
    slider.type = 'range';
    slider.min = -180; slider.max = 180; slider.value = p.start;
    slider.className = 'rot-slider';
    const label = el('div', '', `当前 ${Math.round(angle)}°`);
    slider.addEventListener('input', () => {
      angle = parseFloat(slider.value);
      label.textContent = `当前 ${Math.round(angle)}°`;
      draw();
    });
    wrap.append(cv, slider, label);
    stage.append(wrap);
    h.setSubmitVisible(true);
    return { getState: () => ({ angle }) };
  }

  const RENDERERS = {
    hold: renderHold, grid: renderGrid, distort: renderDistort, slider: renderSlider,
    seq: renderSeq, math: renderMath, traj: renderTraj, rotate: renderRotate
  };

  global.CaptchaChallenges = {
    render(ch, stage, handlers) {
      return RENDERERS[ch.type](ch, stage, handlers);
    }
  };
})(window);
