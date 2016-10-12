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
import { Signal, Mailbox } from './base';

/** Helper function for creating VTrees exported to the top level. */
export function el(tag: string, attrs: any, children: Array<any>) {
    const children_trees = (typeof children === 'undefined')
        ? []
        : children.map((kid, idx) => {
            return typeof kid === 'string'
                ? new VTree(kid, [], VTreeType.Text)
                : kid;

        });

    return new VTree({
        tag: tag,
        attrs: attrs
    }, children_trees, VTreeType.Node);
}

enum VTreeType {
    Text,
    Node
};

/**
 * A rose tree representing DOM elements. Can represent either an element node
 * or a text node.
 *
 * Because VTree is lighter weight than actual DOM elements an efficient diff
 * procedure can be used to compare old and new trees and determine what needs
 * to be done to the actual DOM.
 *
 * The {@link VTree#key} property is used to determine equality. If a `key`
 * attribute is provided, it will be used. If there is not one, then `id` will
 * be used. Failing that the tag name will be used. If this is a text node, the
 * text itself will be used. I'm open to other possibilities, especially
 * regarding that last one.
 */
export class VTree {
    public content: any;
    public children: Array<VTree>;
    public treeType: VTreeType;
    public key: string;
    private mailbox: Mailbox<any>;

    constructor(content, children, treeType) {
        this.content = content;
        this.children = children;
        this.treeType = treeType;
        this.mailbox = null;

        /* There must be a key */
        if (treeType === VTreeType.Node) {
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

    /**
     * Whenever this VTree is re-rendered the DOM node will be sent to this
     * Mailbox. This is useful in case an important element is recreated and you
     * need an up to date reference to it.
     */
    subscribe(mailbox: Mailbox<any>): this {
        this.mailbox = mailbox;
        return this;
    }

    /** Equality based on the key. */
    eq(other: VTree): boolean {
        if (!other) {
            return false;
        }
        return (this.key === other.key);
    }


}

/** Constructs an actual DOM node from a {@link VTree}. */
function makeDOMNode(tree): any {
    if (tree === null) { return null; }
    if (tree.treeType === VTreeType.Text) {
        return document.createTextNode(tree.content);
    }
    const el = document.createElement(tree.content.tag);

    for (let key in tree.content.attrs) {
        el.setAttribute(key, tree.content.attrs[key]);
    }

    for (let i = 0; i < tree.children.length; i++) {
        const child = makeDOMNode(tree.children[i]);
        el.appendChild(child);
    }

    // if a mailbox was subscribed, notify it the element was re-rendered
    if (tree.mailbox !== null) {
        tree.mailbox.send(el);
    }

    return el;
}

/** Constructs an initial DOM from a {@link VTree}. */
function initialDOM(domRoot, tree) {
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
type Eq<T> = (a: T, b: T) => boolean;

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
 * {@link VTree}, the parent node of the one the old tree represents,
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
        parent.removeChild(parent.childNodes[index]);
        return;
    }

    if (typeof a === 'undefined' || a === null) {
        parent.insertBefore(
            makeDOMNode(b),
            parent.childNodes[index]);
        return;
    }

    if (b.treeType === VTreeType.Node) {
        if (a.treeType === VTreeType.Node) {
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
        parent.replaceChild(
            makeDOMNode(b),
            parent.childNodes[index]);
    }
}

/**
 * This reduces a Signal producing VTrees.
 *
 * @param view_signal - the Signal of VTrees coming from the App.
 * @param domRoot - The root element we will be rendering the VTree in.
 */
export function render(view_signal, domRoot) {
    view_signal.reduce(null, (update, tree) => {
        if (tree === null) {
            initialDOM(domRoot, update);
        } else {

            diff_dom(domRoot, tree, update);
        }
        return update;
    });
}
