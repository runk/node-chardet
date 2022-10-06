import { Match } from './match';
interface FullOptions {
    sampleSize: number;
    position: number;
}
declare type Options = Partial<FullOptions>;
declare type DetectResult = Match[] | string | null;
export declare const detect: (buffer: Uint8Array) => string | null;
export declare const analyse: (buffer: Uint8Array) => Match[];
export declare const detectFile: (filepath: string, opts?: Options) => Promise<DetectResult>;
export declare const detectFileSync: (filepath: string, opts?: Options) => DetectResult;
declare const _default: {
    analyse: (buffer: Uint8Array) => Match[];
    detect: (buffer: Uint8Array) => string | null;
    detectFileSync: (filepath: string, opts?: Partial<FullOptions>) => DetectResult;
    detectFile: (filepath: string, opts?: Partial<FullOptions>) => Promise<DetectResult>;
};
export default _default;
