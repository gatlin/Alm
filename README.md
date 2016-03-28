Alm
===

(c) 2016 Gatlin Johnson <gatlin@niltag.net>

0. Synopsis
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
</head>
<body>
<script src='loeb.js'></script>
<script src='alm.js'></script>
<script>
window.onload = function() {
'use strict';

var app = App.init() // binds to `document.body`

.main(function(alm) {
    // save typing ;)
    let events = alm.events,
        el     = alm.el;

    // A place to send events
    let action = alm.mailbox(false);

    // Application state lives inside of signal reducers.
    let update_number = action.signal
        .reduce(0, (incr, total) => (incr) ? total + 1 : 0);

    // Ports let you communicate with the outside world!
    let page_title = alm.port.outbound('title');
    update_number.connect(page_title);

    // increment button click events
    events.mouse.click
        .filter((evt) => evt.target.id === 'incr_button')
        .recv((evt) => action.send(true));

    // reset button click events
    events.mouse.click
        .filter((evt) => evt.target.id === 'reset_button')
        .recv((evt) => action.send(false));

    // we return a signal of virtual DOMs, built with the `el` helper
    return update_number.map(function(n) {
        let incr_btn = el('button', { id: 'incr_button' }, [ "Increment!" ]);
        let reset_btn = el('button', { id: 'reset_button' }, [ "Reset" ]);
        let total = el('p', { id: 'total' }, [ 'Clicked ' + n + ' times']);
        return el('div', { id: 'main' }, [ incr_btn, reset_btn, total ]);
    });
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
If you have python installed you can easily look at the examples by running:

    $> python -m SimpleHTTPServer

and browsing to `http://127.0.0.1:8000/example/todo.html` or others.

The simple and "todo" examples are also live, respectively, at

  - http://niltag.net/almtest
  - http://nilag.net/todo

1. What?
---

This is a functional reactive browser application toolkit. If you're unfamiliar
with this term, that's fine: it means you describe how to transform and connect
streams of data.

Alm borrows ideas from the [Elm programming language][elm] and its foundational
papers. If you want theory, I can't recommend them enough. Alm is partly my
desire to learn more about FRP, and partly to make Elm's power available in
plain old ECMAScript.

A high level overview of the parts of this library follows. It may be helpful
to refer to the sample application in the synopsis.

### App

Alm applications are represented by `App` objects. `App`s contain the runtime
state for an application and are bound to a document element (either one
specified by id when invoking `init()`, or `document.body` by default).

An `App` sets up top-level event listeners for every event emitted in its
document scope, and exposes them as signals (see below).

Signals, mailboxes, and ports may be defined within `.main()` and exist solely
within this context. This way mulitple `App`s may be present on the same page
and not interfere with each other on accident.

An `App` only provides full access to its runtime using the `.runtime()`
method.

### Signals

The foundation of Alm is the *signal*. Signals are how events are routed
throughout an application.

A signal is little more than a function paired with an array of other signals.
When a signal is sent a value, it passes it to the function, and gives each of
its listeners the result (unless the result is `undefined`).

Basic signals emitting browser events are provided for a number of events; you
may add others using the `App.runtime()` method (see "Advanced").

#### Signal operations

Signals are asynchronous streams, and you can manipulate them. For now, basic
combinators provided are:

  - `.map(f)` -- creates a new signal mapping upstream values with `f`
  - `.filter(cond)` -- only permits values to propagate if `cond()` is true
  - `.recv(k)` -- values are given to `k` and the return value is ignored. The
    resulting signal cannot have children.
  - `.done()` -- creates a signal which simply stops propgation.
  - `.reduce()` -- let's talk about this one.

The name "reduce" comes from its similarity to `Array.reduce()` in JavaScript,
and analogous operations in other languages. You can *reduce* the values of a
signal into some aggregate value by supplying an initial base value, and a
function consuming a signal value and the previous state of the reduction to
yield a new one.

Ah. That word. *State*.

A signal created with `.reduce()` is the only place where you can store
stateful values signal values. The "todo" example makes this a bit clearer. A
reducer signal can listen to events from, say, a mailbox or a port, modify the
state, and emit the new state to its listeners.

The listeners may save the state, or re-render it on screen, or initiate some
kind of asynchronous task. The take away is, *signals are also how you manage
application state.*

Others combinators are planned.

### Mailboxes

Mailboxes are signals which are given a default value, and which fire at least
once with this value. Sending a value to a mailbox is asynchronous - the
browser can delay sending the value until it has finished other tasks.

The values received by a mailbox may be accessed using its `signal` property.

### Ports

Ports are signals which allow communication between an `App` and the
surrounding browser context. Ports come in two flavors: *inbound* and
*outbound*, both with respect to the `App`.

The return value of `App.init()...start()` contains an object with all the
defined ports.

### Virtual DOM

The `.main()` method of an `App` expects a function returning a signal of
*virtual DOM* objects. You create these with the `el()` function.

The first time a value is emitted, Alm constructs an actual DOM inside the
`App` scope. Each subsequent virtual DOM is compared to the previous one and
the actual DOM is only manipulated when necessary.

### Advanced

Before `.main()` but after `.init()` you may modify the runtime using the
`.runtime()` method. Just return `save(new_runtime)` and voila!

The `util` key in the runtime state is an (initially empty) object where you
can put custom functionality. For instance, you might add a `save()` function
which saves application models. Or you might add more signals to the basic
`events`.

If the API is going to change significantly it will likely be here first, but
this is where Alm may be modified and extended freely while still ensuring the
runtime state is safely hidden from the outside.

2. Status
---

THIS IS NOT READY FOR PRIMETIME DON'T YOU EVEN THINK ABOUT USING THIS SOME
PLACE IMPORTANT AND THEN GETTING MAD NOPE DON'T EVEN.

3. LICENSE
---

See the included `LICENSE` file.

4. Questions / comments / bugs / free money
---

Send all inquiries to <gatlin@niltag.net>, except bugs. Bugs should be
submitted using the GitHub Issues feature.

[elm]: http://elm-lang.org
