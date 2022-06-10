/* eslint-disable no-unused-vars */
import { ClientInterface, MessageBus } from 'dbus-next';
import { EventEmitter } from 'stream';

// eslint-disable-next-line no-shadow
export enum Status {
  unopened = 0,
  opened = 1,
  closed = 2,
}

// eslint-disable-next-line no-shadow
export enum Reason {
  expired = 1,
  closeByUser = 2,
  closeByCall = 3,
  undefined = 4,
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

export interface NotifyConfig {
  appName: string;
  replacesId: number;
  appIcon: string;
  summary: string;
  body: string;
  hints: Partial<Hints>;
  timeout: number;
}

export interface NotificationClosedResult {
  id: number;
  reason: Reason;
}

export class Notify extends EventEmitter {
  readonly id: number;

  readonly status: Status;

  constructor(config: Partial<NotifyConfig>);

  addAction(text: string, callback: () => void): string;

  addAction(text: string, key: string, callback: () => void): string;

  addAction(text: string, key: 'inline-reply', callback: (message: string) => void): string;

  close(): Promise<void>;

  removeAction(key: string): boolean;

  removeDefaultAction(): boolean;

  setDefaultAction(callback: () => void): void;

  show(): Promise<NotificationClosedResult>;

  addListener(event: 'close', listener: (result: NotificationClosedResult) => void): this;

  addListener(event: 'show', listener: (id: number) => void): this;

  emit(event: 'close', result: NotificationClosedResult): boolean;

  emit(event: 'show', id: number): boolean;

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

  static supportedCapabilities(): Promise<string[]>;
}

export interface ConfigInterface {
  autoDisconnectSessionBus: boolean;
}

export const Config: ConfigInterface;

export function disconnectSessionBus(): void;

export function getInterface(): ClientInterface;

export function setInterface(notificationInterface?: ClientInterface): void;

export function getSessionBus(): MessageBus;

export function setSessionBus(sessionBus?: MessageBus): void;
