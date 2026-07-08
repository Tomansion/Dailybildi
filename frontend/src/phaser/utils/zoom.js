import Phaser from "phaser";

export const CAMERA_ZOOM = Object.freeze({
  initial: 0.8,
  min: 0.4,
  max: 8,
  precision: 100,
  wheelStep: 0.4,
  buttonStep: 0.4,
});

export function normalizeCameraZoom(zoom) {
  console.log("zoom in", zoom);

  const clampedZoom = Phaser.Math.Clamp(zoom, CAMERA_ZOOM.min, CAMERA_ZOOM.max);
  // Zoom must be a multiple of 0.4 to avoid artifacts
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
  const roundedZoom =
    Math.round(finalZoom * CAMERA_ZOOM.precision) / CAMERA_ZOOM.precision;
  console.log("zoom out", zoom);
  return roundedZoom;
}

export function setCameraZoom(camera, zoom, pointer = null) {
  const oldZoom = camera.zoom;
  const newZoom = normalizeCameraZoom(zoom);

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

export function changeCameraZoom(camera, delta, pointer = null) {
  return setCameraZoom(camera, camera.zoom + delta, pointer);
}
