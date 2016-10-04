import { Signal, Mailbox } from './base';

/*** NOT EXPORTED AT TOP LEVEL ***/
enum VTreeType {
    Text,
    Node
};

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

        /* Set the key */
        if (treeType === VTreeType.Node) {
            if ('key' in this.content.attrs) {
                this.key = this.content.attrs.key;
            }
            else if ('id' in this.content.attrs) {
                this.key = this.content.attrs.id;
            }
            else {
                // it'll be assigned one during diff
                this.key = null;
            }
        } else {
            this.key = 'key-' + this.content;
        }
    }

    subscribe(mailbox: Mailbox<any>): this {
        this.mailbox = mailbox;
        return this;
    }

    keyEq(other: VTree): boolean {
        const me = this;
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

function makeIndex(kids) {
    const keys = {};
    const free = [];
    for (let i = 0; i < kids.length; i++) {
        let kid = kids[i];
        if (kid.key) {
            keys[kid.key] = i;
        } else {
            free.push(i);
        }
    }
    return {
        keys: keys,
        free: free
    };
}

function diff(a, b, dom) {
    if (typeof b === 'undefined' || b === null) {
        if (dom) {
            dom.parentNode.removeChild(dom);
        }
        return;
    }

    if (typeof a === 'undefined' || a === null) {
        // dom is the parent of the node that would exist if a weren't null
        dom.appendChild(VTree.makeDOMNode(b));
        return;
    }

    if (b.treeType === VTreeType.Node &&
        a.treeType === VTreeType.Node &&
        a.content.tag === b.content.tag &&
        a.key === b.key) {
        /* They are both elements and their keys are the same. This means we
           need to:

           1. remove any attributes not present in b
           2. add or modify any attributes present in b
           3. reconcile children and recurse
        */

        // 1. reconcile attributes
        for (let attr in a.content.attrs) {
            if (!(attr in b.content.attrs)) {
                dom.removeAttribute(attr);
                delete dom[attr];
            }
        }

        for (let attr in b.content.attrs) {
            dom[attr] = b.content.attrs[attr];
            dom.setAttribute(attr, b.content.attrs[attr]);
        }

        // 2. reconcile children
        const aIndex = makeIndex(a.children);
        const aKeys = aIndex.keys;
        const aFree = aIndex.free;

        const bIndex = makeIndex(b.children);
        const bKeys = bIndex.keys;
        const bFree = bIndex.free;



        console.log('a =', a.children);
        console.log('dom = ', dom.childNodes);

    } else {
        // wholesale replacement
        const p = dom.parentNode;
        p.insertBefore(VTree.makeDOMNode(b), dom);
        p.removeChild(dom);
    }
}

export function render(view_signal, domRoot) {
    view_signal.reduce(null, (update, tree) => {
        // Set a default key for the root node
        if (update.key === null) {
            update.key = 'root';
        }
        if (tree === null) {
            VTree.initialDOM(update, domRoot);
        } else {
            diff(tree, update, domRoot.firstChild);
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
