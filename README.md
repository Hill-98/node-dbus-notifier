# node-dbus-notifier

This is my first NodeJS library, more introductions are coming...

Thanks to [dbusjs/node-dbus-next](https://github.com/dbusjs/node-dbus-next)

## Exanple
```js
const notifier = require('node-dbus-notifier');

const notify = new notifier.Notify({
  appName: 'nodejs',
  appIcon: 'dialog-information"',
  summary: 'Hello',
  body: 'This is a body text',
  hints: {
    soundName: 'message-new-instant',
  },
  timeout: 5000,
});

notify.addAction('Click Me', () => {
  console.log('Click Click');
});

notify.show()
  .then(() => {
    console.log('notify is closed');
  });
```
