import { execFile, spawn } from "node:child_process";
import { existsSync, readdirSync } from "node:fs";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { Inject, Injectable, Logger, type OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

const execFileAsync = promisify(execFile);

const SOFFICE_CANDIDATES = [
  "soffice",
  "libreoffice",
  "C:\\Program Files\\LibreOffice\\program\\soffice.exe",
];

const spawnAsync = (
  command: string,
  args: string[],
  options: { timeout: number; cwd?: string; env?: NodeJS.ProcessEnv },
): Promise<{ stdout: string; stderr: string; code: number }> =>
  new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      shell: true,
      windowsHide: true,
      cwd: options.cwd,
      env: options.env ?? process.env,
    });

    let stdout = "";
    let stderr = "";
    let settled = false;

    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      child.kill();
      reject(new Error(`LibreOffice timed out after ${options.timeout}ms`));
    }, options.timeout);

    child.stdout?.on("data", (chunk) => {
      stdout += String(chunk);
    });
    child.stderr?.on("data", (chunk) => {
      stderr += String(chunk);
    });

    child.on("error", (error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      reject(error);
    });

    child.on("close", (code) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve({ stdout, stderr, code: code ?? 1 });
    });
  });

@Injectable()
export class LibreOfficeService implements OnModuleInit {
  private readonly logger = new Logger(LibreOfficeService.name);
  private libreOfficePath = "";

  constructor(@Inject(ConfigService) private readonly config: ConfigService) {}

  onModuleInit() {
    const configured = this.config.get<string>("worker.libreOfficePath");
    const candidates = this.resolveInitialCandidates(configured?.trim() ?? "");
    this.libreOfficePath = candidates[0] ?? this.detectLibreOffice();
    this.logger.log(`LibreOffice binary candidate: ${this.libreOfficePath}`);
    void this.verifyLibreOffice(candidates);
  }

  async convertToHtml(docxPath: string): Promise<string> {
    const outputDir = path.dirname(docxPath);
    await this.runConvert(docxPath, outputDir, ["--convert-to", "html"]);
    const base = path.basename(docxPath, path.extname(docxPath));
    const htmlPath = path.join(outputDir, `${base}.html`);
    await fs.access(htmlPath);
    return htmlPath;
  }

  async convertToPdf(inputPath: string, outDir: string): Promise<string> {
    await this.runConvert(inputPath, outDir, ["--convert-to", "pdf"]);
    const base = path.basename(inputPath, path.extname(inputPath));
    return path.join(outDir, `${base}.pdf`);
  }

  async isInstalled(): Promise<boolean> {
    const working = await this.findWorkingBinary([this.libreOfficePath]);
    if (working) {
      this.libreOfficePath = working;
      return true;
    }
    return false;
  }

  private async verifyLibreOffice(candidates: string[]): Promise<void> {
    const missing = candidates.filter((candidate) => !this.binaryExists(candidate));
    const working = await this.findWorkingBinary(candidates);

    if (working) {
      this.libreOfficePath = working;
      this.logger.log(`LibreOffice verified at ${this.libreOfficePath}`);
      return;
    }

    const existingOnDisk = candidates.find((candidate) => this.binaryExists(candidate));
    if (existingOnDisk) {
      this.libreOfficePath = existingOnDisk;
      this.logger.warn(
        `LibreOffice --version probe failed but binary exists at ${existingOnDisk}; conversion will still be attempted`,
      );
      return;
    }

    if (missing.length === candidates.length) {
      this.logger.warn(
        `LibreOffice binary not found; attempted: ${candidates.join(", ")}. DOCX/PDF conversion jobs will fail`,
      );
      return;
    }

    this.logger.warn(
      `LibreOffice not reachable; attempted: ${candidates.join(", ")}. DOCX/PDF conversion jobs will fail`,
    );
  }

  private binaryExists(candidate: string): boolean {
    if (!candidate) return false;
    if (candidate.includes(path.sep) || candidate.includes("/") || candidate.includes("\\")) {
      return existsSync(candidate);
    }
    return true;
  }

  private async runSoffice(
    bin: string,
    args: string[],
    timeoutMs: number,
    cwd?: string,
  ): Promise<void> {
    const env =
      os.platform() === "win32" && cwd
        ? { ...process.env, HOME: cwd, USERPROFILE: cwd }
        : process.env;

    try {
      await execFileAsync(bin, args, {
        timeout: timeoutMs,
        maxBuffer: 50 * 1024 * 1024,
        windowsHide: true,
        cwd,
        env,
      });
      return;
    } catch (execError) {
      if (os.platform() !== "win32") {
        throw execError;
      }
    }

    const { code, stderr } = await spawnAsync(bin, args, {
      timeout: timeoutMs,
      cwd,
      env,
    });
    if (code !== 0) {
      throw new Error(stderr.trim() || `LibreOffice exited with code ${code}`);
    }
  }

  private async findWorkingBinary(candidates: string[]): Promise<string | null> {
    for (const bin of candidates) {
      if (!bin) continue;
      if (!this.binaryExists(bin)) continue;
      try {
        await this.runSoffice(bin, ["--version"], 5_000);
        return bin;
      } catch {
        /* try next */
      }
    }
    return null;
  }

  private async runConvert(inputPath: string, outDir: string, convertArgs: string[]): Promise<void> {
    const candidates = this.resolveInitialCandidates(this.libreOfficePath);
    const args = [
      "--headless",
      "--invisible",
      "--nologo",
      "--nofirststartwizard",
      ...convertArgs,
      "--outdir",
      outDir,
      inputPath,
    ];

    let lastError: unknown;
    for (const bin of candidates) {
      if (!this.binaryExists(bin)) continue;
      try {
        await this.runSoffice(bin, args, 120_000, outDir);
        this.libreOfficePath = bin;
        return;
      } catch (error) {
        lastError = error;
      }
    }
    throw lastError;
  }

  private detectLibreOffice(): string {
    const platform = os.platform();
    const paths =
      platform === "win32"
        ? [
            "C:\\Program Files\\LibreOffice\\program\\soffice.exe",
            "C:\\Program Files (x86)\\LibreOffice\\program\\soffice.exe",
            ...this.findVersionedWindowsLibreOffice(),
          ]
        : platform === "darwin"
          ? ["/Applications/LibreOffice.app/Contents/MacOS/soffice"]
          : ["/usr/bin/libreoffice", "/usr/bin/soffice", "/snap/bin/libreoffice"];

    for (const candidate of paths) {
      try {
        if (existsSync(candidate)) {
          return candidate;
        }
      } catch {
        /* continue */
      }
    }
    return platform === "win32" ? "soffice.exe" : "libreoffice";
  }

  private resolveInitialCandidates(preferred: string): string[] {
    const detected = this.detectLibreOffice();
    return [preferred, detected, ...SOFFICE_CANDIDATES].filter(
      (candidate, index, all) => Boolean(candidate) && all.indexOf(candidate) === index,
    );
  }

  private findVersionedWindowsLibreOffice(): string[] {
    const bases = ["C:\\Program Files", "C:\\Program Files (x86)"];
    const results: string[] = [];

    for (const base of bases) {
      try {
        const dirs = readdirSync(base, { withFileTypes: true });
        for (const dir of dirs) {
          if (!dir.isDirectory() || !dir.name.startsWith("LibreOffice")) continue;
          const candidate = path.join(base, dir.name, "program", "soffice.exe");
          if (existsSync(candidate)) {
            results.push(candidate);
          }
        }
      } catch {
        /* keep scanning other bases */
      }
    }

    return results;
  }
}
