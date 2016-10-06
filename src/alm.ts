export * from './base';
/* TODO don't export render */
export { el } from './vdom';

import {
    HasFlatMap,
    FlatMap,
    derive,
    Signal,
    Mailbox
} from './base';

import { VTree, render } from './vdom';

export type AppDefn<T> = {
    gui: boolean | void;
    eventRoot: HTMLElement | Document | string | void;
    domRoot: HTMLElement | string | void;
    state: T;
    update: (a: any, m: T) => T;
    render: (t: T) => Signal<any, VTree> | void;
    ports: {
        outbound: Array<string> | void;
        inbound: Array<string> | void;
    } | void;
    extraEvents: Array<string> | void;
    main: (t: any) => void;
};

/* Wraps system events and provides some convenience methods */
export class Event {
    private raw: any; // TODO: what is the type of a browser event again?
    private classes: Array<string>;
    private id: string;
    private value: any;

    constructor(evt) {
        this.raw = evt;
        this.classes = evt.target.className.split(' ');
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

function makeEvents(evts) {
    const events = {};
    for (let i = 0; i < evts.length; i++) {
        let evtName = evts[i];
        events[evtName] = new Signal(evt => new Event(evt));
    }
    return events;
}

function makePorts(portCfg) {
    const ports = {
        outbound: {},
        inbound: {}
    };

    for (let outPortIdx in portCfg.outbound) {
        const outPortName = portCfg.outbound[outPortIdx];
        ports.outbound[outPortName] = Signal.make();
    }

    for (let inPortIdx in portCfg.inbound) {
        const inPortName = portCfg.inbound[inPortIdx];
        ports.inbound[inPortName] = Signal.make();
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

export class App<T> {
    private gui: boolean;
    private eventRoot: HTMLElement | Document;
    private domRoot: HTMLElement;
    private events: any
    private main: (t: any) => void;
    private ports: any;
    private state;
    private update;
    private render;

    constructor(cfg: AppDefn<T>) {

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

    private registerEvent(evtName, sig) {
        const fn = (evt) => sig.send(evt);
        this.eventRoot.addEventListener(evtName, fn, true);
    }

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
