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

  const PLAYER_APPEARANCES = freezeMap({
    you: { skin: '#8d5b3c', hair: '#16100d', hairStyle: 'fade', eye: '#17111a', brow: 'straight', mouth: 'focus', kit: '#2f4a86', accent: '#7fdcff', shorts: '#15213b', socks: '#e8eef9', build: 1, height: 1, shoulders: 1, torso: 1, legs: 1, stance: 0.14, number: '10' },
    wiz: { skin: '#6f452f', hair: '#20140f', hairStyle: 'curls', eye: '#20140f', brow: 'arc', mouth: 'smile', kit: '#6d3fbf', accent: '#cbb8ff', shorts: '#211637', socks: '#ece6ff', build: 0.86, height: 0.93, shoulders: 0.88, torso: 0.91, legs: 0.96, stance: 0.18, number: '10' },
    rocket: { skin: '#9a6041', hair: '#1a1411', hairStyle: 'crest', eye: '#18212d', brow: 'lift', mouth: 'focus', kit: '#1f8a70', accent: '#8bf0cf', shorts: '#12382f', socks: '#d8fff2', build: 0.94, height: 0.99, shoulders: 0.9, torso: 0.9, legs: 1.08, stance: 0.12, number: '7' },
    tower: { skin: '#563726', hair: '#120e0c', hairStyle: 'crop', eye: '#17111a', brow: 'strong', mouth: 'calm', kit: '#b8862b', accent: '#ffe199', shorts: '#44300e', socks: '#fff0be', build: 1.2, height: 1.1, shoulders: 1.2, torso: 1.1, legs: 1.04, stance: 0.2, number: '9' },
    trick: { skin: '#a86b49', hair: '#25150f', hairStyle: 'twists', eye: '#20140f', brow: 'arc', mouth: 'smile', kit: '#c2366b', accent: '#ffb3d0', shorts: '#4a1228', socks: '#ffe0eb', build: 0.88, height: 0.96, shoulders: 0.86, torso: 0.9, legs: 1.05, stance: 0.17, number: '11' },
    cannon: { skin: '#75462f', hair: '#17110e', hairStyle: 'locs', eye: '#15121a', brow: 'strong', mouth: 'focus', kit: '#c0392b', accent: '#ffb09f', shorts: '#461812', socks: '#ffe2dc', build: 1.12, height: 1.05, shoulders: 1.14, torso: 1.06, legs: 1.02, stance: 0.16, number: '17' }
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
    apiVersion: '1.1.0',
    STORAGE_KEYS,
    PLAYER_APPEARANCES,
    KIT_DEFAULTS,
    KIT_CATALOG,
    normalizeKit,
    kitMetrics,
    kitAppearance,
    playerAppearance,
    headAttachmentGeometry,
    pressureAtTemperature,
    restitutionAtPressure,
    timeAtDistance,
    calculateFreeKick
  });
})(globalThis);
