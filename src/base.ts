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

A signal is a unary function paired with an array of listeners. When a signal
receives a value it computes a result using its function and then sends that to
each of its listeners.
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
