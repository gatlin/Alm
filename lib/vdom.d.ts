export declare type Attrs = {
    [key: string]: string;
};
export declare type El = {
    tag: string;
    attrs: Attrs;
};
export declare enum VDomType {
    Text = 0,
    Node = 1,
}
export declare class VDom {
    content: El;
    children: Array<VDom>;
    treeType: VDomType;
    key: string;
    onCreate: (e: HTMLElement) => (() => void) | null;
    onDestroy: () => void | null;
    constructor(content: any, children: any, treeType: any, handler?: any);
    setChildren(children: Array<VDom>): this;
    eq(other: VDom): boolean;
}
export declare function initialDOM(domRoot: any, tree: any): void;
export declare enum Op {
    Merge = 0,
    Delete = 1,
    Insert = 2,
}
export declare type Eq<T> = (a: T, b: T) => boolean;
export declare function diff_array<T>(a: Array<T>, b: Array<T>, eq: Eq<any>): any[];
export declare function diff_dom(parent: any, a: any, b: any, index?: number): void;
