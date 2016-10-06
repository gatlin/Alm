import { Signal, Mailbox } from './base';

/*
This module started off as a clone of:
https://github.com/Matt-Esch/virtual-dom

However at this point, despite retaining some nomenclature, it's an entirely
different algorithm.

Rather than actually compute a set of patches and then apply them in two phases,
this algorithm computes patches and then applies them immediately.

See the `diff_*` functions for a super fun algorithmic discussion.
*/

// Helper exported at top level for creating vdom trees.
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

// exported only to `alm.ts`. This is our tree representation.
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
            this.key = this.content;
        }
    }

    subscribe(mailbox: Mailbox<any>): this {
        this.mailbox = mailbox;
        return this;
    }

    eq(other: VTree): boolean {
        if (!other) {
            return false;
        }
        return (this.key === other.key);
    }


}

// Construct an actual DOM node from a VTree.
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

function initialDOM(domRoot, tree) {
    const root = domRoot;
    const domTree = makeDOMNode(tree);
    while (root.firstChild) {
        root.removeChild(root.firstChild);
    }
    root.appendChild(domTree);
}

enum Op {
    Merge,
    Delete,
    Insert
};

type Eq<T> = (a: T, b: T) => boolean;

// diff of an array where order matters
// you supply two arrays and an element-wise equality function
function diff_array(a: any, b: any, eq: Eq<any>) {

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
        d[i * n] = 0;
    }

    for (let j = 0; j < n; j++) {
        d[j] = 0;
    }

    for (let i = 1; i < m; i++) {
        for (let j = 1; j < n; j++) {
            if (eq(a[i - 1], b[j - 1])) {
                d[i * n + j] = d[(i - 1) * n + (j - 1)] + 1;
            }
            else {

                d[i * n + j] = Math.max(
                    d[(i - 1) * n + j],
                    d[i * n + (j - 1)]);
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
            if (d[i * n + (j - 1)] > d[(i - 1) * n + j]) {
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

function diff_dom(parent, a, b, index = 0) {

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

                // contend with attributes
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

                // contend with the children
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

// exported only to `alm.ts`
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
