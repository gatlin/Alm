(function() {
'use strict';
/**
 * A task is some text and an id. It may be completed or not. It may currently
 * edited or not as well.
 */
function new_task(description, id) {
    return {
        description: description,
        completed: false,
        editing: false,
        uid: id
    };
}

/**
 * Our application model is a list of tasks, a uid for numbering tasks, and a
 * main text field containing what the user has typed.
 */
function empty_model() {
    return {
        tasks: [],
        field: "",
        uid: 0
    };
}

/**
 * Poor man's enum. These are the types of actions we will be performing on the
 * model.
 */
var Actions = {
    NoOp: 0,
    Add: 1,
    UpdateField: 2,
    Delete: 3,
    Complete: 4,
    Editing: 5,
    UpdateTask: 6
};

var guid = guid_factory();

// Set up the application runtime state
var app = App.init('main')

// for shits / examples, let's modify the runtime on the client side. This is
// essentially how plugins and extensions would work.
.runtime(function(runtime) {
    runtime.utils.initial_model = function() {
        var maybe_saved = window.localStorage.getItem('todos');
        return (maybe_saved === null)
            ? empty_model()
            : JSON.parse(maybe_saved);
    };

    runtime.utils.save_model = (model) =>
        window.localStorage.setItem('todos',JSON.stringify(model)) ;

    return save(runtime);
})

/* Now we wire our signals together.
 * Note that `main` is only given a subset of the runtime, to prevent silly
 * mistakes from happening.
 *
 * The return value is a signal producing virtual DOM trees. These will be
 * rendered by the runtime as new trees are produced.
 */
.main(function(alm) {
    var events = alm.events,
        el     = alm.el,
        utils  = alm.utils;

    // When an event happens, an action is sent here.
    var actions = alm.mailbox({ type: Actions.NoOp });

    // a signal broadcasting updated models
    /**
     * Given some action structure and a model compute and return a new model.
     *
     * This function is "pure" in some sense: it has no access to the application
     * runtime, though obviously this being JavaScript it has access to the browser
     * the same as any other component. But without intentionally misusing this
     * library, there is no way to send signals, update the view, or otherwise
     * change the runtime state.
     */

    var model = actions.signal
        .reduce(utils.initial_model(),
        function (action, model) {
            switch (action.type) {

                case Actions.Add:
                    if (model.field) {
                        model.tasks.push(new_task(model.field, model.uid));
                        model.uid = model.uid + 1;
                        model.field = "";
                    }
                    return model;

                case Actions.UpdateField:
                    model.field = action.content;
                    return model;

                case Actions.Delete:
                    var uid = action.content;
                    var idx = -1;
                    for (var i = 0; i < model.tasks.length; i++) {
                        if (model.tasks[i].uid === uid) {
                            idx = i;
                            break;
                        }
                    }
                    if (idx > -1) {
                        model.tasks.splice(idx, 1);
                    }
                    return model;

                case Actions.Complete:
                    var uid = action.content;
                    for (var i = model.tasks.length; i--; ) {
                        if (model.tasks[i].uid === uid) {
                            model.tasks[i].completed = !model.tasks[i].completed;
                            break;
                        }
                    }
                    return model;

                case Actions.Editing:
                    var uid = action.content;
                    for (var i = model.tasks.length; i--; ) {
                        if (model.tasks[i].uid === uid) {
                            model.tasks[i].editing = true;
                            break;
                        }
                    }
                    return model;

                // Editing is finished
                case Actions.UpdateTask:
                    var uid = action.content.uid;
                    for (var i = model.tasks.length; i--; ) {
                        if (model.tasks[i].uid === uid) {
                            model.tasks[i].editing = false;
                            model.tasks[i].description = action.content.text;
                            break;
                        }
                    }
                    return model;
            }

            return model;
        });

    events.change
        .filter((evt) => evt.target.className === 'toggle')
        .recv((evt) => actions.send({
            type: Actions.Complete,
            content: parseInt(evt.target.id.split('-')[2])
        }));

    events.mouse.click
        .filter((evt) => evt.target.className === 'delete_button')
        .recv((evt) => actions.send({
            type: Actions.Delete,
            content: parseInt(evt.target.id.split('-')[2])
        }));

    // A signal of 'enter' key events
    var onEnter = events.keyboard.keydown
        .filter((evt) => evt.keyCode === 13);

    onEnter.filter((evt) => evt.target.id === 'field')
        .recv((evt) => actions.send({
            type: Actions.Add
        }));

    events.input
        .filter((evt) => evt.target.id === 'field')
        .recv((evt) => actions.send({
            type: Actions.UpdateField,
            content: evt.target.value
        }));

    events.mouse.dblclick
        .filter((evt) => evt.target.className === 'task_text')
        .recv((evt) => actions.send({
            type: Actions.Editing,
            content: parseInt(evt.target.id.split('-')[2])
        }));

    onEnter
        .filter((evt) => evt.target.className === 'editing')
        .recv((evt) => actions.send({
            type: Actions.UpdateTask,
            content: {
                uid: parseInt(evt.target.id.split('-')[2]),
                text: evt.target.value
            }}));

    events.keyboard.blur
        .filter((evt) => evt.target.className === 'editing')
        .recv((evt) => actions.send({
            type: Actions.UpdateTask,
            content: {
                uid: parseInt(evt.target.id.split('-')[2]),
                text: evt.target.value
            }
        }));

    // a model listener - saves the model
    model.recv((model) => utils.save_model(model));

    // We return a signal which produces virtual DOM trees from models
    return model.map(function(model) {
        var task_items = model.tasks.map(function(task) {
            var content = (task.editing)
                ? el('input', {
                    type: 'text',
                    class: 'editing',
                    id: 'edit-task-'+task.uid,
                    value: task.description })
                : el('label', {
                    class: (task.completed) ? 'completed' : 'task_text',
                    id: 'text-task-'+task.uid
                }, [task.description]);

            var checkboxAttrs = {
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
                el('h1', {}, ["Obligatory Todo App"]) ]),
            el('input', {
                type: 'text',
                id: 'field',
                placeholder: 'What needs to be done?',
                value: model.field
            }),
            el('ul', { class: 'todo_list', id: 'todo_list' }, task_items)
        ]);
    });

})

// and begin the application
.start();

})();
