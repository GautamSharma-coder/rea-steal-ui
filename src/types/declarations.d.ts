declare module "culori" {
  export interface Color {
    mode: string;
    [key: string]: unknown;
  }

  export interface LabColor extends Color {
    mode: "lab";
    l: number;
    a?: number;
    b?: number;
    alpha?: number;
  }

  export function parse(color: string): Color | undefined;
  export function formatHsl(color: Color | string): string;
  export function converter<T extends Color = LabColor>(mode: string): (color: Color | string) => T;
  export function differenceEuclidean(mode?: string): (a: Color | string, b: Color | string) => number;
}

declare module "@electron/asar" {
  export function extractAll(archivePath: string, destPath: string): void;
  export function listPackage(archivePath: string): string[];
}

