import { EventEmitter } from "stream";

interface NotifyConfig {
  appName: string;
  replacesId: number;
  appIcon: string;
  summary: string;
  body: string;
  hints: Partial<Hints>;
  timeout: number;
}

interface NotificationClosedResult {
  id: number;
  reason: number;
}

export interface Hints {
  actionIcons: boolean;
  category: string;
  desktopEntry: string;
  imagePath: string;
  resident: boolean;
  soundFile: string;
  soundName: string;
  suppressSound: boolean;
  transient: boolean;
  x: number;
  y: number;
  urgency: number;
}

export enum Status {
  unopen = 0,
  opend = 1,
  closed = 2,
}

export class Notify extends EventEmitter {
  readonly id: number;

  readonly status: Status;

  constructor(config: Partial<NotifyConfig>);

  addAction(actionText: string, callback: () => void): this;

  close(): Promise<void>;

  show(): Promise<NotificationClosedResult>;

  removeAction(actionText: string): this;

  addListener(event: 'close', listener: (result: NotificationClosedResult) => void): this;
  addListener(event: 'show', listener: (id: number) => void): this;
  emit(event: 'close'): boolean;
  emit(event: 'show'): boolean;
  on(event: 'close', listener: (result: NotificationClosedResult) => void): this;
  on(event: 'show', listener: (id: number) => void): this;
  once(event: 'close', listener: (result: NotificationClosedResult) => void): this;
  once(event: 'show', listener: (id: number) => void): this;
  prependListener(event: 'close', listener: (result: NotificationClosedResult) => void): this;
  prependListener(event: 'show', listener: (id: number) => void): this;
  prependOnceListener(event: 'close', listener: (result: NotificationClosedResult) => void): this;
  prependOnceListener(event: 'show', listener: (id: number) => void): this;
  removeListener(event: 'close', listener: (result: NotificationClosedResult) => void): this;
  removeListener(event: 'show', listener: (id: number) => void): this;
}

export const Config = {
  autoDisconnectSessionBus: boolean,
}

export function disconnectSessionBus(): void;

export function getInterface(): any;

export function setInterface(notificationInterface?: any): void;

export function getSessionBus(): any;

export function setSessionBus(sessionBus?: any): void;
