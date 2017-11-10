(function webpackUniversalModuleDefinition(root, factory) {
	if(typeof exports === 'object' && typeof module === 'object')
		module.exports = factory();
	else if(typeof define === 'function' && define.amd)
		define("alm", [], factory);
	else if(typeof exports === 'object')
		exports["alm"] = factory();
	else
		root["alm"] = factory();
})(this, function() {
return /******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};
/******/
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/
/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId]) {
/******/ 			return installedModules[moduleId].exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			i: moduleId,
/******/ 			l: false,
/******/ 			exports: {}
/******/ 		};
/******/
/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/
/******/ 		// Flag the module as loaded
/******/ 		module.l = true;
/******/
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/
/******/
/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;
/******/
/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;
/******/
/******/ 	// define getter function for harmony exports
/******/ 	__webpack_require__.d = function(exports, name, getter) {
/******/ 		if(!__webpack_require__.o(exports, name)) {
/******/ 			Object.defineProperty(exports, name, {
/******/ 				configurable: false,
/******/ 				enumerable: true,
/******/ 				get: getter
/******/ 			});
/******/ 		}
/******/ 	};
/******/
/******/ 	// getDefaultExport function for compatibility with non-harmony modules
/******/ 	__webpack_require__.n = function(module) {
/******/ 		var getter = module && module.__esModule ?
/******/ 			function getDefault() { return module['default']; } :
/******/ 			function getModuleExports() { return module; };
/******/ 		__webpack_require__.d(getter, 'a', getter);
/******/ 		return getter;
/******/ 	};
/******/
/******/ 	// Object.prototype.hasOwnProperty.call
/******/ 	__webpack_require__.o = function(object, property) { return Object.prototype.hasOwnProperty.call(object, property); };
/******/
/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "";
/******/
/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(__webpack_require__.s = 0);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

var __assign = (this && this.__assign) || Object.assign || function(t) {
    for (var s, i = 1, n = arguments.length; i < n; i++) {
        s = arguments[i];
        for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
            t[p] = s[p];
    }
    return t;
};
Object.defineProperty(exports, "__esModule", { value: true });
var vdom_1 = __webpack_require__(1);
function makeReducer(reducers) {
    var reducerKeys = Object.keys(reducers);
    return function (state, action) {
        var hasChanged = false;
        var newState = {};
        for (var i = 0; i < reducerKeys.length; i++) {
            var key = reducerKeys[i];
            var reducer = reducers[key];
            var previousState = state[key];
            var nextState = reducer(previousState, action);
            newState[key] = nextState;
            hasChanged = hasChanged || nextState !== previousState;
        }
        return hasChanged ? newState : state;
    };
}
exports.makeReducer = makeReducer;
var Store = (function () {
    function Store(state, reducer) {
        this.state = state;
        this.reducer = reducer;
        this.subscribers = [];
    }
    Store.prototype.dispatch = function (action) {
        this.state = this.reducer(this.state, typeof action === 'function'
            ? action(this.dispatch.bind(this), this.getState.bind(this))
            : action);
        this.subscribers.forEach(function (update) { update(); });
        return this;
    };
    Store.prototype.subscribe = function (subscriber) {
        var _this = this;
        this.subscribers.push(subscriber);
        return function () {
            var idx = _this.subscribers.indexOf(subscriber);
            _this.subscribers.splice(idx, 1);
        };
    };
    Store.prototype.getState = function () {
        return Object.seal(this.state);
    };
    return Store;
}());
exports.Store = Store;
function el(ctor, props, _children) {
    if (props === void 0) { props = {}; }
    if (_children === void 0) { _children = []; }
    return function (ctx) {
        var eventHandlers = {};
        if (props.on) {
            eventHandlers = props.on;
            delete props.on;
        }
        var children = _children
            .map(function (child, idx) {
            return typeof child === 'string'
                ? new vdom_1.VDom(child, [], vdom_1.VDomType.Text)
                : child(ctx);
        });
        var handler = function (e) { return ctx.handle(e, eventHandlers); };
        var view = typeof ctor === 'string'
            ? new vdom_1.VDom({
                tag: ctor,
                attrs: props
            }, children, vdom_1.VDomType.Node, handler)
            : ctor(props)(ctx);
        return view;
    };
}
exports.el = el;
var AlmEvent = (function () {
    function AlmEvent(evt) {
        this.raw = evt;
        this.classes = evt.target.className.trim().split(/\s+/g) || [];
        this.id = evt.target.id || '';
        this.value = evt.target.value;
    }
    AlmEvent.prototype.hasClass = function (klass) {
        return (this.classes.indexOf(klass) !== -1);
    };
    AlmEvent.prototype.getClasses = function () {
        return this.classes;
    };
    AlmEvent.prototype.getId = function () {
        return this.id;
    };
    AlmEvent.prototype.getValue = function () {
        return this.value;
    };
    AlmEvent.prototype.class_in_ancestry = function (klass) {
        var result = null;
        var done = false;
        var elem = this.raw.target;
        while (!done) {
            if (!elem.className) {
                done = true;
                break;
            }
            var klasses = elem.className.trim().split(/\s+/g) || [];
            if (klasses.indexOf(klass) !== -1) {
                result = elem;
                done = true;
            }
            else if (elem.parentNode) {
                elem = elem.parentNode;
            }
            else {
                done = true;
            }
        }
        return result;
    };
    return AlmEvent;
}());
exports.AlmEvent = AlmEvent;
var Alm = (function () {
    function Alm(cfg) {
        this.gensymnumber = 0;
        this.store = new Store(cfg.model, cfg.update);
        this.eventRoot = typeof cfg.eventRoot === 'string'
            ? document.getElementById(cfg.eventRoot)
            : typeof cfg.eventRoot === 'undefined'
                ? document
                : cfg.eventRoot;
        this.domRoot = typeof cfg.domRoot === 'string'
            ? document.getElementById(cfg.domRoot)
            : cfg.domRoot;
        this.view = cfg.view;
        this.events = {};
    }
    Alm.prototype.start = function () {
        var _this = this;
        this.events = {};
        var store = this.store;
        var handle = function (e, handlers) {
            var eId;
            if (e.hasAttribute('data-alm-id')) {
                eId = e.getAttribute('data-alm-id');
            }
            else {
                eId = _this.gensym();
                e.setAttribute('data-alm-id', eId);
            }
            for (var evtName in handlers) {
                if (!(evtName in _this.events)) {
                    _this.events[evtName] = {};
                    _this.registerEvent(evtName, _this.handleEvent);
                }
                _this.events[evtName][eId] = handlers[evtName];
            }
            return function () {
                for (var evtName in handlers) {
                    delete _this.events[evtName][eId];
                }
            };
        };
        var context = { store: store, handle: handle };
        var vtree = this.view(context);
        vdom_1.initialDOM(this.domRoot, vtree);
        this.store.subscribe(function () {
            var updated = _this.view(context);
            vdom_1.diff_dom(_this.domRoot, vtree, updated);
            vtree = updated;
        });
    };
    Alm.prototype.handleEvent = function (evt) {
        var evtName = evt.type;
        if (this.events[evtName]) {
            if (evt.target.hasAttribute('data-alm-id')) {
                var almId = evt.target.getAttribute('data-alm-id');
                if (this.events[evtName][almId]) {
                    this.events[evtName][almId](new AlmEvent(evt));
                }
            }
        }
    };
    Alm.prototype.gensym = function () {
        return 'node-' + (this.gensymnumber++).toString();
    };
    Alm.prototype.registerEvent = function (evtName, cb) {
        this.eventRoot.addEventListener(evtName, cb.bind(this), true);
    };
    return Alm;
}());
exports.Alm = Alm;
function connect(mapState, mapDispatch) {
    if (mapState === void 0) { mapState = null; }
    if (mapDispatch === void 0) { mapDispatch = null; }
    return function (component) { return function (props) {
        if (props === void 0) { props = {}; }
        return function (ctx) {
            var store = ctx.store;
            var state = store.getState();
            var mappedState = mapState ? mapState(state) : {};
            var mappedDispatch = mapDispatch
                ? mapDispatch(store.dispatch.bind(store))
                : {};
            var finalProps = __assign({}, props, mappedState, mappedDispatch);
            return component(finalProps)(ctx);
        };
    }; };
}
exports.connect = connect;


/***/ }),
/* 1 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
var VDomType;
(function (VDomType) {
    VDomType[VDomType["Text"] = 0] = "Text";
    VDomType[VDomType["Node"] = 1] = "Node";
})(VDomType = exports.VDomType || (exports.VDomType = {}));
;
var VDom = (function () {
    function VDom(content, children, treeType, handler) {
        if (handler === void 0) { handler = null; }
        this.content = content;
        this.children = children;
        this.treeType = treeType;
        this.onCreate = handler;
        this.onDestroy = null;
        if (treeType === VDomType.Node) {
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
            this.key = 'text-node';
        }
    }
    VDom.prototype.eq = function (other) {
        if (!other) {
            return false;
        }
        return (this.key === other.key);
    };
    return VDom;
}());
exports.VDom = VDom;
function makeDOMNode(tree) {
    if (tree === null) {
        return null;
    }
    if (tree.treeType === VDomType.Text) {
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
    tree.onDestroy = tree.onCreate(el);
    return el;
}
function initialDOM(domRoot, tree) {
    var root = domRoot;
    var domTree = makeDOMNode(tree);
    while (root.firstChild) {
        root.removeChild(root.firstChild);
    }
    root.appendChild(domTree);
}
exports.initialDOM = initialDOM;
var Op;
(function (Op) {
    Op[Op["Merge"] = 0] = "Merge";
    Op[Op["Delete"] = 1] = "Delete";
    Op[Op["Insert"] = 2] = "Insert";
})(Op || (Op = {}));
;
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
        d[i_1 * n] = i_1;
    }
    for (var j_1 = 0; j_1 < n; j_1++) {
        d[j_1] = j_1;
    }
    for (var j_2 = 1; j_2 < n; j_2++) {
        for (var i_2 = 1; i_2 < m; i_2++) {
            if (eq(a[i_2 - 1], b[j_2 - 1])) {
                d[i_2 * n + j_2] = d[(i_2 - 1) * n + (j_2 - 1)];
            }
            else {
                d[i_2 * n + j_2] = Math.min(d[(i_2 - 1) * n + j_2], d[i_2 * n + (j_2 - 1)])
                    + 1;
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
            if (d[i * n + (j - 1)] <= d[(i - 1) * n + j]) {
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
exports.diff_array = diff_array;
function diff_dom(parent, a, b, index) {
    if (index === void 0) { index = 0; }
    if (typeof b === 'undefined' || b === null) {
        if (parent.childNodes[index].onDestroy) {
            parent.childNodes[index].onDestroy();
        }
        parent.removeChild(parent.childNodes[index]);
        return;
    }
    if (typeof a === 'undefined' || a === null) {
        parent.insertBefore(makeDOMNode(b), parent.childNodes[index]);
        return;
    }
    if (b.treeType === VDomType.Node) {
        if (a.treeType === VDomType.Node) {
            if (a.content.tag === b.content.tag) {
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
        if (parent.childNodes[index].onDestroy) {
            parent.childNodes[index].onDestroy();
        }
        parent.replaceChild(makeDOMNode(b), parent.childNodes[index]);
    }
}
exports.diff_dom = diff_dom;


/***/ })
/******/ ]);
});