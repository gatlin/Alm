'use strict';

const alm = require('../../../dist/lib/alm.js'),
      el = alm.el;

function rando(min,max) {
    return Math.floor(Math.random() * (max - min) + min);
}

const app1 = new alm.App({
    eventRoot: 'app-1',
    domRoot: 'app-1',
    state: {
        words: ['ｗｏａｈ','ｗａｖｙ','ｔｕｂｕｌａｒ'],
        which: 0
    },
    update: (_, state) => {
        state.which = rando(0, state.words.length);
        return state;
    },
    render: state => el('div', {}, [
        el('p', {}, ['Click anywhere in this box for a random word']),
        el('p', {'class':'aesthetic'}, [ state.words[state.which]])
    ]),
    main: scope => {
        scope.events.click.connect(scope.actions);
    }
}).start();

function renderTasks(state) {
    const input = el('input', {
        'type': 'text',
        'id':'app-2-input',
        'placeholder':'Type something here go ahead'
    });

    const tasks_list = Object.keys(state.tasks)
          .map(taskId => {
              return el('li', {
                  'id':'app-2-task-'+taskId,
                  'class':'app-2-task'
              }, [state.tasks[taskId]]);
          });

    return el('div', {}, [
        input,
        el('p', {}, ['Click on an item to delete it']),
        el('ul', { 'id':'app-2-tasks' }, tasks_list)
    ]);
}

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

    render: renderTasks,

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
