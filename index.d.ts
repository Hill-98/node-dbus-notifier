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
  /** The notification expired. */
  expired = 1,
  /** The notification was dismissed by the user. */
  closeByUser = 2,
  /** The notification was closed by a call to `CloseNotification`. */
  closeByCall = 3,
  /** Undefined/reserved reasons. */
  undefined = 4,
}

// eslint-disable-next-line no-shadow
export enum InternalReason {
  /** The notification replaced. */
  replaced = 101,
}

export interface Hints {
  actionIcons: boolean;
  /** The type of notification this is. */
  category: string;
  /** This specifies the name of the desktop filename representing the calling program. This should be the same as the prefix used for the application's .desktop file. */
  desktopEntry: string;
  /** This is a raw data image format. */
  imageData: {
    /** Image width */
    width: number,
    /** Image height */
    height: number,
    /** Whether the image has alpha channel/transparency */
    hasAlpha: boolean,
    /** Encoded image data, in RGB byte order */
    data: number[],
  };
  /**
   * Alternative way to define the notification image.
   * @see {@link https://specifications.freedesktop.org/notification-spec/1.2/ar01s05.html Icons and Images}
   */
  imagePath: string;
  /**
   * When set the server will not automatically remove the notification when an action has been invoked.
   * The notification will remain resident in the server until it is explicitly removed by the user or by the sender.
   * This hint is likely only useful when the server has the "persistence" capability.
   */
  resident: boolean;
  /** The path to a sound file to play when the notification pops up. */
  soundFile: string;
  /**
   * A themeable named sound from the freedesktop.org sound naming specification to play when the notification pops up.
   * @see {@link http://0pointer.de/public/sound-naming-spec.html Sound Naming Specification}
   */
  soundName: string;
  /** Causes the server to suppress playing any sounds, if it has that ability. */
  suppressSound: boolean;
  /** When set the server will treat the notification as transient and by-pass the server's persistence capability, if it should exist. */
  transient: boolean;
  /** Specifies the X location on the screen that the notification should point to. The "y" hint must also be specified. */
  x: number;
  /** Specifies the Y location on the screen that the notification should point to. The "x" hint must also be specified. */
  y: number;
  /** The urgency level. */
  urgency: number;
  /** Some notification servers support it to show progress (non-standard specification) */
  value: number;
}

export interface NotifyConfig {
  /** The optional name of the application sending the notification. */
  appName: string;
  /**
   * The optional program icon of the calling application.
   * @see {@link https://specifications.freedesktop.org/notification-spec/1.2/ar01s05.html Icons and Images}
   */
  appIcon: string;
  /** The optional notification ID that this notification replaces. */
  replacesId: number;
  /** The summary text briefly describing the notification. */
  summary: string;
  /** The optional detailed body text. */
  body: string;
  /**
   * Optional hints that can be passed to the server from the client program.
   * @see {@link https://specifications.freedesktop.org/notification-spec/1.2/ar01s08.html Hints}
   */
  hints: Partial<Hints>;
  /** The timeout time in milliseconds since the display of the notification at which the notification should automatically close. */
  timeout: number;
}

export interface NotificationClosedResult {
  /** The ID of the notification that was closed. */
  id: number;
  /** The reason the notification was closed. */
  reason: Reason | InternalReason;
}

export class Notify extends EventEmitter {
  /** The notification ID. */
  readonly id: number;

  /** The notification status. */
  readonly status: Status;

  /** Initialize a notification */
  constructor(config: Partial<NotifyConfig>);

  /** Add an action to the notification with random action key, return action key. */
  addAction(text: string, callback: () => void): string;

  /** Add an action to notification with custom action key, return action key. */
  addAction(text: string, key: string, callback: () => void): string;

  /** Add inline reply input box to the notification, the first parameter of the callback function is the submitted message, return action key. */
  addAction(text: string, key: 'inline-reply', callback: (message: string) => void): string;

  /** Use `org.freedesktop.Notifications.CloseNotification` actively close notification. */
  close(): Promise<void>;

  /** Use action key remove an added action */
  removeAction(key: string): boolean;

  /** Alias for `removeAction("default")`. */
  removeDefaultAction(): boolean;

  /** Alias for `addAction("", "default", callback)`. */
  setDefaultAction(callback: () => void): void;

  /** Use `org.freedesktop.Notifications.Notify` to display the notification and mark the Promise as resolved when the notification is dismissed. */
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

  /** The capabilities supported by the notification server. */
  static supportedCapabilities(): Promise<string[]>;
}

export interface ConfigInterface {
  /** If set to `false`, the internal DBus session will not be automatically disconnected. */
  autoDisconnectSessionBus: boolean;
  /**
   * If set to `true`, new notification will internally emit close event to old notification when `replacesId` is set.
   * It is used to handle multiple notifications with the same replacesId triggering multiple actions.
   * @see {@link https://github.com/Hill-98/node-dbus-notifier/issues/8 Issue#8}
   */
  closeReplacedNotify: boolean;
}

export const Config: ConfigInterface;

/** Disconnect the internal DBus session. */
export function disconnectSessionBus(): void;

/** Get DBus interface `org.freedesktop.Notifications`. */
export function getInterface(): ClientInterface;

/** Set DBus interface `org.freedesktop.Notifications`. */
export function setInterface(notificationInterface?: ClientInterface): void;

/** Get DBus Session. */
export function getSessionBus(): MessageBus;

/** Set DBus session. */
export function setSessionBus(sessionBus?: MessageBus): void;
