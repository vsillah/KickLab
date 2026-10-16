(function installKickLabGameCore(root) {
  'use strict';

  const STORAGE_KEYS = Object.freeze({
    progress: 'impactlab.v1',
    nickname: 'impactlab.nick'
  });

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
    apiVersion: '1.0.0',
    STORAGE_KEYS,
    timeAtDistance,
    calculateFreeKick
  });
})(globalThis);
