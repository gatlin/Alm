import {
    el,
    connect,
    makeReducer,
    Alm,
    View,
    Store
} from '../../src/alm';

// COUNTER example

enum CounterActions {
    Increment,
    Decrement
};

const CounterComponent = ({ counter, increment, decrement }) =>
    el('div', {},
        el('p', {}, counter.toString()),
        el('div', {},
            el('button', { on: { click: evt => increment() } },
                'Increment'),
            el('button', { on: { click: evt => decrement() } },
                'Decrement')
        )
    );

const CounterView = connect(
    counter => ({ counter }),
    dispatch => ({
        increment: () => dispatch({ type: CounterActions.Increment }),
        decrement: () => dispatch({ type: CounterActions.Decrement })
    })
)(CounterComponent);

const counterApp = new Alm({
    model: 0,
    update: (state, action) => action.type === CounterActions.Increment
        ? state + 1
        : state - 1,
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
    el('div', {},
        el('textarea', {
            id: 'text-event',
            on: {
                input: evt => updateText(evt.getValue())
            }
        }),
        el('p', {
            'class': overLimit ? 'warning ' : ''
        }, count.toString() + ' / 140 characters')
    );

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
    model: { inputText: 'Type here!', count: 0, overLimit: false },
    update: eventReducer,
    view: EventView(),
    eventRoot: 'event-app',
    domRoot: 'event-app'
});

eventApp.start();

// ASYNC example
type AsyncState = {
    pageUrl: string;
    pageText: string | null;
    requesting: boolean;
};

enum AsyncActions {
    RequestPage,
    SetPageText,
    SetPageUrl
};

const setPageUrlAction = data => ({
    type: AsyncActions.SetPageUrl,
    data
});

const setPageTextAction = data => ({
    type: AsyncActions.SetPageText,
    data
});

const requestPageAction = () => (dispatch, state) => {
    const r = new XMLHttpRequest();
    r.open("GET", state().pageUrl, true);
    r.onreadystatechange = () => {
        if (r.readyState !== 4 || r.status !== 200) {
            return;
        }
        dispatch(setPageTextAction(r.responseText));
    };
    r.send();
    return {
        type: AsyncActions.RequestPage
    };
};

const asyncReducer = (state, action) => {
    switch (action.type) {
        case AsyncActions.RequestPage:
            return { ...state, requesting: true };
        case AsyncActions.SetPageText:
            return { ...state, requesting: false, pageText: action.data };
        case AsyncActions.SetPageUrl:
            return { ...state, pageUrl: action.data };
        default:
            return state;
    }
};

const AsyncComponent = props =>
    el('div', {},
        el('h3', {}, "Load web page"),
        el('input', {
            type: 'text',
            value: props.pageUrl,
            on: {
                input: evt => props.setPageUrl(evt.getValue())
            }
        }),
        el('button', {
            on: {
                click: evt => props.requestPage()
            }
        }, 'Load Page'),
        el('p', {}, props.requesting
            ? 'Loading ...'
            : 'Number of characters received: ' + props.pageText.length
        )
    );

const AsyncView = connect(
    state => state,
    dispatch => ({
        setPageUrl: url => dispatch(setPageUrlAction(url)),
        requestPage: () => dispatch(requestPageAction()),
        setPageText: text => dispatch(setPageTextAction(text))
    })
)(AsyncComponent);

const asyncApp = new Alm({
    model: { pageText: '', requesting: false, pageUrl: 'http://niltag.net' },
    update: asyncReducer,
    view: AsyncView(),
    eventRoot: 'async-app',
    domRoot: 'async-app'
});

asyncApp.start();
