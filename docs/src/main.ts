import {
    el,
    connect,
    makeReducer,
    Alm
} from '../../src/alm';

const CounterComponent = ({ counter, increment, decrement }) =>
    el('div', {}, [
        el('p', {}, [counter.toString()]),
        el('div', {}, [
            el('button', { on: { click: evt => increment() } },
                ['Increment']),
            el('button', { on: { click: evt => decrement() } },
                ['Decrement'])
        ])
    ]);

const CounterView = connect(
    counter => ({ counter }),
    dispatch => ({
        increment: () => dispatch({ type: true }),
        decrement: () => dispatch({ type: false })
    })
)(CounterComponent);

const counterApp = new Alm({
    initialState: 0,
    reducer: (state, action) => action.type ? state + 1 : state - 1,
    view: CounterView(),
    domRoot: 'counter-app',
    eventRoot: 'counter-app'
});

counterApp.start();

// EVENT example

type EventState = {
    count: number;
    overLimit: false;
    inputText: string;
};

enum EventActions {
    UpdateText
};

const eventReducer = (state, action) => {
    switch (action.type) {
        case EventActions.UpdateText: {
            let inputText = action.data;
            return {
                inputText,
                count: inputText.length,
                overLimit: inputText.length > 140
            };
        }
        default:
            return state;
    };
};

const EventComponent = ({ inputText, count, overLimit, updateText }) =>
    el('div', {}, [
        el('textarea', {
            id: 'text-event',
            on: {
                input: evt => updateText(evt.getValue())
            }
        }),
        el('p', {}, [count.toString() + ' / 140 characters'])
    ]);

const EventView = connect(
    state => state,
    dispatch => ({
        updateText: data => dispatch({
            type: EventActions.UpdateText,
            data
        })
    })
)(EventComponent);

const eventApp = new Alm({
    initialState: { inputText: '', count: 0, overLimit: false },
    reducer: eventReducer,
    view: EventView(),
    eventRoot: 'event-app',
    domRoot: 'event-app'
});

eventApp.start();
