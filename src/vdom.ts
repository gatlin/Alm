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

        if (treeType === VTreeType.Text) {
            this.key = this.content;
        } else {
            if (typeof this.content.attrs.id !== 'undefined') {
                this.key = this.content.attrs.id;
            } else {
                this.key = null;
            }
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

function diff(a, b, dom) {
    if (typeof b === 'undefined' || b === null) {
        if (dom) {
            dom.parentNode.removeChild(dom);
        }
        return;
    }
    if (typeof a === 'undefined' || a === null) {
        dom.appendChild(VTree.makeDOMNode(b));
        return;
    }
    if (b.treeType === VTreeType.Node) {
        if (a.treeType === VTreeType.Node) {
            if (a.content.tag === b.content.tag) {
                for (let attr in b.content.attrs) {
                    dom[attr] = b.content.attrs[attr];
                    dom.setAttribute(attr, b.content.attrs[attr]);
                }
                for (let attr in a.content.attrs) {
                    if (!(attr in b.content.attrs)) {
                        dom.removeAttribute(attr);
                    }
                }

                const aLen = a.children.length;
                const bLen = b.children.length;
                const len = aLen > bLen ? aLen : bLen;
                const kids = new Array();
                for (let i = 0; i < len; i++) {
                    kids.push(dom.childNodes[i]);
                }

                for (let i = 0; i < len; i++) {
                    const kidA = a.children[i];
                    const kidB = b.children[i];
                    if (kidA) {
                        diff(kidA, kidB, kids[i]);
                    } else {
                        diff(null, kidB, dom);
                    }
                }
                // TODO: take enough vyvanse to understand this again and remove
                // the duplicate code.
            } else {
                // tags are not the same
                const p = dom.parentNode;
                p.insertBefore(VTree.makeDOMNode(b), dom);
                p.removeChild(dom);
            }
        } else {
            // b is a node, a is text
            const p = dom.parentNode;
            p.insertBefore(VTree.makeDOMNode(b), dom);
            p.removeChild(dom);
        }
    } else {
        // both are text
        const p = dom.parentNode;
        p.insertBefore(VTree.makeDOMNode(b), dom);
        p.removeChild(dom);
    }
}

/*** EXPORTED AT TOP LEVEL ***/

export function render(view_signal, domRoot) {
    view_signal.reduce(null, (update, tree) => {
        if (tree === null) {
            VTree.initialDOM(update, domRoot);
        } else {
            diff(tree, update, domRoot.firstChild);
        }
        return update;
    })
        .done();
}

export function el(tag: string, attrs: any, children: Array<any>) {
    const children_trees = (typeof children === 'undefined')
        ? []
        : children.map(kid => {
            return (typeof kid === 'string')
                ? new VTree(kid, [], VTreeType.Text)
                : kid;
        });

    return new VTree({
        tag: tag,
        attrs: attrs
    }, children_trees, VTreeType.Node);
}
