import {
    el,
    Component,
    Reducer,
    connect,
    Alm
} from '../../src/alm';

type State = {
    num: number;
};

enum Actions {
    Increment,
    Decrement
};

const incrAction = () => ({
    type: Actions.Increment
});

const decrAction = () => ({
    type: Actions.Decrement
});

const appReducer: Reducer<State, Actions> = (state, action) => {
    switch (action.type) {
        case Actions.Increment:
            return { ...state, num: state.num + 1 };

        case Actions.Decrement:
            return { ...state, num: state.num - 1 };

        default:
            return state;
    }
};

const ComponentA = ({ num }) =>
    el('h1', { 'id': 'heading' }, [num.toString()]);

const mapStateToProps = ({ num }) => ({
    num
});

const mapDispatchToProps = dispatch => ({
    incr: () => dispatch(incrAction()),
    decr: () => dispatch(decrAction())
});

const ViewA = connect(mapStateToProps, mapDispatchToProps)(ComponentA);

const ComponentB = ({ incr, decr }) =>
    el('div', { 'id': 'the-app' }, [
        el(ViewA),
        el('div', { 'id': 'btns' }, [
            el('button', {
                on: {
                    click: evt => incr()
                }
            }, ['Increment']),
            el('button', {
                on: {
                    click: evt => decr()
                }
            }, ['Decrement'])
        ])
    ]);

const ViewB = connect(
    _ => { },
    dispatch => ({
        incr: () => dispatch(incrAction()),
        decr: () => dispatch(decrAction())
    })
)(ComponentB);

const app = new Alm<State, Actions>({
    initialState: { num: 5 },
    reducer: appReducer,
    view: ViewB(),
    domRoot: 'app-root'
});
app.start();
