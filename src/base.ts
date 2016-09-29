/* Permits something akin to traits and automatically derived functions. */
export function derive(derivedCtor: any, baseCtors: any[]) {
    baseCtors.forEach(baseCtor => {
        Object.getOwnPropertyNames(baseCtor.prototype).forEach(name => {
            derivedCtor.prototype[name] = baseCtor.prototype[name];
        });
    });
}

/* Higher order types which permit mapping a function over the base type. */
export interface HasMap<T> {
    map<U>(f: (t: T) => U): HasMap<U>;
}

/* Higher order types which permit a flatMap method. */
export interface HasFlatMap<T> extends HasMap<T> {
    flatten<K extends HasFlatMap<T>>(): K;
    flatMap<U>(f: (t: T) => HasFlatMap<U>): HasFlatMap<U>;
}

/* Using `derive` you can get an implementation of flatMap for free by
implementing this class as an interface with a null return value for
flatMap. */
export abstract class FlatMap<T> implements HasFlatMap<T> {
    abstract map(f);
    abstract flatten<T extends HasFlatMap<any>>(): T;

    static pipe(ms) {
        let v = ms[0];
        for (let i = 1; i < ms.length; i++) {
            v = v.flatMap(ms[i]);
        }
        return v;
    }

    flatMap(f) {
        return this.map(f).flatten();
    }

    pipe(ms) {
        let me: this = this;
        for (let i = 0; i < ms.length; i++) {
            me = me.flatMap(ms[i]);
        }
        return me;
    }
}

/* Utility function to perform some function asynchronously. */
export function async(f): void {
    setTimeout(f, 0);
}

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

export class Signal<A, B> implements HasMap<B> {
    protected fn: (x: A) => B;
    protected listeners: Array<Signal<B, any>>;

    constructor(fn) {
        this.fn = fn;
        this.listeners = [];
    }

    public connect<C>(sig: Signal<B, C>): Signal<B, C> {
        this.listeners.push(sig);
        return sig;
    }

    public send(x: A): void {
        const v = this.fn(x);
        if (typeof v !== 'undefined') {
            for (let i = 0; i < this.listeners.length; i++) {
                const r = this.listeners[i];
                r.send(v);
            }
        }
    }

    static make(): Signal<any, any> {
        return new Signal(x => x);
    }

    public recv(f) {
        this.connect(new Signal(v => f(v)));
    }

    public filter(cond) {
        const r = new Signal(v => {
            if (cond(v)) {
                return v;
            }
        });
        return this.connect(r);
    }

    public reduce(initial, reducer) {
        let state = initial;
        let r = new Signal(function (v) {
            state = reducer(v, state);
            return state;
        });
        return this.connect(r);
    }

    public map(f) {
        return this.connect(new Signal(v => f(v)));
    }

    public done() {
        return this;
    }

    public numListeners() {
        return this.listeners.length;
    }
}

/**
Yet another implementation of promises.

Whereas Signals are intended to run multiple times and repeatedly send values to
any listeners, Async computations call each listener at most once for a given
promise.

Because they are derived from Signals you can use Async computations anywhere
you would use a Signal.
*/
export class Async<T> extends Signal<T, T> implements HasFlatMap<T> {
    private value: T;
    constructor() {
        super(x => x);
        this.value = null;
    }

    static of(v) {
        const a = new Async();
        a.send(v);
        return a;
    }

    static pipe(ms) {
        return FlatMap.pipe(ms);
    }

    recv(cb) {
        if (this.value !== null) {
            async(() => cb(this.value));
        } else {
            super.recv(cb);
        }
        return this;
    }

    public send(v: T): void {
        if (this.value !== null) {
            return;
        }

        this.value = v;
        super.send(v);
        this.listeners = [];
    }

    map(f) {
        const a = new Async();
        this.recv(val => a.send(f(val)));
        return a;
    }

    flatten(): Async<T> {
        const a = new Async<T>();
        this.recv(function (a2: Async<T>): void {
            a2.recv(function (val: T): void {
                a.send(val);
            });
        });
        return a;
    }

    /* Will be derived from Monad */
    flatMap(f) { return null; }
    pipe(_) { return null; }
}

derive(Async, [FlatMap]);

/**
A signal to which you may send and receive values. Messages are sent
asynchronously.
*/
export class Mailbox<T> extends Signal<T, T> {
    constructor(t: T) {
        super(x => x);
        this.send(t);
    }

    public send(t: T): void {
        async(() => {
            super.send(t);
        });
    }

    public recv(k) {
        super.recv(k);
    }
}
