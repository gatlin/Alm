'use strict';

const alm = require('../../dist/lib/alm.js'),
      el = alm.el;

/* This generates unique integers for the session */
const guid = (() => {
    let i = 0;
    return () => {
        return i++;
    };
})();

/* Our application model is a list of tasks, the contents of the input field,
   and the next available uid to assign a task.
*/
function empty_model() {
    return {
        tasks: [new_task('Example 1', 0), new_task('Example 2', 1)],
        field: '',
        uid: 2
    };
}

/* The set of actions to perform on the model. This is just an enum. */
const Actions = {
    NoOp: 0,
    Add: 1,
    UpdateField: 2,
    Delete: 3,
    Complete: 4,
    Editing: 5,
    UpdateTask: 6
};

/* Generates a new task in a default state. */
function new_task(description, id) {
    return {
        description: description,
        completed: false,
        editing: false,
        uid: id
    };
}

/* This describes the logic used to update the model.
   Arguments: the action and the model.
   Returns: a new model.
*/
function update_model(action, model) {
    const dispatch = {};
    dispatch[Actions.NoOp] = () => {
        return model;
    };

    dispatch[Actions.Add] = () => {
        if (model.field) {
            model.tasks.push(new_task(
                model.field, model.uid
            ));
            model.uid = model.uid + 1;
            model.field = '';
        }
        return model;
    };

    dispatch[Actions.UpdateField] = () => {
        model.field = action.content;
        return model;
    };

    dispatch[Actions.Delete] = () => {
        const uid = action.content;
        let idx = -1;
        for (let i = 0; i < model.tasks.length; i++) {
            if (model.tasks[i].uid === uid) {
                idx = i;
                break;
            }
        }
        if (idx > -1) {
            model.tasks.splice(idx,1);
        }
        return model;
    };

    dispatch[Actions.Complete] = () => {
        const uid = action.content;
        for (let i = model.tasks.length; i--; ) {
            if (model.tasks[i].uid === uid) {
                model.tasks[i].completed =
                    !model.tasks[i].completed;
                break;
            }
        }
        return model;
    };

    dispatch[Actions.Editing] = () => {
        const uid = action.content;
        for (let i = model.tasks.length; i--; ) {
            if (model.tasks[i].uid === uid) {
                model.tasks[i].editing = true;
                break;
            }
        }
        return model;
    };

    dispatch[Actions.UpdateTask] = () => {
        const uid = action.content.uid;
        for (let i = model.tasks.length; i--; ) {
            if (model.tasks[i].uid === uid) {
                model.tasks[i].editing = false;
                model.tasks[i].description =
                    action.content.text;
                break;
            }
        }
        return model;
    };

    return dispatch[action.type]();
}

/* Takes a model and produces a VTree using the `el` function provided by alm.
*/
function render_model(model) {
    let task_items = model.tasks.map(function(task) {
        let content = (task.editing)
            ? el('input', {
                type: 'text',
                class: 'editing',
                id: 'edit-task-'+task.uid,
                value: task.description })
            : el('label', {
                class: (task.completed) ? 'completed' : 'task_text',
                id: 'text-task-'+task.uid
            }, [task.description]);

        let checkboxAttrs = {
            type: 'checkbox',
            class: 'toggle',
            id: 'check-task-'+task.uid
        };

        if (task.completed) {
            checkboxAttrs.checked = 'checked';
        }

        // return the list item!
        return el('li', { id: 'task-'+task.uid, class: 'task' }, [
            el('input', checkboxAttrs),
            content,
            el('button', {
                class: 'delete_button',
                id: 'del-task-'+task.uid })
        ]);
    });

    return el('section', { id: 'the_app', class: 'app-'+guid() }, [
        el('header', { id: 'header', class: 'header-'+guid() }, [
            el('h1', {}, ["Obligatory Todo App"]),
            el('p', {}, ['Double-click tasks to edit them'])
        ]),
        el('input', {
            type: 'text',
            id: 'field',
            placeholder: 'What needs to be done?',
            value: model.field
        }),
        el('ul', { class: 'todo_list', id: 'todo_list' }, task_items)
    ]);
}

const app = new alm.App({
    domRoot: 'main',
    eventRoot: 'main',
    main: (scope) => {
        const actions = new alm.Mailbox({ type: Actions.NoOp });
        const state = actions.reduce(empty_model(), update_model);

        scope.events.change
            .filter(evt => evt.hasClass('toggle'))
            .recv(evt => actions.send({
                type: Actions.Complete,
                content: parseInt(evt.getId().split('-')[2])
            }));

        scope.events.click
            .filter(evt => evt.hasClass('delete_button'))
            .recv(evt => actions.send({
                type: Actions.Delete,
                content: parseInt(evt.getId().split('-')[2])
            }));

        scope.events.input
            .filter(evt => evt.getId() === 'field')
            .recv(evt => actions.send({
                type: Actions.UpdateField,
                content: evt.getValue()
            }));

        scope.events.dblclick
            .filter(evt => evt.hasClass('task_text'))
            .recv(evt => actions.send({
                type: Actions.Editing,
                content: parseInt(evt.getId().split('-')[2])
            }));

        scope.events.blur
            .filter(evt => evt.hasClass('editing'))
            .recv(evt => actions.send({
                type: Actions.UpdateTask,
                content: {
                    uid: parseInt(evt.getId().split('-')[2]),
                    text: evt.getValue()
                }
            }));

        const onEnter = scope.events.keydown
              .filter(evt => evt.getRaw().keyCode === 13);

        onEnter.filter(evt => evt.getId() === 'field')
            .recv(evt => actions.send({
                type: Actions.Add
            }));

        onEnter
            .filter(evt => evt.hasClass('editing'))
            .recv(evt => actions.send({
                type: Actions.UpdateTask,
                content: {
                    uid: parseInt(evt.getId().split('-')[2]),
                    text: evt.getValue()
                }
            }));

        return state.map(render_model);
    }
});

app.start();
