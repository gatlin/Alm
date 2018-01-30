/**
 * @module vdom
 *
 * This module started off as a clone of:
 * {@link https://github.com/Matt-Esch/virtual-dom}
 *
 * However at this point, despite retaining some nomenclature, it's an entirely
 * different algorithm.
 *
 * Rather than actually compute a set of patches and then apply them in two
 * phases, this algorithm computes patches and then applies them immediately.
 */


export type Attrs = {
    [key: string]: string;
};

export type El = {
    tag: string;
    attrs: Attrs;
};

export enum VDomType {
    Text,
    Node
};

/**
 * A rose tree representing DOM elements. Can represent either an element node
 * or a text node.
 *
 * Because VDom is lighter weight than actual DOM elements an efficient diff
 * procedure can be used to compare old and new trees and determine what needs
 * to be done to the actual DOM.
 *
 * The {@link VDom#key} property is used to determine equality. If a `key`
 * attribute is provided, it will be used. If there is not one, then `id` will
 * be used. Failing that the tag name will be used. If this is a text node, the
 * text itself will be used. I'm open to other possibilities, especially
 * regarding that last one.
 */
export class VDom {
    public content: El;
    public children: Array<VDom>;
    public treeType: VDomType;
    public key: string;
    public onCreate: (e: HTMLElement) => (() => void) | null;
    public onDestroy: () => void | null;

    constructor(content, children, treeType, handler = null) {
        this.content = content;
        this.children = children;
        this.treeType = treeType;
        this.onCreate = handler;
        this.onDestroy = null;

        /* There must be a key */
        if (treeType === VDomType.Node) {
            if ('key' in this.content.attrs) {
                this.key = this.content.attrs.key;
                delete this.content.attrs.key;
            }
            else if ('id' in this.content.attrs) {
                this.key = this.content.attrs.id;
            }
            else {
                this.key = this.content.tag;
            }
        }
        else {
            this.key = 'text-node';
        }
    }

    public setChildren(children: Array<VDom>): this {
        this.children = children;
        return this;
    }

    /** Equality based on the key. */
    eq(other: VDom): boolean {
        if (!other) {
            return false;
        }
        return (this.key === other.key);
    }
}

/** Constructs an actual DOM node from a {@link VDom}. */
function makeDOMNode(tree): any {
    if (tree === null) { return null; }
    if (tree.treeType === VDomType.Text) {
        return document.createTextNode(tree.content);
    }
    const el = document.createElement(tree.content.tag);

    for (let key in tree.content.attrs) {
        if (tree.content.attrs[key] !== null) {
            el.setAttribute(key, tree.content.attrs[key]);
        }
    }

    for (let i = 0; i < tree.children.length; i++) {
        const child = makeDOMNode(tree.children[i]);
        el.appendChild(child);
    }

    tree.onDestroy = tree.onCreate(el);

    return el;
}

/** Constructs an initial DOM from a {@link VDom}. */
export function initialDOM(domRoot, tree) {
    const root = domRoot;
    const domTree = makeDOMNode(tree);
    while (root.firstChild) {
        root.removeChild(root.firstChild);
    }
    root.appendChild(domTree);
}

/**
 * A simple enum representing three kinds of array edit operations.
 */
enum Op {
    Merge,
    Delete,
    Insert
};

// Type alias for readability.
export type Eq<T> = (a: T, b: T) => boolean;

/**
 * Computes an array of edit operations allowing the first argument to be
 * transformed into the second argument.
 *
 * @param a - The original array
 * @param b - The the desired array
 * @param eq - An equality testing function for elements in the arrays.
 * @return An array of {@link Op} values.
 */
export function diff_array<T>(a: Array<T>, b: Array<T>, eq: Eq<any>) {

    if (!a.length) {
        return b.map(c => [Op.Insert, null, c]);
    }

    if (!b.length) {
        return a.map(c => [Op.Delete, c, null]);
    }

    const m = a.length + 1;
    const n = b.length + 1;

    const d = new Array(m * n);
    const moves = [];

    for (let i = 0; i < m; i++) {
        d[i * n] = i;
    }

    for (let j = 0; j < n; j++) {
        d[j] = j;
    }
    for (let j = 1; j < n; j++) {
        for (let i = 1; i < m; i++) {
            if (eq(a[i - 1], b[j - 1])) {
                d[i * n + j] = d[(i - 1) * n + (j - 1)];
            }
            else {
                d[i * n + j] = Math.min(
                    d[(i - 1) * n + j],
                    d[i * n + (j - 1)])
                    + 1;
            }
        }
    }

    let i = m - 1, j = n - 1;
    while (!(i === 0 && j === 0)) {
        if (eq(a[i - 1], b[j - 1])) {
            i--;
            j--;
            moves.unshift([Op.Merge, a[i], b[j]]);
        }
        else {
            if (d[i * n + (j - 1)] <= d[(i - 1) * n + j]) {
                j--;
                moves.unshift([Op.Insert, null, b[j]]);
            }
            else {
                i--;
                moves.unshift([Op.Delete, a[i], null]);
            }
        }
    }

    return moves;
}

/**
 * The name is a little misleading. This takes an old and a current
 * {@link VDom}, the parent node of the one the old tree represents,
 * and an (optional) index into that parent's childNodes array.
 *
 * If either of the trees is null or undefined this triggers DOM node creation
 * or destruction.
 *
 * If both are nodes then attributes are reconciled followed by children.
 *
 * Otherwise the new tree simply overwrites the old one.
 *
 * While this does not perform a perfect tree diff it doesn't need to and
 * performance is (probably) the better for it. In typical cases a DOM node will
 * add or remove a few children at once, and the grandchildren will not need to
 * be recovered from their parents. Meaning starting from the root node we can
 * treat this as a list diff problem for the children and then, once children
 * are paired up, we can recurse on them.
 */
export function diff_dom(parent, a, b, index = 0) {

    if (typeof b === 'undefined' || b === null) {
        if (parent.childNodes[index].onDestroy) {
            parent.childNodes[index].onDestroy();
        }
        parent.removeChild(parent.childNodes[index]);
        return;
    }

    if (typeof a === 'undefined' || a === null) {
        parent.insertBefore(
            makeDOMNode(b),
            parent.childNodes[index]);
        return;
    }

    if (b.treeType === VDomType.Node) {
        if (a.treeType === VDomType.Node) {
            if (a.content.tag === b.content.tag) {

                // contend with attributes. only necessary changes.
                let dom = parent.childNodes[index];

                for (let attr in a.content.attrs) {
                    if (!(attr in b.content.attrs)) {
                        dom.removeAttribute(attr);
                        delete dom[attr];
                    }
                }

                for (let attr in b.content.attrs) {
                    const v = b.content.attrs[attr];
                    if (!(attr in a.content.attrs) ||
                        v !== a.content.attrs[attr]) {
                        dom[attr] = v;
                        dom.setAttribute(attr, v);
                    }
                }

                if (dom.hasAttribute('value')) {
                    dom.value = dom.getAttribute('value');
                }

                // contend with the children.
                const moves = diff_array(
                    a.children,
                    b.children,
                    (a, b) => {
                        if (typeof a === 'undefined')
                            return false;
                        return a.eq(b);
                    }
                );

                let domIndex = 0;
                for (let i = 0; i < moves.length; i++) {
                    const move = moves[i];
                    diff_dom(
                        parent.childNodes[index],
                        move[1],
                        move[2],
                        domIndex
                    );
                    if (move[0] !== Op.Delete) {
                        domIndex++;
                    }
                }
            }
        }

    } else {
        // different types of nodes, `b` is a text node, or they have different
        // tags. in all cases just replace the DOM element.
        if (parent.childNodes[index].onDestroy) {
            parent.childNodes[index].onDestroy();
        }
        parent.replaceChild(
            makeDOMNode(b),
            parent.childNodes[index]);
    }
}
