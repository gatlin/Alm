import { diff_array } from '../src/vdom';
import { expect } from 'chai';
import 'mocha';

describe('vdom diff_array', () => {

    /////////
    // diff_array
    /////////

    it('should produce correct edit operations', () => {
        const result = diff_array(
            ['s', 'i', 't', 't', 'i', 'n', 'g'],
            ['k', 'i', 't', 't', 'e', 'n'],
            (a, b) => a === b)
            .toString();
        expect(result).to.equal(
            '1,s,,1,i,,2,,k,0,i,i,0,t,t,0,t,t,1,i,,2,,e,0,n,n,1,g,'
        );
    });

    // does short-circuiting work?
    it('should short-circuit correctly on first argument', () => {
        const result = diff_array(
            [],
            [11, 9, 20, 20, 5, 14],
            (a, b) => a === b)
            .toString();
        expect(result).to.equal(
            '2,,11,2,,9,2,,20,2,,20,2,,5,2,,14'
        );
    });

    it('should short-circuit correctly on second argument', () => {
        const result = diff_array(
            [19, 9, 20, 20, 9, 14, 7],
            [],
            (a, b) => a === b)
            .toString();
        expect(result).to.equal(
            '1,19,,1,9,,1,20,,1,20,,1,9,,1,14,,1,7,'
        );
    });
});
