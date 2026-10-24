(function installKickLabGameCore(root) {
  'use strict';

  const STORAGE_KEYS = Object.freeze({
    progress: 'impactlab.v1',
    nickname: 'impactlab.nick'
  });

  const freezeMap = (value) => {
    Object.values(value).forEach((entry) => {
      if (entry && typeof entry === 'object' && !Object.isFrozen(entry)) freezeMap(entry);
    });
    return Object.freeze(value);
  };

  const CONTROL_POWER_BANDS = Object.freeze({ targetStart: 0.52, perfectStart: 0.64, perfectEnd: 0.7, targetEnd: 0.8, overchargeStart: 0.9 });

  const CONTROL_MAPPINGS = freezeMap({
    fight: { id: 'fight', title: 'Fight stance', x: ['Block', 'Ready'], y: ['Duck', 'Rise'], action: ['Punch', 'Release in the perfect band'], color: '#ff6b73', icon: 'cross' },
    race: { id: 'race', title: 'Race controls', x: ['Steer left', 'Steer right'], y: ['Brake', 'Throttle'], action: ['Throttle', 'Hold for graded acceleration'], color: '#5fe3a1', icon: 'gas', continuous: true },
    kickFree: { id: 'kick-free', title: 'Free kick', x: ['Backspin', 'Topspin'], y: ['Lower angle', 'Raise angle'], action: ['Kick', 'Power plus curved swipe sets spin'], color: '#ff8a1f', icon: 'kick' },
    kickHeader: { id: 'kick-header', title: 'Header', x: ['Direct left', 'Direct right'], y: ['Lower jump', 'Higher jump'], action: ['Head it', 'Release on the target band'], color: '#f3e36b', icon: 'head' },
    kickRun: { id: 'kick-run', title: 'Dribble run', x: ['Feint left', 'Feint right'], y: ['Slow', 'Sprint'], action: ['Cut or shoot', 'Charge, curve, then release'], color: '#9b6bff', icon: 'cut' },
    kickPass: { id: 'kick-pass', title: 'Passing', x: ['Pick left', 'Pick right'], y: ['Short lead', 'Long lead'], action: ['Pass', 'Release in the target band'], color: '#7fdcff', icon: 'run' },
    kickKeeper: { id: 'kick-keeper', title: 'Goalkeeper', x: ['Dive left', 'Dive right'], y: ['Back to line', 'Come out / high'], action: ['Set or save', 'Release when the shot commits'], color: '#27c7ff', icon: 'shield' },
    kickCombo: { id: 'kick-combo', title: 'Give and go', x: ['Steer left', 'Steer right'], y: ['Slow', 'Sprint'], action: ['Pass or volley', 'Charge and release at contact'], color: '#ff8fc7', icon: 'crossin' }
  });

  function clampControl(value, min = 0, max = 1) {
    return Math.max(min, Math.min(max, Number.isFinite(value) ? value : 0));
  }

  function normalizeAnalogStick(dx, dy, radius, options = {}) {
    const safeRadius = Math.max(1, Number(radius) || 1);
    const deadZone = clampControl(options.deadZone == null ? 0.16 : options.deadZone, 0, 0.9);
    const curve = Math.max(0.2, Number(options.curve) || 1.45);
    const rawMagnitude = clampControl(Math.hypot(dx, dy) / safeRadius);
    const liveMagnitude = rawMagnitude <= deadZone ? 0 : (rawMagnitude - deadZone) / (1 - deadZone);
    const magnitude = Math.pow(clampControl(liveMagnitude), curve);
    const length = Math.hypot(dx, dy) || 1;
    return Object.freeze({
      x: magnitude ? dx / length * magnitude : 0,
      y: magnitude ? dy / length * magnitude : 0,
      magnitude,
      rawMagnitude,
      angle: magnitude ? Math.atan2(dy, dx) : 0,
      deadZone,
      curve
    });
  }

  function powerFromGesture({ elapsedMs = 0, displacement = 0 } = {}) {
    const timeCharge = Math.max(0, Number(elapsedMs) || 0) / 1700;
    const thumbCharge = clampControl(displacement);
    return clampControl(0.85 * timeCharge + 0.2 * thumbCharge);
  }

  function classifyPower(power, bands = CONTROL_POWER_BANDS) {
    const value = clampControl(power);
    if (value >= bands.overchargeStart) return 'overcharge';
    if (value >= bands.perfectStart && value <= bands.perfectEnd) return 'perfect';
    if (value >= bands.targetStart && value <= bands.targetEnd) return 'target';
    return 'early';
  }

  function gestureToSpin(points = []) {
    if (!Array.isArray(points) || points.length < 2) return Object.freeze({ spin: 0, direction: 'none', curvature: 0, velocity: 0 });
    let path = 0;
    let turn = 0;
    for (let i = 1; i < points.length; i += 1) path += Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y);
    for (let i = 1; i < points.length - 1; i += 1) {
      const a = points[i - 1], b = points[i], c = points[i + 1];
      turn += (b.x - a.x) * (c.y - b.y) - (b.y - a.y) * (c.x - b.x);
    }
    const first = points[0], last = points[points.length - 1];
    const direct = Math.hypot(last.x - first.x, last.y - first.y);
    const duration = Math.max(16, (last.t || 0) - (first.t || 0));
    const velocity = path / duration;
    const curvature = path > 0 ? clampControl(Math.abs(turn) / (path * path), 0, 1) * Math.sign(turn || 1) : 0;
    const horizontal = direct > 0 ? (last.x - first.x) / direct : 0;
    const intensity = clampControl(path / 60 * velocity / 0.45);
    const spin = clampControl((horizontal * 0.65 + curvature * 2.2) * intensity, -1, 1);
    return Object.freeze({ spin, direction: spin < -0.08 ? 'left' : spin > 0.08 ? 'right' : 'straight', curvature, velocity });
  }

  function hapticCapability(platform = {}) {
    return Object.freeze({ supported: typeof platform.vibrate === 'function', label: typeof platform.vibrate === 'function' ? 'Haptics ready' : 'Visual cues only' });
  }

  function hapticCueFor(event) {
    return Object.freeze({ target: [12], perfect: [18, 12, 22], overcharge: [30, 10, 30], cancel: [8] }[event] || []);
  }

  function resolveControlMapping(context = {}) {
    if (context.mode === 'fight') return CONTROL_MAPPINGS.fight;
    if (context.mode === 'race') return CONTROL_MAPPINGS.race;
    if (context.mode !== 'kick') return CONTROL_MAPPINGS.fight;
    if (context.shot === 'free') return CONTROL_MAPPINGS.kickFree;
    if (context.shot === 'header') return CONTROL_MAPPINGS.kickHeader;
    if (context.pass || context.pso === 'pass' || context.state === 'pass' || context.state === 'pfly') return CONTROL_MAPPINGS.kickPass;
    if (context.keeper || context.pso === 'gk' || context.state === 'keep') return CONTROL_MAPPINGS.kickKeeper;
    if (context.combo || context.pso === 'combo' || ['crun', 'cpass', 'cret', 'cwhiff', 'cshot'].includes(context.state)) return CONTROL_MAPPINGS.kickCombo;
    return CONTROL_MAPPINGS.kickRun;
  }

  function sliderRangeModel({ min = 0, max = 1, step = 0.01, value = min, suggestion = null, locked = false, lockReason = '', name = 'Variable', unit = '' } = {}) {
    const loBound = Number.isFinite(min) ? min : 0;
    const hiBound = Number.isFinite(max) && max > loBound ? max : loBound + 1;
    const span = hiBound - loBound;
    const clampValue = input => Math.max(loBound, Math.min(hiBound, Number.isFinite(input) ? input : loBound));
    const current = clampValue(value);
    const position = clampControl((current - loBound) / span);
    const hasBand = !!(suggestion && Number.isFinite(suggestion.lo) && Number.isFinite(suggestion.hi));
    let targetStart = 0, targetEnd = 0, perfectStart = 0, perfectEnd = 0;
    let segments = [{ state: 'neutral', start: 0, end: 1 }];
    if (hasBand) {
      const bandLow = clampValue(Math.min(suggestion.lo, suggestion.hi));
      const bandHigh = clampValue(Math.max(suggestion.lo, suggestion.hi));
      targetStart = clampControl((bandLow - loBound) / span);
      targetEnd = clampControl((bandHigh - loBound) / span);
      const bandSpan = Math.max(0, targetEnd - targetStart);
      const perfectSpan = Math.min(bandSpan, Math.max((Number(step) || 0) / span * 2, bandSpan * 0.32));
      const midpoint = (targetStart + targetEnd) / 2;
      perfectStart = Math.max(targetStart, midpoint - perfectSpan / 2);
      perfectEnd = Math.min(targetEnd, midpoint + perfectSpan / 2);
      segments = [
        { state: 'low', start: 0, end: targetStart },
        { state: 'target', start: targetStart, end: perfectStart },
        { state: 'perfect', start: perfectStart, end: perfectEnd },
        { state: 'target', start: perfectEnd, end: targetEnd },
        { state: 'high', start: targetEnd, end: 1 }
      ].filter(segment => segment.end - segment.start > 1e-9);
    }
    let state = 'neutral';
    if (hasBand) state = position < targetStart ? 'low' : position > targetEnd ? 'high' : position >= perfectStart && position <= perfectEnd ? 'perfect' : 'target';
    if (locked) state = 'locked';
    const valueText = `${current}${unit ? unit === '°' ? '°' : ` ${unit}` : ''}`;
    const rangeText = `${loBound} to ${hiBound}${unit ? unit === '°' ? ' degrees' : ` ${unit}` : ''}`;
    const bandText = hasBand ? `${clampValue(Math.min(suggestion.lo, suggestion.hi))} to ${clampValue(Math.max(suggestion.lo, suggestion.hi))}${unit ? unit === '°' ? ' degrees' : ` ${unit}` : ''}` : 'No coach target band for this mechanic';
    const description = locked ? lockReason || `${name} is fixed by the active challenge.` : `${name} range ${rangeText}. Current ${valueText}. ${hasBand ? `Coach target ${bandText}.` : `${bandText}.`}`;
    return Object.freeze({
      min: loBound, max: hiBound, value: current, position, hasBand, targetStart, targetEnd, perfectStart, perfectEnd,
      state, valueText, rangeText, bandText, label: `${name}. Current ${valueText}.`, description,
      segments: Object.freeze(segments.map(segment => Object.freeze(segment)))
    });
  }

  function sliderSlotsModel(options = {}) {
    const range = sliderRangeModel(options), step = Math.max(Number(options.step) || 1, Number.EPSILON), span = range.max - range.min;
    const precision = Math.min(8, Math.max(0, String(step).split('.')[1]?.length || 0, String(range.min).split('.')[1]?.length || 0, String(range.max).split('.')[1]?.length || 0));
    const snap = raw => Number((range.min + Math.round((raw - range.min) / step) * step).toFixed(precision));
    const values = Array.from({ length: 6 }, (_, index) => index === 0 ? range.min : index === 5 ? range.max : Math.max(range.min, Math.min(range.max, snap(range.min + span * index / 5))));
    const selectedIndex = values.reduce((best, candidate, index) => Math.abs(candidate - range.value) < Math.abs(values[best] - range.value) ? index : best, 0);
    const slots = values.map((slotValue, index) => {
      const center = (slotValue - range.min) / span;
      const start = index === 0 ? 0 : ((values[index - 1] + slotValue) / 2 - range.min) / span;
      const end = index === 5 ? 1 : ((slotValue + values[index + 1]) / 2 - range.min) / span;
      let state = 'neutral';
      if (range.hasBand) {
        if (end < range.targetStart) state = 'low';
        else if (start > range.targetEnd) state = 'high';
        else if (end >= range.perfectStart && start <= range.perfectEnd) state = 'perfect';
        else if (end >= range.targetStart && start <= range.targetEnd) state = 'target';
        else state = center < range.targetStart ? 'low' : 'high';
      }
      const unitText = options.unit ? options.unit === '°' ? ' degrees' : ` ${options.unit}` : '';
      const stateText = { low: 'below coach range', target: 'coach range', perfect: 'coach ideal', high: 'above coach range', neutral: 'no coach range' }[state];
      return Object.freeze({ index, value: slotValue, start, end, state, selected: index === selectedIndex, label: `${options.name || 'Variable'}, slot ${index + 1} of 6, ${slotValue}${unitText}, ${stateText}${index === selectedIndex ? ', nearest current value' : ''}` });
    });
    return Object.freeze({ ...range, selectedIndex, values: Object.freeze(values), slots: Object.freeze(slots) });
  }

  function objectiveImpact({ benefit = '', cost = '', neutral = '', prediction = '' } = {}) {
    const helps = String(benefit || '').trim(), hurts = String(cost || '').trim(), neither = String(neutral || '').trim();
    if (helps && hurts) return Object.freeze({ kind: 'tradeoff', label: `${helps} · ${hurts}`, benefit: helps, cost: hurts, prediction });
    if (helps) return Object.freeze({ kind: 'helps', label: helps, benefit: helps, cost: '', prediction });
    if (hurts) return Object.freeze({ kind: 'hurts', label: hurts, benefit: '', cost: hurts, prediction });
    return Object.freeze({ kind: 'neutral', label: neither || 'Neutral / explore', benefit: '', cost: '', prediction });
  }

  const PLAYER_APPEARANCES = freezeMap({
    you: { skin: '#8d5b3c', hair: '#16100d', hairStyle: 'fade', eye: '#17111a', brow: 'straight', mouth: 'focus', kit: '#2f4a86', accent: '#7fdcff', shorts: '#15213b', socks: '#e8eef9', build: 1, height: 1, shoulders: 1, torso: 1, legs: 1, stance: 0.14, number: '10' },
    wiz: { skin: '#6f452f', hair: '#20140f', hairStyle: 'curls', eye: '#20140f', brow: 'arc', mouth: 'smile', kit: '#6d3fbf', accent: '#cbb8ff', shorts: '#211637', socks: '#ece6ff', build: 0.86, height: 0.93, shoulders: 0.88, torso: 0.91, legs: 0.96, stance: 0.18, number: '10' },
    rocket: { skin: '#9a6041', hair: '#1a1411', hairStyle: 'crest', eye: '#18212d', brow: 'lift', mouth: 'focus', kit: '#1f8a70', accent: '#8bf0cf', shorts: '#12382f', socks: '#d8fff2', build: 0.94, height: 0.99, shoulders: 0.9, torso: 0.9, legs: 1.08, stance: 0.12, number: '7' },
    tower: { skin: '#563726', hair: '#120e0c', hairStyle: 'crop', eye: '#17111a', brow: 'strong', mouth: 'calm', kit: '#b8862b', accent: '#ffe199', shorts: '#44300e', socks: '#fff0be', build: 1.2, height: 1.1, shoulders: 1.2, torso: 1.1, legs: 1.04, stance: 0.2, number: '9' },
    trick: { skin: '#a86b49', hair: '#25150f', hairStyle: 'twists', eye: '#20140f', brow: 'arc', mouth: 'smile', kit: '#c2366b', accent: '#ffb3d0', shorts: '#4a1228', socks: '#ffe0eb', build: 0.88, height: 0.96, shoulders: 0.86, torso: 0.9, legs: 1.05, stance: 0.17, number: '11' },
    cannon: { skin: '#75462f', hair: '#17110e', hairStyle: 'locs', eye: '#15121a', brow: 'strong', mouth: 'focus', kit: '#c0392b', accent: '#ffb09f', shorts: '#461812', socks: '#ffe2dc', build: 1.12, height: 1.05, shoulders: 1.14, torso: 1.06, legs: 1.02, stance: 0.16, number: '17' }
  });

  const FALLBACK_ENVIRONMENTS = freezeMap({
    home: { skyTop: '#07101f', skyBottom: '#20365c', haze: '#88a5d1', stand: '#111d3b', tier: '#1b2a4d', rail: '#a9bedf', crowd: ['#ffb04a', '#5fe3a1', '#7fdcff', '#c9a7ff'], field: '#174b31', band: '#1d5b39', board: '#071225', accent: '#7fdcff', atmosphere: 'floodlights' },
    alt: { skyTop: '#101b42', skyBottom: '#5378ad', haze: '#c3dbf4', stand: '#17284e', tier: '#284369', rail: '#d5e7ff', crowd: ['#ffd166', '#9ee7ff', '#d7c2ff', '#ffffff'], field: '#205741', band: '#28684c', board: '#0b1730', accent: '#c9e5ff', atmosphere: 'mountains' },
    mars: { skyTop: '#190806', skyBottom: '#8e3d23', haze: '#e58b58', stand: '#44211d', tier: '#6a3025', rail: '#ffc08d', crowd: ['#ffb07c', '#ffd166', '#7fdcff', '#f6e2d0'], field: '#81412d', band: '#9a5034', board: '#24100d', accent: '#ffb07c', atmosphere: 'dome' },
    moon: { skyTop: '#000000', skyBottom: '#101522', haze: '#b7c5db', stand: '#171b26', tier: '#2a303e', rail: '#ecf4ff', crowd: ['#d9e5f7', '#7fdcff', '#c9a7ff', '#f3e36b'], field: '#505762', band: '#616975', board: '#090c13', accent: '#eaf3ff', atmosphere: 'habitat' }
  });

  const KIT_DEFAULTS = Object.freeze({ press: 'match', size: '5', surf: 'tex', studs: 'fg', boot: 'std' });
  const KIT_CATALOG = freezeMap({
    press: { label: 'Ball pressure', eq: 'bounciness e: v_ball = v_foot · M(1+e) ÷ (M+m)', why: 'A firmer ball is bouncier (higher e). More of your kick comes back as speed, but every dribble touch also pops further off your foot.',
      options: { soft: { n: 'Soft', d: '0.5 bar · underpumped', bar: 0.5, e: 0.62, seam: 'wide', squash: 0.94 }, match: { n: 'Match', d: '0.9 bar · regulation', bar: 0.9, e: 0.76, seam: 'standard', squash: 1 }, hard: { n: 'Rock hard', d: '1.3 bar · overpumped', bar: 1.3, e: 0.84, seam: 'tight', squash: 1.04 } } },
    size: { label: 'Ball size', eq: 'a = F ÷ m: same push, lighter ball, more speed', why: 'Kids play with a size 4. It is lighter, so it leaves your foot faster, but drag and wind push it around more.',
      options: { '5': { n: 'Size 5', d: '0.43 kg · 22 cm · adult', m: 0.43, r: 0.11, visualScale: 1 }, '4': { n: 'Size 4', d: '0.36 kg · 20.5 cm · youth', m: 0.36, r: 0.1025, visualScale: 0.932 } } },
    surf: { label: 'Ball surface', eq: 'F_drag = ½ρC_dAv²,  Magnus a = k·ω·v', why: 'Textured panels grab the boot for spin and keep air flowing smoothly. A slick ball has less drag but the air lets go unevenly, so it wobbles: a knuckleball.',
      options: { tex: { n: 'Textured', d: 'grippy panels, flies true', Cd: 0.25, kn: 1, spin: 1.1, pattern: 'panels', roughness: 0.72, color: '#f4f6fb', accent: '#17213a' }, smooth: { n: 'Smooth', d: 'slick, less drag, wobbles', Cd: 0.21, kn: 1.8, spin: 0.85, pattern: 'rings', roughness: 0.28, color: '#eef7ff', accent: '#ff8fc7' } } },
    studs: { label: 'Studs', eq: 'a_cut = μ · g: your grip decides how hard you can turn', why: 'Studs set your grip (μ). The right studs for the pitch let you cut hard; the wrong ones and you slide.',
      options: { fg: { n: 'Firm-ground studs', d: 'molded, for dry grass', mu: { grass: 1, turf: 0.85, wet: 0.75 }, sole: 'molded', studCount: 6, soleColor: '#f3e36b' }, sg: { n: 'Soft-ground studs', d: 'long metal, for mud', mu: { grass: 0.95, turf: 0.8, wet: 1.05 }, sole: 'metal', studCount: 6, soleColor: '#c8d2e6' }, tf: { n: 'Turf shoes', d: 'tiny rubber nubs', mu: { grass: 0.85, turf: 1, wet: 0.7 }, sole: 'nubs', studCount: 10, soleColor: '#ffb04a' }, ind: { n: 'Indoor flats', d: 'flat rubber sole', mu: { grass: 0.7, turf: 0.85, wet: 0.5 }, sole: 'flat', studCount: 0, soleColor: '#7fdcff' } } },
    boot: { label: 'Boot weight', eq: 'heavier M adds punch, but your foot swings slower', why: 'Extra boot mass barely adds power because it also slows your swing. It does make your feet slower, which is why pros wear light boots.',
      options: { light: { n: 'Light', d: '180 g · quick feet', kg: 0.18, sk: 0.9, color: '#7fdcff', accent: '#e8eef9', profile: 'speed' }, std: { n: 'Standard', d: '230 g', kg: 0.23, sk: 1, color: '#111827', accent: '#e8eef9', profile: 'classic' }, heavy: { n: 'Heavy', d: '300 g · clunky', kg: 0.30, sk: 1.12, color: '#6d3fbf', accent: '#f3e36b', profile: 'power' } } }
  });

  function normalizeKit(selection = {}) {
    const out = {};
    for (const key of Object.keys(KIT_DEFAULTS)) {
      const value = selection[key];
      out[key] = KIT_CATALOG[key].options[value] ? value : KIT_DEFAULTS[key];
    }
    return out;
  }

  function kitOption(selection, key) {
    const normalized = normalizeKit(selection);
    return KIT_CATALOG[key].options[normalized[key]];
  }

  function pressureAtTemperature(bar, temperatureC = 20) {
    return (bar + 1.013) * (273.15 + temperatureC) / 293.15 - 1.013;
  }

  function restitutionAtPressure(bar) {
    const points = [[0.3, 0.55], [0.5, 0.62], [0.9, 0.76], [1.3, 0.84], [1.6, 0.87]];
    if (bar <= points[0][0]) return points[0][1];
    for (let i = 1; i < points.length; i += 1) {
      if (bar <= points[i][0]) {
        const [a0, e0] = points[i - 1];
        const [a1, e1] = points[i];
        return Number((e0 + (e1 - e0) * (bar - a0) / (a1 - a0)).toFixed(3));
      }
    }
    return points[points.length - 1][1];
  }

  function kitMetrics(selection = KIT_DEFAULTS, context = {}) {
    const kit = normalizeKit(selection);
    const press = kitOption(kit, 'press');
    const size = kitOption(kit, 'size');
    const surf = kitOption(kit, 'surf');
    const studs = kitOption(kit, 'studs');
    const boot = kitOption(kit, 'boot');
    const temperatureC = Number.isFinite(context.temperatureC) ? context.temperatureC : 20;
    const pitch = studs.mu[context.pitch] == null ? 'grass' : context.pitch;
    const wetMass = pitch === 'wet' ? 0.02 : 0;
    const mass = Number((size.m + wetMass).toFixed(3));
    const pressureBar = pressureAtTemperature(press.bar, temperatureC);
    const restitution = restitutionAtPressure(pressureBar);
    const legMass = 0.95;
    const touchMass = 0.5;
    const kickRatio = (e, ballMass, bootMass) => {
      const movingMass = legMass + bootMass;
      return (1 - 0.4 * (bootMass - 0.23)) * movingMass * (1 + e) / (movingMass + ballMass);
    };
    const touchRatio = (e, ballMass) => touchMass * (1 + e) / (touchMass + ballMass);
    const shotMultiplier = kickRatio(restitution, mass, boot.kg) / kickRatio(0.76, 0.43, 0.23);
    const touchMultiplier = Math.pow(touchRatio(restitution, mass) / touchRatio(0.76, 0.43), 2);
    const area = Number((Math.PI * size.r * size.r).toFixed(4));
    const rho = Number.isFinite(context.rho) ? context.rho : 1.2;
    const dragFactor = context.airOn === false ? 0 : 0.5 * rho * surf.Cd * area / mass;
    const baseShotSpeed = Number.isFinite(context.baseShotSpeed) ? context.baseShotSpeed : 24;
    return Object.freeze({
      kit: Object.freeze(kit),
      pressureBar,
      restitution,
      ballMass: mass,
      ballRadius: size.r,
      ballArea: area,
      shotMultiplier,
      shotSpeed: baseShotSpeed * shotMultiplier,
      touchMultiplier,
      touchDistance: 0.3 * touchMultiplier,
      reachMultiplier: 1 + 0.35 * (touchMultiplier - 1),
      gripMultiplier: studs.mu[pitch],
      spinMultiplier: surf.spin,
      knuckleMultiplier: surf.kn,
      skillTimingMultiplier: boot.sk,
      skillSpeedMultiplier: 1 / boot.sk,
      dragFactor,
      bounce: restitution
    });
  }

  function playerAppearance(id = 'you', overrides = {}) {
    const base = PLAYER_APPEARANCES[id] || PLAYER_APPEARANCES.you;
    return Object.freeze({ ...base, ...overrides, id: PLAYER_APPEARANCES[id] ? id : 'you' });
  }

  function headAttachmentGeometry(scale = 1) {
    const safeScale = Number.isFinite(scale) && scale > 0 ? scale : 1;
    const headRadius = 0.1344 * safeScale;
    const headCenterAboveShoulders = 0.18 * safeScale;
    return Object.freeze({
      headRadius,
      headCenterAboveShoulders,
      neckTopAboveShoulders: headCenterAboveShoulders - headRadius * 0.88,
      maxVisibleGap: 0.006 * safeScale
    });
  }

  const KICK_TIMES = freezeMap({
    day: { name: 'Day', skyTop: '#4c9dd2', skyBottom: '#a9d8ef', haze: '#d8e9e3', stand: '#344e68', tier: '#486885', rail: '#e1e9e9', field: '#27804a', band: '#319052', atmosphere: 'sunlit stadium', floodlights: false },
    dusk: { name: 'Dusk', skyTop: '#344778', skyBottom: '#e49d76', haze: '#f2c2a1', stand: '#273451', tier: '#394761', rail: '#d8c7c2', field: '#246b42', band: '#2b7948', atmosphere: 'golden-hour stadium', floodlights: true },
    night: { name: 'Night', skyTop: '#07101f', skyBottom: '#20365c', haze: '#88a5d1', stand: '#111d3b', tier: '#1b2a4d', rail: '#a9bedf', field: '#174b31', band: '#1d5b39', atmosphere: 'floodlit stadium', floodlights: true }
  });
  function normalizeKickTime(value) { return Object.hasOwn(KICK_TIMES, value) ? value : 'day'; }

  function fallbackEnvironment(id = 'home', pitchId = 'grass', time = 'day') {
    const base = FALLBACK_ENVIRONMENTS[id] || FALLBACK_ENVIRONMENTS.home;
    const lighting = KICK_TIMES[normalizeKickTime(time)];
    const worldSky = id === 'mars' ? { day: ['#9d4f37','#e5a46c','#f0c294'], dusk: ['#492535','#b95a3b','#da8863'], night: ['#190806','#6b2e1c','#92523b'] }[normalizeKickTime(time)] : id === 'moon' ? { day: ['#273a56','#7d95a7','#b7c5db'], dusk: ['#172039','#515976','#8494af'], night: ['#000000','#101522','#b7c5db'] }[normalizeKickTime(time)] : null;
    const pitchTone = pitchId === 'turf'
      ? { field: id === 'mars' ? '#985034' : id === 'moon' ? '#636b77' : '#216846', band: id === 'mars' ? '#aa5b3b' : id === 'moon' ? '#727b87' : '#287a50' }
      : pitchId === 'wet'
        ? { field: id === 'mars' ? '#68362c' : id === 'moon' ? '#454c57' : '#123c2d', band: id === 'mars' ? '#7b4032' : id === 'moon' ? '#555d69' : '#184b37' }
        : {};
    return Object.freeze({ ...base, ...lighting, ...(id === 'home' ? {} : { field: base.field, band: base.band, stand: base.stand, tier: base.tier, rail: base.rail, atmosphere: base.atmosphere }), ...(worldSky ? { skyTop: worldSky[0], skyBottom: worldSky[1], haze: worldSky[2] } : {}), ...pitchTone, id: FALLBACK_ENVIRONMENTS[id] ? id : 'home', pitchId, time: normalizeKickTime(time) });
  }

  function kitAppearance(selection = KIT_DEFAULTS) {
    const kit = normalizeKit(selection);
    const size = kitOption(kit, 'size');
    const press = kitOption(kit, 'press');
    const surf = kitOption(kit, 'surf');
    const studs = kitOption(kit, 'studs');
    const boot = kitOption(kit, 'boot');
    return Object.freeze({
      ball: Object.freeze({ radius: size.r, scale: size.visualScale, squash: press.squash, seam: press.seam, pattern: surf.pattern, color: surf.color, accent: surf.accent, roughness: surf.roughness }),
      boot: Object.freeze({ color: boot.color, accent: boot.accent, profile: boot.profile, sole: studs.sole, soleColor: studs.soleColor, studCount: studs.studCount }),
      glove: Object.freeze({ color: boot.accent, accent: boot.color })
    });
  }

  function timeAtDistance(distance, horizontalVelocity, horizontalAcceleration = 0) {
    if (Math.abs(horizontalAcceleration) < 1e-6) return distance / horizontalVelocity;
    const discriminant = horizontalVelocity * horizontalVelocity
      + 2 * horizontalAcceleration * distance;
    return discriminant < 0
      ? Infinity
      : (-horizontalVelocity + Math.sqrt(discriminant)) / horizontalAcceleration;
  }

  function calculateFreeKick(input) {
    const {
      speed,
      angleDegrees,
      gravity,
      spinAcceleration = 0,
      startHeight,
      horizontalAcceleration = 0,
      wallDistance,
      goalDistance,
      wallHeight,
      crossbarHeight,
      ballRadius,
      keeperReach = 0,
      ballMass,
      contactSeconds
    } = input;

    const angleRadians = angleDegrees * Math.PI / 180;
    const horizontalVelocity = speed * Math.cos(angleRadians);
    const verticalVelocity = speed * Math.sin(angleRadians);
    const effectiveGravity = gravity + spinAcceleration;
    const wallTime = timeAtDistance(
      wallDistance,
      horizontalVelocity,
      horizontalAcceleration
    );
    const goalTime = timeAtDistance(
      goalDistance,
      horizontalVelocity,
      horizontalAcceleration
    );
    const heightAt = (time) => Number.isFinite(time)
      ? startHeight + verticalVelocity * time - 0.5 * effectiveGravity * time * time
      : -1;
    const wallY = heightAt(wallTime);
    const goalY = heightAt(goalTime);
    const peakTime = verticalVelocity / effectiveGravity;
    const peakHeight = startHeight
      + verticalVelocity * verticalVelocity / (2 * effectiveGravity);
    const clearsWall = wallY > wallHeight + ballRadius;
    const clearsKeeper = goalY > Math.max(ballRadius, keeperReach + ballRadius);
    const underCrossbar = goalY < crossbarHeight - ballRadius && clearsKeeper;

    return Object.freeze({
      kind: 'free-kick',
      speed,
      angleDegrees,
      gravity,
      spinAcceleration,
      horizontalAcceleration,
      startHeight,
      horizontalVelocity,
      verticalVelocity,
      effectiveGravity,
      wallTime,
      wallY,
      goalTime,
      goalY,
      peakTime,
      peakHeight,
      impulseForce: ballMass * speed / contactSeconds,
      clearsWall,
      underCrossbar,
      scores: clearsWall && underCrossbar
    });
  }

  root.KickLabGameCore = Object.freeze({
    apiVersion: '1.5.0',
    STORAGE_KEYS,
    CONTROL_POWER_BANDS,
    CONTROL_MAPPINGS,
    PLAYER_APPEARANCES,
    FALLBACK_ENVIRONMENTS,
    KICK_TIMES,
    normalizeKickTime,
    KIT_DEFAULTS,
    KIT_CATALOG,
    normalizeKit,
    kitMetrics,
    kitAppearance,
    playerAppearance,
    headAttachmentGeometry,
    fallbackEnvironment,
    pressureAtTemperature,
    restitutionAtPressure,
    timeAtDistance,
    calculateFreeKick,
    normalizeAnalogStick,
    powerFromGesture,
    classifyPower,
    gestureToSpin,
    hapticCapability,
    hapticCueFor,
    resolveControlMapping,
    sliderRangeModel,
    sliderSlotsModel,
    objectiveImpact
  });
})(globalThis);
