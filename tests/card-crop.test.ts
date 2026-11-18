import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  detectCardSlices,
  nameObjectPositionY,
  rulesObjectPositionY,
  SECONDARY_SLICE_CROP,
  type PixelBuffer,
} from "../lib/card-crop";

const PT_BOTTOM = 0.942;
const COLLECTOR_TOP = 0.955;

function paint(
  buffer: PixelBuffer,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  rgb: readonly [number, number, number],
  noise = 0,
) {
  for (let y = y0; y < y1; y += 1) {
    for (let x = x0; x < x1; x += 1) {
      const i = (y * buffer.width + x) * 4;
      const jitter = noise ? ((x * 13 + y * 7) % (noise * 2 + 1)) - noise : 0;
      buffer.data[i] = Math.max(0, Math.min(255, rgb[0] + jitter));
      buffer.data[i + 1] = Math.max(0, Math.min(255, rgb[1] + jitter));
      buffer.data[i + 2] = Math.max(0, Math.min(255, rgb[2] + jitter));
      buffer.data[i + 3] = 255;
    }
  }
}

function syntheticCard(options: { transformBanner?: boolean } = {}): PixelBuffer {
  const width = 80;
  const height = 112;
  const buffer: PixelBuffer = {
    width,
    height,
    data: new Uint8ClampedArray(width * height * 4),
  };
  paint(buffer, 0, 0, width, height, [22, 19, 14]);
  paint(buffer, 6, Math.floor(height * 0.03), width - 6, Math.floor(height * 0.1), [198, 186, 118]);
  paint(buffer, 8, Math.floor(height * 0.11), width - 8, Math.floor(height * 0.55), [110, 96, 88], 48);
  paint(buffer, 6, Math.floor(height * 0.556), width - 6, Math.floor(height * 0.612), [200, 188, 118]);
  paint(buffer, 8, Math.floor(height * 0.628), width - 8, Math.floor(height * 0.88), [232, 238, 230]);
  for (let y = Math.floor(height * 0.66); y < Math.floor(height * 0.86); y += 4) {
    paint(buffer, 14, y, width - 18, y + 1, [42, 36, 32]);
  }
  paint(buffer, 8, Math.floor(height * 0.88), width - 8, Math.floor(height * PT_BOTTOM), [38, 32, 24]);
  paint(
    buffer,
    Math.floor(width * 0.72),
    Math.floor(height * 0.86),
    width - 6,
    Math.floor(height * PT_BOTTOM),
    [205, 186, 92],
  );
  if (options.transformBanner) {
    paint(buffer, 8, Math.floor(height * 0.88), width - 8, Math.floor(height * 0.93), [244, 240, 228]);
  }
  paint(buffer, 8, Math.floor(height * COLLECTOR_TOP), width - 8, Math.floor(height * 0.97), [70, 68, 60]);
  return buffer;
}

function rulesBottom(crop: { rulesTop: number; rulesBand: number }): number {
  return crop.rulesTop + crop.rulesBand;
}

describe("card crops", () => {
  it("positions fallback name and rules windows on a full card frame", () => {
    assert.equal(nameObjectPositionY(SECONDARY_SLICE_CROP), "3.02%");
    assert.equal(rulesObjectPositionY(SECONDARY_SLICE_CROP), "90.85%");
  });

  it("keeps the name banner and mana, then stops before the art", () => {
    const crop = detectCardSlices(syntheticCard());
    assert.ok(crop.nameTop >= 0.02 && crop.nameTop <= 0.05, `nameTop ${crop.nameTop}`);
    const nameEnd = crop.nameTop + crop.nameBand;
    assert.ok(nameEnd >= 0.09 && nameEnd <= 0.12, `nameEnd ${nameEnd}`);
  });

  it("starts the rules window at the type line and follows the textbox fill", () => {
    const crop = detectCardSlices(syntheticCard());
    assert.ok(crop.rulesTop >= 0.53 && crop.rulesTop <= 0.58, `rulesTop ${crop.rulesTop}`);
    assert.ok(rulesBottom(crop) > 0.88, `rules bottom ${rulesBottom(crop)}`);
  });

  it("keeps a buffer below the power/toughness box and ignores a dark holofoil", () => {
    const crop = detectCardSlices(syntheticCard());
    const bottom = rulesBottom(crop);
    assert.ok(bottom > PT_BOTTOM, `P/T clip: bottom ${bottom} vs box ${PT_BOTTOM}`);
    assert.ok(bottom <= COLLECTOR_TOP, `collector leak: bottom ${bottom}`);
  });

  it("keeps the double-faced invert strip with the rules crop", () => {
    const crop = detectCardSlices(syntheticCard({ transformBanner: true }));
    const bottom = rulesBottom(crop);
    assert.ok(bottom >= 0.93, `DFC strip clip: bottom ${bottom}`);
    assert.ok(bottom <= COLLECTOR_TOP, `collector leak: bottom ${bottom}`);
  });

  it("stops before collector numbers", () => {
    const crop = detectCardSlices(syntheticCard());
    assert.ok(rulesBottom(crop) <= COLLECTOR_TOP, `rules bottom ${rulesBottom(crop)}`);
  });
});
