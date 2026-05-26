import { describe, expect, it } from "vitest";
import { emusToPixels, twipsToPixels } from "./ooxml-units.js";

describe("ooxml-units", () => {
  it("converts twips to pixels", () => {
    expect(twipsToPixels(1440)).toBe(96);
  });

  it("converts EMUs to pixels", () => {
    expect(emusToPixels(914400)).toBe(96);
  });
});
