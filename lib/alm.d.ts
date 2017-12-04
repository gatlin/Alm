import { VDom } from './vdom';
export declare type Message<T> = {
    'type': T;
    data?: any;
};
export declare type Reducer<S, A> = (state: S, action: Message<A>) => S;
export declare function makeReducer(reducers: any): (state: any, action: any) => any;
export declare type AsyncMessage<S, A> = (d: (a: Message<A>) => void, s: () => S) => Message<A>;
export declare class Store<S, Action> {
    protected state: S;
    private reducer;
    protected subscribers: Array<() => void>;
    constructor(state: S, reducer: Reducer<S, Action>);
    dispatch(action: Message<Action> | AsyncMessage<S, Action>): this;
    subscribe(subscriber: any): () => void;
    getState(): S;
}
export declare type Context<S, A> = {
    store: Store<S, A>;
    handle: (e: HTMLElement, h: Object) => void;
};
export declare type View<S, A> = (c: Context<S, A>) => VDom;
export declare function el<S, A>(ctor: any, props?: any, ..._children: any[]): View<S, A>;
export declare type Component<Props> = (props: Props) => View<any, any>;
export declare class AlmEvent {
    private readonly raw;
    private readonly classes;
    private readonly id;
    private readonly value;
    constructor(evt: any);
    hasClass(klass: any): boolean;
    getClasses(): string[];
    getId(): string;
    getValue(): any;
    getRaw(): any;
    class_in_ancestry(klass: string): any;
}
export declare type AppConfig<State, Action> = {
    model: State;
    update: Reducer<State, Action>;
    view: View<State, Action>;
    eventRoot?: HTMLElement | Document | string;
    domRoot?: HTMLElement | string;
};
export declare class Alm<State, Action> {
    readonly store: Store<State, Action>;
    private view;
    private eventRoot;
    private domRoot;
    private events;
    private gensymnumber;
    constructor(cfg: AppConfig<State, Action>);
    start(): void;
    private handleEvent(evt);
    private gensym();
    private registerEvent(evtName, cb);
}
export declare function connect(mapState?: any, mapDispatch?: any): (component: any) => (props?: {}) => (ctx: any) => any;
