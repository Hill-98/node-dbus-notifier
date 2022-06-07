const EventEmitter = require('events');
const { sessionBus: SessionBus, Variant } = require('dbus-next');

const ActionInvokedSymbol = Symbol('actionInvoked');
const ActionEvents = Object.freeze({
  ActionInvoked: 'ActionInvoked',
  NotificationClosed: 'NotificationClosed',
  NotificationReplied: 'NotificationReplied',
});
const ActionKeys = Object.freeze({
  DEFAULT: 'default',
});

let externalSessionBus;
let selfSessionBus;
let Notifications;
let getInterfaceStat = false;
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
    sessionBus.disconnect();
  }, 100);
};

const actionInvoked = function actionInvoked(id, actionKey) {
  notifierEmitter.emit(`${ActionEvents.ActionInvoked}:${id}`, actionKey);
};

const notificationClosed = function notificationClosed(id, reason) {
  notifierEmitter.emit(`${ActionEvents.NotificationClosed}:${id}`, reason);
};

const notificationReplied = function notificationReplied(id, reason) {
  notifierEmitter.emit(`${ActionEvents.NotificationReplied}:${id}`, reason);
};

const bindNotifications = function bindNotifications(notificationInterface) {
  // Since the NotificationClosed event will fire when any notification is closed
  // using ID to trigger the event here allows us to use once() elsewhere without binding too many events.
  notificationInterface.on(ActionEvents.ActionInvoked, actionInvoked);
  notificationInterface.on(ActionEvents.NotificationClosed, notificationClosed);
  notificationInterface.on(ActionEvents.NotificationReplied, notificationReplied);
  Notifications = notificationInterface;
  return Notifications;
};

const unsetNotifications = function unsetNotifications() {
  if (!Notifications) {
    return;
  }
  Notifications.off(ActionEvents.ActionInvoked, actionInvoked);
  Notifications.off(ActionEvents.NotificationClosed, notificationClosed);
  Notifications.off(ActionEvents.NotificationReplied, notificationReplied);
  Notifications = undefined;
};

const getSessionBus = function getSessionBus() {
  if (externalSessionBus) {
    return externalSessionBus;
  }
  if (!selfSessionBus) {
    selfSessionBus = SessionBus();
  }
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
  if (getInterfaceStat) {
    return new Promise((resolve, reject) => {
      notifierEmitter.once('getInterface', resolve);
      notifierEmitter.once('getInterfaceError', reject);
    });
  }
  getInterfaceStat = true;
  return new Promise((reslove, reject) => {
    getSessionBus().getProxyObject('org.freedesktop.Notifications', '/org/freedesktop/Notifications')
      .then((obj) => {
        const i = bindNotifications(obj.getInterface('org.freedesktop.Notifications'));
        notifierEmitter.emit('getInterface', i);
        reslove(i);
      })
      .catch((err) => {
        if (Config.autoDisconnectSessionBus) {
          disconnectSessionBus();
        }
        notifierEmitter.emit('getInterfaceError', err);
        reject(err);
      })
      .finally(() => {
        getInterfaceStat = false;
      });
  });
};

const setInterface = function setInterface(notificationInterface) {
  unsetNotifications();
  disconnectSessionBus();
  if (notificationInterface) {
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
  #id = 0;

  #status = 0;

  #actions = new Map();

  #config = {};

  [ActionInvokedSymbol](key, ...args) {
    const action = this.#actions.get(key);
    if (typeof action.callback === 'function') {
      action.callback(...args);
    }
  }

  get id() {
    return this.#id;
  }

  get status() {
    return this.#status;
  }

  constructor(config) {
    super();
    this.#config = {
      appName: config.appName || '',
      replacesId: config.replacesId || 0,
      appIcon: config.appIcon || '',
      summary: config.summary || '',
      body: config.body || '',
      actions: [],
      hints: {},
      timeout: config.timeout || 0,
    };
    const hints = config.hints || {};
    if (typeof hints.actionIcons === 'boolean') {
      this.#config.hints['action-icons'] = new Variant('b', hints.actionIcons);
    }
    if (typeof hints.category === 'string') {
      // eslint-disable-next-line dot-notation
      this.#config.hints['category'] = new Variant('s', hints.category);
    }
    if (typeof hints.desktopEntry === 'string') {
      this.#config.hints['desktop-entry'] = new Variant('s', hints.desktopEntry);
    }
    if (typeof hints.imagePath === 'string') {
      this.#config.hints['image-path'] = new Variant('s', hints.imagePath);
    }
    if (typeof hints.resident === 'boolean') {
      // eslint-disable-next-line dot-notation
      this.#config.hints['resident'] = new Variant('b', hints.resident);
    }
    if (typeof hints.soundFile === 'string') {
      this.#config.hints['sound-file'] = new Variant('s', hints.soundFile);
    }
    if (typeof hints.soundName === 'string') {
      this.#config.hints['sound-name'] = new Variant('s', hints.soundName);
    }
    if (typeof hints.suppressSound === 'boolean') {
      this.#config.hints['suppress-sound'] = new Variant('b', hints.suppressSound);
    }
    if (typeof hints.transient === 'boolean') {
      // eslint-disable-next-line dot-notation
      this.#config.hints['transient'] = new Variant('b', hints.transient);
    }
    if (typeof hints.x === 'number') {
      // eslint-disable-next-line dot-notation
      this.#config.hints['x'] = new Variant('i', hints.x);
    }
    if (typeof hints.y === 'number') {
      // eslint-disable-next-line dot-notation
      this.#config.hints['y'] = new Variant('i', hints.y);
    }
    if (typeof hints.urgency === 'number') {
      // eslint-disable-next-line dot-notation
      this.#config.hints['urgency'] = new Variant('y', hints.urgency);
    }
  }

  addAction(text, key, callback) {
    const actionCallback = callback === undefined ? key : callback;
    const actionKey = callback === undefined ? `__action_key__::${identifier.next().value}` : key.toString();
    if (typeof actionCallback !== 'function') {
      throw new TypeError('callback is not a function.');
    }
    if (this.#actions.has(actionKey)) {
      throw new Error(`'${actionKey}' action already exists.`);
    }
    this.#actions.set(actionKey, {
      text: text ? text.toString() : '',
      callback: actionCallback,
    });
    return actionKey;
  }

  close() {
    if (this.#id !== 0) {
      return getInterface().CloseNotification(this.#id);
    }
    return Promise.resolve();
  }

  removeAction(key) {
    return this.#actions.delete(key);
  }

  removeDefaultAction() {
    return this.removeAction(ActionKeys.DEFAULT);
  }

  setDefaultAction(callback) {
    this.removeDefaultAction();
    this.addAction('', ActionKeys.DEFAULT, callback);
    return this;
  }

  show() {
    const actions = [];
    this.#actions.forEach((item, key) => {
      actions.push(key, item.text);
    });
    const params = [
      this.#config.appName,
      this.#config.replacesId,
      this.#config.appIcon,
      this.#config.summary,
      this.#config.body,
      actions,
      this.#config.hints,
      this.#config.timeout,
    ];
    return new Promise((resolve, reject) => {
      getInterface()
        .then((i) => {
          i.Notify(...params)
            .then((id) => {
              const invoked = this[ActionInvokedSymbol].bind(this);
              const inlineReplyInvoked = this[ActionInvokedSymbol].bind(this, 'inline-reply');
              notifierEmitter.on(`${ActionEvents.ActionInvoked}:${id}`, invoked);
              notifierEmitter.on(`${ActionEvents.NotificationReplied}:${id}`, inlineReplyInvoked);
              notifierEmitter.once(`${ActionEvents.NotificationClosed}:${id}`, (reason) => {
                this.#status = 2;
                notifierEmitter.off(`${ActionEvents.ActionInvoked}:${id}`, invoked);
                notifierEmitter.off(`${ActionEvents.NotificationReplied}:${id}`, inlineReplyInvoked);
                notifierEmitter.emit('pop');
                const result = {
                  id,
                  reason,
                };
                this.emit('close', result);
                resolve(result);
              });
              this.#id = id;
              this.#status = 1;
              notifierEmitter.emit('push');
              this.emit('show', id);
            })
            .catch(reject);
        })
        .catch(reject);
    });
  }

  static supportedFeatures() {
    return new Promise((resolve, reject) => {
      getInterface()
        .then((i) => {
          i.GetCapabilities()
            .then((caps) => {
              resolve(caps);
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
