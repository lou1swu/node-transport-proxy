declare class Logger {
    prefix: any;
    levelMap: any;
    level: any;
    constructor(level?: number, prefix?: string);
    setLevel(level?: number): number;
    error(msg: string, pureText?: boolean): any;
    warn(msg: string, pureText?: boolean): any;
    info(msg: string, pureText?: boolean): any;
    debug(msg: string, pureText?: boolean): any;
    now(): string;
}
declare const _default: Logger;
export default _default;
