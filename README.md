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

1. What?
---

This is a functional reactive browser application toolkit. If you're unfamiliar
with this term, that's fine: it means you describe how to transform and connect
streams of data.

Alm borrows ideas from the [Elm programming language][elm] and its foundational
papers. If you want theory, I can't recommend them enough. Alm is partly my
desire to learn more about FRP, and partly to make Elm's power available in
plain old ECMAScript.

The following is a high-level overview of the major parts of Alm.

### Signals

The core of Alm is the *Signal*. Signals are best thought of as time-varying
values. You may use the Signal methods to map, reduce, and filter Signals,
which in turn produce new Signals.

When a Signal's value updates all Signals defined in terms of it will also
update. In this way Signals form the basis of all message dispatching in Alm.

You may also connect two unrelated Signals using the `.connect` method, which
is useful especially with *mailboxes* and *ports* (see below).

Signals form the backbone of most of the other features.

### App

An *App* is a representation of the runtime data and scope for a given Alm
application. An App is initialized with an optional HTML element to bind to for
event capture and DOM manipulation, and presents a few methods for setting up
the application runtime before starting.

The `runtime` method is just that - it provides access to the full hidden
runtime object so that any utilities or extensions to Alm's default
capabilities may be defined. `runtime` expects a handler function which is
given this object.

The `main` method presents a limited subset of the runtime. It is here that you
define your Signal graph and compose the flow of data through your application.
`main` expects you to return a Signal of *virtual DOM* objects (see below).

The `init` method takes an optional String ID of an HTML element to bind to. If
this is not provided then the App will simply bind itself to `document.body`.
This allows multiple Apps to be present on the same page. All browser events
which occur within this scope are gathered at the top level and made available
as Signals, and the DOM within this scope is managed entirely by the App.

Finally the `start` method is how you actually kick off the application. It
returns an object with various runtime data, notably *ports* (see below) so
that they can be used elsewhere in the page.

App is useful because the runtime is not a property which can be accessed or
manipulated without using the `runtime` or `main` methods, and the latter only
in a limited way. It is set up to take advantage of efficiencies afforded by
`Object.freeze`, though at this early stage of development this is most likely
not optimal yet.

### Virtual DOM

Using the `el` helper provided in the runtime, you can programmatically define
your interface. `App.main` expects a Signal of virtual DOM objects, which means
that you can refresh your user interface declaratively. Behind the scenes Alm
is able to relatively-efficiently compute the difference between the old DOM
and the new one and avoid destroying and recreating elements more than it has
to.

As a result, inputs which are focused stay focused on updates.

`el` takes three arguments: a String HTML tag; an object of attributes; and an
optional Array of child DOM elements, which may be calls to `el` or String
literals for text values.

Additionally, the object created by `el` has a method `subscribe`. If you give
`subscribe` a *mailbox* (see below) then every time the DOM node is re-rendered
the mailbox will receive the node and can make use of it.

### Mailboxes

A *mailbox* is essentially a Signal to which you may send values. The `mailbox`
function in the Alm runtime requires a default value which is emitted when the
application starts up. Mailboxes have `.signal` properties which may be used to
build other Signals.

In other words, mailboxes are Signals which emit *at least* one value and which
you may send more values to emit.

### Ports

A *port* is a way to interface with the surrounding JavaScript environment;
after all, it is highly unlikely in a complex application that you won't be
using other libraries for important things.

Ports are basically signals which either allow you to send values *out* of the
application or receive values coming *into* the application. The example app in
the synopsis illustrates this.

2. Status
---

THIS IS NOT READY FOR PRIMETIME DON'T YOU EVEN THINK ABOUT USING THIS SOME
PLACE IMPORTANT AND THEN GETTING MAD NOPE DON'T EVEN.

That said, the example applications demonstrate Alm's expressiveness and power
even at this immature stage. Feel free to contribute, and if you do use it the
author would greatly appreciate any feedback or commentary!

3. LICENSE
---

See the included `LICENSE` file.

4. Questions / comments / bugs / free money
---

Send all inquiries to <gatlin@niltag.net>, except bugs. Bugs should be
submitted using the GitHub Issues feature.

[elm]: http://elm-lang.org
