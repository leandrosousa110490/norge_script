/**
 * Sign Sprint Game
 * High-performance canvas game for the contact page.
 */
(function () {
  'use strict';

  document.addEventListener('DOMContentLoaded', function () {
    var canvas = document.getElementById('sign-game-canvas');
    var shell = document.getElementById('sign-game-shell');
    if (!canvas || !shell) return;
    initSignSprintGame(canvas, shell);
  });

  function initSignSprintGame(canvas, shell) {
    var ctx = canvas.getContext('2d');
    if (!ctx) return;

    var statusNode = document.getElementById('game-status-text');
    var timerNode = document.getElementById('game-timer');
    var scoreNode = document.getElementById('game-score');
    var overlayNode = document.getElementById('sign-game-overlay');
    var overlayTitleNode = document.getElementById('game-overlay-title');
    var overlayMessageNode = document.getElementById('game-overlay-message');
    var startBtn = document.getElementById('game-start-btn');
    var restartBtn = document.getElementById('game-restart-btn');

    var W = 960;
    var H = 540;
    var FIXED = 1 / 60;
    var rafId = null;
    var lastTs = 0;
    var acc = 0;

    var viewport = {
      width: W,
      height: H,
      scale: 1,
      offsetX: 0,
      offsetY: 0,
      dpr: Math.min(window.devicePixelRatio || 1, 2)
    };

    var pointer = { id: null, active: false, dragOffsetX: 0, dragOffsetY: 0 };
    var state = createInitialState();

    showOverlay('Sign Sprint', 'Complete 5 installs. Drag the sign into the glowing target zone before time runs out.');
    updateHud();
    resizeCanvas();
    render();

    if (startBtn) startBtn.addEventListener('click', startRound);
    if (restartBtn) restartBtn.addEventListener('click', startRound);

    canvas.addEventListener('pointerdown', onPointerDown);
    canvas.addEventListener('pointermove', onPointerMove, { passive: true });
    canvas.addEventListener('pointerup', onPointerUp);
    canvas.addEventListener('pointercancel', onPointerUp);
    canvas.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove, { passive: true });
    window.addEventListener('mouseup', onMouseUp);
    canvas.addEventListener('touchstart', onTouchStart, { passive: false });
    window.addEventListener('touchmove', onTouchMove, { passive: false });
    window.addEventListener('touchend', onTouchEnd);
    window.addEventListener('touchcancel', onTouchEnd);

    window.addEventListener('resize', resizeCanvas);
    document.addEventListener('fullscreenchange', resizeCanvas);
    window.addEventListener('keydown', onKeyDown);

    window.render_game_to_text = function () { return JSON.stringify(renderStateToText()); };
    window.advanceTime = function (ms) {
      var steps = Math.max(1, Math.round(ms / (1000 / 60)));
      for (var i = 0; i < steps; i += 1) update(FIXED);
      render();
      return window.render_game_to_text();
    };

    startLoop();

    function createInitialState() {
      var tw = 208;
      var th = 88;
      return {
        mode: 'ready',
        timeRemaining: 42,
        score: 0,
        installs: 0,
        goalInstalls: 5,
        combo: 0,
        bestCombo: 0,
        worldTime: 0,
        clouds: [
          { x: 80, y: 74, speed: 9, size: 1.1 },
          { x: 290, y: 112, speed: 13, size: 0.85 },
          { x: 520, y: 70, speed: 11, size: 1.2 },
          { x: 760, y: 104, speed: 10, size: 0.95 }
        ],
        cars: createCars(),
        target: {
          width: tw,
          height: th,
          baseX: W * 0.5 - tw * 0.5,
          x: W * 0.5 - tw * 0.5,
          y: H * 0.24,
          pulse: 0,
          flash: 0
        },
        sign: {
          width: 194,
          height: 74,
          x: W * 0.12,
          y: H * 0.72,
          homeX: W * 0.12,
          homeY: H * 0.72,
          dragging: false,
          returning: false,
          returnSpeed: 8,
          rotation: 0,
          prevX: W * 0.12
        },
        particles: []
      };
    }

    function createCars() {
      return [
        { x: -120, laneY: H * 0.83, speed: 88, colorA: '#f35d4b', colorB: '#b72b1f', scale: 1 },
        { x: 240, laneY: H * 0.875, speed: 104, colorA: '#46a5ff', colorB: '#1f5ea8', scale: 0.92 },
        { x: 640, laneY: H * 0.83, speed: 96, colorA: '#ffd358', colorB: '#c5901f', scale: 1.04 },
        { x: 900, laneY: H * 0.875, speed: 112, colorA: '#56d48b', colorB: '#2b8f56', scale: 0.9 }
      ];
    }

    function startRound() {
      state = createInitialState();
      state.mode = 'playing';
      pointer.active = false;
      pointer.id = null;
      hideOverlay();
      updateHud();
    }

    function finishRound(success) {
      state.mode = success ? 'won' : 'lost';
      pointer.active = false;
      pointer.id = null;
      state.sign.dragging = false;
      state.sign.returning = false;
      if (success) {
        spawnConfetti(state.target.x + state.target.width * 0.5, state.target.y + state.target.height * 0.5, 130);
        showOverlay('Installation Crew MVP', 'Completed ' + state.installs + '/' + state.goalInstalls + ' installs with a best combo of ' + state.bestCombo + '. Final score: ' + state.score + '.');
      } else {
        showOverlay('Time Up', 'Completed ' + state.installs + '/' + state.goalInstalls + ' installs. Replay and chain combos for a higher score.');
      }
      updateHud();
    }

    function startLoop() {
      if (rafId !== null) cancelAnimationFrame(rafId);
      lastTs = performance.now();
      rafId = requestAnimationFrame(loop);
    }

    function loop(ts) {
      var delta = Math.min(0.05, Math.max(0, (ts - lastTs) / 1000));
      lastTs = ts;
      acc += delta;
      while (acc >= FIXED) {
        update(FIXED);
        acc -= FIXED;
      }
      render();
      rafId = requestAnimationFrame(loop);
    }

    function update(dt) {
      state.worldTime += dt;
      var sway = Math.sin(state.worldTime * 1.58) * 32;
      state.target.x = state.target.baseX + sway;
      state.target.pulse = (Math.sin(state.worldTime * 3.25) + 1) * 0.5;
      state.target.flash = Math.max(0, state.target.flash - dt * 2.8);

      for (var ci = 0; ci < state.clouds.length; ci += 1) {
        state.clouds[ci].x += state.clouds[ci].speed * dt;
        if (state.clouds[ci].x > W + 140) state.clouds[ci].x = -140;
      }

      for (var carIndex = 0; carIndex < state.cars.length; carIndex += 1) {
        state.cars[carIndex].x += state.cars[carIndex].speed * dt;
        if (state.cars[carIndex].x > W + 160) {
          state.cars[carIndex].x = -180;
        }
      }

      if (state.mode === 'playing') {
        state.timeRemaining = Math.max(0, state.timeRemaining - dt);
        if (state.timeRemaining <= 0) finishRound(false);
      }

      if (state.sign.returning && !state.sign.dragging) {
        var mix = Math.min(1, dt * state.sign.returnSpeed);
        state.sign.x += (state.sign.homeX - state.sign.x) * mix;
        state.sign.y += (state.sign.homeY - state.sign.y) * mix;
        state.sign.rotation += (0 - state.sign.rotation) * Math.min(1, dt * 9);
        if (Math.abs(state.sign.x - state.sign.homeX) < 0.8 && Math.abs(state.sign.y - state.sign.homeY) < 0.8) {
          state.sign.x = state.sign.homeX;
          state.sign.y = state.sign.homeY;
          state.sign.rotation = 0;
          state.sign.returning = false;
        }
      }

      for (var i = state.particles.length - 1; i >= 0; i -= 1) {
        var p = state.particles[i];
        p.life -= dt;
        if (p.life <= 0) {
          state.particles.splice(i, 1);
          continue;
        }
        p.vy += 620 * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.rotation += p.spin * dt;
      }

      updateHud();
    }

    function updateHud() {
      if (statusNode) {
        if (state.mode === 'playing') statusNode.textContent = 'Install ' + state.installs + '/' + state.goalInstalls;
        else if (state.mode === 'won') statusNode.textContent = 'Completed';
        else if (state.mode === 'lost') statusNode.textContent = 'Try Again';
        else statusNode.textContent = 'Ready';
      }
      if (timerNode) timerNode.textContent = state.timeRemaining.toFixed(1) + 's';
      if (scoreNode) scoreNode.textContent = String(state.score);
    }

    function showOverlay(title, message) {
      if (overlayTitleNode) overlayTitleNode.textContent = title;
      if (overlayMessageNode) overlayMessageNode.textContent = message;
      if (overlayNode) overlayNode.classList.add('is-visible');
    }

    function hideOverlay() { if (overlayNode) overlayNode.classList.remove('is-visible'); }

    function onKeyDown(event) {
      var key = (event.key || '').toLowerCase();
      if (key === 'f') {
        event.preventDefault();
        if (!document.fullscreenElement) {
          if (shell.requestFullscreen) shell.requestFullscreen().catch(function () {});
        } else if (document.exitFullscreen) {
          document.exitFullscreen().catch(function () {});
        }
      } else if (key === 'escape' && document.fullscreenElement && document.exitFullscreen) {
        document.exitFullscreen().catch(function () {});
      }
    }

    function onPointerDown(event) { if (state.mode === 'playing' && startDragAt(event.clientX, event.clientY, event.pointerId, true)) event.preventDefault(); }
    function onPointerMove(event) { if (pointer.active && pointer.id === event.pointerId) moveDragAt(event.clientX, event.clientY); }
    function onPointerUp(event) { if (pointer.active && pointer.id === event.pointerId) endDrag(event.pointerId, true); }
    function onMouseDown(event) { if (!pointer.active) startDragAt(event.clientX, event.clientY, 'mouse', false); }
    function onMouseMove(event) { if (pointer.active && pointer.id === 'mouse') moveDragAt(event.clientX, event.clientY); }
    function onMouseUp() { if (pointer.active && pointer.id === 'mouse') endDrag('mouse', false); }
    function onTouchStart(event) { if (!pointer.active && event.touches && event.touches.length) { var t = event.touches[0]; startDragAt(t.clientX, t.clientY, 'touch', false); event.preventDefault(); } }
    function onTouchMove(event) { if (pointer.active && pointer.id === 'touch' && event.touches && event.touches.length) { var t = event.touches[0]; moveDragAt(t.clientX, t.clientY); event.preventDefault(); } }
    function onTouchEnd() { if (pointer.active && pointer.id === 'touch') endDrag('touch', false); }

    function startDragAt(clientX, clientY, dragId, capturePointer) {
      if (state.mode !== 'playing') return false;
      var world = pointerToWorld(clientX, clientY);
      if (!world) return false;
      if (!isPointInRect(world.x, world.y, state.sign.x, state.sign.y, state.sign.width, state.sign.height)) return false;
      pointer.active = true;
      pointer.id = dragId;
      pointer.dragOffsetX = world.x - state.sign.x;
      pointer.dragOffsetY = world.y - state.sign.y;
      state.sign.dragging = true;
      state.sign.returning = false;
      if (capturePointer && typeof canvas.setPointerCapture === 'function' && typeof dragId === 'number') canvas.setPointerCapture(dragId);
      return true;
    }

    function moveDragAt(clientX, clientY) {
      if (!pointer.active || !state.sign.dragging) return;
      var world = pointerToWorld(clientX, clientY);
      if (!world) return;
      var maxX = W - state.sign.width;
      var maxY = H - state.sign.height;
      state.sign.prevX = state.sign.x;
      state.sign.x = clamp(world.x - pointer.dragOffsetX, 0, maxX);
      state.sign.y = clamp(world.y - pointer.dragOffsetY, 0, maxY);
      var velocityX = state.sign.x - state.sign.prevX;
      state.sign.rotation = clamp(velocityX * 0.02, -0.2, 0.2);
    }

    function endDrag(dragId, releasePointerCapture) {
      pointer.active = false;
      pointer.id = null;
      state.sign.dragging = false;
      if (releasePointerCapture && typeof canvas.releasePointerCapture === 'function' && typeof dragId === 'number') canvas.releasePointerCapture(dragId);
      if (state.mode !== 'playing') return;

      var overlap = overlapRatio(state.sign.x, state.sign.y, state.sign.width, state.sign.height, state.target.x, state.target.y, state.target.width, state.target.height);
      if (overlap >= 0.58) {
        state.installs += 1;
        state.combo += 1;
        state.bestCombo = Math.max(state.bestCombo, state.combo);
        state.score += 150 + state.combo * 35 + Math.round(state.timeRemaining * 4);
        state.timeRemaining = Math.min(60, state.timeRemaining + 2.1);
        state.target.flash = 1;
        spawnConfetti(state.target.x + state.target.width * 0.5, state.target.y + state.target.height * 0.5, 52);
        if (state.installs >= state.goalInstalls) {
          finishRound(true);
          return;
        }
        relocateTarget();
        state.sign.returning = true;
        state.sign.rotation = 0;
      } else {
        state.combo = 0;
        state.timeRemaining = Math.max(0, state.timeRemaining - 2.15);
        state.sign.returning = true;
        state.sign.rotation = 0;
        spawnSparkBurst(state.sign.x + state.sign.width * 0.5, state.sign.y + state.sign.height * 0.5, 18);
        if (state.timeRemaining <= 0) finishRound(false);
      }
    }

    function relocateTarget() {
      var span = W * 0.2;
      var randomOffset = (Math.random() * 2 - 1) * span;
      state.target.baseX = clamp(W * 0.5 - state.target.width * 0.5 + randomOffset, 90, W - state.target.width - 90);
      state.target.y = H * (0.2 + Math.random() * 0.18);
    }

    function pointerToWorld(clientX, clientY) {
      var rect = canvas.getBoundingClientRect();
      if (!rect.width || !rect.height) return null;
      var localX = clientX - rect.left;
      var localY = clientY - rect.top;
      return { x: (localX - viewport.offsetX) / viewport.scale, y: (localY - viewport.offsetY) / viewport.scale };
    }

    function render() {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.save();
      ctx.scale(viewport.dpr, viewport.dpr);
      ctx.translate(viewport.offsetX, viewport.offsetY);
      ctx.scale(viewport.scale, viewport.scale);
      drawScene();
      drawTarget();
      drawSign();
      drawParticles();
      ctx.restore();
    }

    function drawScene() {
      var grad = ctx.createLinearGradient(0, 0, 0, H);
      grad.addColorStop(0, '#b8ddf9');
      grad.addColorStop(0.42, '#83bff0');
      grad.addColorStop(1, '#1c314b');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, W, H);

      var pulse = 0.22 + state.target.pulse * 0.25;
      ctx.fillStyle = 'rgba(255, 222, 129,' + pulse.toFixed(2) + ')';
      ctx.beginPath();
      ctx.arc(W * 0.12, H * 0.16, 72, 0, Math.PI * 2);
      ctx.fill();

      for (var ci = 0; ci < state.clouds.length; ci += 1) {
        var c = state.clouds[ci];
        ctx.fillStyle = 'rgba(255,255,255,0.55)';
        ctx.beginPath();
        ctx.ellipse(c.x, c.y, 44 * c.size, 24 * c.size, 0, 0, Math.PI * 2);
        ctx.ellipse(c.x + 34 * c.size, c.y + 3 * c.size, 32 * c.size, 19 * c.size, 0, 0, Math.PI * 2);
        ctx.ellipse(c.x - 32 * c.size, c.y + 5 * c.size, 28 * c.size, 17 * c.size, 0, 0, Math.PI * 2);
        ctx.fill();
      }

      drawCityBackdrop();
      drawRoadWithTraffic();
      drawStorefrontRealistic();

      if (state.sign.dragging) {
        var gx = state.sign.x + state.sign.width * 0.5;
        var gy = state.sign.y + state.sign.height * 0.5;
        ctx.strokeStyle = 'rgba(184, 234, 255, 0.72)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(gx, 18);
        ctx.lineTo(gx, gy - state.sign.height * 0.45);
        ctx.stroke();
        ctx.fillStyle = 'rgba(207, 244, 255, 0.9)';
        ctx.beginPath();
        ctx.arc(gx, 18, 5, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    function drawCityBackdrop() {
      for (var i = 0; i < 9; i += 1) {
        var bx = i * 118 - 22;
        var bw = 96 + (i % 4) * 18;
        var bh = 148 + (i % 5) * 44;
        var by = 168 - (i % 3) * 10;
        var buildingGradient = ctx.createLinearGradient(bx, by, bx + bw, by + bh);
        buildingGradient.addColorStop(0, i % 2 === 0 ? '#2e476a' : '#395780');
        buildingGradient.addColorStop(1, i % 2 === 0 ? '#21344d' : '#29415f');
        ctx.fillStyle = buildingGradient;
        roundRect(ctx, bx, by, bw, bh, 3);
        ctx.fill();

        ctx.fillStyle = 'rgba(18, 33, 53, 0.4)';
        ctx.fillRect(bx + bw - 4, by + 10, 3, bh - 12);

        var rows = 4 + (i % 3);
        var cols = 3 + (i % 2);
        for (var row = 0; row < rows; row += 1) {
          for (var col = 0; col < cols; col += 1) {
            var wx = bx + 10 + col * ((bw - 24) / Math.max(1, cols - 1));
            var wy = by + 14 + row * ((bh - 32) / Math.max(1, rows - 1));
            var twinkle = (Math.sin(state.worldTime * 2.4 + row * 1.3 + col * 0.7 + i) + 1) * 0.5;
            ctx.fillStyle = 'rgba(255, 225, 168,' + (0.24 + twinkle * 0.38).toFixed(2) + ')';
            ctx.fillRect(wx, wy, 10, 14);
          }
        }
      }
    }

    function drawRoadWithTraffic() {
      var roadTop = H * 0.78;
      ctx.fillStyle = '#1d2f45';
      ctx.fillRect(0, roadTop, W, H * 0.22);

      var laneGrad = ctx.createLinearGradient(0, roadTop, 0, H);
      laneGrad.addColorStop(0, 'rgba(255,255,255,0.08)');
      laneGrad.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = laneGrad;
      ctx.fillRect(0, roadTop, W, H * 0.22);

      ctx.strokeStyle = 'rgba(255,255,255,0.34)';
      ctx.lineWidth = 4;
      ctx.setLineDash([22, 14]);
      ctx.beginPath();
      ctx.moveTo(0, H * 0.885);
      ctx.lineTo(W, H * 0.885);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = 'rgba(92, 224, 255, 0.34)';
      ctx.fillRect(0, roadTop, W, 3);

      for (var carIdx = 0; carIdx < state.cars.length; carIdx += 1) {
        drawCar(state.cars[carIdx]);
      }
    }

    function drawCar(car) {
      var width = 64 * car.scale;
      var height = 22 * car.scale;
      var x = car.x;
      var y = car.laneY;
      var body = ctx.createLinearGradient(x, y, x, y + height);
      body.addColorStop(0, car.colorA);
      body.addColorStop(1, car.colorB);
      ctx.fillStyle = body;
      roundRect(ctx, x, y - height, width, height, 8 * car.scale);
      ctx.fill();

      ctx.fillStyle = 'rgba(201, 233, 255, 0.72)';
      roundRect(ctx, x + width * 0.18, y - height * 0.9, width * 0.42, height * 0.42, 5 * car.scale);
      ctx.fill();

      ctx.fillStyle = '#101820';
      ctx.beginPath();
      ctx.arc(x + width * 0.22, y + 1, 6 * car.scale, 0, Math.PI * 2);
      ctx.arc(x + width * 0.76, y + 1, 6 * car.scale, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#d8e3ed';
      ctx.beginPath();
      ctx.arc(x + width * 0.22, y + 1, 2.8 * car.scale, 0, Math.PI * 2);
      ctx.arc(x + width * 0.76, y + 1, 2.8 * car.scale, 0, Math.PI * 2);
      ctx.fill();
    }

    function drawStorefrontRealistic() {
      var sx = W * 0.22;
      var sy = H * 0.34;
      var sw = W * 0.56;
      var sh = H * 0.41;

      var facade = ctx.createLinearGradient(sx, sy, sx, sy + sh);
      facade.addColorStop(0, '#efe0c6');
      facade.addColorStop(1, '#c9ab84');
      ctx.fillStyle = facade;
      roundRect(ctx, sx, sy, sw, sh, 10);
      ctx.fill();

      ctx.fillStyle = '#b7c4d2';
      ctx.fillRect(sx - 8, sy + sh - 8, sw + 16, 10);

      ctx.fillStyle = '#c95d43';
      roundRect(ctx, sx - 10, sy - 38, sw + 20, 44, 12);
      ctx.fill();

      var awning = ctx.createLinearGradient(sx - 10, sy - 36, sx + sw + 10, sy + 8);
      awning.addColorStop(0, '#e26d52');
      awning.addColorStop(0.5, '#b44e3c');
      awning.addColorStop(1, '#e26d52');
      ctx.fillStyle = awning;
      ctx.fillRect(sx - 10, sy - 18, sw + 20, 17);

      ctx.fillStyle = 'rgba(16, 34, 60, 0.92)';
      roundRect(ctx, sx + 30, sy + 82, sw - 60, sh - 112, 8);
      ctx.fill();

      ctx.fillStyle = 'rgba(107, 170, 223, 0.42)';
      roundRect(ctx, sx + 48, sy + 100, sw - 96, sh - 152, 8);
      ctx.fill();

      ctx.fillStyle = '#27384d';
      ctx.fillRect(sx + sw * 0.46, sy + sh - 136, sw * 0.08, 136);

      ctx.fillStyle = 'rgba(255, 255, 255, 0.22)';
      ctx.fillRect(sx + 52, sy + 104, sw - 104, 20);

      ctx.fillStyle = '#ffffff';
      ctx.font = '700 26px Oswald, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('FLORIDA SIGN SOLUTION', W * 0.5, sy + 34);
    }

    function drawTarget() {
      var t = state.target;
      var grow = 1 + t.pulse * 0.08;
      var dw = t.width * grow;
      var dh = t.height * grow;
      var dx = t.x - (dw - t.width) * 0.5;
      var dy = t.y - (dh - t.height) * 0.5;
      var glow = 0.2 + t.pulse * 0.26 + t.flash * 0.36;
      ctx.fillStyle = 'rgba(85, 238, 255,' + glow.toFixed(2) + ')';
      roundRect(ctx, dx - 8, dy - 8, dw + 16, dh + 16, 14); ctx.fill();

      ctx.fillStyle = 'rgba(206, 219, 230, 0.9)';
      roundRect(ctx, t.x + 8, t.y + t.height * 0.45, t.width - 16, 10, 4);
      ctx.fill();

      ctx.fillStyle = '#7f8f9f';
      for (var bolt = 0; bolt < 4; bolt += 1) {
        var bx = t.x + 18 + bolt * ((t.width - 36) / 3);
        ctx.beginPath();
        ctx.arc(bx, t.y + t.height * 0.5, 2.6, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.strokeStyle = state.mode === 'won' ? 'rgba(88, 255, 170, 0.95)' : 'rgba(92, 223, 255, 0.95)';
      ctx.lineWidth = 3;
      ctx.setLineDash([8, 6]);
      ctx.lineDashOffset = -state.worldTime * 36;
      roundRect(ctx, dx, dy, dw, dh, 10); ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = state.mode === 'won' ? 'rgba(88,255,170,0.2)' : 'rgba(92,223,255,0.14)';
      roundRect(ctx, dx, dy, dw, dh, 10); ctx.fill();
      ctx.fillStyle = 'rgba(232, 248, 255, 0.9)';
      ctx.font = '700 15px Montserrat, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('MOUNT RAIL', t.x + t.width * 0.5, t.y - 10);
    }

    function drawSign() {
      var s = state.sign;
      ctx.save();
      ctx.translate(s.x + s.width * 0.5, s.y + s.height * 0.5);
      ctx.rotate(s.rotation);
      ctx.translate(-s.width * 0.5, -s.height * 0.5);
      ctx.fillStyle = 'rgba(6, 24, 46,' + (s.dragging ? 0.24 : 0.16).toFixed(2) + ')';
      roundRect(ctx, 7, s.height - 2, s.width - 14, 14, 8); ctx.fill();
      var panel = ctx.createLinearGradient(0, 0, 0, s.height);
      panel.addColorStop(0, '#3abdfd');
      panel.addColorStop(1, '#0a5faf');
      ctx.fillStyle = panel; roundRect(ctx, 0, 0, s.width, s.height, 10); ctx.fill();
      ctx.strokeStyle = 'rgba(209, 231, 250, 0.9)';
      ctx.lineWidth = 2;
      roundRect(ctx, 3, 3, s.width - 6, s.height - 6, 8);
      ctx.stroke();
      ctx.strokeStyle = 'rgba(80, 97, 116, 0.75)';
      ctx.lineWidth = 1.6;
      roundRect(ctx, 8, 8, s.width - 16, s.height - 16, 6);
      ctx.stroke();
      var shine = (Math.sin(state.worldTime * 3.2) + 1) * 0.5;
      ctx.fillStyle = 'rgba(255,255,255,' + (0.12 + shine * 0.12).toFixed(2) + ')';
      ctx.fillRect(8, 8, s.width - 16, 10);
      ctx.fillStyle = 'rgba(255,255,255,0.94)';
      ctx.font = '700 20px Oswald, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('FLORIDA SIGN', s.width * 0.5, s.height * 0.6);
      ctx.font = '700 10px Montserrat, sans-serif';
      ctx.fillStyle = 'rgba(225, 241, 255, 0.9)';
      ctx.fillText('INSTALLATION TEAM', s.width * 0.5, s.height * 0.79);

      ctx.fillStyle = '#7f91a3';
      for (var bolt = 0; bolt < 4; bolt += 1) {
        var boltX = 16 + bolt * ((s.width - 32) / 3);
        ctx.beginPath();
        ctx.arc(boltX, 13, 2.3, 0, Math.PI * 2);
        ctx.arc(boltX, s.height - 13, 2.3, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    function drawParticles() {
      for (var i = 0; i < state.particles.length; i += 1) {
        var p = state.particles[i];
        var alpha = Math.max(0, Math.min(1, p.life / p.maxLife));
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        ctx.fillStyle = p.color.replace('{a}', alpha.toFixed(2));
        ctx.fillRect(-p.size * 0.5, -p.size * 0.5, p.size, p.size);
        ctx.restore();
      }
    }

    function spawnConfetti(x, y, count) {
      var palette = ['rgba(80, 199, 255, {a})','rgba(255, 214, 87, {a})','rgba(119, 255, 179, {a})','rgba(255, 123, 101, {a})'];
      for (var i = 0; i < count; i += 1) {
        var speed = 170 + Math.random() * 250;
        var angle = Math.random() * Math.PI * 2;
        var life = 0.8 + Math.random() * 0.8;
        state.particles.push({ x: x, y: y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed - 100, size: 4 + Math.random() * 6, life: life, maxLife: life, rotation: Math.random() * Math.PI, spin: -7 + Math.random() * 14, color: palette[i % palette.length] });
      }
    }

    function spawnSparkBurst(x, y, count) {
      for (var i = 0; i < count; i += 1) {
        var angle = (Math.PI * 2 * i) / count;
        var speed = 90 + Math.random() * 90;
        var life = 0.35 + Math.random() * 0.25;
        state.particles.push({ x: x, y: y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, size: 3 + Math.random() * 2, life: life, maxLife: life, rotation: Math.random() * Math.PI, spin: -3 + Math.random() * 6, color: 'rgba(255, 218, 143, {a})' });
      }
    }

    function renderStateToText() {
      return {
        coordinate_system: 'origin at top-left, +x right, +y down',
        mode: state.mode,
        timer_seconds: Number(state.timeRemaining.toFixed(2)),
        score: state.score,
        installs: state.installs,
        goal_installs: state.goalInstalls,
        combo: state.combo,
        sign: { x: Number(state.sign.x.toFixed(2)), y: Number(state.sign.y.toFixed(2)), width: state.sign.width, height: state.sign.height, dragging: state.sign.dragging, returning: state.sign.returning },
        target: { x: Number(state.target.x.toFixed(2)), y: Number(state.target.y.toFixed(2)), width: state.target.width, height: state.target.height, pulse: Number(state.target.pulse.toFixed(2)) },
        cars: state.cars.map(function (car) {
          return {
            x: Number(car.x.toFixed(2)),
            y: Number(car.laneY.toFixed(2)),
            speed: car.speed
          };
        }),
        particle_count: state.particles.length,
        viewport: { width: viewport.width, height: viewport.height, scale: Number(viewport.scale.toFixed(3)) }
      };
    }

    function resizeCanvas() {
      var rect = shell.getBoundingClientRect();
      var width = Math.max(300, Math.floor(rect.width));
      var height = Math.floor(width * 9 / 16);
      viewport.width = width;
      viewport.height = height;
      canvas.style.height = height + 'px';
      canvas.width = Math.floor(width * viewport.dpr);
      canvas.height = Math.floor(height * viewport.dpr);
      viewport.scale = Math.min(width / W, height / H);
      viewport.offsetX = (width - W * viewport.scale) * 0.5;
      viewport.offsetY = (height - H * viewport.scale) * 0.5;
      render();
    }
  }

  function roundRect(ctx, x, y, width, height, radius) {
    var r = Math.min(radius, width * 0.5, height * 0.5);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + width, y, x + width, y + height, r);
    ctx.arcTo(x + width, y + height, x, y + height, r);
    ctx.arcTo(x, y + height, x, y, r);
    ctx.arcTo(x, y, x + width, y, r);
    ctx.closePath();
  }

  function clamp(value, min, max) { return Math.max(min, Math.min(max, value)); }
  function isPointInRect(px, py, rx, ry, rw, rh) { return px >= rx && px <= rx + rw && py >= ry && py <= ry + rh; }

  function overlapRatio(ax, ay, aw, ah, bx, by, bw, bh) {
    var overlapW = Math.max(0, Math.min(ax + aw, bx + bw) - Math.max(ax, bx));
    var overlapH = Math.max(0, Math.min(ay + ah, by + bh) - Math.max(ay, by));
    var signArea = aw * ah;
    if (signArea <= 0) return 0;
    return (overlapW * overlapH) / signArea;
  }
})();
