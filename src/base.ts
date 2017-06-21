/** Higher order types which permit mapping a function over the base type. */
export interface HasMap<T> {
    map<U>(f: (t: T) => U): HasMap<U>;
}

/** Utility function to perform some function asynchronously. */
export function async(f): void {
    setTimeout(f, 0);
}

/**
 * Signals route data through an application.

 * A signal is a unary function paired with an array of listeners. When a signal
 * receives a value it computes a result using its function and then sends that
 * to each of its listeners.
 *
 * @constructor
 * @param fn - A unary function.
 */
export class Signal<A, B> implements HasMap<B> {
    protected fn: (x: A) => B;
    protected listeners: Array<Signal<B, any>>;

    constructor(fn) {
        this.fn = fn;
        this.listeners = [];
    }

    /** Attaches the argument as a listener and then returns the argument. */
    public connect<C>(sig: Signal<B, C>): Signal<B, C> {
        this.listeners.push(sig);
        return sig;
    }

    /** Convenience constructor. */
    static make(): Signal<any, any> {
        return new Signal(x => x);
    }

    /**
     * Gives the argument to the signal's internal function and then sends the
     * result to all its listeners.
     *
     * @param x - The value to send.
     * @return Nothing
     */
    public send(x: A): void {
        const v = this.fn(x);
        if (typeof v !== 'undefined') {
            for (let i = 0; i < this.listeners.length; i++) {
                const r = this.listeners[i];
                r.send(v);
            }
        }
    }

    public recv(f) {
        this.connect(new Signal(v => f(v)));
    }

    /**
     * Creates a new signal with the specified function, attaches it to this
     * signal, and returns the newly created signal.
     *
     * @param f - A unary function with which to create a new signal.
     * @return a new signal attached to this one.
     */
    public map(f) {
        const sig = new Signal(f);
        return this.connect(sig);
    }

    /**
     * Creates a new signal which will only propagate a value if a condition
     * is met. The new signal will be attached as a listener to this one.
     *
     * @param cond - A unary function returning a boolean.
     * @return a new Signal attached as a listener to this Signal.
     */
    public filter(cond) {
        const r = new Signal(v => {
            if (cond(v)) {
                return v;
            }
        });
        return this.connect(r);
    }

    /**
     * Creates a new signal which reduces incoming values using a supplied
     * function and an initial value. The new signal will be attached as a
     * listener to this one.
     *
     * @param initial - An initial value for the reduction.
     * @param reducer - A function accepting new signal values and the old
     *                  reduced value.
     * @return a new Signal attached as a listener to this Signal.
     */
    public reduce(initial: B, reducer: (a: A, b: B) => B) {
        let state = initial;
        let r = new Signal(v => {
            state = reducer(v, state);
            return state;
        });
        return this.connect(r);
    }

    public numListeners() {
        return this.listeners.length;
    }
}

/**
 * A signal to which you may send and receive values. Messages are sent
 * asynchronously. If you supply an initial value it will be sent immediately.
 *
 * This makes Mailboxes useful for kicking off any initial actions that must
 * be taken. Internally a Mailbox is used for initial state reduction by App.
 */
export class Mailbox<T> extends Signal<T, T> {
    constructor(t: T | void) {
        super(x => x);
        if (typeof t !== 'undefined') {
            this.send(t);
        }
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
