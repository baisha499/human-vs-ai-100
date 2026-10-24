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

    let dragging = false;
    const onMove = (ev) => {
      if (!dragging) return;
      ev.preventDefault();
      update(ev.clientX);
    };
    const onUp = () => {
      if (!dragging) return;
      dragging = false;
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
    };
    knob.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      dragging = true;
      try { knob.setPointerCapture(e.pointerId); } catch (_) {}
      update(e.clientX);
      window.addEventListener('pointermove', onMove, { passive: false });
      window.addEventListener('pointerup', onUp);
      window.addEventListener('pointercancel', onUp);
    });

    return {
      getState: () => ({ pos }),
      dispose: onUp
    };
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

  /* ================= 9. 反应时 ================= */
  function renderReflex(ch, stage, h) {
    const p = ch.params;
    const wrap = el('div', 'traj-wrap');
    const btn = el('button', 'btn reflex-btn waiting', '等待变蓝…');
    const label = el('div', '', '别提前点');
    wrap.append(btn, label);
    stage.append(wrap);
    h.setSubmitVisible(false);

    let lit = false, t0 = 0, timer = setTimeout(() => {
      lit = true; t0 = performance.now();
      btn.className = 'btn reflex-btn lit';
      btn.textContent = '点！';
      label.textContent = '现在点！';
    }, randWait(p.waitMin, p.waitMax));

    function randWait(a, b) { return a + Math.random() * (b - a); }

    btn.addEventListener('click', () => {
      if (!lit) { h.report(false); return; }
      const ms = performance.now() - t0;
      label.textContent = `反应 ${Math.round(ms)} ms（需 ≤ ${p.maxMs} ms）`;
      h.report(ms <= p.maxMs);
    });

    return { dispose: () => clearTimeout(timer) };
  }

  /* ================= 10. 骰子计数 ================= */
  function drawDie(ctx, x, y, size, v) {
    const r = size * 0.16;
    ctx.fillStyle = '#fff';
    ctx.strokeStyle = '#9aa0a6';
    roundRect(ctx, x, y, size, size, r);
    ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#202124';
    const dot = size * 0.11;
    const pos = {
      1: [[.5, .5]],
      2: [[.28, .28], [.72, .72]],
      3: [[.26, .26], [.5, .5], [.74, .74]],
      4: [[.28, .28], [.72, .28], [.28, .72], [.72, .72]],
      5: [[.28, .28], [.72, .28], [.5, .5], [.28, .72], [.72, .72]],
      6: [[.28, .26], [.72, .26], [.28, .5], [.72, .5], [.28, .74], [.72, .74]]
    }[v];
    pos.forEach(([px, py]) => {
      ctx.beginPath(); ctx.arc(x + px * size, y + py * size, dot, 0, Math.PI * 2); ctx.fill();
    });
  }
  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function renderDice(ch, stage, h) {
    const p = ch.params;
    const wrap = el('div', 'distort-wrap');
    const cv = document.createElement('canvas');
    cv.width = 320; cv.height = p.small ? 240 : 200;
    cv.className = 'dice-canvas';
    const ctx = cv.getContext('2d');
    const cols = 3, size = p.small ? 56 : 72, gap = 12;
    p.dice.forEach((v, i) => {
      const cx = (i % cols), cy = Math.floor(i / cols);
      drawDie(ctx, 20 + cx * (size + gap), 16 + cy * (size + gap), size, v);
    });
    const input = document.createElement('input');
    input.className = 'math-input';
    input.type = 'number'; input.inputMode = 'numeric';
    input.placeholder = '总点数';
    wrap.append(cv, input);
    stage.append(wrap);
    h.setSubmitVisible(true);
    return { getState: () => ({ input: input.value }) };
  }

  /* ================= 11. 记忆配对 ================= */
  function renderMemory(ch, stage, h) {
    const p = ch.params;
    const wrap = el('div', 'seq-wrap memory-wrap');
    const cols = p.faces.length <= 8 ? 4 : 5;
    wrap.style.gridTemplateColumns = `repeat(${cols},1fr)`;
    const state = { flipped: [], matched: new Set(), lock: false };
    const cards = p.faces.map((icon, i) => {
      const card = el('div', 'mem-card', '?');
      card.addEventListener('click', () => {
        if (state.lock || state.matched.has(i) || state.flipped.includes(i)) return;
        card.classList.add('open'); card.textContent = icon;
        state.flipped.push(i);
        if (state.flipped.length === 2) {
          state.lock = true;
          const [a, b] = state.flipped;
          if (p.faces[a] === p.faces[b]) {
            state.matched.add(a); state.matched.add(b);
            state.flipped = []; state.lock = false;
            card.classList.add('matched');
            if (state.matched.size === p.faces.length) h.report(true);
          } else {
            setTimeout(() => {
              [a, b].forEach(idx => {
                const c = wrap.children[idx];
                c.classList.remove('open'); c.textContent = '?';
              });
              state.flipped = []; state.lock = false;
            }, 650);
          }
        }
      });
      wrap.append(card);
      return card;
    });
    stage.append(wrap);
    return { getState: () => ({}) };
  }

  const RENDERERS = {
    hold: renderHold, grid: renderGrid, distort: renderDistort, slider: renderSlider,
    seq: renderSeq, math: renderMath, traj: renderTraj, rotate: renderRotate,
    reflex: renderReflex, dice: renderDice, memory: renderMemory
  };

  global.CaptchaChallenges = {
    render(ch, stage, handlers) {
      return RENDERERS[ch.type](ch, stage, handlers);
    }
  };
})(window);
