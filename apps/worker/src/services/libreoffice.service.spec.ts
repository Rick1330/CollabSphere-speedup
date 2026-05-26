import { describe, expect, it, vi } from "vitest";
import { ConfigService } from "@nestjs/config";
import { LibreOfficeService } from "./libreoffice.service.js";

describe("LibreOfficeService", () => {
  it("constructs with config service", () => {
    const config = new ConfigService({ worker: { libreOfficePath: "/custom/soffice" } });
    const service = new LibreOfficeService(config);
    expect(service).toBeInstanceOf(LibreOfficeService);
  });

  it("deduplicates configured and detected candidates", () => {
    const config = new ConfigService({ worker: { libreOfficePath: "C:\\Program Files\\LibreOffice\\program\\soffice.exe" } });
    const service = new LibreOfficeService(config);
    vi.spyOn(service as any, "detectLibreOffice").mockReturnValue(
      "C:\\Program Files\\LibreOffice\\program\\soffice.exe",
    );

    const candidates = (service as any).resolveInitialCandidates(
      "C:\\Program Files\\LibreOffice\\program\\soffice.exe",
    );
    expect(candidates[0]).toBe("C:\\Program Files\\LibreOffice\\program\\soffice.exe");
    expect(new Set(candidates).size).toBe(candidates.length);
  });

  it("isInstalled returns true for a valid executable path", async () => {
    const service = new LibreOfficeService(new ConfigService());
    (service as any).libreOfficePath = process.execPath;
    await expect(service.isInstalled()).resolves.toBe(true);
  });

  it("isInstalled returns false for an invalid executable path", async () => {
    const service = new LibreOfficeService(new ConfigService());
    (service as any).libreOfficePath = "__missing_soffice_binary__";
    await expect(service.isInstalled()).resolves.toBe(false);
  });
});
