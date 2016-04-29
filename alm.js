/**
 * (c) 2016, Gatlin Johnson
 *
 * Contains some generalized abstract nonsense I find useful when building
 * applications.
 *
 * This will be factored out into its own library at some point, but for now
 * here we are.
 */
// Module boilerplate
(function(root, factory) {
    if (typeof exports === 'object') {
        module.exports = factory(root);
    } else
    if (typeof define === 'function' && define.amd) {
        define(factory);
    } else {
        root = factory(root);
    }
}(this, function(module) {

/////
// MODULE BEGIN
/////

// Got a function which takes itself as a parameter? Make it recursive with `Y`
var Y = module.Y = function(F) {
    return (function(x) {
        return F(function(y) { return (x(x))(y); }); })
           (function(x) {
        return F(function(y) { return (x(x))(y); }); }); };

// Compute a function's fixpoint, caching the result
var fix = module.fix = function(F, cache) {
    if (!cache) {
        cache = {}; }
    return function(arg) {
        if (cache[arg]) {
            return cache[arg]; }
        var answer = (F(function(n) {
            return (fix(F, cache))(n); }))(arg) ;
        cache[arg] = answer ;
        return answer ; } ; };

// Take a function and return a thunk, which will only be computed on first
// call
var memothunk = module.memothunk = function(f) {
    var cached = false;
    var result;
    return function() {
        if (cached) {
            return result; }
        cached = true;
        result = f();
        return result; }; };

// I promise this comes up occasionally
var constant = module.constant = function(y) {
    return function() {
        return y; }; };

// I promise this is useful on occasion
var id = module.id = function (x) { return x; };

// Compose two functions.
var compose = module.compose = function(f, g) {
    return function(x) {
        return f(g(x)); }; };

// get a generator of unique ids
var guid_factory = module.guid_factory = (function() {
    var count = 0;
    return function() {
        return count++;
    };
});

var instance = module.instance = function (inst, klass) {
    for (var fn in klass.prototype) {
        inst.prototype[fn] = klass.prototype[fn];
    }
};

var Functor = module.Functor = function() { return; };

Functor.prototype = {
    force: function() {
        return this.map(function(x) { return x(); }); },
    delay: function() {
        return this.map(function(x) {
            return memothunk(function() { return x; }); }); }
};

var Monad = module.Monad = function() { return; };

Monad.prototype.flatMap = Monad.prototype.then = function(f) {
    return this.map(f).flatten();
};

Monad.prototype.then = Monad.prototype.flatMap;

// Convenient for mapping `flatten`
var flatten = module.flatten = function(monad) {
    return monad.flatten(); };

/* Functor application. If you have a functor F with base type `(a -> b)`,
 * and another F with base type `a`, you can apply them and get an `F b`.
 * All monads support this operation automatically which is super chill.
 */
Monad.prototype.ap = function(other) {
    var me = this;
    return me.flatMap(function(f) {
        return other.flatMap(function(x) {
            return me.constructor.of(f(x)).delay(); }); }); };

var Comonad = module.Comonad = function() { return; };
Comonad.prototype.convolve = function(f) {
    return this.duplicate().map(f);
};

// If a comonad also implements the `ap` method it can be an instance of this,
// which I don't have the energy to describe right now.
var Evaluate = module.Evaluate = function() { return; };
Evaluate.prototype.evaluate = function() {
    var w = this;
    return memothunk(function() {
        return (function(u) {
            return w.ap(u.duplicate());
        })(w);
    })(); };

var wfix = module.wfix = function(w) {
    return memothunk(function() {
        return w.extract()(
            w.convolve(function(x) {
                return wfix(x); })); }); };

// Convenience for mapping
var extract = module.extract = function(comonad) {
    return comonad.extract(); };

// Convenience for mapping
var duplicate = module.duplicate = function(comonad) {
    return comonad.duplicate(); };

/**
 * Evaluator
 *
 * Takes an object of unary functions and, using comonadic fixpoints, allows
 * you to compute inter-dependent values quickly and easily.
 *
 * Think of it as allowing any object of functions to be treated as a
 * spreadsheet.
 */
function Evaluator(focus, values) {
    this.focus = focus;
    this.values = values;
}

Evaluator.prototype = {
    map: function(f) {
        var newValues = {};
        for (var key in this.values) {
            newValues[key] = f(this.values[key]);
        }
        return new Evaluator(this.focus, newValues);
    },
    // assumes exact same data in both 'values'
    ap: function(other) {
        var newValues = {};
        for (var key in this.values) {
            newValues[key] = this.values[key](other.values[key]);
        }
        return new Evaluator(this.focus, newValues);
    },
    extract: function() {
        return this.values[this.focus];
    },
    duplicate: function() {
        var newValues = {};
        for (var key in this.values) {
            var new_me = new Evaluator(key, this.values);
            newValues[key] = new_me;
        }
        return new Evaluator(this.focus, newValues);
    },
    at: function(k) {
        return this.values[k](this);
    },
    set: function(k,v) {
        this.values[k] = v;
        return this;
    }
};

instance(Evaluator, Functor);
instance(Evaluator, Comonad);
instance(Evaluator, Evaluate);

module.Evaluator = Evaluator;

/**
 * Arrays are monads
 */
Array.prototype.flatten = function() {
    return this.reduce(function(a,b) { return a.concat(b); }, []);
};

if (!Array.of) {
    Array.of = function() {
        return Array.prototype.slice.call(arguments);
    };
}

instance(Array, Functor);
instance(Array, Monad);

/**
 * Log
 *
 * A write-only logging utility.
 */
function Log(initialLog, value) {
    this.open = memothunk(function() { return initialLog; });
    this.value = memothunk(function() { return value; });
}

module.Log = Log;

Log.of = function(v) {
    return new Log([], v);
};

Log.prototype = {
    map: function(f) {
        return new Log(this.open(), f(this.value()));
    },
    flatten: function() {
        var me = this;
        var other = this.value();
        return new Log(me.open().concat(other.open()), other.value());
    },
    log: function(msg) {
        var me = this;
        return this.flatMap(function(x) {
            return new Log(msg(x), x); });
    }
};

instance(Log, Functor);
instance(Log, Monad);

/////
// MODULE END
/////

return module;
}));

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
            if (dom) {
                dom.parentNode.removeChild(dom);
            }
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
                    let kids = new Array();
                    for (var i = 0; i < len; i++) {
                        kids.push(dom.childNodes[i]);
                    }

                    for (let i = 0; i < len; i++) {
                        let kidA = a.children[i];
                        let kidB = b.children[i];
                        if (kidA) {
                            diff(kidA, kidB, kids[i]);
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
                if (!(key in modified)) {
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
