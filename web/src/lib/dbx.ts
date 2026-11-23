import type { SupportedLocale } from "./i18n";

export type Appearance = "light" | "dark";

export interface DbxTheme {
  appearance?: Appearance;
  tokens?: Record<string, string>;
}

export interface FileTransferCapabilities {
  pick?: boolean;
  beginSave?: boolean;
  read?: boolean;
  drop?: boolean;
  folderExpansion?: boolean;
}

export interface DbxCapabilities {
  storage?: boolean;
  fileTransfer?: FileTransferCapabilities;
  clipboardWrite?: boolean;
  clipboardRead?: boolean;
  [key: string]: unknown;
}

export interface FileSaveTarget {
  handleId: string;
  chunkBytes?: number;
}

export interface FileTransferApi {
  beginSave?: (options: {
    name: string;
    contentType?: string;
    size?: number;
  }) => Promise<FileSaveTarget | null>;
  write?: (
    handleId: string,
    offset: number,
    data: Uint8Array
  ) => Promise<{ written: number; nextOffset: number }>;
  finish?: (handleId: string) => Promise<void> | void;
  cancel?: (handleId: string) => Promise<void> | void;
}

export interface DbxBridge {
  ready: Promise<void>;
  contributionId?: string;
  locale?: string;
  theme?: DbxTheme;
  capabilities?: DbxCapabilities;
  copy?: (text: string) => Promise<void> | void;
  clipboard?: {
    writeText?: (text: string) => Promise<void> | void;
  };
  fileTransfer?: FileTransferApi;
}

declare global {
  interface Window {
    dbxPlugin?: DbxBridge;
  }
}

function bridge(): DbxBridge | undefined {
  return window.dbxPlugin;
}

export function hasBridge(): boolean {
  return bridge() !== undefined;
}

export async function waitForReady(): Promise<void> {
  const host = bridge();
  if (host === undefined) {
    throw new Error("DBX host bridge is unavailable.");
  }
  await host.ready;
}

export function getContributionId(): string {
  return bridge()?.contributionId ?? "";
}

export function getLocale(): SupportedLocale {
  const raw = bridge()?.locale ?? navigator.language;
  return raw.toLowerCase().startsWith("zh") ? "zh-CN" : "en";
}

export function getAppearance(): Appearance {
  return bridge()?.theme?.appearance === "dark" ? "dark" : "light";
}

export function getCapabilities(): DbxCapabilities {
  return bridge()?.capabilities ?? {};
}

export function canCopy(): boolean {
  const host = bridge();
  return typeof host?.copy === "function" || typeof host?.clipboard?.writeText === "function";
}

export function getFileTransfer(): FileTransferApi | undefined {
  return bridge()?.fileTransfer;
}

export function canSaveFile(): boolean {
  const host = bridge();
  const transfer = host?.fileTransfer;
  return (
    host?.capabilities?.fileTransfer?.beginSave === true &&
    typeof transfer?.beginSave === "function" &&
    typeof transfer.write === "function" &&
    typeof transfer.finish === "function"
  );
}

export function applyEnvironment(): void {
  const appearance = getAppearance();
  const root = document.documentElement;
  root.dataset.dbxTheme = appearance;
  root.lang = getLocale();
  if (document.body !== null) {
    document.body.dataset.theme = appearance;
  }
}

export function onEnvironmentChange(listener: () => void): () => void {
  const handler = (): void => {
    applyEnvironment();
    listener();
  };
  window.addEventListener("dbx-plugin-env", handler);
  return () => {
    window.removeEventListener("dbx-plugin-env", handler);
  };
}

export async function copyText(text: string): Promise<void> {
  const host = bridge();
  if (typeof host?.copy === "function") {
    await host.copy(text);
    return;
  }
  if (typeof host?.clipboard?.writeText === "function") {
    await host.clipboard.writeText(text);
    return;
  }
  throw new Error("Clipboard write is unavailable.");
}
