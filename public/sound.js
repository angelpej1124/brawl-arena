// =====================================================================
//  난투 아레나 — 소리 (배경음악 + 효과음)
//  파일 없이 브라우저(Web Audio)에서 직접 만들어 냄. 첫 클릭/키 입력 뒤부터 소리가 남.
// =====================================================================
(function (root) {
  let ac = null, master, sfxBus, bgmBus, noiseBuf;
  const store = (() => { try { return JSON.parse(localStorage.getItem('brawlSound') || '{}'); } catch (_) { return {}; } })();
  const opt = { bgm: store.bgm !== false, sfx: store.sfx !== false };
  const saveOpt = () => { try { localStorage.setItem('brawlSound', JSON.stringify(opt)); } catch (_) {} };

  function init() {
    if (ac) { if (ac.state === 'suspended') ac.resume(); return; }
    const AC = root.AudioContext || root.webkitAudioContext;
    if (!AC) return;
    ac = new AC();
    master = ac.createGain(); master.gain.value = 0.8;
    const comp = ac.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 4;
    master.connect(comp).connect(ac.destination);
    sfxBus = ac.createGain(); sfxBus.gain.value = opt.sfx ? 0.9 : 0; sfxBus.connect(master);
    bgmBus = ac.createGain(); bgmBus.gain.value = opt.bgm ? 0.45 : 0; bgmBus.connect(master);
    noiseBuf = ac.createBuffer(1, ac.sampleRate, ac.sampleRate);
    const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    startBgm();
  }
  for (const e of ['pointerdown', 'keydown', 'touchstart']) root.addEventListener(e, init, { passive: true });

  // ---------- 기본 재료 ----------
  const now = () => ac.currentTime;
  function out(vol, pan, bus) {
    const g = ac.createGain(); g.gain.value = vol;
    if (pan && ac.createStereoPanner) { const p = ac.createStereoPanner(); p.pan.value = Math.max(-1, Math.min(1, pan)); g.connect(p).connect(bus || sfxBus); }
    else g.connect(bus || sfxBus);
    return g;
  }
  // 음 하나: 주파수 f0 → f1, 길이 dur
  function tone(type, f0, f1, dur, vol, o = {}) {
    const t = (o.at || now()) + (o.delay || 0);
    const osc = ac.createOscillator(); osc.type = type;
    osc.frequency.setValueAtTime(f0, t);
    if (f1 && f1 !== f0) osc.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t + dur);
    const g = ac.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + (o.atk || 0.005));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g).connect(o.dest || out(1, o.pan, o.bus));
    osc.start(t); osc.stop(t + dur + 0.02);
  }
  // 잡음: 필터 종류/주파수(시작→끝), 길이
  function noise(ftype, f0, f1, dur, vol, o = {}) {
    const t = (o.at || now()) + (o.delay || 0);
    const src = ac.createBufferSource(); src.buffer = noiseBuf; src.loop = true;
    const fl = ac.createBiquadFilter(); fl.type = ftype; fl.Q.value = o.q || 1;
    fl.frequency.setValueAtTime(f0, t);
    if (f1 && f1 !== f0) fl.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    const g = ac.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + (o.atk || 0.004));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(fl).connect(g).connect(o.dest || out(1, o.pan, o.bus));
    src.start(t, Math.random() * 0.5); src.stop(t + dur + 0.02);
  }

  // ---------- 효과음 ----------
  const last = {};
  const S = {
    hit(o, power) {   // 0 약하게(불·잔타) 1 약공격 2 강공격
      if (power >= 2) {
        tone('sine', 150, 42, 0.28, 0.9, o); noise('lowpass', 2600, 300, 0.22, 0.7, o);
        tone('square', 90, 50, 0.12, 0.25, o);
      } else {
        tone('sine', 190, 70, 0.12, 0.6 * (power ? 1 : 0.5), o); noise('bandpass', 2200, 900, 0.09, 0.55 * (power ? 1 : 0.5), { ...o, q: 0.8 });
      }
    },
    bflash(o) { noise('highpass', 5000, 1200, 0.18, 0.6, o); tone('sawtooth', 1400, 90, 0.25, 0.35, o); tone('sine', 120, 35, 0.35, 0.9, o); },
    burn(o, blue) {   // 불 데미지: 탁탁 튀는 소리 + 화르륵
      noise('bandpass', blue ? 2600 : 1600, blue ? 3400 : 700, 0.32, 0.38, { ...o, q: 0.7, atk: 0.03 });
      for (let i = 0; i < 4; i++) noise('highpass', 3000 + Math.random() * 3000, 0, 0.025, 0.4, { ...o, delay: i * 0.05 + Math.random() * 0.03 });
      tone('sine', 110, 60, 0.18, 0.25, o);
    },
    ko(o) { noise('lowpass', 1800, 120, 0.9, 0.9, o); tone('sine', 110, 30, 0.8, 1, o); tone('triangle', 900, 120, 0.7, 0.25, o); },
    jump(o, two) { tone('square', two ? 520 : 340, two ? 900 : 640, 0.1, 0.12, o); },
    swing(o) { noise('bandpass', 900, 3500, 0.13, 0.3, { ...o, q: 1.5 }); },
    slash(o) { noise('highpass', 1800, 7000, 0.18, 0.4, o); tone('triangle', 1800, 2600, 0.12, 0.12, o); },
    boom(o) { noise('lowpass', 2400, 90, 0.75, 1, o); tone('sine', 90, 28, 0.7, 1, o); },
    freeze(o) { for (let i = 0; i < 5; i++) tone('sine', 1500 + i * 380, 2200 + i * 400, 0.35, 0.12, { ...o, delay: i * 0.04 }); noise('highpass', 6000, 9000, 0.4, 0.15, o); },
    ice(o) { tone('triangle', 1900, 1200, 0.25, 0.18, o); noise('highpass', 5000, 8000, 0.2, 0.18, o); },
    bolt(o) { noise('highpass', 2500, 600, 0.35, 0.8, o); tone('sawtooth', 2400, 80, 0.3, 0.3, o); tone('sine', 70, 30, 0.5, 0.7, o); },
    zap(o) { tone('sawtooth', 1600, 300, 0.12, 0.2, o); noise('highpass', 3000, 3000, 0.08, 0.25, o); },
    blink(o) { tone('sine', 400, 1800, 0.12, 0.25, o); tone('sine', 900, 2600, 0.1, 0.12, { ...o, delay: 0.03 }); },
    whoosh(o, up) { noise('bandpass', up ? 400 : 2400, up ? 2400 : 400, 0.35, 0.4, { ...o, q: 1.2, atk: 0.05 }); },
    pull(o) { tone('sine', 900, 200, 0.4, 0.3, o); noise('bandpass', 2000, 300, 0.4, 0.25, o); },
    push(o) { tone('sine', 200, 900, 0.35, 0.3, o); noise('bandpass', 300, 2000, 0.35, 0.25, o); },
    quake(o) { noise('lowpass', 300, 60, 1.1, 1, { ...o, atk: 0.05 }); tone('sine', 55, 30, 1, 0.8, o); },
    thud(o) { tone('sine', 120, 50, 0.25, 0.7, o); noise('lowpass', 600, 100, 0.2, 0.5, o); },
    poof(o) { noise('lowpass', 3000, 400, 0.3, 0.4, o); tone('sine', 600, 300, 0.15, 0.15, o); },
    ping(o) { tone('sine', 1760, 1760, 0.5, 0.3, o); tone('sine', 2640, 2640, 0.4, 0.15, o); },
    power(o) { tone('sawtooth', 200, 800, 0.4, 0.16, o); tone('sine', 400, 1600, 0.4, 0.2, o); },
    down(o) { tone('sine', 900, 200, 0.3, 0.2, o); },
    glitch(o) { for (let i = 0; i < 6; i++) tone('square', 200 + Math.random() * 1600, 0, 0.04, 0.15, { ...o, delay: i * 0.045 }); },
    rewind(o) { for (let i = 0; i < 6; i++) tone('triangle', 1600 - i * 200, 1800 - i * 200, 0.08, 0.15, { ...o, delay: i * 0.06 }); },
    chime(o) { [880, 1320, 1760].forEach((f, i) => tone('sine', f, f, 0.5, 0.18, { ...o, delay: i * 0.07 })); },
    click(o) { tone('square', 1200, 600, 0.05, 0.15, o); },
    start() { [523, 659, 784, 1047].forEach((f, i) => tone('square', f, f, 0.18, 0.13, { delay: i * 0.09 })); tone('sine', 1047, 1047, 0.6, 0.15, { delay: 0.36 }); },
    win() { [523, 659, 784, 659, 784, 1047].forEach((f, i) => tone('square', f, f, 0.22, 0.12, { delay: i * 0.13 })); tone('triangle', 262, 262, 0.9, 0.2, { delay: 0.65 }); },
    deny(o) { tone('square', 220, 160, 0.15, 0.12, o); },
  };
  // 이벤트 종류 → 효과음
  const MAP = {
    hit: (o, e) => S.hit(o, e.p), bflash: (o) => S.bflash(o), burn: (o, e) => S.burn(o, e.b), ko: (o) => S.ko(o),
    jump: (o) => S.jump(o, false), jump2: (o) => S.jump(o, true), slash: (o) => S.slash(o),
    explode: (o) => S.boom(o), boom: (o) => S.boom(o), smash: (o) => S.boom(o),
    freeze: (o) => S.freeze(o), iced: (o) => S.ice(o), blizzard: (o) => S.whoosh(o, false),
    bolt: (o) => S.bolt(o), thunk: (o) => S.thud(o), blink: (o) => S.blink(o), swap: (o) => S.blink(o),
    pull: (o) => S.pull(o), push: (o) => S.push(o), quake: (o) => S.quake(o), rock: (o) => S.thud(o),
    wind: (o) => S.whoosh(o, true), fdash: (o) => S.whoosh(o, true), fly: (o) => S.whoosh(o, true), engine: (o) => S.whoosh(o, true),
    clone: (o) => S.poof(o), poof: (o) => S.poof(o), stealth: (o) => S.down(o), slow: (o) => S.down(o),
    parry: (o) => S.ping(o), parryq: (o) => S.click(o), mineset: (o) => S.click(o), turret: (o) => S.click(o), tbreak: (o) => S.thud(o),
    empower: (o) => S.power(o), charged: (o) => S.power(o), giant: (o) => S.power(o), sun: (o) => S.power(o), rubber: (o) => S.blink(o),
    error: (o) => S.glitch(o), invert: (o) => S.glitch(o), rewind: (o) => S.rewind(o), tsave: (o) => S.chime(o),
    infest: (o) => S.poof(o), unfest: (o) => S.poof(o), atomq: (o) => S.zap(o), homing: (o) => S.zap(o), bfq: (o) => S.zap(o),
    start: () => S.start(), deny: (o) => S.deny(o),
  };
  const GAP = { hit: 0.035, burn: 0.06, jump: 0.05, jump2: 0.05, thunk: 0.05, bolt: 0.05 };
  // ev: 서버 이벤트, me: 내 캐릭터(거리에 따라 소리 크기·좌우), stageW: 맵 너비
  function event(ev, me, stageW) {
    if (!ac || !opt.sfx || !MAP[ev.k]) return;
    const t = now(), gap = GAP[ev.k] || 0.02;
    if (last[ev.k] && t - last[ev.k] < gap) return;
    last[ev.k] = t;
    let vol = 1, pan = 0;
    if (typeof ev.x === 'number') {
      const cx = me ? me.x : (stageW || 1280) / 2;
      pan = Math.max(-0.8, Math.min(0.8, (ev.x - cx) / 700));
      if (me) vol = Math.max(0.35, 1 - Math.hypot(ev.x - me.x, (ev.y || me.y) - me.y) / 1500);
    }
    try { MAP[ev.k]({ dest: out(vol, pan) }, ev); } catch (_) {}
  }

  // ---------- 배경음악 (대기실·로비: 잔잔하게 / 게임 중: 신나게) ----------
  const N = (m) => 440 * Math.pow(2, (m - 69) / 12);   // 미디 번호 → 주파수
  const SONGS = {
    calm: { bpm: 92, chords: [[57, 60, 64, 67], [53, 57, 60, 64], [48, 52, 55, 59], [55, 59, 62, 65]], drums: false,
      lead: [76, 0, 74, 72, 0, 0, 69, 0, 72, 0, 74, 0, 76, 0, 0, 0, 72, 0, 69, 0, 67, 0, 0, 0, 69, 0, 72, 0, 74, 0, 0, 0] },
    battle: { bpm: 148, chords: [[57, 60, 64], [53, 57, 60], [48, 52, 55], [55, 59, 62]], drums: true,
      lead: [69, 72, 76, 0, 74, 72, 69, 0, 72, 0, 74, 76, 79, 0, 76, 0, 77, 76, 74, 0, 72, 74, 72, 69, 67, 0, 69, 72, 71, 0, 0, 0] },
  };
  let song = 'calm', step = 0, nextT = 0, timer = null, want = 'calm';
  function startBgm() {
    if (timer) return;
    nextT = now() + 0.1;
    timer = setInterval(schedule, 25);
  }
  function schedule() {
    if (!ac || ac.state !== 'running') return;
    while (nextT < now() + 0.15) {
      if (step % 16 === 0 && want !== song) { song = want; step = 0; }
      const sg = SONGS[song], spb = 60 / sg.bpm / 4;   // 16분음표 길이
      const bar = Math.floor(step / 16) % sg.chords.length, ch = sg.chords[bar], s16 = step % 16;
      const b = bgmBus;
      if (opt.bgm) {
        // 베이스
        if (sg.drums ? s16 % 2 === 0 : s16 % 4 === 0) tone(sg.drums ? 'square' : 'triangle', N(ch[0] - 24 + (sg.drums && s16 % 8 === 6 ? 12 : 0)), 0, spb * (sg.drums ? 1.6 : 3.5), sg.drums ? 0.22 : 0.4, { at: nextT, dest: out(1, 0, b) });
        // 화음 아르페지오
        const ar = ch[s16 % ch.length] + 12;
        if (sg.drums || s16 % 2 === 0) tone(sg.drums ? 'square' : 'sine', N(ar), 0, spb * 0.9, sg.drums ? 0.06 : 0.12, { at: nextT, dest: out(1, s16 % 2 ? 0.3 : -0.3, b) });
        // 멜로디
        const ln = sg.lead[(Math.floor(step / 2) % sg.lead.length)];
        if (ln && step % 2 === 0) tone(sg.drums ? 'triangle' : 'triangle', N(ln), 0, spb * 1.9, sg.drums ? 0.2 : 0.16, { at: nextT, dest: out(1, 0, b) });
        if (sg.drums) {
          if (s16 % 4 === 0) tone('sine', 150, 40, 0.18, 0.9, { at: nextT, dest: out(1, 0, b) });                   // 킥
          if (s16 === 4 || s16 === 12) noise('bandpass', 1800, 900, 0.14, 0.5, { at: nextT, dest: out(1, 0, b) });   // 스네어
          if (s16 % 2 === 1) noise('highpass', 8000, 8000, 0.04, 0.18, { at: nextT, dest: out(1, 0.2, b) });         // 하이햇
        }
      }
      nextT += spb; step++;
    }
  }
  function mode(m) { want = m === 'battle' ? 'battle' : 'calm'; }

  function set(k, on) {
    opt[k] = !!on; saveOpt();
    if (ac) { if (k === 'sfx') sfxBus.gain.value = on ? 0.9 : 0; if (k === 'bgm') bgmBus.gain.value = on ? 0.45 : 0; }
  }
  function play(name) { if (ac && opt.sfx && S[name]) try { S[name]({}); } catch (_) {} }

  root.SFX = { event, mode, set, play, get: () => ({ ...opt }), init, _S: S, _MAP: MAP, _ac: () => ac, _master: () => master };
})(this);
