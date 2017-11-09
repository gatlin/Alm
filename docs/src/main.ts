import {
    el,
    connect,
    makeReducer,
    Alm
} from '../../src/alm';

type State = {
    inputText: string;
};

enum Actions {
    UpdateText
};

const updateTextAction = data => ({
    type: Actions.UpdateText,
    data
});

const reducer = makeReducer({
    inputText: (state: string, action) => {
        switch (action.type) {
            case Actions.UpdateText:
                return action.data;
            default:
                return state;
        };
    }
});

const MainComponent = ({ inputText, updateText }) =>
    el('div', { 'id': 'the-app' }, [
        el('h1', {}, ['Alm']),
        el('input', {
            type: 'text',
            value: inputText,
            on: {
                input: evt => updateText(evt.getValue())
            }
        }),
        el('p', {}, [inputText])
    ]);

const MainView = connect(
    ({ inputText }) => ({ inputText }),
    dispatch => ({
        updateText: t => dispatch(updateTextAction(t))
    })
)(MainComponent);

const app = new Alm<State, Actions>({
    initialState: { inputText: '' },
    reducer,
    view: MainView(),
    domRoot: 'app-root'
});
app.start();
