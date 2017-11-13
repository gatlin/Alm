import { el } from './alm';

export default function jsx(jsxObject) {
    return el(
        jsxObject.elementName,
        jsxObject.attributes,
        jsxObject.children
    );
};
