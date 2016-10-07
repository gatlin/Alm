'use strict';

const alm = require('../../../dist/lib/alm.js'),
      el = alm.el;

/* A simple counter */
const app1 = new alm.App({
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
    eventRoot: 'app-1',
    domRoot: 'app-1'
}).start();

const app2 = new alm.App({
    state: '#ffffff',
    update: (value, state) => value,
    ports: {
        outbound: ['background']
    },
    main: scope => {
        scope.events.input
            .filter(evt => evt.getId() === 'app2-color')
            .recv(evt => scope.actions.send(
                evt.getRaw().target.value));

        scope.events.click
            .filter(evt => evt.getId() === 'app2-reset')
            .recv(_ => scope.actions.send('#ffffff'));

        scope.state.connect(scope.ports.outbound.background);
    },
    render: state =>
        el('span', {}, [
            el('input', { 'type':'color',
                          'id':'app2-color',
                          'value':state }),
            el('button', { 'id':'app2-reset' }, ['Reset'])
        ]),
    eventRoot: 'app-2',
    domRoot: 'app-2'
}).start();

app2.ports.outbound.background.recv(color => {
    document.body.style.backgroundColor = color;
});
