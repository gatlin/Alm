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
    const ports = (typeof portCfg === 'undefined' || portCfg === null)
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
    ports?: {
        outbound?: Array<string>;
        inbound?: Array<string>;
    };
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
        this.ports = typeof cfg.ports !== 'undefined'
            ? makePorts(cfg.ports)
            : { outbound: null, inbound: null };

        this.main = cfg.main;
        this.state = cfg.state;
        this.update = cfg.update;
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
     * This method actually creates the signal graph and sets up the event ->
     * update -> render pipeline.
     * @return An object containing the App's port signals and a state update
     * signal.
     */
    public start() {
        // Setup the react -> update -> render graph
        const actions = new Mailbox(null);
        const updates = actions.reduce(this.state, (action, model) => {
            if (action === null) {
                return model;
            }
            return this.update(action, model);
        });

        // Let the user wire up any relevant signals
        this.main({
            events: this.events,
            ports: this.ports,
            actions: actions,
            state: updates
        });

        /* Find all the event listeners the user cared about and bind those */
        for (let evtName in this.events) {
            let sig = this.events[evtName];
            if (sig.numListeners() > 0) {
                this.registerEvent(evtName, sig);
            }
        }

        if (this.gui) {
            const view = updates.map(this.render);
            render(view, this.domRoot);
        }

        return {
            ports: this.ports,
            state: updates
        };
    }
}

/*
[1]: The proper thing for it to wrap would be the type `Event`. However I also
want to be able to make assumptions about the target because I'll be getting
them exclusively from the browser. I do not know the proper TypeScript-fu yet
for expressing this properly.
*/
