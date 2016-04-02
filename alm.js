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
    this.fn = fn;
    this.receivers = (typeof receivers !== 'undefined')
        ? receivers
        : [];
}

// A signal which just repeats what it has been given.
Signal.make = function() {
    return new Signal(function(x) {
        return x;
    }, []);
};

Signal.constant = function(x) {
    return new Signal(constant(x));
};

Signal.output = function(handler) {
    var sig = new Signal(function(v) {
        handler(v);
    }, []);
    sig.isOutput = true;
    return sig;
};

Signal.prototype = {
    send: function(timestamp, value) {
        var result = this.fn(value);
        if (result === undefined) { return; }
        if (this.isOutput) { return; }
        for (var i = this.receivers.length; i--; ) {
            this.receivers[i].send(timestamp, result);
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
            if (cond(v)) {
                return v;
            }
        });
        this.connect(r);
        return r;
    },
    reduce: function(initial, reducer) {
        var sig = this;
        let state = initial;
        var r = new Signal(function(v) {
            state = reducer(v, state);
            return state;
        });
        this.connect(r);
        return r;
    },
    map: function(f) {
        var sig = this;
        var r = new Signal(function(v) {
            return f(v);
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
        let signal = Signal.make();
        let sig_id = runtime.addInput(signal);
        let mb = {
            signal: signal,
            send: function(v) {
                runtime.async(function() {
                    runtime.notify(sig_id, v);
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
        let signal = Signal.make();
        let sig_id = runtime.addInput(signal);
        runtime.ports[name] = {
            send: function(v) {
                runtime.notify(sig_id,v);
            }
        };
        return signal;
    };

    var outbound = function(name) {
        let signal = Signal.make();
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
 */
function setupVdom(alm) {
    var vdom = {};

    /* A virtual DOM is a rose tree. */
    function VTree(content, children, type) {
        this.content = content;
        this.children = children;
        this.type = type;
        if (this.type === VTree.Text) {
            this.key = this.content;
        } else {
            if (typeof this.content.attrs.id !== 'undefined') {
                this.key = this.content.attrs.id;
            } else {
                this.key = null;
            }
        }
    }

    VTree.prototype = {
        subscribe: function(mailbox) {
            this.mailbox = mailbox;
            return this;
        },
        keyEq: function(other) {
            var me = this;
            if (me.key == null || other.key == null) {
                return false;
            }
            return (me.key === other.key);
        }
    }

    VTree.Text = 0;
    VTree.Node = 1;

    /**
     * Convenience constructor for VTree.
     */
    vdom.el = function(tag, attrs, children) {
        var children_trees = (typeof children === 'undefined')
            ? []
            : children.map(function(kid) {
                return (typeof kid === 'string')
                    ? new VTree(kid, [], VTree.Text)
                    : kid; });
        return new VTree({
            tag: tag,
            attrs: attrs
        }, children_trees, VTree.Node);
    };

    function makeDOMNode(tree) {
        if (tree === null) { return null; }
        if (tree.type === VTree.Text) {
            return document.createTextNode(tree.content);
        }
        var el = document.createElement(tree.content.tag);

        for (var key in tree.content.attrs) {
            el.setAttribute(key, tree.content.attrs[key]);
        }
        for (var i = 0; i < tree.children.length; i++) {
            var child = makeDOMNode(tree.children[i]);
            el.appendChild(child);
        }
        if (tree.mailbox) {
            tree.mailbox.send(el);
        }
        return el;
    }

    function initialDOM(tree) {
        var root = alm.domRoot;
        var domTree = makeDOMNode(tree);
        while (root.firstChild) {
            root.removeChild(root.firstChild);
        }
        root.appendChild(domTree);
    }

    function makeIndex(tree) {
        var index = {};
        for (var i = 0; i < tree.children.length; i++) {
            var kid = tree.children[i];
            if (kid.key != null) {
                index[kid.key] = i;
            }
        }
        return index;
    }

    /* Computes the differences between two trees, and modifies the DOM
     * accordingly.
     *
     * The algorithm traverses the two trees as well as the DOM. In lieu of
     * computing patches to be applied at a later time, for now this simply
     * modifies the DOM in place.
     */
    function diff(a, b, dom) {
        if (typeof b === 'undefined' || b == null) {
            dom.parentNode.removeChild(dom);
            return;
        }
        if (typeof a === 'undefined' || a == null) {
            // `dom` will be the parent of `a`
            dom.appendChild(makeDOMNode(b));
            return;
        }
        if (b.type === VTree.Node) {
            if (a.type === VTree.Node) {
                if (a.content.tag === b.content.tag) {
                    // reconcile element attributes
                    for (var attr in b.content.attrs) {
                        dom[attr] = b.content.attrs[attr];
                        dom.setAttribute(attr,b.content.attrs[attr]);
                    }
                    for (var attr in a.content.attrs) {
                        if (!(attr in b.content.attrs)) {
                            dom.removeAttribute(attr);
                        }
                    }

                    // Naively compare children. Works but is un-optimized.
                    var aLen = a.children.length;
                    var bLen = b.children.length;
                    var len = aLen > bLen ? aLen : bLen;

                    for (let i = 0; i < len; i++) {
                        let kidA = a.children[i];
                        let kidB = b.children[i];
                        if (kidA) {
                            diff(kidA, kidB, dom.childNodes[i]);
                        } else {
                            diff(null, kidB, dom);
                        }
                    }
                } else {
                    // tags are not the same
                    var p = dom.parentNode;
                    p.insertBefore(makeDOMNode(b), dom);
                    p.removeChild(dom);
                }
            } else {
                // b is a node, a is text
                var p = dom.parentNode;
                p.insertBefore(makeDOMNode(b), dom);
                p.removeChild(dom);
            }
        } else {
            // both are text
            var p = dom.parentNode;
            p.insertBefore(makeDOMNode(b), dom);
            p.removeChild(dom);
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
     * Thus a virtual DOM is used. The new tree is compared to the old tree and
     * a set of patches are produced, which are then applied to the actual DOM.
     *
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
                diff(tree, update, root.firstChild);
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

function save(modified) {
    return new App(function(runtime) {
        if (runtime) {
            for (let key in runtime) {
                if (!key in modified) {
                    modified[key] = runtime[key];
                }
            }
        }
        return {
            value: undefined,
            runtime: Object.freeze(modified)
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
        : document.body;
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
        inputs[inputId].send(timestamp, v);
        updating = false;
    }

    function addInput(inp) {
        var _id = inputs.length;
        inputs.push(inp);
        return _id;
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
    let mailbox = setupMailboxes({ addInput: addInput, async: async, notify: notify });

    // Set up the virtual dom
    let vdom = setupVdom({ byId: byId, domRoot: domRoot, mailbox: mailbox });

    // Set up ports (inbound and outbound constructors)
    let port = setupPorts({ addInput: addInput, ports: ports, notify: notify, mailbox: mailbox });

    // Initialize top-level event signals
    let events = setupEvents({
        addInput: addInput,
        domRoot: domRoot,
        addListener: addListener,
        notify: notify
    });

    const utils = {};

    // The final runtime object
    return save({
        domRoot: domRoot,
        timer: timer,
        addInput: addInput,
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
        utils: {} // extensions
    });
};

App.prototype = {
    map: function(f) {
        let me = this;
        return new App(function(runtime) {
            var prev = me.runApp(runtime);
            return {
                value: f(prev.value),
                runtime: prev.runtime
            };
        });
    },
    flatten: function() {
        let me = this;
        return new App(function(runtime) {
            let prev = me.runApp(runtime);
            let inner = prev.value.runApp(prev.runtime);
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
            let alm = {
                events: runtime.events,
                async: runtime.async,
                setTimeout: runtime.setTimeout,
                byId: runtime.byId,
                mailbox: runtime.mailbox,
                port: runtime.port,
                utils: runtime.utils,
                el: runtime.vdom.el,
                timer: runtime.timer
            };
            let view = k(alm);
            runtime.vdom.render(view);
            return save(alm);
        });
    },

    start: function() {
        var runtime = this.runApp().runtime;
        return {
            ports: runtime.ports,
            utils: runtime.utils
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
        change: Signal.make(),
        load: Signal.make()
    };

    function setupEvent(evtName, sig) {
        var sig_id = runtime.addInput(sig);
        runtime.addListener([sig], runtime.domRoot, evtName, function(evt) {
            runtime.notify(sig_id, evt);
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
    setupEvent('load', events.load);

    return events;
}

return Public;
})(this);
