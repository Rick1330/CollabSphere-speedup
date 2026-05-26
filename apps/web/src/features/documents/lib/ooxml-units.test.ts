import { describe, expect, it } from "vitest";
import {
  emusToPixels,
  halfPointsToPoints,
  pointsToPixels,
  pixelsToPoints,
  twipsToPixels,
  twipsToPoints,
} from "./ooxml-units";

describe("ooxml unit conversions", () => {
  it("converts twips to pixels (A4 width)", () => {
    expect(twipsToPixels(11906)).toBeCloseTo(794, 0);
  });

  it("converts twips to points", () => {
    expect(twipsToPoints(1440)).toBeCloseTo(72, 2);
  });

  it("converts 11pt to pixels at 96dpi", () => {
    expect(pointsToPixels(11)).toBeCloseTo(14.67, 1);
  });

  it("converts pixels back to points", () => {
    expect(pixelsToPoints(96)).toBeCloseTo(72, 2);
  });

  it("converts EMUs to pixels (1 inch)", () => {
    expect(emusToPixels(914400)).toBeCloseTo(96, 0);
  });

  it("converts half-points to points", () => {
    expect(halfPointsToPoints(22)).toBe(11);
  });
});
