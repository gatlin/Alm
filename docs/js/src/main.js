'use strict';

const alm = require('../../../dist/lib/alm.js'),
      el = alm.el;

/* A simple counter */
const counterApp = new alm.App({
    state: 0,
    update: (action, num) => num + (action ? 1 : -1),
    main: scope => {
        scope.events.click
            .filter(evt => evt.getId() === 'up-btn')
            .recv(evt => scope.actions.send(true));

        scope.events.click
            .filter(evt => evt.getId() === 'down-btn')
            .recv(evt => scope.actions.send(false));
    },
    render: state =>
        el('div', { 'id':'app-1-main' }, [
            el('h3', { 'class':'app-1-header' }, [state.toString()]),
            el('span', {}, [
                el('button', { 'id':'up-btn' }, ['+1']),
                el('button', { 'id':'down-btn' }, ['-1'])
            ])
        ]),
    eventRoot: 'counter-app',
    domRoot: 'counter-app'
}).start();

const eventApp = new alm.App({
    state: { count: 0, overLimit: false },
    update: (text, state) => {
        state.count = text.length;
        state.overLimit = state.count > 140;
        return state;
    },
    main: scope => {
        scope.events.input
            .filter(evt => evt.getId() === 'text-event')
            .recv(evt => scope.actions.send(evt.getValue()));
    },
    render: state =>
        el('div', {}, [
            el('textarea', { 'id': 'text-event' }),
            el('p', {
                'id':'limit-text',
                'class': state.overLimit ? 'warning' : ''
            }, [state.count.toString() + ' / 140 characters'])
        ]),
    eventRoot: 'event-app',
    domRoot: 'event-app'
}).start();

const colorApp = new alm.App({
    state: '#ffffff',
    update: (value, color) => value,
    ports: ['background'],
    main: scope => {
        scope.events.input
            .filter(evt => evt.getId() === 'app2-color')
            .recv(evt => scope.actions.send(evt.getValue()));

        scope.events.click
            .filter(evt => evt.getId() === 'app2-reset')
            .recv(_ => scope.actions.send('#ffffff'));

        scope.state.connect(scope.ports.background);
    },
    render: color =>
        el('span', {}, [
            el('input', { 'type':'color',
                          'id':'app2-color',
                          'value':color }),
            el('button', { 'id':'app2-reset' }, ['Reset'])
        ]),
    eventRoot: 'color-app',
    domRoot: 'color-app'
}).start();

colorApp.ports.background.recv(color => {
    document.body.style.backgroundColor = color;
});
