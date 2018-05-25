import { ReallySmallEvents } from "really-small-events";
export interface QueueOptions {
    concurrency?: number;
    timeout?: number;
    autostart?: boolean;
    results?: any[];
}
export declare function QueueTS(options?: QueueOptions): QueueTSClass;
export declare class QueueTSClass {
    concurrency: number;
    timeout: number;
    autostart: boolean;
    results: any[];
    pending: number;
    session: number;
    running: boolean;
    jobs: any[];
    timers: any;
    events: ReallySmallEvents;
    constructor(options?: QueueOptions);
    slice(begin: number, end?: number): this;
    reverse(): this;
    done(err?: any): void;
    on(event: string, cb: any): void;
    off(event: string, cb: any): void;
    callOnErrorOrEnd(cb: any): void;
    start(cb?: any): void;
    stop(): void;
    clearTimers(): void;
    end(err: any): void;
}
