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

<<<<<<< HEAD

/*
Assumptions:
- `a` and `b` should be compared to one another
- both have keys
- `dom` and `a` have the same number of children.
 */
function diff(parent, a, b, index = 0) {

    if (!b) {
        parent.removeChild(parent.childNodes[index]);
        return;
    }

    if (!a) {
        parent.insertBefore(
            VTree.makeDOMNode(b),
            parent.childNodes[index]);

        return;
    }

    if (b.treeType === VTreeType.Node &&
        a.treeType === VTreeType.Node &&
        a.content.tag === b.content.tag &&
        a.key === b.key) {
        parent.replaceChild(
            VTree.makeDOMNode(b),
            parent.childNodes[index]);
    }

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
}

// exported only to `alm.ts`
export function render(view_signal, domRoot) {
    view_signal.reduce(null, (update, tree) => {
        // Set a default key for the root node
        if (update.key === null) {
            update.key = 'root';
        }
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
