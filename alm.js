(function(Public) {

'use strict';

/**
 * Alm.js
 *
 * A simple re-implementation of the Elm runtime and core libraries.
 */

var guid = Public.guid = guid_factory(); // from loeb.js

/**
 * Signal
 *
 * Event-routing mechanism for the application. A signal is fundamentally a
 * function to transform upstream values and an array of downstream receiving
 * signals.
 *
 * With one exception, signals are stateless: they receive a value, transform
 * it, and broadcast to receivers (if applicable).
 */

// perhaps I should just store a value and let methods handle transformations?
function Signal(fn, receivers) {
    this.id = guid();
    this.fn = fn;
    this.receivers = (typeof receivers !== 'undefined')
        ? receivers
        : [];
}

// A signal which just repeats what it has been given.
Signal.make = function() {
    return new Signal(id, []);
};

Signal.constant = function(x) {
    return new Signal(constant(x));
};

Signal.output = function(handler) {
    return new Signal(function(v) {
        handler(v);
    }, []);
};

Signal.prototype = {
    send: function(timestamp, inputId, value) {
        const result = this.fn(value);
        if (result === undefined) { return; }
        if (this.isOutput) { return; }
        for (var i = this.receivers.length; i--; ) {
            this.receivers[i].send(timestamp, this.id, result);
        }
    },
    connect: function(receiver) {
        this.receivers.push(receiver);
        return this;
    },
    addReceivers: function(receivers) {
        this.receivers.concat(receivers);
    },
    receive: function(upstream) {
        upstream.receivers.push(this);
        return this;
    },
    // signal transformers
    filter: function(cond) {
        var sig = this;
        var r = new Signal(function(v) {
            var result = sig.fn(v);
            if (cond(result)) {
                return result;
            }
        });
        this.connect(r);
        return r;
    },
    reduce: function(initial, reducer) {
        var sig = this;
        var state = initial;
        var r = new Signal(function(v) {
            state = reducer(sig.fn(v), state);
            return state;
        });
        this.connect(r);
        return r;
    },
    map: function(f) {
        var sig = this;
        var r = new Signal(function(v) {
            return f(sig.fn(v));
        });
        this.connect(r);
        return r;
    },
    // an idiomatic way of tapping the output of a stream.
    recv: function(f) {
        var s = new Signal.output(f);
        this.connect(s);
        return s;
    },
    done: function() {
        return this;
    }
};

Public.Signal = {
    make: Signal.make,
    output: Signal.output,
    constant: Signal.constant,
};

/**
 * Mailboxes
 *
 * A mailbox is basically a named signal which a client application may update
 * Updates happen asynchronously so they're a good choice for propagating UI
 * updates.
 *
 * Mailboxes don't contain state, they just send a default value immediately
 * after being created.
 *
 * This function is intended to be called by an initialized `App` object, which
 * will then expose the inner function for client applications to make
 * mailboxes.
 */
function setupMailboxes(runtime) {
    return function (base) {
        var signal = Signal.make();
        runtime.inputs.push(signal);
        var mb = {
            signal: signal,
            send: function(v) {
                runtime.async(function() {
                    runtime.notify(signal.id, v);
                });
            }
        };
        mb.send(base);
        return mb;
    };
}

/**
 * Ports
 *
 * Clean, structured means of communicating with the surrounding browser
 * execution environment. An "inbound" port is one feeding data *into* the
 * application, while an "outbound" port is one sending data *out* of the
 * application.
 *
 * This function initializes the port constructors for a given runtime.
 */
function setupPorts(runtime) {
    var inbound = function(name) {
        var signal = Signal.make();
        runtime.inputs.push(signal);
        runtime.ports[name] = {
            send: function(v) {
                runtime.notify(signal.id,v);
            }
        };
        return signal;
    };

    var outbound = function(name) {
        var signal = Signal.make();
        runtime.ports[name] = {
            listen: function(k) {
                signal.recv(k);
            }
        };
        return signal;
    };

    return {
        inbound: inbound,
        outbound: outbound
    };
}

/**
 * Virtual DOM
 *
 * A simple virtual DOM implementation to allow for programmatic construction
 * and manipulation of HTML elements.
 *
 * This is very simple for now.
 *
 * How this should work: the VDOM exists inside of a signal reduction. When the
 * model updates:
 *
 * - a new VDOM should be computed
 * - a diff should be computed
 * - the DOM should be walked once, applying diffs as necessary.
 */
function setupVdom(alm) {
    var vdom = {};

    /**
     * A Node is an HTML node, which contains a tag, attributes, and 0 or more
     * child nodes.
     */
    vdom.el = function(tag, attrs, children) {
        return {
            tag: tag,
            attrs: attrs,
            children: (typeof children !== 'undefined')
                ? children
                : []
        };
    };

    function makeDOMTree(node) {
        if (node === null) { return null; }
        if (typeof node === 'string') {
            return document.createTextNode(node);
        }
        var el = document.createElement(node.tag);

        for (var key in node.attrs) {
            el.setAttribute(key, node.attrs[key]);
        }
        for (var i = 0; i < node.children.length; i++) {
            var child = makeDOMTree(node.children[i]);
            el.appendChild(child);
        }
        return el;
    }

    function initialDOM(tree) {
        var root = alm.domRoot;
        var domTree = makeDOMTree(tree);
        while (root.firstChild) {
            root.removeChild(root.firstChild);
        }
        root.appendChild(domTree);
    }

    /* Computes differences between two trees, which are then used to update
     * the DOM instead of wholesale replacing it.
     *
     * FIXME doesn't work if the nodes are text
     */
    function diff(nA, nB, _diffs) {
        if (typeof nB === 'string') {

        }
        if (nA.tag !== nB.tag) {
            diffs.push({
                action: 'remove',
                target: nA
            }, {
                action: 'insert',
                target: nB
            });
            return diffs;
        }
        var diffs = (typeof _diffs !== 'undefined')
            ? _diffs
            : [];

        // These two trees have the same element, let's go through their
        // attributes
        for (var attr in nA.attrs) {
            if (!(attr in nB.attrs)) {
                diffs.push({
                    action: 'removeAttr',
                    target: nB.attrs.id,
                    attr: attr
                });
            }
        }
        for (var attr in nB.attrs) {
            if (!nA.attrs[attr] || (nA.attrs[attr] !== nB.attrs[attr])) {
                // we need to insert the attribute into node A
                diffs.push({
                    action: 'setAttr',
                    target: nB.attrs.id,
                    attr: attr,
                    value: nB.attrs[attr]
                });
            }
        }
        var len = 0;
        var nA_len = (typeof nA !== 'string') ? nA.children.length : 0;
        var nB_len = (typeof nB !== 'string') ? nB.children.length : 0;
        if (nA_len && nB_len) {
            len = (nA_len < nB_len) ? nA_len : nB_len;
        }
        for (var i = 0; i < len; i++) {
            diff(nA.children[i], nB.children[i], diffs);
        }
        if (nB_len > nA_len) {
            for (var i = nA_len; i < nB_len; i++) {
                diffs.push({
                    action: 'insert',
                    target: nB.children[i]
                });
            }
        }
        if (nA_len > nB_len) {
            for (var i = nB_len; i < nA_len; i++) {
                diffs.push({
                    action: 'remove',
                    target: nA.children[i]
                });
            }
        }

        return diffs;
    }

    function applyDiff(d) {
        var root = alm.domRoot;
        switch (d.action) {
        case 'insert':
            var p = alm.byId(d.parent);
            p.appendChild(makeDOMTree(d.target));
            break;

        case 'remove':
            var c = alm.byId(d.target.attrs.id);
            c.parentNode.removeChild(c);
            break;

        case 'setAttr':
            var target = alm.byId(d.target);
            target.setAttribute(d.attr, d.value);
            break;

        case 'removeAttr':
            var target = alm.byId(d.target);
            target.removeAttribute(d.attr);
            break;

        default:
            console.log('Unrecognized DOM action');
        };
    }

    /* Apply a list of diffs to the DOM.
     */
    function applyDiffs(diffs) {
        for (var i = 0; i < diffs.length; i++) {
            applyDiff(diffs[i]);
        }
    }

    /**
     * Rendering the virtual DOM
     *
     * App.main returns a signal emitting DOM trees. Building them is cheap
     * enough.
     *
     * However, re-renderig the actual DOM each time is problematic for the
     * following reasons:
     *
     *   1. It's slow, so dreadfully, miserably slow.
     *   2. Were you typing somewhere? Well, you just lost focus.
     *
     * The strategy adopted here is to compute the differences between the new
     * tree and the old tree. This set of changes is then applied to the actual
     * DOM, manipulating it as little as possible.
     *
     * The current, perhaps naive, algorithm is thus:
     *
     *   1. If the root node type is different, re-render and finish.
     *   2. For each different attribute, generate a diff.
     *   3. Recurse on each child, until one list is empty.
     */
    vdom.render = function(view_signal) {
        view_signal.reduce(null,function(update, tree) {
            var root = alm.domRoot;
            // Construct a new tree and save it
            if (tree === null) {
                initialDOM(update);
            }
            else {
                // for now, we do the same thing in both cases
                var diffs = diff(tree, update);
                console.log(diffs);
                applyDiffs(diffs);
            }
            return update;
        })
        .done();
    };

    return vdom;
};

/**
 * App
 *
 * Encapsulates the application state and exports an interface with which it's
 * difficult to screw up too much.
 */

function App(runApp) {
    this.runApp = runApp;
}

Public.App = App;

App.of = function(v) {
    var value = (typeof v !== 'undefined')
        ? v
        : null;
    return new App(function(runtime) {
        return {
            value: value,
            runtime: runtime
        };
    });
};

function runtime() {
    return new App(function(runtime) {
        return {
            value: runtime,
            runtime: runtime
        };
    });
}

function save(newruntime) {
    return new App(function(runtime) {
        return {
            value: undefined,
            runtime: newruntime
        };
    });
}

Public.save = save;

function modify(f) {
    return runtime().then(function(runtime) {
        var newruntime = f(runtime);
        return save(newruntime);
    });
}

// Initalize the application runtime
App.init = function(root) {
    const domRoot = (typeof root !== 'undefined')
        ? document.getElementById(root)
        : document;
    var listeners = [];
    var inputs = [];
    var ports = {};
    const timer = {
        programStart: Date.now(),
        now: function() { return Date.now(); }
    };

    function setTimeout(fn,delay) {
        return window.setTimeout(fn,delay);
    }

    function async(fn) {
        return window.setTimeout(fn,0);
    }

    function addListener(whichInputs, dom, evtName, fn) {
        dom.addEventListener(evtName, fn, true);
        var listener = {
            whichInputs: inputs,
            dom: dom,
            evtName: evtName,
            fn: fn
        };
        listeners.push(listener);
    }

    var updating = false;
    function notify (inputId, v) {
        if (updating) {
            throw new Error("Update already in progress!");
        }
        updating = true;
        var timestamp = timer.now();
        for (var i = inputs.length; i--; ) {
            var inp = inputs[i];
            if (inp.id === inputId) {
                inp.send(timestamp, inputId, v);
            }
        }
        updating = false;
    }

    // convenience because I dislike typing out document.getElementById
    function byId(_id) {
        return document.getElementById(_id);
    }

    /////
    // Each subsystem needs a different piece of what will end up being the
    // final runtime, so there are different initialization procedures which
    // are given different objects containing their runtime dependencies. These
    // are all put together in the final runtime object.
    /////

    // Initialize the mailbox system
    var mailbox = setupMailboxes({ inputs: inputs, async: async, notify: notify });

    // Set up the virtual dom
    var vdom = setupVdom({ byId: byId, domRoot: domRoot, mailbox: mailbox });

    // Set up ports (inbound and outbound constructors)
    var port = setupPorts({ inputs: inputs, ports: ports, notify: notify });

    // Initialize top-level event signals
    var events = setupEvents({
        inputs: inputs,
        domRoot: domRoot,
        addListener: addListener,
        notify: notify
    });

    // The final runtime object
    const runtime = {
        domRoot: domRoot,
        timer: timer,
        inputs: inputs,
        addListener: addListener,
        notify: notify,
        setTimeout: setTimeout,
        events: events,
        async: async,
        mailbox: mailbox,
        byId: byId,
        port: port,
        vdom: vdom,
        ports: ports,
        view: null, // dom tree which main will provide
        utils: {} // extensions
    };

    return save(runtime);
};

App.prototype = {
    map: function(f) {
        var me = this;
        return new App(function(runtime) {
            var prev = me.runApp(runtime);
            return {
                value: f(prev.value),
                runtime: prev.runtime
            };
        });
    },
    flatten: function() {
        var me = this;
        return new App(function(runtime) {
            var prev = me.runApp(runtime);
            var inner = prev.value.runApp(prev.runtime);
            return inner;
        });
    },
    // Get access to the application runtime
    runtime: function(k) {
        return this.then(function(_) {
            return new App(function(runtime) {
                return {
                    value: runtime,
                    runtime: runtime
                };
            });
        })
        .then(k);
    },

    // The main procedure in which you can create signals and mailboxes
    main: function(k) {
        return this.runtime(function(runtime) {
            const alm = {
                events: runtime.events,
                byId: runtime.byId,
                mailbox: runtime.mailbox,
                port: runtime.port,
                utils: runtime.utils,
                el: runtime.vdom.el
            };
            runtime.view = k(alm);
            runtime.vdom.render(runtime.view);
            return save(runtime);
        });
    },

    start: function() {
        const runtime = this.runApp();
        const ports = runtime.ports;

        return {
            ports: ports
        };
    }
};

instance(App,Functor);
instance(App,Monad);

// Setup events for the core browser events
function setupEvents(runtime) {
    var events = {
        mouse: {
            click: Signal.make(),
            dblclick: Signal.make()
        },
        keyboard: {
            keypress: Signal.make(),
            keydown: Signal.make(),
            keyup: Signal.make(),
            blur: Signal.make(),
            focusout: Signal.make()
        },
        input: Signal.make(),
        change: Signal.make()
    };

    function setupEvent(evtName, sig) {
        runtime.inputs.push(sig);
        runtime.addListener([sig], runtime.domRoot, evtName, function(evt) {
            runtime.notify(sig.id, evt);
        });
    }

    setupEvent('click', events.mouse.click);
    setupEvent('dblclick', events.mouse.dblclick);
    setupEvent('keypress', events.keyboard.keypress);
    setupEvent('keydown', events.keyboard.keydown);
    setupEvent('keyup', events.keyboard.keyup);
    setupEvent('focusout', events.keyboard.focusout);
    setupEvent('blur', events.keyboard.blur);
    setupEvent('input', events.input);
    setupEvent('change', events.change);

    return events;
}

return Public;
})(this);
