odoo.define('web.filter_menu_generator_tests', function (require) {
"use strict";

const Domain = require('web.Domain');
const FilterMenuGenerator = require('web.FilterMenuGenerator');
const makeTestEnvironment = require('web.test_env');
const pyUtils = require('web.py_utils');
const testUtils = require('web.test_utils');

async function createFilterMenuGenerator(params = {}) {
    const fields = params.fields || {};
    const handler = params.handler || null;
    const env = params.env || {};
    const debug = params.debug || false;

    class Parent extends owl.Component {
        constructor() {
            super();
            this.state = owl.hooks.useState({ fields });
        }
        _onCreateNewFilters(ev) {
            if (handler) {
                handler.bind(this)(ev);
            }
        }
    }
    Parent.env = makeTestEnvironment(env);
    Parent.components = { FilterMenuGenerator };
    Parent.template = owl.tags.xml`
        <FilterMenuGenerator t-props="state" t-on-create-new-filters="_onCreateNewFilters"/>`;
    const parent = new Parent();
    await parent.mount(testUtils.prepareTarget(debug), { position: 'first-child' });
    return { parent, el: parent.el };
}

QUnit.module('FilterMenuGenerator', {
    beforeEach: function () {
        this.fields = [
            { name: 'date_field', string: "A date", type: "date" },
            { name: 'boolean_field', string: "Boolean Field", type: "boolean", default: true },
            { name: 'char_field', string: "Char Field", type: "char", default: "foo", trim: true },
        ];
    },
}, function () {

    QUnit.test('click on add custom filter opens the submenu', async function (assert) {
        assert.expect(11);

        const { parent, el } = await createFilterMenuGenerator({ fields: this.fields });

        assert.strictEqual(el.innerText, "Add Custom Filter");
        assert.hasClass(el, 'o_menu_generator');
        assert.strictEqual(el.children.length, 1);

        await testUtils.dom.click(el.querySelector('button.o_add_custom_filter'));

        // Single condition
        assert.containsOnce(el, 'div.o_filter_condition');
        assert.containsOnce(el, 'div.o_filter_condition > select.o_menu_generator_field');
        assert.containsOnce(el, 'div.o_filter_condition > select.o_menu_generator_operator');
        assert.containsOnce(el, 'div.o_filter_condition > span.o_menu_generator_value');

        // no deletion allowed on single condition
        assert.containsNone(el, 'div.o_filter_condition > i.o_menu_generator_delete');

        // Buttons
        assert.containsOnce(el, 'div.o_add_filter_menu');
        assert.containsOnce(el, 'div.o_add_filter_menu > button.o_apply_filter');
        assert.containsOnce(el, 'div.o_add_filter_menu > button.o_add_condition');

        parent.destroy();
    });

    QUnit.test('adding a simple filter works', async function (assert) {
        assert.expect(5);

        this.fields.splice(0, 1);

        function handler(ev) {
            const preFilter = ev.detail.preFilters[0];
            assert.strictEqual(preFilter.type, 'filter');
            assert.strictEqual(preFilter.description, 'Boolean Field is true');
            assert.strictEqual(preFilter.domain, '[["boolean_field","=",True]]');
        }

        const { parent, el } = await createFilterMenuGenerator({ fields: this.fields, handler });

        await testUtils.dom.click(el.querySelector('button.o_add_custom_filter'));
        await testUtils.dom.click(el.querySelector('div.o_add_filter_menu > button.o_apply_filter'));

        // The only thing visible should be the button 'Add Custome Filter';
        assert.strictEqual(el.children.length, 1);
        assert.containsOnce(el, 'button.o_add_custom_filter');

        parent.destroy();
    });

    QUnit.test('commit search with an extended proposition with field char does not cause a crash', async function (assert) {
        assert.expect(6);

        this.fields = [
            { name: 'many2one_field', string: "Trululu", type: "many2one" }
        ];

        const expectedDomains = [
            [['many2one_field', 'ilike', `a`]],
            [['many2one_field', 'ilike', `"a"`]],
            [['many2one_field', 'ilike', `'a'`]],
            [['many2one_field', 'ilike', `'`]],
            [['many2one_field', 'ilike', `"`]],
            [['many2one_field', 'ilike', `\\`]],
        ];

        const testedValues = [`a`, `"a"`, `'a'`, `'`, `"`, `\\`];

        function handler(ev) {
            const preFilter = ev.detail.preFilters[0];
            // this step combine a tokenization/parsing followed by a string formatting
            let domain = pyUtils.assembleDomains([preFilter.domain]);
            domain = Domain.prototype.stringToArray(domain);
            assert.deepEqual(domain, expectedDomains.shift());
        }

        const { parent, el } = await createFilterMenuGenerator({ fields: this.fields, handler });

        async function testValue(value) {
            // open filter menu generator, select trululu field and enter string `a`, then click apply
            await testUtils.dom.click(el.querySelector('button.o_add_custom_filter'));
            await testUtils.fields.editInput(el.querySelector('div.o_filter_condition > span.o_menu_generator_value input'), value);
            await testUtils.dom.click(el.querySelector('div.o_add_filter_menu > button.o_apply_filter'));
        }

        for (const value of testedValues) {
            await testValue(value);
        }

        parent.destroy();
    });

    QUnit.skip('Custom Filter datetime with equal operator', async function (assert) {
        assert.expect(4);

        // not good! Problem with domain and description.
        this.fields = [
            { name: 'date_time_field', string: "DateTime", type: "datetime" }
        ];

        function handler(ev) {
            const preFilter = ev.detail.preFilters[0];
            assert.deepEqual(preFilter.domain, [['date_time_field', '=', '2017-02-22 15:00:00']]);
            // domain in UTC
            assert.strictEqual(preFilter.description, 'DateTime is equal to "02/22/2017 11:00:00"');
            // localized description
        }

        const env = {
            session: {
                getTZOffset: function () {
                    return -240;
                },
            },
        };

        const { parent, el } = await createFilterMenuGenerator({ fields: this.fields, handler, env });

        await testUtils.dom.click(el.querySelector('button.o_add_custom_filter'));
        assert.strictEqual(el.querySelector('div.o_filter_condition > select.o_menu_generator_field').value, 'date_time_field');
        assert.strictEqual(el.querySelector('div.o_filter_condition > select.o_menu_generator_operator').value, 'between');

        await testUtils.fields.editSelect(el.querySelector('div.o_filter_condition > select.o_menu_generator_operator'), '=');
        await testUtils.fields.editInput(el.querySelector('div.o_filter_condition > span.o_menu_generator_value input'), '02/22/2017 11:00:00'); // in TZ
        await testUtils.dom.click(el.querySelector('div.o_add_filter_menu > button.o_apply_filter'));

        parent.destroy();
    });

    QUnit.skip('Custom Filter datetime between operator', async function (assert) {
        assert.expect(4);

        // not good! Problem with domain and description.
        this.fields = [
            { name: 'date_time_field', string: "DateTime", type: "datetime" }
        ];

        function handler(ev) {
            const preFilter = ev.detail.preFilters[0];
            assert.deepEqual(
                preFilter.domain,
                [
                    '&',
                    ['date_time_field', '>=', '2017-02-22 15:00:00'],
                    ['date_time_field', '<=', '2017-02-22 21:00:00']  // In UTC
                ]
            );
            // domain in UTC
            assert.strictEqual(
                preFilter.description,
                'DateTime is between "02/22/2017 11:00:00 and 02/22/2017 17:00:00"'
            );
            // localized description
        }

        const env = {
            session: {
                getTZOffset: function () {
                    return -240;
                },
            },
        };

        const { parent, el } = await createFilterMenuGenerator({ fields: this.fields, handler, env });

        await testUtils.dom.click(el.querySelector('button.o_add_custom_filter'));
        assert.strictEqual(el.querySelector('div.o_filter_condition > select.o_menu_generator_field').value, 'date_time_field');
        assert.strictEqual(el.querySelector('div.o_filter_condition > select.o_menu_generator_operator').value, 'between');

        const inputEls = el.querySelectorAll('div.o_filter_condition > span.o_menu_generator_value input');
        await testUtils.fields.editInput(inputEls[0], '02/22/2017 11:00:00'); // in TZ
        await testUtils.fields.editInput(inputEls[1], '02/22/2017 17:00:00'); // in TZ

        await testUtils.dom.click(el.querySelector('div.o_add_filter_menu > button.o_apply_filter'));

        parent.destroy();
    });

    // todo
    // There should be more tests here!

});
});
