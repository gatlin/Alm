'use strict';

const alm = require('../../../dist/lib/alm.js'),
      el = alm.el;

const app1 = new alm.App({
    eventRoot: 'app-1',
    ports: {
        outbound: ['title']
    },
    state: 0,
    update: (n, total) => total + (n ? 1 : 0),
    gui: false,
    main: (scope) => {
        scope.events
            .click
            .connect(scope.actions);

        scope.state
            .map(n => n.toString())
            .connect(scope.ports.outbound.title);
    }
}).start();

app1.ports.outbound.title.recv(n => {
    document.title = (n ? '('+n+') ' : '') + 'Alm';
});

const app2 = new alm.App({
    eventRoot: 'app-2',
    domRoot: 'app-2',
    state: { id: 0, tasks: {} },
    update: (action, model) => {
        if (action.type === 'add') {
            const uid = model.id++;
            model.tasks[uid] = action.data;
        }
        else if (action.type === 'del') {
            delete model.tasks[action.data];
        }
        console.log(model);
        return model;
    },

    render: (state) => {
        const inp = el('input', {
            'type': 'text',
            'id': 'app-2-input',
            'placeholder':'Type a reminder here'
        });

        const tasks_list =
              el('ul', { 'id':'app-2-tasks'},
                 Object.keys(state.tasks).map(taskId => el('li', {
                     'id':'app-2-task-'+taskId.toString(),
                     'class':'app-2-task'
                 }, [state.tasks[taskId]])));

        return el('div', { 'id':'app-2-main' }, [
            el('h3', {}, ['Simple Reminder List']),
            inp,
            el('p', {}, ['Click on a reminder to delete it']),
            tasks_list
        ]);
    },

    main: (scope) => {
        scope.events.keydown
            .filter(evt => evt.getRaw().keyCode === 13 &&
                    evt.getId() === 'app-2-input')
            .recv(evt => scope.actions.send({
                type: 'add',
                data: evt.getRaw().target.value
            }));

        scope.events.click
            .filter(evt => evt.hasClass('app-2-task'))
            .recv(evt => scope.actions.send({
                type: 'del',
                data: evt.getId().split('-')[3]
            }));
    }
}).start();
