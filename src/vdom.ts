import { Signal, Mailbox } from './base';

/*
This module started off as a clone of:
https://github.com/Matt-Esch/virtual-dom

However at this point, despite retaining some nomenclature, it's an entirely
different algorithm.

Rather than actually compute a set of patches and then apply them in two phases,
this algorithm computes patches and then applies them immediately.

See the `diff` function for a super fun algorithmic discussion.
*/

enum VTreeType {
    Text,
    Node
};

// exported only to `alm.ts`
export class VTree {
    public content: any;
    public children: Array<VTree>;
    public treeType: VTreeType;
    public key: any;
    private domRoot;
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
        const me = this;
        if (!other) {
            return false;
        }
        if (me.key === null || other.key === null) {
            return false;
        }
        return (me.key === other.key);
    }

    static makeDOMNode(tree): any {
        if (tree === null) { return null; }
        if (tree.treeType === VTreeType.Text) {
            return document.createTextNode(tree.content);
        }
        const el = document.createElement(tree.content.tag);

        for (let key in tree.content.attrs) {
            el.setAttribute(key, tree.content.attrs[key]);
        }

        for (let i = 0; i < tree.children.length; i++) {
            const child = VTree.makeDOMNode(tree.children[i]);
            el.appendChild(child);
        }

        if (tree.mailbox !== null) {
            tree.mailbox.send(el);
        }

        return el;
    }

    static initialDOM(tree, domRoot) {
        const root = domRoot;
        const domTree = VTree.makeDOMNode(tree);
        while (root.firstChild) {
            root.removeChild(root.firstChild);
        }
        root.appendChild(domTree);
    }
}

enum Op {
    Merge,
    Delete,
    Insert
};

/* Similar to Wagner-Fischer.

   `a` is the array of old children of the current DOM node
   `b` is the array of new children.

   Let m = a.length+1, n = b.length+1. `d` is an mxn matrix.
   An O(m*n) pass through the matrix computes a longest common
   subsequence, the length of which is in the bottom-right corner.

   The array of patches returned will be iterated over, along with
   the arrays of children and the array of DOM child nodes
 */
function list_diff(a, b) {
    if (!(a.length && b.length)) {
        return [[], []];
    }
    const m = a.length + 1;
    const n = b.length + 1;

    const d = new Array(m * n);

    const a_new = [];
    const b_new = [];

    /* First row and column filled with zeros */
    for (let i = 0; i < m; i++) {
        d[i * n] = 0;
    }

    for (let j = 0; j < n; j++) {
        d[j] = 0;
    }

    /* Compute set of moves using matrix. */
    for (let i = 1; i < m; i++) {
        for (let j = 1; j < n; j++) {
            if (a[i - 1] && a[i - 1].eq(b[j - 1])) {
                d[i * n + j] = d[(i - 1) * n + (j - 1)] + 1;
            } else {
                d[i * n + j] = Math.max(
                    d[(i - 1) * n + j],
                    d[i * n + (j - 1)]
                );
            }
        }
    }

    let i = m - 1, j = n - 1;
    while (i !== 0 || j !== 0) {
        if (a[i - 1] && a[i - 1].eq(b[j - 1])) {
            i--;
            j--;
            a_new.unshift(a[i]);
            b_new.unshift(b[j]);
        }
        else {
            if (d[(i - 1) * n + j] >= d[i * n + (j - 1)]) {
                i--;
                a_new.unshift(a[i]);
                b_new.unshift(null);
            }
            else {
                j--;
                a_new.unshift(null);
                b_new.unshift(b[j]);
            }
        }
    }

    return [a_new, b_new];
}

/*
Assumptions:
- `a` and `b` should be compared to one another
- both have keys
- `dom` and `a` have the same number of children.
 */
function diff(parent, a, b, index = 0) {

    if (!b) {
        if (parent.childNodes[index]) {
            parent.removeChild(parent.childNodes[index]);
        }
        return;
    }

    if (!a) {
        parent.insertBefore(
            VTree.makeDOMNode(b),
            parent.childNodes[index]);

        return;
    }

    let dom = parent.childNodes[index];
    for (let attr in a.content.attrs) {
        if (!(attr in b.content.attrs)) {
            dom.removeAttribute(attr);
            delete dom[attr];
        }
    }

    for (let attr in b.content.attrs) {
        if (attr in a.content.attrs &&
            attr !== a.content.attrs.attr) {
            dom[attr] = b.content.attrs[attr];
            dom.setAttribute(attr, b.content.attrs[attr]);
        }
    }

    const reordered = list_diff(a.children, b.children);
    const a_kids = reordered[0];
    const b_kids = reordered[1];
    let domIndex = 0;
    for (let i = 0; i < dom.childNodes.length; i++) {
        let aKid = a_kids[i];
        let bKid = b_kids[i];

        diff(parent.childNodes[index],
            aKid,
            bKid,
            domIndex);
        if (!aKid || (aKid && bKid)) {
            domIndex++;
        }
    }
    /*
        const aLen = a.children.length;
        const bLen = b.children.length;
        const len = aLen > bLen ? aLen : bLen;
        for (let i = 0; i < len; i++) {
            const aKid = a.children[i];
            const bKid = b.children[i];

            diff(dom, aKid, bKid, i);
        }
    */
    /*
            const aLen = a.children.length;
            const bLen = b.children.length;
            const len = aLen > bLen ? aLen : bLen;
            for (let i = 0; i < len; i++) {
                diff(
                    parent.childNodes[index],
                    a.children[i],
                    b.children[i],
                    i
                );
            }
            return;
    */
}

// exported only to `alm.ts`
export function render(view_signal, domRoot) {
    view_signal.reduce(null, (update, tree) => {
        if (tree === null) {
            VTree.initialDOM(update, domRoot);
        } else {
            diff(domRoot, tree, update);
        }
        return update;
    });
}

/*** EXPORTED AT TOP LEVEL ***/
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
