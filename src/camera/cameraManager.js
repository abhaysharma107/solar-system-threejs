/**
 * Camera manager — transitions, tracking, reset.
 *
 * The key fix: during a transition the camera continuously re-targets the
 * mesh's *live* world position each frame, so it never aims at empty space.
 */

import * as THREE from 'three';

export const DEFAULT_CAM_POS    = new THREE.Vector3(15, 20, 30);
export const DEFAULT_CAM_TARGET = new THREE.Vector3(0, 0, 0);

// Transition state
let _transition = null;  // { mesh, startPos, startTarget, zoomDist, startTime, duration, explicitEndPos }

/**
 * Start a smooth camera transition.
 *   mesh        — THREE.Mesh to follow (can be null for static target)
 *   staticTarget— THREE.Vector3 fallback target (used when mesh is null)
 *   zoomDist    — distance from target
 *   camera, controls — refs
 *   explicitEndPos — if set, camera goes exactly here (used for reset)
 */
export function smoothCameraTo(mesh, staticTarget, zoomDist, camera, controls, explicitEndPos = null) {
  _transition = {
    mesh,
    staticTarget: staticTarget.clone(),
    zoomDist,
    startPos: camera.position.clone(),
    startTarget: controls.target.clone(),
    startTime: performance.now(),
    duration: 1600,
    explicitEndPos: explicitEndPos ? explicitEndPos.clone() : null,
  };
}

/**
 * Call every frame. Updates camera if a transition is active.
 * Also keeps controls.target glued to lockedTarget when not transitioning.
 * Returns true if a transition is currently in progress.
 */
export function updateCamera(camera, controls, lockedTarget) {
  if (_transition) {
    const { mesh, staticTarget, zoomDist, startPos, startTarget, startTime, duration, explicitEndPos } = _transition;
    const elapsed = performance.now() - startTime;
    const rawT = Math.min(elapsed / duration, 1);
    // Ease in-out quart
    const t = rawT < 0.5
      ? 8 * rawT * rawT * rawT * rawT
      : 1 - Math.pow(-2 * rawT + 2, 4) / 2;

    // Live target position — always re-sample from the mesh
    const liveTarget = new THREE.Vector3();
    if (mesh) {
      mesh.getWorldPosition(liveTarget);
    } else {
      liveTarget.copy(staticTarget);
    }

    // End camera position
    let endPos;
    if (explicitEndPos) {
      endPos = explicitEndPos;
    } else {
      // Position camera at an offset from the live target
      const dir = new THREE.Vector3().subVectors(startPos, startTarget).normalize();
      endPos = liveTarget.clone().add(dir.multiplyScalar(zoomDist));
      endPos.y = Math.max(endPos.y, zoomDist * 0.3);
    }

    camera.position.lerpVectors(startPos, endPos, t);
    controls.target.lerpVectors(startTarget, liveTarget, t);
    controls.update();

    if (rawT >= 1) {
      _transition = null;
    }
    return true;
  }

  // No active transition — if locked, track the body
  if (lockedTarget) {
    const wp = new THREE.Vector3();
    lockedTarget.getWorldPosition(wp);
    controls.target.lerp(wp, 0.08);
  }
  return false;
}

/**
 * Cancel any in-progress transition.
 */
export function cancelTransition() {
  _transition = null;
}
