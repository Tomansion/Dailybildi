import Phaser from "phaser";

export const CAMERA_ZOOM = Object.freeze({
  initial: 0.8,
  min: 0.4,
  max: 8,
  precision: 100,
  wheelStep: 0.4,
  buttonStep: 0.4,
});

export function normalizeCameraZoom(zoom, options = {}) {
  const { snap = true } = options;
  const clampedZoom = Phaser.Math.Clamp(zoom, CAMERA_ZOOM.min, CAMERA_ZOOM.max);

  if (!snap) {
    return (
      Math.round(clampedZoom * CAMERA_ZOOM.precision) / CAMERA_ZOOM.precision
    );
  }

  const remainder = clampedZoom % CAMERA_ZOOM.wheelStep;
  const adjustedZoom =
    remainder < CAMERA_ZOOM.wheelStep / 2
      ? clampedZoom - remainder
      : clampedZoom + (CAMERA_ZOOM.wheelStep - remainder);
  const finalZoom = Phaser.Math.Clamp(
    adjustedZoom,
    CAMERA_ZOOM.min,
    CAMERA_ZOOM.max,
  );

  return Math.round(finalZoom * CAMERA_ZOOM.precision) / CAMERA_ZOOM.precision;
}

export function setCameraZoom(camera, zoom, pointer = null, options = {}) {
  const oldZoom = camera.zoom;
  const newZoom = normalizeCameraZoom(zoom, options);

  if (newZoom === oldZoom) {
    return newZoom;
  }

  if (!pointer) {
    camera.setZoom(newZoom);
    return newZoom;
  }

  const centerX = camera.width / 2;
  const centerY = camera.height / 2;
  const offsetX = pointer.x - centerX;
  const offsetY = pointer.y - centerY;
  const worldX = camera.scrollX + offsetX / oldZoom;
  const worldY = camera.scrollY + offsetY / oldZoom;

  camera.setZoom(newZoom);
  camera.scrollX = worldX - offsetX / newZoom;
  camera.scrollY = worldY - offsetY / newZoom;

  return newZoom;
}

export function changeCameraZoom(camera, delta, pointer = null, options = {}) {
  return setCameraZoom(camera, camera.zoom + delta, pointer, options);
}
