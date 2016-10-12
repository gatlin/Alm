#!/usr/bin/env ts-node

/***
    To use Tap from typescript I am pulling some silly tricks.
*/

declare function require(str: string): any;
const test = require('tap').test;

import { diff_array } from '../src/vdom';

test('vdom', function (t) {

    /////////
    // diff_array
    /////////

    // are the correct moves produced?
    t.equal(
        diff_array(
            [19, 9, 20, 20, 9, 14, 7],
            [11, 9, 20, 20, 5, 14],
            (a, b) => a === b)
            .toString(),
        '1,19,,2,,11,0,9,9,0,20,20,0,20,20,1,9,,2,,5,0,14,14,1,7,'
    );

    // does short-circuiting work?
    t.equal(
        diff_array(
            [],
            [11, 9, 20, 20, 5, 14],
            (a, b) => a === b)
            .toString(),
        '2,,11,2,,9,2,,20,2,,20,2,,5,2,,14'
    );

    t.equal(
        diff_array(
            [19, 9, 20, 20, 9, 14, 7],
            [],
            (a, b) => a === b)
            .toString(),
        '1,19,,1,9,,1,20,,1,20,,1,9,,1,14,,1,7,'
    );

    t.end();
});
