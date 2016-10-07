'use strict';

const alm = require('../../../dist/lib/alm.js'),
      el = alm.el;

/* A simple counter */
const app1 = new alm.App({
    eventRoot: 'app-1',
    domRoot: 'app-1',
    state: 0,
    update: (action, num) => num + (action ? 1 : -1),
    render: state =>
        el('div', { 'id':'app-1-main' }, [
            el('h3', { 'class':'app-1-header' }, [state.toString()]),
            el('span', {}, [
                el('button', { 'id':'up-btn' }, ['+']),
                el('button', { 'id':'down-btn' }, ['-'])
            ])
        ]),
    main: scope => {
        scope.events.click
            .filter(evt => evt.getId() === 'up-btn')
            .recv(evt => scope.actions.send(true));

        scope.events.click
            .filter(evt => evt.getId() === 'down-btn')
            .recv(evt => scope.actions.send(false));
    }
}).start();
