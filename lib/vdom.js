"use strict";
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
exports.__esModule = true;
var VDomType;
(function (VDomType) {
    VDomType[VDomType["Text"] = 0] = "Text";
    VDomType[VDomType["Node"] = 1] = "Node";
})(VDomType = exports.VDomType || (exports.VDomType = {}));
;
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
var VDom = /** @class */ (function () {
    function VDom(content, children, treeType, handler) {
        if (handler === void 0) { handler = null; }
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
    VDom.prototype.setChildren = function (children) {
        this.children = children;
        return this;
    };
    /** Equality based on the key. */
    VDom.prototype.eq = function (other) {
        if (!other) {
            return false;
        }
        return (this.key === other.key);
    };
    return VDom;
}());
exports.VDom = VDom;
/** Constructs an actual DOM node from a {@link VDom}. */
function makeDOMNode(tree) {
    if (tree === null) {
        return null;
    }
    if (tree.treeType === VDomType.Text) {
        return document.createTextNode(tree.content);
    }
    var el = document.createElement(tree.content.tag);
    for (var key in tree.content.attrs) {
        if (tree.content.attrs[key] !== null) {
            el.setAttribute(key, tree.content.attrs[key]);
        }
    }
    for (var i = 0; i < tree.children.length; i++) {
        var child = makeDOMNode(tree.children[i]);
        el.appendChild(child);
    }
    tree.onDestroy = tree.onCreate(el);
    return el;
}
/** Constructs an initial DOM from a {@link VDom}. */
function initialDOM(domRoot, tree) {
    var root = domRoot;
    var domTree = makeDOMNode(tree);
    while (root.firstChild) {
        root.removeChild(root.firstChild);
    }
    root.appendChild(domTree);
}
exports.initialDOM = initialDOM;
/**
 * A simple enum representing three kinds of array edit operations.
 */
var Op;
(function (Op) {
    Op[Op["Merge"] = 0] = "Merge";
    Op[Op["Delete"] = 1] = "Delete";
    Op[Op["Insert"] = 2] = "Insert";
})(Op || (Op = {}));
;
/**
 * Computes an array of edit operations allowing the first argument to be
 * transformed into the second argument.
 *
 * @param a - The original array
 * @param b - The the desired array
 * @param eq - An equality testing function for elements in the arrays.
 * @return An array of {@link Op} values.
 */
function diff_array(a, b, eq) {
    if (!a.length) {
        return b.map(function (c) { return [Op.Insert, null, c]; });
    }
    if (!b.length) {
        return a.map(function (c) { return [Op.Delete, c, null]; });
    }
    var m = a.length + 1;
    var n = b.length + 1;
    var d = new Array(m * n);
    var moves = [];
    for (var i_1 = 0; i_1 < m; i_1++) {
        d[i_1 * n] = i_1;
    }
    for (var j_1 = 0; j_1 < n; j_1++) {
        d[j_1] = j_1;
    }
    for (var j_2 = 1; j_2 < n; j_2++) {
        for (var i_2 = 1; i_2 < m; i_2++) {
            if (eq(a[i_2 - 1], b[j_2 - 1])) {
                d[i_2 * n + j_2] = d[(i_2 - 1) * n + (j_2 - 1)];
            }
            else {
                d[i_2 * n + j_2] = Math.min(d[(i_2 - 1) * n + j_2], d[i_2 * n + (j_2 - 1)])
                    + 1;
            }
        }
    }
    var i = m - 1, j = n - 1;
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
exports.diff_array = diff_array;
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
function diff_dom(parent, a, b, index) {
    if (index === void 0) { index = 0; }
    if (typeof b === 'undefined' || b === null) {
        if (parent.childNodes[index].onDestroy) {
            parent.childNodes[index].onDestroy();
        }
        parent.removeChild(parent.childNodes[index]);
        return;
    }
    if (typeof a === 'undefined' || a === null) {
        parent.insertBefore(makeDOMNode(b), parent.childNodes[index]);
        return;
    }
    if (b.treeType === VDomType.Node) {
        if (a.treeType === VDomType.Node) {
            if (a.content.tag === b.content.tag) {
                // contend with attributes. only necessary changes.
                var dom = parent.childNodes[index];
                for (var attr in a.content.attrs) {
                    if (!(attr in b.content.attrs)) {
                        dom.removeAttribute(attr);
                        delete dom[attr];
                    }
                }
                for (var attr in b.content.attrs) {
                    var v = b.content.attrs[attr];
                    if (!(attr in a.content.attrs) ||
                        v !== a.content.attrs[attr]) {
                        dom[attr] = v;
                        dom.setAttribute(attr, v);
                    }
                }
                // contend with the children.
                var moves = diff_array(a.children, b.children, function (a, b) {
                    if (typeof a === 'undefined')
                        return false;
                    return a.eq(b);
                });
                var domIndex = 0;
                for (var i = 0; i < moves.length; i++) {
                    var move = moves[i];
                    diff_dom(parent.childNodes[index], move[1], move[2], domIndex);
                    if (move[0] !== Op.Delete) {
                        domIndex++;
                    }
                }
            }
        }
    }
    else {
        // different types of nodes, `b` is a text node, or they have different
        // tags. in all cases just replace the DOM element.
        if (parent.childNodes[index].onDestroy) {
            parent.childNodes[index].onDestroy();
        }
        parent.replaceChild(makeDOMNode(b), parent.childNodes[index]);
    }
}
exports.diff_dom = diff_dom;
