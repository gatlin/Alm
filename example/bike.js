/*
 * Used in concert with the `Evaluator` from loeb.js, which allows easy and
 * succinct modeling of inter-dependent computations like a spreadsheet.
 */
var bikecalc = {
    // inputs
      crankLength: constant(175.0)
    , frontTeeth: constant(36)
    , rearTeeth: constant(24)
    , wheelRadius: constant(340.0)
    // computed values
    , radiusRatio: (bc) => bc.at('wheelRadius') / bc.at('crankLength')
    , teethRatio: (bc) => bc.at('frontTeeth') / bc.at('rearTeeth')
    , gainRatio: (bc) => bc.at('radiusRatio') * bc.at('teethRatio')
};

var app = App.init('app_container')

.main(function(events, utils, dom) {
    // user input updates
    var updates = utils.mailbox(null);

    var bikedata = updates.signal
        .reduce(new Evaluator('gainRatio', bikecalc), function(message, model) {
            if (message !== null) {
                model.values[message.key] = constant(message.value);
            }
            return model;
        });

    events.change.filter((evt) => evt.target.className === 'bike_input')
        .recv((evt) => updates.send({
            key: evt.target.id,
            value: parseFloat(evt.target.value)
        }));

    bikedata
        .recv(function(unevaluated) {
            var el = dom.el;
            var data = unevaluated.evaluate();
            var items = new Array();

            items.push(el('li', { id: 'gainRatio', class: 'output' },
                    [ 'Gain ratio: ' + data.extract().toFixed(2) ]));

            var labels = {
                  'crankLength': 'Crank Length (mm)'
                , 'frontTeeth': 'Number of front teeth'
                , 'rearTeeth': 'Number of rear teeth'
                , 'wheelRadius': 'Rear Wheel Radius (mm)'
            };

            for (var key in labels) {
                var label = labels[key];
                items.push(el('li', { class: 'datum-group' }, [
                    el('label', { 'for': key, id: 'label-'+ key },
                        [label]),
                    el('input', {
                        type: 'text',
                        class: 'bike_input',
                        id: key,
                        value: data.values[key]
                    })]));
            }

            var view = el('ul', { id: 'datum' }, items);
            dom.render(view);
        });

})

.start();
