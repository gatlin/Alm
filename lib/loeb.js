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


var Comonad = module.Comonad = function() { return; };
Comonad.prototype.convolve = function(f) {
    return this.duplicate().map(f);
};


/////
// MODULE END
/////

return module;
}));
