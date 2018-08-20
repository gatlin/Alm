import { diff_array } from '../src/vdom';
import { expect } from 'chai';
import 'mocha';

function applyDiff(moves, oldArray) {
    let newArray = [...oldArray];
    let aryIdx = 0;
    for (let idx in moves) {
        const move = moves[idx];
        switch (move[0]) {
            case 0: // Merge
                aryIdx++;
                break;
            case 1: // Delete
                newArray.splice(aryIdx, 1);
                break;
            case 2: // Insert
                newArray.splice(aryIdx++, 0, move[2]);
                break;
        }
    }
    return newArray;
}

describe('vdom diff_array', () => {

    /////////
    // diff_array
    /////////

    it('should convert \'caught\' to \'catch\'', () => {

        //        const a = ['s', 'i', 't', 't', 'i', 'n', 'g'];
        //        const b = ['k', 'i', 't', 't', 'e', 'n'];
        const a = ['c', 'a', 'u', 'g', 'h', 't'];
        const b = ['c', 'a', 't', 'c', 'h'];
        const moves = diff_array(
            a,
            b,
            (a, b) => a === b);
        const result = applyDiff(moves, a);
        expect(result.toString()).to.equal(b.toString());
    });

    it('should convert \'sitting\' to \'kitten\'', () => {
        const a = ['s', 'i', 't', 't', 'i', 'n', 'g'];
        const b = ['k', 'i', 't', 't', 'e', 'n'];
        const moves = diff_array(
            a,
            b,
            (a, b) => a === b);
        const result = applyDiff(moves, a);
        expect(result.toString()).to.equal(b.toString());
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

    it('should remove the first item of the array and skip 2', () => {
        const a = ['a', 'b', 'c'];
        const b = ['b', 'c'];
        const moves = diff_array(
            a,
            b,
            (a, b) => a === b);
        const result = applyDiff(moves, a);
        expect(result.toString()).to.equal(b.toString());
    });

    it('should insert an item at the front and skip 2', () => {
        const a = ['b', 'c'];
        const b = ['a', 'b', 'c'];
        const moves = diff_array(
            a,
            b,
            (a, b) => a === b);
        const result = applyDiff(moves, a);
        expect(result.toString()).to.equal(b.toString());
    });

    it('should remove the last item', () => {
        const a = ['a', 'b', 'c'];
        const b = ['a', 'b'];
        const moves = diff_array(
            a,
            b,
            (a, b) => a === b);
        const result = applyDiff(moves, a);
        expect(result.toString()).to.equal(b.toString());
    });

    it('should insert an item at the end', () => {
        const a = ['a', 'b'];
        const b = ['a', 'b', 'c'];
        const moves = diff_array(
            a,
            b,
            (a, b) => a === b);
        const result = applyDiff(moves, a);
        expect(result.toString()).to.equal(b.toString());
    });

});
