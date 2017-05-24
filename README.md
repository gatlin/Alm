Alm
===

(c) 2016 Gatlin Johnson <gatlin@niltag.net>

Synopsis
---

Alm helps you build organized and efficient web applications.

[Here is an example todo list app][todoexample]. The source is under
`docs/js/src/todo.js`.

*I'm not always certain I have properly updated the examples when I bundle a new
version so let me know if something is wrong!*

How to just include it in your project without hassle
---

The file `dist/alm-bundled.js` is a minified single file which you can include
in a page using a `<script>` tag. The contents of the library are made available
on a global variable `alm`. See "Overview" for preliminary documentation.

*More information on building is available below, under "Building." For an
easy-to-use project template, see [`alm-template`][almtemplate].*

Overview
---

Alm is a *reactive* library. With Alm, you define how your application *state*
should react to events, and how to produce a *view* given your state.

    Events --> State Changes --> [ State Update ] --> View
       ^                                   |
       |                                   |- new events (maybe)
       +-----------------------------------+

A network of *signals* is used to transmit data throughout your application.

### Signals

A signal is an object with a `#send` method and a `#recv` method. A signal
contains an array of listener signals; when you send a value to a signal, a
result is computed and immediately sent to the listeners.

When you call the signal methods like `#map`, `#filter`, and `#reduce` a new
signal is created, attached as a listener to the callee, and then returned.

The upshot is that creating a network of signals is very *declarative*, as is
demonstrated in the synopsis.

You won't have to know too much about signals to use them properly.

### The `App`

When you create a `new alm.App` you must provide it with a configuration
object. Below are the various options:

- **state** *(required)*: Any value you like (even `null` but it must be
  *something.*)

- **update** *(required)*: A two argument function. The function will be given
  some *action* and the current state, and it must return a *new* state. The
  action will be something you define (see *Main* below).

- **render** *(required if gui is true)*: An argument which will be given a
  *state* and which must produce a *virtual DOM* (see *Virtual DOM* below).

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
  of the `App` to facilitate interop with other code. You may either specify an
  array of strings (eg `['port1','port2']`) or an object of named arrays to
  maintain separate namespaces (eg `{ outbound: ['out'], inbound: ['in'] }`).
  *Default: null*.

- **main** *(required)*: a function given a *scope* object. The scope object
  contains four keys: `events`, `ports`, `actions`, and `state` (see *Main*
  below).

- **extraEvents** *(optional)*: An array of any other event names to which the
  `App` should subscribe. *Default: [].*

When you call the `#start` method, an object is returned with the `ports` as
well as a signal `state` emitting the state every time it changes.

#### Main

The `main` function will be given an object containing

- `events`: an object containing signals for each kind of event you're
  subscribed too
- `ports`: signals allowing communication outside the app
- `actions`: a signal to which you can send state updates
- `state`: a signal emitting the state whenever it is updated.

The high level goal is to transform data from `events` and `ports` into messages
which you then send to `actions`.

You cannot manipulate the application state without sending messages to
`scope.actions`. The `update` function you supplied will be used to create the
new state.

#### Virtual DOM

Each time your state is updated the `render` function you supplied is
called. The output of this function should be a *virtual DOM.* A virtual DOM is
a tree of lightweight objects containing barebones information on the browser
`document`.

To create a virtual DOM, Alm exports a function called `el` which takes three
arguments and returns a vdom:

- a tag name
- an object of element attributes
- an array of either other `el` calls or text.

The third argument is optional for convenience.

It would be extraordinarily inefficient to wipe the page and rerender everything
every single time the state is updated. Alm instead computes a *diff* between
the old virtual DOM and the new virtual DOM and only updates the page where
necessary.

Each virtual DOM node is assigned a *key* to assist the diff algorithm: if two
nodes are compared and have the same key then they will trivially be considered
equal.

You may set the key by setting a `key` attribute for the node; otherwise the
following keys will be tried in this order:

1. the `id` attribute;
2. the tag name; or if it's a text node
3. the string `text-node`.

If you want to ensure the destruction of a node with a particular `id` you can
assign the new node a different `key` without having to write separate code
referencing different `id`s.

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
    state: /* ... */,

    main: (scope) => {
        /* ... */
        scope.ports.inbound
            .recv(chat => scope.actions.send({
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

The project website contains an example todo list. Run

    $> gulp docs && gulp serve

and then navigate to `http://localhost:3000/` or
`http://localhost:3000/todo.html` to see them in action.

Testing
---

A nascent testing system is currently present. Run `npm test` to run whatever
tests currently exist.

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
[todoexample]: http://niltag.net/Alm/todo.html
[almtemplate]: https://github.com/gatlin/alm-template
