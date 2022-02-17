# node-dbus-notifier

This is my first NodeJS library, more introductions are coming...

**Requires NodeJS 15+ to work, and will run on lower NodeJS versions in the future.**

Thanks to [dbusjs/node-dbus-next](https://github.com/dbusjs/node-dbus-next)

## Exanple
```js
const notifier = require('node-dbus-notifier');

const notify = new notifier.Notify({
  appName: 'nodejs',
  appIcon: 'text-html',
  summary: 'Hello',
  body: 'This is a body text',
  hints: {
    urgency: 2,
  },
  timeout: 5000,
});

notify.addAction('Click Me', () => {
  console.log('Click Click');
});

notify.show()
  .then((result) => {
    console.log(`notify is closed: ${JSON.stringify(result)}`);
  });
```
