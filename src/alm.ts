/**
 * @module alm
 *
 * The main entry point for the alm library.
 */

import { VDom, VDomType, initialDOM, diff_dom } from './vdom';

/**
 * Messages consumed by a {@link Reducer}. Messages are tagged with a type of
 * your choosing (likely an Enum of some kind).
 */
export type Message<T> = {
    'type': T;
    data?: any;
};

/**
 * A left fold on your application state which consumes {@link Message} values
 * and a state object and returns a modified state object.
 */
export type Reducer<S, Action> = (state: S, action: Message<Action>) => S;

/**
 * A function to combine multiple {@link Reducer}s, each governing one piece of
 * the total state.
 *
 * @param reducers - An object whose keys correspond to the top-level state
 * keys. Each corresponding value is a {@link Reducer} for that part of the
 * state.
 */
export function combineReducers(reducers) {
    const reducerKeys = Object.keys(reducers);
    return (action, state = {}) => {
        let hasChanged = false;
        const newState = {};
        for (let i = 0; i < reducerKeys.length; i++) {
            const key = reducerKeys[i];
            const reducer = reducers[key];
            const previousState = state[key];
            const nextState = reducer(action, previousState);
            newState[key] = nextState;
            hasChanged = hasChanged || nextState !== previousState;
        }
        return hasChanged ? newState : state;
    };
}

/**
 * Manages application state using an initial state value and a {@link Reducer}.
 */
export class Store<S, Action> {

    private subscribers: Array<() => void>;

    constructor(private state: S, private reducer: Reducer<S, Action>) {
        this.subscribers = [];
    }

    /**
     * Dispatch a {@link Message} to the {@link Reducer}.
     *
     * @param action - The message describing which action to perform on the
     * state.
     * @return The store.
     */
    public dispatch(action: Message<Action>): this {
        this.state = this.reducer(this.state, action);
        this.subscribers.forEach(update => { update(); });
        return this;
    }

    /**
     * The Store keeps an array of functions to call whenever the state changes.
     *
     * @param subscriber - A function to call on each state change.
     * @return A function which may be used to unsubscribe the function.
     */
    public subscribe(subscriber) {
        this.subscribers.push(subscriber);
        // hand back a way to unsubscribe
        return () => {
            const idx = this.subscribers.indexOf(subscriber);
            this.subscribers.splice(idx, 1);
        };
    }

    /**
     * A getter for the state.
     *
     * @return The sealed state.
     */
    public getState() {
        return Object.seal(this.state);
    }
}

/**
 * An object made available to every {@link Component}.
 *
 * A Context contains a pointer to the application {@link Store} as well as a
 * function which can be used to register event handlers.
 */
export type Context<S, A> = {
    store: Store<S, A>;
    handle: (e: HTMLElement, h: Object) => void;
};

/**
 * The foundation of a user interface. A View converts a {@link Context} into a
 * {@link VDom}.
 */
export type View<S, A> = (c: Context<S, A>) => VDom;

/**
 * Convenience function for constructing a {@link View}.
 *
 * @param ctor - A string or a {@link Component}. A string value should be an
 * HTML tag.
 * @param props - Properties to set on the HTML element or the component.
 * @param _children - An array of child {@link View}s.
 * @return A new {@link View}.
 */
export function el<S, A>(ctor, props: any = {}, _children = []): View<S, A> {
    return ctx => {
        let eventHandlers = {};
        if (props.on) {
            eventHandlers = props.on;
            delete props.on;
        }

        const children = _children
            .map((child, idx) => {
                return typeof child === 'string'
                    ? new VDom(child, [], VDomType.Text)
                    : child(ctx);
            });

        const handler = e => ctx.handle(e, eventHandlers);

        const view = typeof ctor === 'string'
            ? new VDom({
                tag: ctor,
                attrs: props
            }, children, VDomType.Node, handler)
            : ctor(props)(ctx);

        return view;
    };
}

/**
 * A Component is a pure function from an argument to a {@link View}.
 */
export type Component<Props> = (props: Props) => View<any, any>;

/**
 * Wraps around browser events.
 */
export class AlmEvent {
    private readonly raw: any;
    private readonly classes: Array<string>;
    private readonly id: string;
    private readonly value: any;

    constructor(evt) {
        this.raw = evt;
        this.classes = evt.target.className.trim().split(/\s+/g) || [];
        this.id = evt.target.id || '';
    }

    public hasClass(klass) {
        return (this.classes.indexOf(klass) !== -1);
    }

    public getClasses() {
        return this.classes;
    }

    public getId() {
        return this.id;
    }

    public getValue() {
        return this.value;
    }

    public class_in_ancestry(klass: string) {
        let result = null;
        let done = false;
        let elem = this.raw.target;

        while (!done) {
            if (!elem.className) {
                done = true;
                break;
            }

            let klasses = elem.className.trim().split(/\s+/g) || [];
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
    }
}

/**
 * The configuration object required to create an {@link Alm} app.
 */
export type AppConfig<State, Action> = {
    initialState: State;
    reducer: Reducer<State, Action>;
    view: View<State, Action>,
    eventRoot?: HTMLElement | Document | string;
    domRoot?: HTMLElement | string;
};

const standardEvents = [
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

/**
 * The application lifecycle manager. It listens for top-level events and binds
 * to part of the DOM to display the user interface.
 */
export class Alm<State, Action> {
    public readonly store: Store<State, Action>;
    private view: View<State, Action>;
    private eventRoot: HTMLElement | Document;
    private domRoot: HTMLElement;
    private events: object;
    private gensymnumber: number = 0;

    constructor(cfg: AppConfig<State, Action>) {
        this.store = new Store(cfg.initialState, cfg.reducer);

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

    public start() {
        this.events = {};
        let store = this.store;
        let handle = (e, handlers) => {
            let eId;
            if (e.hasAttribute('data-alm-id')) {
                eId = e.getAttribute('data-alm-id');
            } else {
                eId = this.gensym();
                e.setAttribute('data-alm-id', eId);
            }
            for (let evtName in handlers) {
                if (!(evtName in this.events)) {
                    this.events[evtName] = {};
                    this.registerEvent(evtName, this.handleEvent);
                }
                this.events[evtName][eId] = handlers[evtName];
            }

            return () => {
                for (let evtName in handlers) {
                    delete this.events[evtName][eId];
                }
            };
        };
        let context = { store, handle };
        let vtree = this.view(context);
        initialDOM(this.domRoot, vtree);

        this.store.subscribe(() => {
            const updated = this.view(context);
            diff_dom(this.domRoot, vtree, updated);
            vtree = updated;
        });
    }

    private handleEvent(evt) {
        const evtName = evt.type;
        if (this.events[evtName]) {
            if (evt.target.hasAttribute('data-alm-id')) {
                const almId = evt.target.getAttribute('data-alm-id');
                if (this.events[evtName][almId]) {
                    this.events[evtName][almId](new AlmEvent(evt));
                }
            }
        }
    }

    private gensym() {
        return 'node-' + (this.gensymnumber++).toString();
    }

    /**
     * Register an event listener for the specified event.
     */
    private registerEvent(evtName, cb) {
        this.eventRoot.addEventListener(evtName, cb.bind(this), true);
    }
}

/**
 * Connect the store to a pure component.
 */
export function connect(mapState = null, mapDispatch = null) {
    return component => (props = {}) => ctx => {
        const store = ctx.store;
        const state = store.getState();
        const mappedState = mapState ? mapState(state) : {};
        const mappedDispatch = mapDispatch
            ? mapDispatch(store.dispatch.bind(store))
            : {};
        const finalProps = { ...props, ...mappedState, ...mappedDispatch };
        return component(finalProps)(ctx);
    };
}
