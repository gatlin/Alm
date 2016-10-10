import { HasFlatMap, FlatMap, derive, Signal, async } from './base';

/**
Yet another implementation of promises.

Whereas Signals are intended to run multiple times and repeatedly send values to
any listeners, Task computations call each listener at most once for a given
promise.

Because they are derived from Signals you can use Task computations anywhere
you would use a Signal.

As of right now this doesn't make it to the minified bundle. It's useful but
should also probably be in its own repository. Meh?
*/
export class Task<T> extends Signal<T, T> implements HasFlatMap<T> {
    private value: T;
    constructor() {
        super(x => x);
        this.value = null;
    }

    static of(v) {
        const a = new Task();
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
        const a = new Task();
        this.recv(val => a.send(f(val)));
        return a;
    }

    flatten(): Task<T> {
        const a = new Task<T>();
        this.recv(function (a2: Task<T>): void {
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

derive(Task, [FlatMap]);
