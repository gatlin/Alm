export * from './base';
export { el } from './vdom';

import {
    HasFlatMap,
    FlatMap,
    derive,
    Signal,
    Mailbox
} from './base';

import { VTree, render } from './vdom';

/**
 * Wraps system events and provides some convenience methods.
 * @constructor
 * @param evt - The raw browser event value.
 */
export class AlmEvent {
    private readonly raw: any; // See [1] at the bottom of the code
    private readonly classes: Array<string>;
    private readonly id: string;
    private readonly value: any;

    constructor(evt) {
        this.raw = evt;
        this.classes = evt.target.className.trim().split(/\s+/g) || [];
        this.id = evt.target.id;
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
        return this.raw.target.value;
    }

    public getRaw() {
        return this.raw;
    }
}

/**
 * Constructs signals emitting whichever browser event names you pass in.
 * @param {Array<string>} evts - The event names you want signals for.
 * @return {Array<Signal>} The event signals.
 */
function makeEvents(evts) {
    const events = {};
    for (let i = 0; i < evts.length; i++) {
        let evtName = evts[i];
        events[evtName] = new Signal(evt => new AlmEvent(evt));
    }
    return events;
}

/**
 * Builds the port signals for an App.
 * @param {Object} portCfg - An object whose keys name arrays of desired port
 *                           names.
 *                           Eg, { outbound: ['port1','port2' ],
 *                                 inbound: ['port3'] }.
 *
 * @return {Object} ports - An object with the same keys but this time they
 *                          point to objects whose keys were in the original
 *                          arrays and whose values are signals.
 */
function makePorts(portCfg) {
    // If it is simply an array then make ports for each string
    if (Array.isArray(portCfg)) {
        const _ports = {};
        for (let i = 0; i < portCfg.length; i++) {
            const portName = portCfg[i];
            _ports[portName] = Signal.make();
        }
        return _ports;
    }

    let ports = (typeof portCfg === 'undefined' || portCfg === null)
        ? { outbound: [], inbound: [] }
        : portCfg;

    for (let key in ports) {
        const portNames = ports[key];
        const portSpace = {};
        for (let i = 0; i < portNames.length; i++) {
            const portName = portNames[i];
            portSpace[portName] = Signal.make();
        }
        ports[key] = portSpace;
    }
    return ports;
}

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

/** The type of the object used to configure an App.  */
export type AppConfig<T> = {
    state: T;
    update: (a: any, m: T) => T;
    main: (t: any) => void;
    gui?: boolean;
    eventRoot?: HTMLElement | Document | string;
    domRoot?: HTMLElement | string;
    render?: (t: T) => Signal<any, VTree>;
    ports?: any; // See [2] at the bottom
    extraEvents?: Array<string>;
};

/**
 * A self-contained application.
 * @constructor
 * @param {AppConfig} cfg - the configuration object.
 */
export class App<T> {
    private gui: boolean;
    private eventRoot: HTMLElement | Document;
    private domRoot: HTMLElement;
    private events: any
    private main: (t: any) => void;
    private ports: any;
    private state: T;
    private update: (a: any, m: T) => T;
    private render: (t: T) => Signal<any, VTree>;
    private scope;

    constructor(cfg: AppConfig<T>) {

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

        const events = standardEvents.concat(typeof cfg.extraEvents !== 'undefined'
            ? cfg.extraEvents
            : []);

        this.events = makeEvents(events);
        this.ports = makePorts(cfg.ports);

        // create the signal graph
        const actions = new Mailbox(null);
        const state = actions.reduce(cfg.state, (action, model) => {
            if (action === null) {
                return model;
            }
            return cfg.update(action, model);
        });

        this.scope = Object.seal({
            events: this.events,
            ports: this.ports,
            actions: actions,
            state: state
        });

        cfg.main(this.scope);

        this.render = this.gui ? cfg.render : null;
    }

    /**
     * Internal method which registers a given signal to emit upstream browser
     * events.
     */
    private registerEvent(evtName, sig) {
        const fn = (evt) => sig.send(evt);
        this.eventRoot.addEventListener(evtName, fn, true);
    }

    /**
     * Provides access to the application scope for any other configuration.
     *
     * @param f - A function which accepts a scope and returns nothing.
     * @return @this
     */
    public editScope(cb) {
        cb(this.scope);
        return this;
    }

    /**
     * Set the root element in the page to which we will attach listeners.
     * @param er - Either an HTML element, the whole document, or an element ID
     *             as a string.
     * @return @this
     */
    public setEventRoot(er: HTMLElement | Document | string): this {
        this.eventRoot = typeof er === 'string'
            ? document.getElementById(er)
            : er;
        return this;
    }

    /**
     * Set the root element in the page in which we will render.
     * @param er - Either an HTML element, the whole document, or an element ID
     *             as a string.
     * @return @this
     */
    public setDomRoot(dr: HTMLElement | string): this {
        this.domRoot = typeof dr === 'string'
            ? document.getElementById(dr)
            : dr;
        return this;
    }

    /**
     * This method actually registers the desired events and creates the ports.
     * @return An object containing the App's port signals and a state update
     * signal.
     */
    public start() {
        /* Find all the event listeners the user cared about and bind those */
        for (let evtName in this.events) {
            let sig = this.events[evtName];
            if (sig.numListeners() > 0) {
                this.registerEvent(evtName, sig);
            }
        }

        if (this.gui) {
            const view = this.scope.state.map(this.render);
            render(view, this.domRoot);
        }

        return {
            ports: this.scope.ports,
            state: this.scope.state
        };
    }
}

/*
[1]: The proper thing for it to wrap would be the type `Event`. However I also
want to be able to make assumptions about the target because I'll be getting
them exclusively from the browser. I do not know the proper TypeScript-fu yet
for expressing this properly.

[2]: I don't know the typescript way of saying "an object of string literal keys
which point to arrays of names. any number of such keys, or none at all."
*/
