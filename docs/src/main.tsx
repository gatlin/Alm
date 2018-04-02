import {
    el,
    connect,
    makeReducer,
    Alm,
    View,
    Store
} from '../../src/alm';

import 'whatwg-fetch';

// COUNTER example

enum CounterActions {
    Increment,
    Decrement
};

const CounterComponent = connect(
    counter => ({ counter }),
    dispatch => ({
        increment: () => dispatch({ type: CounterActions.Increment }),
        decrement: () => dispatch({ type: CounterActions.Decrement })
    })
)(({ counter, increment, decrement }) => (
    <div>
        <p>{ counter.toString() }</p>
        <div>
            <button
                on={{
                    click: evt => increment()
                }}>
                Increment
            </button>
            <button
                on={{
                    click: evt => decrement()
                }}>
                Decrement
            </button>
        </div>
    </div>
));

const counterApp = new Alm({
    model: 0,
    update: (state, action) => action.type === CounterActions.Increment
        ? state + 1
        : state - 1,
    view: CounterComponent(),
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

const EventComponent = connect(
    state => state,
    dispatch => ({
        updateText: data => dispatch({
            type: EventActions.UpdateText,
            data
        })
    })
)(({ inputText, count, overLimit, updateText }) => (
    <div>
        <textarea
            id="text-event"
            on={{
                input: evt => updateText(evt.getValue())
            }}/>
        <p className={ overLimit ? 'warning ' : '' }>
            { count.toString() + ' / 140 characters' }
        </p>
    </div>
));

const eventApp = new Alm({
    model: { inputText: 'Type here!', count: 0, overLimit: false },
    update: eventReducer,
    view: EventComponent(),
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

const requestPageAction = () => (dispatch, state) => (
    fetch(state().pageUrl)
        .then(response => response.text())
        .then(data => dispatch({
            type: AsyncActions.SetPageText,
            data
        }))
        .catch(err => { console.error(err) })
);

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

const AsyncComponent = connect(
    state => state,
    dispatch => ({
        setPageUrl: url => dispatch({
            type: AsyncActions.SetPageUrl,
            data: url
        }),
        requestPage: () => dispatch(requestPageAction())
    })
)(props => (
    <div>
        <h3>Load web page</h3>
        <input
            type="text"
            value={ props.pageUrl }
            on={{
                change: evt => props.setPageUrl(evt.getValue())
            }}
        />
        <button on={{ click: evt => props.requestPage()}}>
            Load Page
        </button>
        <p>{ props.requesting
            ? 'Loading ...'
            : 'Number of characters received: ' + props.pageText.length
        }</p>
    </div>
));

const asyncApp = new Alm({
    model: { pageText: '', requesting: false, pageUrl: 'http://niltag.net' },
    update: asyncReducer,
    view: AsyncComponent(),
    eventRoot: 'async-app',
    domRoot: 'async-app'
});

asyncApp.start();
