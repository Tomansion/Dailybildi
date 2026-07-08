import Phaser from "phaser";
import { UNIVERSE_ID } from "@/lib/constants";

export class WorldExporter {
  static getSubjectBounds(scene) {
    const placedBlocks = Array.from(scene.blocks.values());

    if (placedBlocks.length === 0) {
      if (scene.parallaxLayers.length > 0) {
        return this.mergeBounds(
          scene.parallaxLayers
            .map((layer) => layer.image.getBounds())
            .filter(Boolean),
        );
      }

      const fallbackSize = scene.universeConfig.blockSize * 8;
      return new Phaser.Geom.Rectangle(
        -fallbackSize / 2,
        -fallbackSize / 2,
        fallbackSize,
        fallbackSize,
      );
    }

    return this.mergeBounds(placedBlocks.map((block) => block.getBounds()));
  }

  static mergeBounds(boundsList) {
    if (!boundsList.length) {
      return null;
    }

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    for (const bounds of boundsList) {
      if (!bounds) {
        continue;
      }

      minX = Math.min(minX, bounds.x);
      minY = Math.min(minY, bounds.y);
      maxX = Math.max(maxX, bounds.right);
      maxY = Math.max(maxY, bounds.bottom);
    }

    if (
      !Number.isFinite(minX) ||
      !Number.isFinite(minY) ||
      !Number.isFinite(maxX) ||
      !Number.isFinite(maxY)
    ) {
      return null;
    }

    return new Phaser.Geom.Rectangle(minX, minY, maxX - minX, maxY - minY);
  }

  static expandBounds(bounds, padding) {
    return new Phaser.Geom.Rectangle(
      bounds.x - padding,
      bounds.y - padding,
      bounds.width + padding * 2,
      bounds.height + padding * 2,
    );
  }

  static getRenderableObjects(scene) {
    const parallaxObjects = scene.parallaxLayers
      .map((layer) => layer.image)
      .filter(Boolean)
      .map((image) => ({
        depth: image.depth,
        object: image,
      }));

    const blockObjects = Array.from(scene.blocks.values()).map((block) => ({
      depth: block.depth,
      object: block,
    }));

    return [...parallaxObjects, ...blockObjects].sort(
      (a, b) => a.depth - b.depth,
    );
  }

  static drawGameObject(ctx, gameObject) {
    const frame = gameObject.frame;
    const sourceImage = frame?.source?.image;

    if (!frame || !sourceImage) {
      return;
    }

    const sourceX = frame.cutX ?? 0;
    const sourceY = frame.cutY ?? 0;
    const sourceWidth = frame.cutWidth ?? frame.width;
    const sourceHeight = frame.cutHeight ?? frame.height;
    const scaleX = gameObject.scaleX * (gameObject.flipX ? -1 : 1);
    const scaleY = gameObject.scaleY * (gameObject.flipY ? -1 : 1);

    ctx.save();
    ctx.translate(gameObject.x, gameObject.y);
    ctx.rotate(gameObject.rotation);
    ctx.scale(scaleX, scaleY);
    ctx.drawImage(
      sourceImage,
      sourceX,
      sourceY,
      sourceWidth,
      sourceHeight,
      -gameObject.displayOriginX,
      -gameObject.displayOriginY,
      sourceWidth,
      sourceHeight,
    );
    ctx.restore();
  }

  static triggerCanvasDownload(canvas, filename) {
    return new Promise((resolve, reject) => {
      const finishDownload = (url) => {
        const link = document.createElement("a");
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        resolve();
      };

      if (canvas.toBlob) {
        canvas.toBlob((blob) => {
          if (!blob) {
            reject(new Error("Unable to generate PNG blob"));
            return;
          }

          const url = URL.createObjectURL(blob);
          finishDownload(url);
          setTimeout(() => URL.revokeObjectURL(url), 0);
        }, "image/png");

        return;
      }

      try {
        finishDownload(canvas.toDataURL("image/png"));
      } catch (error) {
        reject(error);
      }
    });
  }

  static async exportScene(scene, options = {}) {
    const subjectBounds = this.getSubjectBounds(scene);

    if (!subjectBounds) {
      throw new Error("Nothing to export");
    }

    const padding = options.padding ?? scene.universeConfig.blockSize * 2;
    const exportBounds = this.expandBounds(subjectBounds, padding);
    const longestSide = Math.max(exportBounds.width, exportBounds.height, 1);
    const maxScale = options.maxScale ?? 4;
    const maxDimension = options.maxDimension ?? 4096;
    const exportScale = Math.max(
      1,
      Math.min(maxScale, Math.floor(maxDimension / longestSide) || 1),
    );
    const canvasWidth = Math.max(1, Math.ceil(exportBounds.width * exportScale));
    const canvasHeight = Math.max(
      1,
      Math.ceil(exportBounds.height * exportScale),
    );
    const exportCanvas = document.createElement("canvas");
    exportCanvas.width = canvasWidth;
    exportCanvas.height = canvasHeight;

    const ctx = exportCanvas.getContext("2d");
    if (!ctx) {
      throw new Error("Unable to create export canvas");
    }

    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = scene.universeConfig.backgroundColor || "#000000";
    ctx.fillRect(0, 0, exportCanvas.width, exportCanvas.height);
    ctx.save();
    ctx.scale(exportScale, exportScale);
    ctx.translate(-exportBounds.x, -exportBounds.y);

    for (const { object } of this.getRenderableObjects(scene)) {
      this.drawGameObject(ctx, object);
    }

    ctx.restore();

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const filename = `${UNIVERSE_ID}-${timestamp}.png`;
    await this.triggerCanvasDownload(exportCanvas, filename);
  }
}