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

export class Notify {
  readonly id: number;

  readonly status: Status;

  constructor(config: Partial<NotifyConfig>);

  addAction(actionText: string, callback: () => void): void;

  close(): Promise<void>;

  show(): Promise<NotificationClosedResult>;
}

export const Config = {
  autoDisconnectSessionBus: boolean,
}

export function disconnectSessionBus(): void;

export function getInterface(): any;

export function setInterface(interface?: any): void;

export function getSessionBus(): any;

export function setSessionBus(sessionBus?: any): void;
