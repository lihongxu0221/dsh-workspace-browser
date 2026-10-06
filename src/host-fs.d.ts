/** Minimal node typings for the host half. The package types field is empty on purpose. */
declare const process: { readonly env: Record<string, string | undefined>; readonly pid: number }

declare module 'node:fs/promises' {
  export function readFile(path: string, encoding: 'utf8'): Promise<string>
  export function writeFile(path: string, data: string, encoding: 'utf8'): Promise<void>
  export function mkdir(path: string, options: { recursive: boolean }): Promise<void>
  export function rename(from: string, to: string): Promise<void>
}

declare module 'node:os' {
  export function homedir(): string
}

declare module 'node:path' {
  export function join(...parts: string[]): string
}
