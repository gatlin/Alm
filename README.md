Alm
===

(c) 2016 Gatlin Johnson <gatlin@niltag.net>

Synopsis
---

Alm helps you build organized and efficient web applications.

The following example counts the number of times you have clicked the page,
updating a heading as well as the page title.

```html
<!doctype html>
<html lang='en-US'>
    <head>
        <meta charset='utf-8'>
        <title>alm test</title>
    </head>
    <body>
        <div id='main'></div>
        <script src='alm-bundled.js'></script>
        <script>

'use strict';
const app = new alm.App({
    domRoot: 'main',
    ports: {
        outbound: ['title']
    },
    main: (scope) => {
        const updates = new alm.Mailbox(false);
        const state = updates.reduce(0, (action, model) => {
            if (action) {
                return model+1;
            }
            return model;
        })
        .map(n => n.toString());

        scope.events.click.recv(_ => updates.send(true));
        state.connect(scope.ports.outbound.title);

        return state.map(n => alm.el('h1', {}, [n]));
    }
}).start();

app.ports.outbound.title
    .recv(n => {
        document.title = 'Clicked ' + n + ' times!';
    });

        </script>
    </body>
</html>
```

[Another example is available on codepen.][codepen]

How to just include it in your project without hassle
---

The file `dist/alm-bundled.js` is a minified single file which you can include
in a page using a `<script>` tag. The contents of the library are made available
on a global variable `alm`. See "Overview" for preliminary documentation.

*More information on building is available below, under "Building."*

Overview
---

Alm is a *reactive* library. At a high level you define how external events
should be transformed into *state changes*, and then how your state should be
mapped to a *view* and possibly other events.

    Events ---> State Changes --> [ State Update ] --> View
                      ^              |
                      |              |- new events
                      +--------------+

A core concept of Alm is that state should be managed in one place. It may
receive messages from multiple sources and there may be multiple listeners
waiting for updates. This helps keep applications self-contained and easy to
maintain.

Below the core concepts are explained: *signals*, *virtual DOMs*, and
*applications*.

### Signals

Events and other messages are transported using *signals*. A signal does not
contain data of its own. Instead it possesses a *one-argument function* and an
array of *listeners*. When a signal receives a value it computes a result using
its function and sends it along to each listener.

```javascript
var signal = new alm.Signal(x => { /* ... */ });
var signal = alm.Signal.make(); // new Signal(x => x);
```

You can send values to a signal using `#send` and you can receive them in a
callback using `#recv`.

```javascript
signalA.recv(x => signalB.send(x));
```

Signals may also be connected using the `#connect` method (returning the
listener). Other operations such as `#map` and `#filter` implicitly create new
listeners and return them.

```javascript
var signalB = signalA.connect(signalB);
var signalAPlus2 = signalA.map(x => x + 2);
```

An extremely important method is **`#reduce`**. `#reduce` takes two arguments:
an initial *state* value and a *reducer function.* The reducer function has two
arguments: an incoming signal value and the old state value.

```javascript
var state_manager = updates.reduce(initialState, (action, state) => {
    /* ... use `action` to create a new state ... */
    return modifiedState;
});

var logger = state_manager.recv(x => console.log('state =', x));
```

**This is idiomatic state management in Alm.** However in practice you'll
probably want to use a sub-class of signals, *mailboxes.*

#### Mailboxes

`alm.Mailbox` is a sub-class of `alm.Signal`. The key distinction is that
sending is done *asynchronously*. By sending values asynchronously the browser
is given a chance to prioritize upcoming tasks and handle them more efficiently.

Mailboxes must also be given an initial value, which is sent when the
application starts. This value is not stored, but merely sent
asynchronously.

```javascript
const Mailbox = alm.Mailbox;
// The following guarantees at least one action is sent.
const updates = new Mailbox({ action: 'initial' });
const state = updates.reduce(initial_model(), (action, model) => {
    /* use action.type to determine the new model */
    return modified;
});
scope.events.click
    .filter(evt => evt.getId() === 'the-button')
    .recv(evt => updates.send({
        type: 'click',
        data: evt.getRaw()
    }));
```

### Virtual DOM

Signals are how events get into an application; the end product of an
application is a signal of *virtual DOMs*.

Virtual DOMs are essentially trees with each node containing a tag name, an
attributes object, and an array of children.

The function `alm.el` is how you create Virtual DOMs:

```javascript
function render(state) {
    var el = alm.el;
    return el('div', { 'id' : 'main' }, [
        el('h1', {}, [ state.headerText]),
        el('p', { 'class':'normal-text' }, [state.paragraphText])]);
}
```

*NB: This isn't the the most elegant API but it is surprisingly effective. I am
certainly open to discussion.*

An application, as explained below, produces a signal returning these values. At
first this might sound bad: the entire view is recomputed on each signal update,
which is extremely slow.

However `Signal#reduce` once again proves invaluable: with `null` as an initial
value the old virtual DOM and the new virtual DOM are compared efficiently to
determine precisely what changes need to be made to the DOM.

Not all applications have views, though. If you configure your application to
not have a GUI then this step is skipped.

### Application

`alm.App` ties everything together. There are six options you may provide when
creating a new `App`, one of which is required:

- **gui** *(optional)*: A boolean declaring whether or not this `App` should
  render a view. *Default: true.*

- **eventRoot** *(optional)*: Either a string giving an element ID or an
  HTMLElement. The `App` will receive all events which occur anywhere in this
  scope and make them available as `Signals`, which is very efficient. *Default:
  document.*

- **domRoot** *(optional)*: Either a string giving an element ID or an
    HTMLElement. The `App` will render within this element. *Default:
    document.body.*

- **ports** *(optional)*: Ports are signals which will be made available outside
  of the `App` to facilitate interop with other code. It is an object with two
  keys: an `outbound` array and an `inbound` array. See "Ports" below for more
  information. *Default: { outbound: null, inbound: null }*.

- **main** *(required)*: a function given a *scope* object which returns a
  `Signal` of virtual DOMs (or `null`). A scope is an object containing event
  signals and *ports*.

- **extraEvents** *(optional)*: An array of any other event names to which the
  `App` should subscribe. *Default: [].*

```javascript
var app = new alm.App({
    ports: { outbound: ['title'] },
    main: (scope) => {
        var updates = new alm.Mailbox(false);
        var state = updates.reduce(0, (action, model) => {
            if (action) return model+1;
            return model;
        });
        scope.events.click.recv(_ => updates.send(true));
        state.connect(scope.ports.outbound.title);
        return state.map(n => el('h1', {}, [n.toString()]));
    }
}).start();

app.ports.outbound.title.recv(n => {
    document.title = 'Clicks: ' + n.toString();
});
```

#### Ports

A *port* is just a `Signal`, but one which is created by the `App`, made
available to the main function scope, and then made available to the outside
world as a result of calling `App#start`. As of now there is really nothing
restricting you from sending to or receiving from any kind of port but the
`outbound` and `inbound` separation is intended to help you keep that organized.

Here is an inbound port example:

```javascript
var app = new alm.App({
    ports: { inbound: ['chats'] },
    main: (scope) => {
        /* ... */
        scope.ports.inbound
            .recv(chat => actions.send({
                type: 'MessageUpdate',
                data: chat.data
            }));
        /* ... */
    }
}).start();

/* ... */
io.on('recv-chat', function(msg) {
    app.ports.inbound.chats.send(msg);
});
```

Building
---

Assuming you have `node` and `npm` installed and configured correctly first
install all the necessary dependencies:

    $> npm install

Alm uses the [`gulp`][gulp] build system. There are two `gulp` tasks targeting
JavaScript: `bundle` and `js`.

`js` compiles the TypeScript files in `/` into JavaScript and creates
distinct AMD modules in `dist/lib`.

`bundle` runs `js` and then bundles and minifies the contents of `dist/lib` to
`dist/alm-bundled.js`.

### The example

An obligatory todo application is available under `example`. To build it, run
`gulp example` and then `gulp serve`.

License
---

See the `LICENSE` file included with this source code.

DON'T EVEN THINK ABOUT USING THIS IN PRODUCTION IF YOU CANNOT TOLERATE THE
POTENTIAL FOR BUGS OR THINK YOU WOULD EVER FIND YOURSELF COMPLAINING TO ME NOPE
NOT EVEN ONCE THIS SOFTWARE IS PROVIDED AS-IS WITH NO WARRANTY EXPRESS OR
IMPLIED READ THE LICENSE ANYWAY THIS IS SUBJECT TO CHANGE ALTHOUGH HONESTLY
PROBABLY LESS NOW.

Questions / Comments / Suggestions / Free money
---

Feel free to email me at <gatlin@niltag.net> or use the GitHub Issue tracker.

[typescript]: https://typescriptlang.org
[amd]: http://requirejs.org/docs/whyamd.html
[gulp]: http://gulpjs.com/
[codepen]: http://codepen.io/askeletism/pen/WGEXoJ
