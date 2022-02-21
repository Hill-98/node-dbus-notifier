const EventEmitter = require('events');
const dbusNext = require('dbus-next');

const { Variant } = dbusNext;

let externalSessionBus;
let selfSessionBus;
let Notifications;
let NUMBER = 0;

const Config = {
  autoDisconnectSessionBus: true,
};

const notifierEmitter = new EventEmitter();

const getSessionBus = function getSessionBus() {
  if (externalSessionBus) {
    return externalSessionBus;
  }
  selfSessionBus ??= dbusNext.sessionBus();
  return selfSessionBus;
}

const setSessionBus = function setSessionBus(sessionBus) {
  if (selfSessionBus) {
    selfSessionBus.disconnect();
    selfSessionBus = undefined;
  }
  externalSessionBus = sessionBus;
  Config.autoDisconnectSessionBus = Config.autoDisconnectSessionBus && !sessionBus;
  Notifications = undefined;
}

const disconnectSessionBus = function disconnectSessionBus() {
  if (!selfSessionBus) {
    return;
  }
  // dbus-next bug
  // disconnecting the dbus connection immediately will throw an error, so let's delay the disconnection just in case.
  setTimeout(() => {
    if (NUMBER > 0) {
      return;
    }
    unsetNotifications();
    selfSessionBus?.disconnect();
    selfSessionBus = undefined;
  }, 100);
}

const actionInvoked = function actionInvoked(id, actionKey) {
  notifierEmitter.emit(`ActionInvoked:${id}`, actionKey);
}

const notificationClosed = function notificationClosed(id, reason) {
  notifierEmitter.emit(`NotificationClosed:${id}`, reason);
  if (Config.autoDisconnectSessionBus) {
    disconnectSessionBus();
  }
}

const bindNotifications = function bindNotifications(interface) {
  // Since the NotificationClosed event will fire when any notification is closed
  // using ID to trigger the event here allows us to use once() elsewhere without binding too many events
  Notifications = interface;
  Notifications.on('ActionInvoked', actionInvoked);
  Notifications.on('NotificationClosed', notificationClosed);
  return Notifications;
}

const unsetNotifications = function unsetNotifications() {
  Notifications?.off('ActionInvoked', actionInvoked);
  Notifications?.off('NotificationClosed', notificationClosed);
  Notifications = undefined;
}

const getInterface = function getInterface() {
  if (Notifications) {
    return Promise.resolve(Notifications);
  }
  return new Promise((reslove, reject) => {
    getSessionBus().getProxyObject('org.freedesktop.Notifications', '/org/freedesktop/Notifications')
      .then((obj) => {
        reslove(bindNotifications(obj.getInterface('org.freedesktop.Notifications')));
      })
      .catch((err) => {
        if (Config.autoDisconnectSessionBus) {
          disconnectSessionBus();
        }
        reject(err);
      });
  });
}

const setInterface = function setInterface(interface) {
  if (interface) {
    disconnectSessionBus();
    bindNotifications(interface);
  } else {
    unsetNotifications();
  }
}

const genIdentifier = function* genIdentifier() {
  let IX = 0;
  while(true) {
    IX = IX >= 25 ? 0 : IX + 1;
    const ide = String.fromCharCode(64 + IX);
    yield ide;
  };
}
const identifier = genIdentifier();

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
    this[S.config] = {
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
      this[S.config].hints['action-icons'] = new Variant('b', hints.actionIcons);
    }
    if (typeof hints.category === 'string') {
      this[S.config].hints['category'] = new Variant('s', hints.category);
    }
    if (typeof hints.desktopEntry === 'string') {
      this[S.config].hints['desktop-entry'] = new Variant('s', hints.desktopEntry);
    }
    if (typeof hints.imagePath === 'string') {
      this[S.config].hints['image-path'] = new Variant('s', hints.imagePath);
    }
    if (typeof hints.resident === 'boolean') {
      this[S.config].hints['resident'] = new Variant('b', hints.resident);
    }
    if (typeof hints.soundFile === 'string') {
      this[S.config].hints['sound-file'] = new Variant('s', hints.soundFile);
    }
    if (typeof hints.soundName === 'string') {
      this[S.config].hints['sound-name'] = new Variant('s', hints.soundName);
    }
    if (typeof hints.suppressSound === 'boolean') {
      this[S.config].hints['suppress-sound'] = new Variant('b', hints.suppressSound);
    }
    if (typeof hints.transient === 'boolean') {
      this[S.config].hints['transient'] = new Variant('b', hints.transient);
    }
    if (typeof hints.x === 'number') {
      this[S.config].hints['x'] = new Variant('i', hints.x);
    }
    if (typeof hints.y === 'number') {
      this[S.config].hints['y'] = new Variant('i', hints.y);
    }
    if (typeof hints.urgency === 'number') {
      this[S.config].hints['urgency'] = new Variant('y', hints.urgency);
    }
  }

  addAction(actionText, callback) {
    const actionKey = identifier.next().value;
    this[S.config].actions.push(actionKey, actionText);
    this[S.actionCallbacks].set(actionKey, callback);
  }

  close() {
    if (this[S.id] != 0) {
      return getInterface().CloseNotification(this[S.id]);
    }
  }

  show() {
    const params = [
      this[S.config].appName,
      this[S.config].replacesId,
      this[S.config].appIcon,
      this[S.config].summary,
      this[S.config].body,
      this[S.config].actions,
      this[S.config].hints,
      this[S.config].timeout,
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
  setInterface,
  getSessionBus,
  setSessionBus,
};
