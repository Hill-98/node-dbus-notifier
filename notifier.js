const EventEmitter = require('events');
const dbusNext = require('dbus-next');

const { Variant } = dbusNext;

let SessionBus;
let Notifications;
let NUMBER = 0;

const Config = {
  autoDisconnectSessionBus: true,
};

const notifierEmitter = new EventEmitter();

const getSessionBus = function getSessionBus() {
  SessionBus ??= dbusNext.sessionBus();
  return SessionBus;
}

const disconnectSessionBus = function disconnectSessionBus() {
  // dbus-next bug
  // disconnecting the dbus connection immediately will throw an error, so let's delay the disconnection just in case.
  setTimeout(() => {
    if (NUMBER > 0) {
      return;
    }
    SessionBus?.disconnect();
    Notifications = undefined;
    SessionBus = undefined;
  }, 100);
}

const getInterface = function getInterface() {
  if (Notifications) {
    return Promise.resolve(Notifications);
  }
  return new Promise((reslove, reject) => {
    getSessionBus().getProxyObject('org.freedesktop.Notifications', '/org/freedesktop/Notifications')
      .then((obj) => {
        Notifications = obj.getInterface('org.freedesktop.Notifications');
        // Since the NotificationClosed event will fire when any notification is closed
        // using ID to trigger the event here allows us to use once() elsewhere without binding too many events
        Notifications.on('ActionInvoked', (id, action_key) => {
          notifierEmitter.emit(`ActionInvoked:${id}`, action_key);
        })
        Notifications.on('NotificationClosed', (id, reason) => {
          notifierEmitter.emit(`NotificationClosed:${id}`, reason);
          if (Config.autoDisconnectSessionBus) {
          disconnectSessionBus();
          }
        })
        reslove(Notifications);
      })
      .catch((err) => {
        if (Config.autoDisconnectSessionBus) {
        disconnectSessionBus();
        }
        reject(err);
      });
  });
}

let IX = 0;
const genIdentifier = function genIdentifier() {
  IX = IX >= 25 ? 0 : IX + 1;
  return String.fromCharCode(IX);
}

const S = {
  actionCallbacks: Symbol('actionsCallback'),
  actionInvoked: Symbol('ActionInvoked'),
  config: Symbol('config'),
  id: Symbol('id'),
  status: Symbol('status'),
}

class Notify {
  [S.id] = 0;
  [S.actionCallbacks] = new Map();
  [S.status] = 0;

  [S.config] = {};

  [S.actionInvoked](actionKey) {
    const callback = this[S.actionCallbacks].get(actionKey);
    if (callback) {
      callback();
    }
  }

  get id() {
    return this[S.id];
  }

  get status() {
    return this[S.status];
  }

  constructor(config) {
    this.config = {
      appName: config.appName ?? 'node',
      replacesId: config.replacesId ?? 0,
      appIcon: config.appIcon ?? '',
      summary: config.summary ?? '',
      body: config.body ?? '',
      actions: [],
      hints: {},
      timeout: config.timeout ?? 0,
    }
    const hints = config.hints ?? {};
    if (typeof hints.actionIcons === 'boolean') {
      this.config.hints['action-icons'] = new Variant('b', hints.actionIcons);
    }
    if (typeof hints.category === 'string') {
      this.config.hints['category'] = new Variant('s', hints.category);
    }
    if (typeof hints.desktopEntry === 'string') {
      this.config.hints['desktop-entry'] = new Variant('s', hints.desktopEntry);
    }
    if (typeof hints.imagePath === 'string') {
      this.config.hints['image-path'] = new Variant('s', hints.imagePath);
    }
    if (typeof hints.resident === 'boolean') {
      this.config.hints['resident'] = new Variant('b', hints.resident);
    }
    if (typeof hints.soundFile === 'string') {
      this.config.hints['sound-file'] = new Variant('s', hints.soundFile);
    }
    if (typeof hints.soundName === 'string') {
      this.config.hints['sound-name'] = new Variant('s', hints.soundName);
    }
    if (typeof hints.suppressSound === 'boolean') {
      this.config.hints['suppress-sound'] = new Variant('b', hints.suppressSound);
    }
    if (typeof hints.transient === 'boolean') {
      this.config.hints['transient'] = new Variant('b', hints.transient);
    }
    if (typeof hints.x === 'number') {
      this.config.hints['x'] = new Variant('i', hints.x);
    }
    if (typeof hints.y === 'number') {
      this.config.hints['y'] = new Variant('i', hints.y);
    }
    if (typeof hints.urgency === 'number') {
      this.config.hints['urgency'] = new Variant('y', hints.urgency);
    }
  }

  addAction(actionText, callback) {
    const actionKey = genIdentifier();
    this.config.actions.push(actionKey, actionText);
    this[S.actionCallbacks].set(actionKey, callback);
  }

  close() {
    if (this[S.id] != 0) {
      return getInterface().CloseNotification(this[S.id]);
    }
  }

  show() {
    const params = [
      this.config.appName,
      this.config.replacesId,
      this.config.appIcon,
      this.config.summary,
      this.config.body,
      this.config.actions,
      this.config.hints,
      this.config.timeout,
    ];
    return new Promise((resolve, reject) => {
      getInterface()
        .then((i) => {
          i.Notify(...params)
            .then((id) => {
              const actionInvoked = this[S.actionInvoked].bind(this);
              notifierEmitter.on(`ActionInvoked:${id}`, actionInvoked);
              notifierEmitter.once(`NotificationClosed:${id}`, (reason) => {
                notifierEmitter.off(`ActionInvoked:${id}`, actionInvoked);
                this[S.status] = 2;
                NUMBER -= 1;
                resolve({
                  id,
                  reason,
                });
              });
              this[S.id] = id;
              this[S.status] = 1;
              NUMBER += 1;
            })
            .catch(reject);
        })
        .catch(reject);
    });
  }
}

module.exports = {
  Notify,
  Config,
  disconnectSessionBus,
  getInterface,
  getSessionBus,
}
