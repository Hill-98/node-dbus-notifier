# node-dbus-notifier

![npm](https://img.shields.io/npm/v/node-dbus-notifier)
![node-current](https://img.shields.io/node/v/node-dbus-notifier)
![npm](https://img.shields.io/npm/dm/node-dbus-notifier)

A DBus-based NodeJS library for desktop notifications.

Use the DBus interface `org.freedesktop.Notifications` to create notifications instead of using `notify-send`, making it possible to provide full-featured support for desktop notifications on Linux (or any DBus-enabled system) and conform to the [Desktop Notifications Specification](https://specifications.freedesktop.org/notification-spec/latest/).

Implementation Specification Version: 1.2

## Install

Using npm: `npm install node-dbus-notifier --save`  
**or**  
Using yarn: `yarn add node-dbus-notifier`

## Examples

Make sure your current system supports DBus and has a provider that conforms to the [Desktop Notifications Specification](https://specifications.freedesktop.org/notification-spec/latest/) before using it.

### simple notification

```js
const { Notify } = require('node-dbus-notifier');

const notify = new Notify({
  appName: 'My App',
  summary: 'This is summary',
  body: 'This is body',
  timeout: 3000,
});

notify.show()
  .then((result) => {
    console.log(`notify is closed: ${JSON.stringify(result)}`);
  });
```

### Notification with button and icon

```js
const { Notify } = require('node-dbus-notifier');

const notify = new Notify({
  appName: 'My App',
  appIcon: 'application-javascript', // The availability of icons depends on the current system icon set.
  summary: 'This is summary',
  body: 'This is body',
  timeout: 3000,
});

notify.addAction('Click Me', () => {
  console.log('Click Click');
});

notify.show();
```

### Notification with custom image

```js
const { Notify } = require('node-dbus-notifier');

const notify = new Notify({
  appName: 'My App',
  summary: 'This is summary',
  body: 'This is body',
  hints: {
    imagePath: '/path/to/image',
  },
  timeout: 3000,
});

notify.show();
```

See the [DBus protocol](https://specifications.freedesktop.org/notification-spec/latest/ar01s09.html) of the [Desktop Notifications Specification](https://specifications.freedesktop.org/notification-spec/latest/) for more information.

## Usage

> The node-dbus-notifier creates a DBus session by default when the first notification is displayed and disconnects the DBus session when there are no notifications; if the session is not disconnected, the app will not exit properly.
> 
> If an external DBus session or interface is set, it will not auto disconnect the DBus session.

### `Notify`

* `constructor(config: Partial<NotifyConfig>)`: Initialize a notification, accepting the same parameters as `org.freedesktop.Notifications.Notify`, except for `actions` (using `addAction()`). `hints` does not support attributes marked as "iibiiay".

* `addAction(actionText: string, callback: () => void): this`: Add an action to the notification

* `close(): void`: Use `org.freedesktop.Notifications.CloseNotification` to actively close notifications.

* `show()`: Use `org.freedesktop.Notifications.Notify` to display the notification and mark the Promise as resolved when the notification is dismissed.

* `removeAction(actionText: string): this`: remove an added action

* `event: close`: Notification is closed

* `event: show`: Notification is displayed

### `Config: ConfigInterface`

* `autoDisconnectSessionBus`: If set to `false`, the DBus session will not be disconnected automatically. Defaults to `true`, if there is no notification, the internal DBus session will be automatically disconnected. 

### `disconnectSessionBus(): void`

Disconnect the internal DBus session.

You shouldn't use it anywhere unless you set `Config.autoDisconnectSessionBus` to `false` or need to exit the app immediately.

### `getInterface(): ClientInterface`

Get DBus interface: `org.freedesktop.Notifications`

If the interface is set from outside, it will return the external interface.

> if you want to do something

### `setInterface(notificationInterface?: ClientInterface): void`

Set DBus interface: `org.freedesktop.Notifications`

Set up an `org.freedesktop.Notifications` interface externally if you want to share an existing DBus interface.

If no arguments are passed, the internal interface will be reused.

### `getSessionBus(): MessageBus`

Get DBus Session

If the session is set from outside, it will return the external session.

> if you want to do something

### `setSessionBus(sessionBus?: MessageBus): void`

Set DBus session for `dbus-next`

Set up an DBus session  externally if you want to share an existing DBus session.

If no arguments are passed, the internal session will be reused.

> I don't recommend you use `getInterface()` or `getSessionBus()` anywhere, they are actually created more for internal code and exporting them is just for special cases.

## Thanks

Thanks to [dbusjs/node-dbus-next](https://github.com/dbusjs/node-dbus-next) for the DBus session support.
