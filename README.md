Alm
===

(c) 2016 Gatlin Johnson <gatlin@niltag.net>

Synopsis
---

Alm lets you build web applications!

Here is an example application which counts the number of times you've clicked
a button, displays the count, and updates the page title in kind.

```html
<!doctype html>
<html lang='en_US'>
<head>
    <meta charset='utf-8'></meta>
    <title>Alm example</title>
<style type='text/css'>
div#view {
    width: 50%;
    margin: 0 auto;
}
</style>
</head>
<body>
    <div id='view'></div>
<script src='../alm.js'></script>
<script>
window.onload = function() {
'use strict';
var app = App.init({domRoot: 'view'})

.main(function(alm) {
    // save typing ;)
    let events = alm.events,
        el     = alm.el;

    // Mailboxes are signals you can send values to
    let action = alm.mailbox({type: 'noop'});

    // Ports are signals going into or out of the app
    let page_title = alm.port.outbound('title');

    // State is elegantly managed as a signal reduction
    let model = action.signal
        .reduce({ counter: 0, coords: { x: 0, y: 0 } },
        function(actn, mdl) {
            if (actn.type === 'incr') {
                mdl.counter++;
            }

            if (actn.type === 'reset') {
                mdl.counter = 0;
            }

            if (actn.type === 'click') {
                mdl.coords = actn.data;
            }

            return mdl;
        });

    // Listen for increment button clicks
    events.mouse.click
        .filter((evt) => evt.target.id === 'incr_button')
        .recv((evt) => action.send({ type: 'incr' }));

    // Listen for reset button clicks
    events.mouse.click
        .filter((evt) => evt.target.id === 'reset_button')
        .recv((evt) => action.send({ type: 'reset' }));

    // On any click, anywhere, update the model with the coordinates.
    events.mouse.click
        .recv((evt) => action.send({
            type: 'click',
            data: {
                x: evt.clientX,
                y: evt.clientY
            }
        }));

    // Update the page title
    model.map((mdl) => mdl.counter).connect(page_title);

    return model.map((mdl) =>
        el('div', { id: 'main' }, [
            el('button', { id: 'incr_button' }, [ "Increment!" ]),
            el('button', { id: 'reset_button' }, [ "Reset" ]),
            el('p', { id: 'total' }, [ 'Clicked ' + mdl.counter + ' times']),
            el('p', { id: 'coords' }, [ 'Mouse coords: ('+
                mdl.coords.x + ',' + mdl.coords.y + ').'])
        ])
    );
})

.start(); // And away we go ~~~

// Update the page title using the port
app.ports['title'].listen(function(n) {
    let base = 'Alm Example';
    if (n > 0) {
        document.title = '('+n+') ' + base;
    } else {
        document.title = base;
    }
});
};
</script>
</body>
</html>
```

This example and a more elaborate todo application may be found in `example/`.

If you have `node` and `npm` installed, you can execute the following to view
the examples locally:

    $> npm i --global gulp-cli
    $> npm install
    $> gulp serve

And navigate to `http://localhost:3000/example`.

The examples are also live here:

  - http://niltag.net/almtest
  - http://niltag.net/todo
  - http://niltag.net/gainratio

What?
---

This is a functional reactive browser application toolkit. If you're unfamiliar
with this term, that's fine: it means you describe how to transform and connect
streams of data.

Alm borrows ideas from the [Elm programming language][elm] and its foundational
papers. If you want theory, I can't recommend them enough. Alm is partly my
desire to learn more about FRP, and partly to make Elm's power available in
plain old ECMAScript.

Let's walk through the highlights. It may be helpful to refer back to the
synopsis above occasionally.

### Initialization

```javascript
var app = App.init('some-id')
```

An `App` is part of your document which *reacts* to events and possibly
*renders* a view. These are confined to the *event root* and *DOM root*,
respectively. The above example says "I want to listen to all events which
occur within the element with id `some-id` and I will render a view there as
well."

There are others:

```javascript
var app = App.init()
```

This sets the event root and DOM root to `document.body`.

```javascript
var app = App.init({ domRoot: 'element-a', eventRoot: 'element-b' })
```

This sets the DOM root to `element-a` and the event root to `element-b`. If you
omit either, they default to `document.body`.

If your application won't be rendering a view, you can do the following:

```javascript
var app = App.init({ gui: false })
```

### Runtime setup

Next comes

```javascript
.runtime(function(runtime) {
    runtime.scope.foo = 'bar';
    // ...
    return save(runtime);
})
```

`App` is designed to keep the internal runtime state closed off to the outside
world. It is not a property of the object that can be publicly accessed. It's
complicated. But the `runtime()` method is how you can access it. Reasons why
you might want to do that:

- To add new types of events
- To modify `runtime.scope`, which is where you can put arbitrary data you
  might need, or utility functions.
- A more industrious person could potentially build an extension or plugin
  system on top of this.

The `save()` function is necessary to update the runtime state, which is frozen
for potential performance benefits.

### The Main Event

Once the runtime is set up properly, we have this:

```javascript
.main(function(alm) {
    // !!!
})
```

You can obviously call `alm` whatever you want. This is a subset of the
application runtime. Here is its actual definition in the code:

```javascript
let alm = {
    events: runtime.events,
    async: runtime.async,
    setTimeout: runtime.setTimeout,
    byId: runtime.byId,
    mailbox: runtime.mailbox,
    port: runtime.port,
    scope: runtime.scope,
    el: runtime.vdom.el,
    timer: runtime.timer
};
```

Here's the good stuff. `main()` gives you access to your private runtime data
and expects you to return a *Signal* of *Views*. Let's break this down.

#### Signal

A `Signal` is a value which may update at any time. `Signal`s listen to
upstream values from other `Signal`s, do something with them, and then
broadcast them to 0 or more receiving `Signal`s.

All message passing and event handling is done through `Signal`s. You can
simply take an existing one and call its `filter/map/reduce`, etc methods or
you can connect two signals with `.connect`:

```javascript
let sigB = sigA.map(foo);
sigB.connect(sigC);
sigB.connect(sigD);
```

`Signal`s are defined for a default set of browser events. Example:

```javascript
events.mouse.click
    .filter((evt) => evt.target.id === 'btn-1')
    .map((evt) => evt.target.value)
    .recv((value) => somewhere.send(value));
```

No need to assign anything. This statement will now funnel mouse click events
for a specific button to a `Mailbox` called `somewhere`. Wait, what's a

#### Mailbox

A `Mailbox` is essentially a named `Signal` to which you may send values at any
time. `Mailbox`es must be defined with a default value.

`Mailbox`es are created with `alm.mailbox` and require a default parameter.
You can subscribe to a mailbox by accessing its `.signal` property.

#### Views

I said earlier that `main` must return a `Signal` of `View`s (unless your app
is initialized with `gui: false`). You create `View`s using the `alm.el`
helper. `el` takes three arguments:

- String name of tag
- Dictionary of element attributes
- (Optional) Array of either child views or text.

That's right: you "recreate" the whole view each time. However, this is fairly
cheap: the only thing you recreate each time is this nested JavaScript object.
Alm will compare the previous tree to the current tree, compute a diff, and
only tell the browser to redraw what is necessary. In practice this is
efficient.

If you want to be notified when an element is redrawn, you can use
`.subscribe` and give it a mailbox. Example:

```javascript
el('p', { 'class':'small' }, [ 'This is some text hi' ]).subscribe(mbox)
```

Each time the element is recreated the `HTMLElement` will be sent to the
specified mailbox.

#### State

Alm doesn't aim to be too ideological about this topic, but rather to encourage
good habits. There is a special method on `Signal` called `.reduce`. It takes
two arguments:

- An initial state value; and
- A callback which should expect two arguments: a signal value, and the old
  state.

The name `reduce` comes from the fact that it's like JavaScript's
`Array.reduce`: it allows you to reduce values into an aggregate result.

It just so happens this is a great way to manage your model. Example from the
synopsis:

```javascript
let updates = alm.mailbox({ type: 'noop' });
let model = updates.signal
    .reduce({ counter: 0, coords: { x: 0, y: 0 } },
    function(actn, mdl) {
        if (actn.type === 'incr') {
            mdl.counter++;
        }

        if (actn.type === 'reset') {
            mdl.counter = 0;
        }

        if (actn.type === 'click') {
            mdl.coords = actn.data;
        }

        return mdl;
    });
```

You can now send updates to `updates` and they will transform the model.

#### Ports

To communicate with code outside your application you can use `Port`s. These
come in two varieties: inbound and outbound.

You create them with `port.inbound()` and `port.outbound`, both of which take a
string name. Example usage from within `.main()`:

```javascript
let incoming = alm.port.inbound('incoming');
let outgoing = alm.port.outbound('outgoing');

messages_signal.connect(outgoing);
incoming.recv((msg) => foo.send(msg));
```

How do we access these on the other side? Glad you asked!

### Wrapping up and starting

The final `App` method you call is `.start()`:

```javascript
var app = App.init()
.runtime(function(runtime) {
    //...
})
.main(function(alm) {
    //...
})
.start();
```

In the above example, `app` is an object containing the `scope` and `ports` you
defined. To wit:

```javascript
app.ports['outgoing'].listen(function(msg) {
    // ...
});

app.ports['incoming'].send(blah);
```

That about wraps up the overview.

Status
---

THIS IS NOT READY FOR PRIMETIME DON'T YOU EVEN THINK ABOUT USING THIS SOME
PLACE IMPORTANT AND THEN GETTING MAD NOPE DON'T EVEN.

That said, the example applications demonstrate Alm's expressiveness and power
even at this immature stage. Feel free to contribute, and if you do use it the
author would greatly appreciate any feedback or commentary!

Building and using
---

This repository already contains a pre-built, non-minified file you can use at
`dist/alm.js`. However if you need to rebuild it for whatever reason then read
on.

Ensure that you have node and npm installed. Also `gulp-cli`:

    $> npm install --global gulp-cli

Once you have the prerequisites you can build `alm` like so:

    $> npm install
    $> gulp make

If you want to build `alm` with some extra stuff (from `lib/loeb_extra.js`) then
you can instead run

    $> gulp make-extra

What's with this `loeb.js` stuff ?
---

`loeb.js` contains some generalized abstract nonsense that I like to program
with. For example if you define a class `YourClass` with methods `#map` and
`#flatten` then you can write

```javascript
instance(YourClass, Functor);
instance(YourClass, Monad);
```

and now you have `#then` and some other goodies automatically.

`loeb.js` doesn't have its own repository yet because right now this is the only
place I use it. Because it *does* have potential uses outside of Alm, though, I
keep it separate. There are two files:

- `loeb.js` contains stuff required for Alm. It is used in `gulp make`.
- `loeb_extra.js` contains stuff I find interesting (perhaps even useful!) but
  not necessary to build Alm. It is included if you build with `gulp make-extra`.

The `bikemath` example uses stuff from `loeb_extra.js`, if you're curious.

LICENSE
---

See the included `LICENSE` file.

Questions / comments / bugs / free money
---

Send all inquiries to <gatlin@niltag.net>, except bugs. Bugs should be
submitted using the GitHub Issues feature.

[elm]: http://elm-lang.org
