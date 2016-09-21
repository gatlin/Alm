/**
 * (c) 2016, Gatlin Johnson
 *
 * Some extra bullshit you might want with loeb that isn't necessary for Alm.
 *

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
