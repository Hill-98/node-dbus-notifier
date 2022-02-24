const EventEmitter = require('events');
const dbusNext = require('dbus-next');

const { Variant } = dbusNext;

let externalSessionBus;
let selfSessionBus;
let Notifications;
const notificationCounter = [];

const Config = {
  autoDisconnectSessionBus: true,
};

const notifierEmitter = new EventEmitter();

const disconnectSessionBus = function disconnectSessionBus() {
  if (!selfSessionBus) {
    return;
  }
  // Save it for delayed disconnection.
  const sessionBus = selfSessionBus;
  selfSessionBus = undefined;
  // dbus-next bug
  // disconnecting the dbus connection immediately will throw an error, so let's delay the disconnection just in case.
  setTimeout(() => {
    sessionBus?.disconnect();
  }, 100);
};

const actionInvoked = function actionInvoked(id, actionKey) {
  notifierEmitter.emit(`ActionInvoked:${id}`, actionKey);
};

const notificationClosed = function notificationClosed(id, reason) {
  notifierEmitter.emit(`NotificationClosed:${id}`, reason);
};

const bindNotifications = function bindNotifications(notificationInterface) {
  // Since the NotificationClosed event will fire when any notification is closed
  // using ID to trigger the event here allows us to use once() elsewhere without binding too many events.
  notificationInterface.on('ActionInvoked', actionInvoked);
  notificationInterface.on('NotificationClosed', notificationClosed);
  Notifications = notificationInterface;
  return Notifications;
};

const unsetNotifications = function unsetNotifications() {
  Notifications?.off('ActionInvoked', actionInvoked);
  Notifications?.off('NotificationClosed', notificationClosed);
  Notifications = undefined;
};

const getSessionBus = function getSessionBus() {
  if (externalSessionBus) {
    return externalSessionBus;
  }
  selfSessionBus ??= dbusNext.sessionBus();
  return selfSessionBus;
};

const setSessionBus = function setSessionBus(sessionBus) {
  unsetNotifications();
  disconnectSessionBus();
  externalSessionBus = sessionBus;
  Config.autoDisconnectSessionBus = Config.autoDisconnectSessionBus && !sessionBus;
};

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
};

const setInterface = function setInterface(notificationInterface) {
  unsetNotifications();
  if (notificationInterface) {
    disconnectSessionBus();
    bindNotifications(notificationInterface);
  } else {
    // Get a new one to continue processing old events.
    getInterface();
  }
};

const genIdentifier = function* genIdentifier() {
  let IX = 0;
  while (true) {
    IX = IX >= 25 ? 0 : IX + 1;
    const ide = String.fromCharCode(64 + IX);
    yield ide;
  }
};
const identifier = genIdentifier();

const S = {
  actionCallbacks: Symbol('actionsCallback'),
  actionInvoked: Symbol('ActionInvoked'),
  config: Symbol('config'),
  id: Symbol('id'),
  status: Symbol('status'),
};

notifierEmitter.on('push', () => {
  notificationCounter.push(true);
});

notifierEmitter.on('pop', () => {
  notificationCounter.pop();
  if (Config.autoDisconnectSessionBus && selfSessionBus && notificationCounter.length === 0) {
    unsetNotifications();
    disconnectSessionBus();
  }
});

class Notify extends EventEmitter {
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
    super();
    this[S.config] = {
      appName: config.appName ?? 'node',
      replacesId: config.replacesId ?? 0,
      appIcon: config.appIcon ?? '',
      summary: config.summary ?? '',
      body: config.body ?? '',
      actions: [],
      hints: {},
      timeout: config.timeout ?? 0,
    };
    const hints = config.hints ?? {};
    if (typeof hints.actionIcons === 'boolean') {
      this[S.config].hints['action-icons'] = new Variant('b', hints.actionIcons);
    }
    if (typeof hints.category === 'string') {
      // eslint-disable-next-line dot-notation
      this[S.config].hints['category'] = new Variant('s', hints.category);
    }
    if (typeof hints.desktopEntry === 'string') {
      this[S.config].hints['desktop-entry'] = new Variant('s', hints.desktopEntry);
    }
    if (typeof hints.imagePath === 'string') {
      this[S.config].hints['image-path'] = new Variant('s', hints.imagePath);
    }
    if (typeof hints.resident === 'boolean') {
      // eslint-disable-next-line dot-notation
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
      // eslint-disable-next-line dot-notation
      this[S.config].hints['transient'] = new Variant('b', hints.transient);
    }
    if (typeof hints.x === 'number') {
      // eslint-disable-next-line dot-notation
      this[S.config].hints['x'] = new Variant('i', hints.x);
    }
    if (typeof hints.y === 'number') {
      // eslint-disable-next-line dot-notation
      this[S.config].hints['y'] = new Variant('i', hints.y);
    }
    if (typeof hints.urgency === 'number') {
      // eslint-disable-next-line dot-notation
      this[S.config].hints['urgency'] = new Variant('y', hints.urgency);
    }
  }

  addAction(actionText, callback) {
    const actionKey = `__action_key__::${identifier.next().value}`;
    this[S.config].actions.push(actionKey, actionText);
    this[S.actionCallbacks].set(actionKey, callback);
    return this;
  }

  close() {
    if (this[S.id] !== 0) {
      return getInterface().CloseNotification(this[S.id]);
    }
    return Promise.resolve();
  }

  removeAction(actionText) {
    const x = this[S.config].actions.indexOf(actionText);
    if (x !== -1) {
      this[S.config].actions.splice(x - 1, 2);
    }
    return this;
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
              const invoked = this[S.actionInvoked].bind(this);
              notifierEmitter.on(`ActionInvoked:${id}`, invoked);
              notifierEmitter.once(`NotificationClosed:${id}`, (reason) => {
                notifierEmitter.off(`ActionInvoked:${id}`, invoked);
                notifierEmitter.emit('pop');
                const result = {
                  id,
                  reason,
                };
                this.emit('close', result);
                resolve(result);
              });
              this[S.id] = id;
              notifierEmitter.emit('push');
              this.emit('show', id);
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
