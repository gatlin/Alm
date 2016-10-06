/******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};

/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {

/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId])
/******/ 			return installedModules[moduleId].exports;

/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			exports: {},
/******/ 			id: moduleId,
/******/ 			loaded: false
/******/ 		};

/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);

/******/ 		// Flag the module as loaded
/******/ 		module.loaded = true;

/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}


/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;

/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;

/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "";

/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(0);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	const alm = __webpack_require__(1),
	      el = alm.el;

	/* This generates unique integers for the session */
	const guid = (() => {
	    let i = 0;
	    return () => {
	        return i++;
	    };
	})();

	/* Our application model is a list of tasks, the contents of the input field,
	   and the next available uid to assign a task.
	*/
	function empty_model() {
	    return {
	        tasks: [new_task('Example 1', 0), new_task('Example 2', 1)],
	        field: '',
	        uid: 2
	    };
	}

	/* The set of actions to perform on the model. This is just an enum. */
	const Actions = {
	    NoOp: 0,
	    Add: 1,
	    UpdateField: 2,
	    Delete: 3,
	    Complete: 4,
	    Editing: 5,
	    UpdateTask: 6
	};

	/* Generates a new task in a default state. */
	function new_task(description, id) {
	    return {
	        description: description,
	        completed: false,
	        editing: false,
	        uid: id
	    };
	}

	/* This describes the logic used to update the model.
	   Arguments: the action and the model.
	   Returns: a new model.
	*/
	function update_model(action, model) {
	    const dispatch = {};

	    dispatch[Actions.Add] = () => {
	        if (model.field) {
	            model.tasks.push(new_task(
	                model.field, model.uid
	            ));
	            model.uid = model.uid + 1;
	            model.field = '';
	        }
	        return model;
	    };

	    dispatch[Actions.UpdateField] = () => {
	        model.field = action.content;
	        return model;
	    };

	    dispatch[Actions.Delete] = () => {
	        const uid = action.content;
	        let idx = -1;
	        for (let i = 0; i < model.tasks.length; i++) {
	            if (model.tasks[i].uid === uid) {
	                idx = i;
	                break;
	            }
	        }
	        if (idx > -1) {
	            model.tasks.splice(idx,1);
	        }
	        return model;
	    };

	    dispatch[Actions.Complete] = () => {
	        const uid = action.content;
	        for (let i = model.tasks.length; i--; ) {
	            if (model.tasks[i].uid === uid) {
	                model.tasks[i].completed =
	                    !model.tasks[i].completed;
	                break;
	            }
	        }
	        return model;
	    };

	    dispatch[Actions.Editing] = () => {
	        const uid = action.content;
	        for (let i = model.tasks.length; i--; ) {
	            if (model.tasks[i].uid === uid) {
	                model.tasks[i].editing = true;
	                break;
	            }
	        }
	        return model;
	    };

	    dispatch[Actions.UpdateTask] = () => {
	        const uid = action.content.uid;
	        for (let i = model.tasks.length; i--; ) {
	            if (model.tasks[i].uid === uid) {
	                model.tasks[i].editing = false;
	                model.tasks[i].description =
	                    action.content.text;
	                break;
	            }
	        }
	        return model;
	    };

	    return dispatch[action.type]();
	}

	/* Takes a model and produces a VTree using the `el` function provided by alm.
	*/
	function render_model(model) {
	    let task_items = model.tasks.map(function(task) {
	        let content = (task.editing)
	            ? el('input', {
	                type: 'text',
	                class: 'editing',
	                id: 'edit-task-'+task.uid,
	                value: task.description })
	            : el('label', {
	                class: (task.completed) ? 'completed' : 'task_text',
	                id: 'text-task-'+task.uid
	            }, [task.description]);

	        let checkboxAttrs = {
	            type: 'checkbox',
	            class: 'toggle',
	            id: 'check-task-'+task.uid
	        };

	        if (task.completed) {
	            checkboxAttrs.checked = 'checked';
	        }

	        // return the list item!
	        return el('li', { id: 'task-'+task.uid, class: 'task' }, [
	            el('input', checkboxAttrs),
	            content,
	            el('button', {
	                class: 'delete_button',
	                id: 'del-task-'+task.uid })
	        ]);
	    });

	    return el('section', { id: 'the_app', class: 'app' }, [
	        el('header', { id: 'header', class: 'header' }, [
	            el('h1', {key: 'title' }, ["Obligatory Todo App"]),
	            el('p', {key: 'wut'}, ['Double-click tasks to edit them'])
	        ]),
	        el('input', {
	            type: 'text',
	            id: 'field',
	            placeholder: 'What needs to be done?',
	            value: model.field
	        }),
	        el('ul', { class: 'todo_list', id: 'todo_list' }, task_items)
	    ]);
	}

	const app = new alm.App({
	    domRoot: 'main',
	    eventRoot: 'main',
	    state: empty_model(),
	    update: update_model,
	    render: render_model,
	    ports: {
	        outbound: ['vdom_test']
	    },
	    main: (scope) => {

	        scope.events.change
	            .filter(evt => evt.hasClass('toggle'))
	            .recv(evt => scope.actions.send({
	                type: Actions.Complete,
	                content: parseInt(evt.getId().split('-')[2])
	            }));

	        scope.events.click
	            .filter(evt => evt.hasClass('delete_button'))
	            .recv(evt => scope.actions.send({
	                type: Actions.Delete,
	                content: parseInt(evt.getId().split('-')[2])
	            }));

	        scope.events.input
	            .filter(evt => evt.getId() === 'field')
	            .recv(evt => scope.actions.send({
	                type: Actions.UpdateField,
	                content: evt.getValue()
	            }));

	        scope.events.dblclick
	            .filter(evt => evt.hasClass('task_text'))
	            .recv(evt => scope.actions.send({
	                type: Actions.Editing,
	                content: parseInt(evt.getId().split('-')[2])
	            }));

	        scope.events.blur
	            .filter(evt => evt.hasClass('editing'))
	            .recv(evt => scope.actions.send({
	                type: Actions.UpdateTask,
	                content: {
	                    uid: parseInt(evt.getId().split('-')[2]),
	                    text: evt.getValue()
	                }
	            }));

	        const onEnter = scope.events.keydown
	              .filter(evt => evt.getRaw().keyCode === 13);

	        onEnter.filter(evt => evt.getId() === 'field')
	            .recv(evt => scope.actions.send({
	                type: Actions.Add
	            }));

	        onEnter
	            .filter(evt => evt.hasClass('editing'))
	            .recv(evt => scope.actions.send({
	                type: Actions.UpdateTask,
	                content: {
	                    uid: parseInt(evt.getId().split('-')[2]),
	                    text: evt.getValue()
	                }
	            }));
	    }
	}).start();


/***/ },
/* 1 */
/***/ function(module, exports, __webpack_require__) {

	var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;!(__WEBPACK_AMD_DEFINE_ARRAY__ = [__webpack_require__, exports, __webpack_require__(2), __webpack_require__(3), __webpack_require__(2), __webpack_require__(3)], __WEBPACK_AMD_DEFINE_RESULT__ = function (require, exports, base_1, vdom_1, base_2, vdom_2) {
	    "use strict";
	    function __export(m) {
	        for (var p in m) if (!exports.hasOwnProperty(p)) exports[p] = m[p];
	    }
	    __export(base_1);
	    /* TODO don't export render */
	    exports.el = vdom_1.el;
	    /* Wraps system events and provides some convenience methods */
	    var Event = (function () {
	        function Event(evt) {
	            this.raw = evt;
	            this.classes = evt.target.className.split(' ');
	            this.id = evt.target.id;
	        }
	        Event.prototype.hasClass = function (klass) {
	            return (this.classes.indexOf(klass) !== -1);
	        };
	        Event.prototype.getClasses = function () {
	            return this.classes;
	        };
	        Event.prototype.getId = function () {
	            return this.id;
	        };
	        Event.prototype.getValue = function () {
	            return this.raw.target.value;
	        };
	        Event.prototype.getRaw = function () {
	            return this.raw;
	        };
	        return Event;
	    }());
	    exports.Event = Event;
	    function makeEvents(evts) {
	        var events = {};
	        for (var i = 0; i < evts.length; i++) {
	            var evtName = evts[i];
	            events[evtName] = new base_2.Signal(function (evt) { return new Event(evt); });
	        }
	        return events;
	    }
	    function makePorts(portCfg) {
	        var ports = {
	            outbound: {},
	            inbound: {}
	        };
	        for (var outPortIdx in portCfg.outbound) {
	            var outPortName = portCfg.outbound[outPortIdx];
	            ports.outbound[outPortName] = base_2.Signal.make();
	        }
	        for (var inPortIdx in portCfg.inbound) {
	            var inPortName = portCfg.inbound[inPortIdx];
	            ports.inbound[inPortName] = base_2.Signal.make();
	        }
	        return ports;
	    }
	    var standardEvents = [
	        'click',
	        'dblclick',
	        'keyup',
	        'keydown',
	        'keypress',
	        'blur',
	        'focusout',
	        'input',
	        'change',
	        'load'
	    ];
	    var App = (function () {
	        function App(cfg) {
	            this.gui = typeof cfg.gui === 'undefined'
	                ? true
	                : cfg.gui;
	            this.eventRoot = typeof cfg.eventRoot === 'string'
	                ? document.getElementById(cfg.eventRoot)
	                : typeof cfg.eventRoot === 'undefined'
	                    ? document
	                    : cfg.eventRoot;
	            this.domRoot = typeof cfg.domRoot === 'string'
	                ? document.getElementById(cfg.domRoot)
	                : typeof cfg.domRoot === 'undefined'
	                    ? document.body
	                    : cfg.domRoot;
	            var events = standardEvents.concat(typeof cfg.extraEvents !== 'undefined'
	                ? cfg.extraEvents
	                : []);
	            this.events = makeEvents(events);
	            this.ports = typeof cfg.ports !== 'undefined'
	                ? makePorts(cfg.ports)
	                : { outbound: null, inbound: null };
	            this.main = cfg.main;
	            this.state = cfg.state;
	            this.update = cfg.update;
	            this.render = this.gui ? cfg.render : null;
	        }
	        App.prototype.registerEvent = function (evtName, sig) {
	            var fn = function (evt) { return sig.send(evt); };
	            this.eventRoot.addEventListener(evtName, fn, true);
	        };
	        App.prototype.start = function () {
	            var _this = this;
	            // Setup the react -> update -> render graph
	            var actions = new base_2.Mailbox(null);
	            var updates = actions.reduce(this.state, function (action, model) {
	                if (action === null) {
	                    return model;
	                }
	                return _this.update(action, model);
	            });
	            // Let the user wire up any relevant signals
	            this.main({
	                events: this.events,
	                ports: this.ports,
	                actions: actions,
	                state: updates
	            });
	            /* Find all the event listeners the user cared about and bind those */
	            for (var evtName in this.events) {
	                var sig = this.events[evtName];
	                if (sig.numListeners() > 0) {
	                    this.registerEvent(evtName, sig);
	                }
	            }
	            if (this.gui) {
	                var view = updates.map(this.render);
	                vdom_2.render(view, this.domRoot);
	            }
	            return {
	                ports: this.ports,
	                state: updates
	            };
	        };
	        return App;
	    }());
	    exports.App = App;
	}.apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__), __WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));


/***/ },
/* 2 */
/***/ function(module, exports, __webpack_require__) {

	var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;var __extends = (this && this.__extends) || function (d, b) {
	    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
	    function __() { this.constructor = d; }
	    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
	};
	!(__WEBPACK_AMD_DEFINE_ARRAY__ = [__webpack_require__, exports], __WEBPACK_AMD_DEFINE_RESULT__ = function (require, exports) {
	    "use strict";
	    /* Permits something akin to traits and automatically derived functions. */
	    function derive(derivedCtor, baseCtors) {
	        baseCtors.forEach(function (baseCtor) {
	            Object.getOwnPropertyNames(baseCtor.prototype).forEach(function (name) {
	                derivedCtor.prototype[name] = baseCtor.prototype[name];
	            });
	        });
	    }
	    exports.derive = derive;
	    /* Using `derive` you can get an implementation of flatMap for free by
	    implementing this class as an interface with a null return value for
	    flatMap. */
	    var FlatMap = (function () {
	        function FlatMap() {
	        }
	        FlatMap.pipe = function (ms) {
	            var v = ms[0];
	            for (var i = 1; i < ms.length; i++) {
	                v = v.flatMap(ms[i]);
	            }
	            return v;
	        };
	        FlatMap.prototype.flatMap = function (f) {
	            return this.map(f).flatten();
	        };
	        FlatMap.prototype.pipe = function (ms) {
	            var me = this;
	            for (var i = 0; i < ms.length; i++) {
	                me = me.flatMap(ms[i]);
	            }
	            return me;
	        };
	        return FlatMap;
	    }());
	    exports.FlatMap = FlatMap;
	    /* Utility function to perform some function asynchronously. */
	    function async(f) {
	        setTimeout(f, 0);
	    }
	    exports.async = async;
	    /**
	    Signals route data through an application.
	    
	    Instead of containing explicit state signals contain a unary function
	    and an array of listeners. When a signal is sent a value it applies its
	    function and send the result in turn to each listener.
	    
	    The Signal interface is very declarative: by calling a method such as `#map`
	    you are implicitly creating a new Signal, attaching it to the list of
	    the callee's receivers, and receiving the new signal as a result.
	    
	    Thus you can start with an existing signal and simply chain method calls to
	    construct a pipeline.
	    */
	    var Signal = (function () {
	        function Signal(fn) {
	            this.fn = fn;
	            this.listeners = [];
	        }
	        Signal.prototype.connect = function (sig) {
	            this.listeners.push(sig);
	            return sig;
	        };
	        Signal.prototype.send = function (x) {
	            var v = this.fn(x);
	            if (typeof v !== 'undefined') {
	                for (var i = 0; i < this.listeners.length; i++) {
	                    var r = this.listeners[i];
	                    r.send(v);
	                }
	            }
	        };
	        Signal.make = function () {
	            return new Signal(function (x) { return x; });
	        };
	        Signal.prototype.recv = function (f) {
	            this.connect(new Signal(function (v) { return f(v); }));
	        };
	        Signal.prototype.filter = function (cond) {
	            var r = new Signal(function (v) {
	                if (cond(v)) {
	                    return v;
	                }
	            });
	            return this.connect(r);
	        };
	        Signal.prototype.reduce = function (initial, reducer) {
	            var state = initial;
	            var r = new Signal(function (v) {
	                state = reducer(v, state);
	                return state;
	            });
	            return this.connect(r);
	        };
	        Signal.prototype.map = function (f) {
	            return this.connect(new Signal(function (v) { return f(v); }));
	        };
	        Signal.prototype.done = function () {
	            return this;
	        };
	        Signal.prototype.numListeners = function () {
	            return this.listeners.length;
	        };
	        return Signal;
	    }());
	    exports.Signal = Signal;
	    /**
	    Yet another implementation of promises.
	    
	    Whereas Signals are intended to run multiple times and repeatedly send values to
	    any listeners, Async computations call each listener at most once for a given
	    promise.
	    
	    Because they are derived from Signals you can use Async computations anywhere
	    you would use a Signal.
	    */
	    var Async = (function (_super) {
	        __extends(Async, _super);
	        function Async() {
	            _super.call(this, function (x) { return x; });
	            this.value = null;
	        }
	        Async.of = function (v) {
	            var a = new Async();
	            a.send(v);
	            return a;
	        };
	        Async.pipe = function (ms) {
	            return FlatMap.pipe(ms);
	        };
	        Async.prototype.recv = function (cb) {
	            var _this = this;
	            if (this.value !== null) {
	                async(function () { return cb(_this.value); });
	            }
	            else {
	                _super.prototype.recv.call(this, cb);
	            }
	            return this;
	        };
	        Async.prototype.send = function (v) {
	            if (this.value !== null) {
	                return;
	            }
	            this.value = v;
	            _super.prototype.send.call(this, v);
	            this.listeners = [];
	        };
	        Async.prototype.map = function (f) {
	            var a = new Async();
	            this.recv(function (val) { return a.send(f(val)); });
	            return a;
	        };
	        Async.prototype.flatten = function () {
	            var a = new Async();
	            this.recv(function (a2) {
	                a2.recv(function (val) {
	                    a.send(val);
	                });
	            });
	            return a;
	        };
	        /* Will be derived from Monad */
	        Async.prototype.flatMap = function (f) { return null; };
	        Async.prototype.pipe = function (_) { return null; };
	        return Async;
	    }(Signal));
	    exports.Async = Async;
	    derive(Async, [FlatMap]);
	    /**
	    A signal to which you may send and receive values. Messages are sent
	    asynchronously.
	    */
	    var Mailbox = (function (_super) {
	        __extends(Mailbox, _super);
	        function Mailbox(t) {
	            _super.call(this, function (x) { return x; });
	            this.send(t);
	        }
	        Mailbox.prototype.send = function (t) {
	            var _this = this;
	            async(function () {
	                _super.prototype.send.call(_this, t);
	            });
	        };
	        Mailbox.prototype.recv = function (k) {
	            _super.prototype.recv.call(this, k);
	        };
	        return Mailbox;
	    }(Signal));
	    exports.Mailbox = Mailbox;
	}.apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__), __WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));


/***/ },
/* 3 */
/***/ function(module, exports, __webpack_require__) {

	var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;!(__WEBPACK_AMD_DEFINE_ARRAY__ = [__webpack_require__, exports], __WEBPACK_AMD_DEFINE_RESULT__ = function (require, exports) {
	    "use strict";
	    /*
	    This module started off as a clone of:
	    https://github.com/Matt-Esch/virtual-dom
	    
	    However at this point, despite retaining some nomenclature, it's an entirely
	    different algorithm.
	    
	    Rather than actually compute a set of patches and then apply them in two phases,
	    this algorithm computes patches and then applies them immediately.
	    
	    See the `diff` function for a super fun algorithmic discussion.
	    */
	    var VTreeType;
	    (function (VTreeType) {
	        VTreeType[VTreeType["Text"] = 0] = "Text";
	        VTreeType[VTreeType["Node"] = 1] = "Node";
	    })(VTreeType || (VTreeType = {}));
	    ;
	    // exported only to `alm.ts`
	    var VTree = (function () {
	        function VTree(content, children, treeType) {
	            this.content = content;
	            this.children = children;
	            this.treeType = treeType;
	            this.mailbox = null;
	            /* There must be a key */
	            if (treeType === VTreeType.Node) {
	                if ('key' in this.content.attrs) {
	                    this.key = this.content.attrs.key;
	                    delete this.content.attrs.key;
	                }
	                else if ('id' in this.content.attrs) {
	                    this.key = this.content.attrs.id;
	                }
	                else {
	                    this.key = this.content.tag;
	                }
	            }
	            else {
	                this.key = this.content;
	            }
	        }
	        VTree.prototype.subscribe = function (mailbox) {
	            this.mailbox = mailbox;
	            return this;
	        };
	        VTree.prototype.eq = function (other) {
	            var me = this;
	            if (!other) {
	                return false;
	            }
	            if (me.key === null || other.key === null) {
	                return false;
	            }
	            return (me.key === other.key);
	        };
	        VTree.makeDOMNode = function (tree) {
	            if (tree === null) {
	                return null;
	            }
	            if (tree.treeType === VTreeType.Text) {
	                return document.createTextNode(tree.content);
	            }
	            var el = document.createElement(tree.content.tag);
	            for (var key in tree.content.attrs) {
	                el.setAttribute(key, tree.content.attrs[key]);
	            }
	            for (var i = 0; i < tree.children.length; i++) {
	                var child = VTree.makeDOMNode(tree.children[i]);
	                el.appendChild(child);
	            }
	            if (tree.mailbox !== null) {
	                tree.mailbox.send(el);
	            }
	            return el;
	        };
	        VTree.initialDOM = function (tree, domRoot) {
	            var root = domRoot;
	            var domTree = VTree.makeDOMNode(tree);
	            while (root.firstChild) {
	                root.removeChild(root.firstChild);
	            }
	            root.appendChild(domTree);
	        };
	        return VTree;
	    }());
	    exports.VTree = VTree;
	    var Op;
	    (function (Op) {
	        Op[Op["Merge"] = 0] = "Merge";
	        Op[Op["Delete"] = 1] = "Delete";
	        Op[Op["Insert"] = 2] = "Insert";
	    })(Op || (Op = {}));
	    ;
	    // diff of an array where order matters
	    // you supply two arrays and an element-wise equality function
	    function diff_array(a, b, eq) {
	        if (!a.length) {
	            return b.map(function (c) { return [Op.Insert, null, c]; });
	        }
	        if (!b.length) {
	            return a.map(function (c) { return [Op.Delete, c, null]; });
	        }
	        var m = a.length + 1;
	        var n = b.length + 1;
	        var d = new Array(m * n);
	        var moves = [];
	        for (var i_1 = 0; i_1 < m; i_1++) {
	            d[i_1 * n] = 0;
	        }
	        for (var j_1 = 0; j_1 < n; j_1++) {
	            d[j_1] = 0;
	        }
	        for (var i_2 = 1; i_2 < m; i_2++) {
	            for (var j_2 = 1; j_2 < n; j_2++) {
	                if (eq(a[i_2 - 1], b[j_2 - 1])) {
	                    d[i_2 * n + j_2] = d[(i_2 - 1) * n + (j_2 - 1)] + 1;
	                }
	                else {
	                    d[i_2 * n + j_2] = Math.max(d[(i_2 - 1) * n + j_2], d[i_2 * n + (j_2 - 1)]);
	                }
	            }
	        }
	        var i = m - 1, j = n - 1;
	        while (!(i === 0 && j === 0)) {
	            if (eq(a[i - 1], b[j - 1])) {
	                i--;
	                j--;
	                moves.unshift([Op.Merge, a[i], b[j]]);
	            }
	            else {
	                if (d[i * n + (j - 1)] > d[(i - 1) * n + j]) {
	                    j--;
	                    moves.unshift([Op.Insert, null, b[j]]);
	                }
	                else {
	                    i--;
	                    moves.unshift([Op.Delete, a[i], null]);
	                }
	            }
	        }
	        return moves;
	    }
	    function diff_dom(parent, a, b, index) {
	        if (index === void 0) { index = 0; }
	        if (typeof b === 'undefined' || b === null) {
	            parent.removeChild(parent.childNodes[index]);
	            return;
	        }
	        if (typeof a === 'undefined' || a === null) {
	            parent.insertBefore(VTree.makeDOMNode(b), parent.childNodes[index]);
	            return;
	        }
	        if (b.treeType === VTreeType.Node) {
	            if (a.treeType === VTreeType.Node) {
	                if (a.content.tag === b.content.tag) {
	                    // contend with attributes
	                    var dom = parent.childNodes[index];
	                    for (var attr in a.content.attrs) {
	                        if (!(attr in b.content.attrs)) {
	                            dom.removeAttribute(attr);
	                            delete dom[attr];
	                        }
	                    }
	                    for (var attr in b.content.attrs) {
	                        var v = b.content.attrs[attr];
	                        if (!(attr in a.content.attrs) ||
	                            v !== a.content.attrs[attr]) {
	                            dom[attr] = v;
	                            dom.setAttribute(attr, v);
	                        }
	                    }
	                    // contend with the children
	                    var moves = diff_array(a.children, b.children, function (a, b) {
	                        if (typeof a === 'undefined')
	                            return false;
	                        return a.eq(b);
	                    });
	                    var domIndex = 0;
	                    for (var i = 0; i < moves.length; i++) {
	                        var move = moves[i];
	                        diff_dom(parent.childNodes[index], move[1], move[2], domIndex);
	                        if (move[0] !== Op.Delete) {
	                            domIndex++;
	                        }
	                    }
	                }
	            }
	        }
	        else {
	            // different types of nodes, `b` is a text node, or they have different
	            // tags. in all cases just replace the DOM element.
	            parent.replaceChild(VTree.makeDOMNode(b), parent.childNodes[index]);
	        }
	    }
	    // exported only to `alm.ts`
	    function render(view_signal, domRoot) {
	        view_signal.reduce(null, function (update, tree) {
	            // Set a default key for the root node
	            if (update.key === null) {
	                update.key = 'root';
	            }
	            if (tree === null) {
	                VTree.initialDOM(update, domRoot);
	            }
	            else {
	                diff_dom(domRoot, tree, update);
	            }
	            return update;
	        });
	    }
	    exports.render = render;
	    /*** EXPORTED AT TOP LEVEL ***/
	    function el(tag, attrs, children) {
	        var children_trees = (typeof children === 'undefined')
	            ? []
	            : children.map(function (kid, idx) {
	                return typeof kid === 'string'
	                    ? new VTree(kid, [], VTreeType.Text)
	                    : kid;
	            });
	        return new VTree({
	            tag: tag,
	            attrs: attrs
	        }, children_trees, VTreeType.Node);
	    }
	    exports.el = el;
	}.apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__), __WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));


/***/ }
/******/ ]);