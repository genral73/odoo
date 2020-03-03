odoo.define('web.filter_menu_generator_tests', function (require) {
    "use strict";

    const Domain = require('web.Domain');
    const FilterGeneratorMenu = require('web.FilterGeneratorMenu');
    const pyUtils = require('web.py_utils');
    const testUtils = require('web.test_utils');
    const session = require('web.session');

    const { createComponent } = testUtils;
    const { getHelpers: getCPHelpers } = testUtils.controlPanel;

    function patchSession(newSession) {
        // We have to patch the "legacy" session because field_utils is using it.
        // TODO: remove it when the field_utils are re-written.
        const initialSession = session;
        Object.assign(session, newSession);
        return function () {
            Object.assign(session, initialSession);
        };
    }

    QUnit.module('Components', {
        beforeEach: function () {
            this.fields = {
                date_field: { string: "A date", type: 'date', searchable: true },
                date_time_field: { string: "DateTime", type: 'datetime', searchable: true },
                boolean_field: { string: "Boolean Field", type: 'boolean', default: true, searchable: true },
                char_field: { string: "Char Field", type: 'char', default: "foo", trim: true, searchable: true },
                float_field: { string: "Floaty McFloatface", type: 'float', searchable: true },
            };
        },
    }, function () {

        QUnit.module('FilterGeneratorMenu');

        QUnit.test('basic rendering', async function (assert) {
            assert.expect(17);

            const fmg = await createComponent(FilterGeneratorMenu, {
                props: {
                    fields: this.fields,
                },
            });
            const helpers = getCPHelpers(fmg.el, '');

            assert.strictEqual(fmg.el.innerText.trim(), "Add Custom Filter");
            assert.hasClass(fmg.el, 'o_generator_menu');
            assert.strictEqual(fmg.el.children.length, 1);

            await helpers.toggleAddCustomFilter();

            // Single condition
            assert.containsOnce(fmg, 'div.o_filter_condition');
            assert.containsOnce(fmg, 'div.o_filter_condition > select.o_generator_menu_field');
            assert.containsOnce(fmg, 'div.o_filter_condition > select.o_generator_menu_operator');
            assert.containsOnce(fmg, 'div.o_filter_condition > span.o_generator_menu_value');
            assert.containsNone(fmg, 'div.o_filter_condition .o_or_filter');
            assert.containsNone(fmg, 'div.o_filter_condition .o_generator_menu_delete');

            // no deletion allowed on single condition
            assert.containsNone(fmg, 'div.o_filter_condition > i.o_generator_menu_delete');

            // Buttons
            assert.containsOnce(fmg, 'div.o_add_filter_menu');
            assert.containsOnce(fmg, 'div.o_add_filter_menu > button.o_apply_filter');
            assert.containsOnce(fmg, 'div.o_add_filter_menu > button.o_add_condition');

            assert.containsOnce(fmg, 'div.o_filter_condition');

            await testUtils.dom.click('button.o_add_condition');

            assert.containsN(fmg, 'div.o_filter_condition', 2);
            assert.containsOnce(fmg, 'div.o_filter_condition .o_or_filter');
            assert.containsN(fmg, 'div.o_filter_condition .o_generator_menu_delete', 2);

            fmg.destroy();
        });

        QUnit.test('adding a simple filter works', async function (assert) {
            assert.expect(5);

            delete this.fields.date_field;

            const fmg = await createComponent(FilterGeneratorMenu, {
                props: {
                    fields: this.fields,
                },
                intercepts: {
                    'create-new-filters'(ev) {
                        const preFilter = ev.detail.preFilters[0];
                        assert.strictEqual(preFilter.type, 'filter');
                        assert.strictEqual(preFilter.description, 'Boolean Field is true');
                        assert.strictEqual(preFilter.domain, '[["boolean_field","=",True]]');
                    },
                },
            });
            const helpers = getCPHelpers(fmg.el, '');

            await helpers.toggleAddCustomFilter();
            await helpers.applyFilter();

            // The only thing visible should be the button 'Add Custome Filter';
            assert.strictEqual(fmg.el.children.length, 1);
            assert.containsOnce(fmg, 'button.o_add_custom_filter');

            fmg.destroy();
        });

        QUnit.test('commit search with an extended proposition with field char does not cause a crash', async function (assert) {
            assert.expect(6);

            this.fields.many2one_field = { string: "Trululu", type: "many2one", searchable: true };
            const expectedDomains = [
                [['many2one_field', 'ilike', `a`]],
                [['many2one_field', 'ilike', `"a"`]],
                [['many2one_field', 'ilike', `'a'`]],
                [['many2one_field', 'ilike', `'`]],
                [['many2one_field', 'ilike', `"`]],
                [['many2one_field', 'ilike', `\\`]],
            ];

            const testedValues = [`a`, `"a"`, `'a'`, `'`, `"`, `\\`];
            const fmg = await createComponent(FilterGeneratorMenu, {
                props: {
                    fields: this.fields,
                },
                intercepts: {
                    'create-new-filters'(ev) {
                        const preFilter = ev.detail.preFilters[0];
                        // this step combine a tokenization/parsing followed by a string formatting
                        let domain = pyUtils.assembleDomains([preFilter.domain]);
                        domain = Domain.prototype.stringToArray(domain);
                        assert.deepEqual(domain, expectedDomains.shift());
                    }
                },
            });
            const helpers = getCPHelpers(fmg.el, '');

            async function testValue(value) {
                // open filter menu generator, select trululu field and enter string `a`, then click apply
                await helpers.toggleAddCustomFilter();
                await testUtils.fields.editSelect(fmg.el.querySelector('select.o_generator_menu_field'), 'many2one_field');
                await testUtils.fields.editInput(fmg.el.querySelector(
                    'div.o_filter_condition > span.o_generator_menu_value input'),
                    value
                );
                await helpers.applyFilter();
            }

            for (const value of testedValues) {
                await testValue(value);
            }

            fmg.destroy();
        });

        QUnit.test('custom filter datetime with equal operator', async function (assert) {
            assert.expect(4);

            patchSession({
                getTZOffset: function () {
                    return -240;
                },
            });

            const fmg = await createComponent(FilterGeneratorMenu, {
                props: {
                    fields: this.fields,
                },
                intercepts: {
                    'create-new-filters'(ev) {
                        const preFilter = ev.detail.preFilters[0];
                        assert.strictEqual(preFilter.description,
                            'DateTime is equal to "02/22/2017 11:00:00"',
                            "description should be in localized format");
                        assert.deepEqual(preFilter.domain,
                            '[["date_time_field","=","2017-02-22 15:00:00"]]',
                            "domain should be in UTC format");
                    },
                },
            });
            const helpers = getCPHelpers(fmg.el, '');

            await helpers.toggleAddCustomFilter();
            await testUtils.fields.editSelect(fmg.el.querySelector('.o_generator_menu_field'), 'date_time_field');

            assert.strictEqual(fmg.el.querySelector('.o_generator_menu_field').value, 'date_time_field');
            assert.strictEqual(fmg.el.querySelector('.o_generator_menu_operator').value, 'between');

            await testUtils.fields.editSelect(fmg.el.querySelector('.o_generator_menu_operator'), '=');
            await testUtils.fields.editSelect(fmg.el.querySelector('div.o_filter_condition > span.o_generator_menu_value input'), '02/22/2017 11:00:00'); // in TZ
            await helpers.applyFilter();

            fmg.destroy();
        });

        QUnit.test('custom filter datetime between operator', async function (assert) {
            assert.expect(4);

            patchSession({
                getTZOffset: function () {
                    return -240;
                },
            });

            // not good! Problem with domain and description.
            const fmg = await createComponent(FilterGeneratorMenu, {
                props: {
                    fields: this.fields,
                },
                intercepts: {
                    'create-new-filters'(ev) {
                        const preFilter = ev.detail.preFilters[0];
                        assert.strictEqual(preFilter.description,
                            'DateTime is between "02/22/2017 11:00:00 and 02/22/2017 17:00:00"',
                            "description should be in localized format");
                        assert.deepEqual(preFilter.domain,
                            '[["date_time_field",">=","2017-02-22 15:00:00"]' +
                            ',["date_time_field","<=","2017-02-22 21:00:00"]]',
                            "domain should be in UTC format");
                    },
                },
            });
            const helpers = getCPHelpers(fmg.el, '');

            await helpers.toggleAddCustomFilter();
            await testUtils.fields.editSelect(fmg.el.querySelector('.o_generator_menu_field'), 'date_time_field');

            assert.strictEqual(fmg.el.querySelector('.o_generator_menu_field').value, 'date_time_field');
            assert.strictEqual(fmg.el.querySelector('.o_generator_menu_operator').value, 'between');

            const valueInputs = fmg.el.querySelectorAll('.o_generator_menu_value .o_input');
            await testUtils.fields.editSelect(valueInputs[0], '02/22/2017 11:00:00'); // in TZ
            await testUtils.fields.editSelect(valueInputs[1], '02-22-2017 17:00:00'); // in TZ
            await helpers.applyFilter();

            fmg.destroy();
        });

        QUnit.test('input value parsing', async function (assert) {
            assert.expect(6);

            const fmg = await createComponent(FilterGeneratorMenu, {
                props: {
                    fields: this.fields,
                },
            });
            const helpers = getCPHelpers(fmg.el, '');

            await helpers.toggleAddCustomFilter();
            await testUtils.dom.click('button.o_add_condition');

            const [floatSelect, idSelect] = fmg.el.querySelectorAll('.o_generator_menu_field');
            await testUtils.fields.editSelect(floatSelect, 'float_field');
            await testUtils.fields.editSelect(idSelect, 'id');

            const [floatInput, idInput] = fmg.el.querySelectorAll('.o_generator_menu_value .o_input');

            // Default values
            assert.strictEqual(floatInput.value, "0.0");
            assert.strictEqual(idInput.value, "0");

            // Float parsing
            await testUtils.fields.editInput(floatInput, 4.2);
            assert.strictEqual(floatInput.value, "4.2");
            await testUtils.fields.editInput(floatInput, "DefinitelyValidFloat");
            assert.strictEqual(floatInput.value, "4.2");

            // Number parsing
            await testUtils.fields.editInput(idInput, 4);
            assert.strictEqual(idInput.value, "4");
            await testUtils.fields.editInput(idInput, "DefinitelyValidID");
            assert.strictEqual(idInput.value, "4");

            fmg.destroy();
        });

        QUnit.test('add custom filter with multiple values', async function (assert) {
            assert.expect(1);

            const fmg = await createComponent(FilterGeneratorMenu, {
                props: {
                    fields: this.fields,
                },
                intercepts: {
                    'create-new-filters'(ev) {
                        const expected = [
                            {
                                description: 'A date is equal to "01/09/1997"',
                                domain: '[["date_field","=","1997-01-09"]]',
                                type: "filter",
                            },
                            {
                                description: 'Boolean Field is true',
                                domain: '[["boolean_field","=",True]]',
                                type: "filter",
                            },
                            {
                                description: 'Floaty McFloatface is equal to "7.2"',
                                domain: '[["float_field","=",7.2]]',
                                type: "filter",
                            },
                            {
                                description: 'ID is "9"',
                                domain: '[["id","=",9]]',
                                type: "filter",
                            },
                        ];
                        assert.deepEqual(ev.detail.preFilters, expected,
                            "Conditions should be in the correct order witht the right values.");
                    },
                },
            });
            const helpers = getCPHelpers(fmg.el, '');

            await helpers.toggleAddCustomFilter();
            await testUtils.dom.click('button.o_add_condition');
            await testUtils.dom.click('button.o_add_condition');
            await testUtils.dom.click('button.o_add_condition');
            await testUtils.dom.click('button.o_add_condition');

            function getCondition(index, selector) {
                const condition = fmg.el.querySelectorAll('.o_filter_condition')[index];
                return condition.querySelector(selector);
            }

            await testUtils.fields.editSelect(getCondition(0, '.o_generator_menu_field'), 'date_field');
            await testUtils.fields.editSelect(getCondition(0, '.o_generator_menu_value .o_input'), '01/09/1997');

            await testUtils.fields.editSelect(getCondition(1, '.o_generator_menu_field'), 'boolean_field');
            await testUtils.fields.editInput(getCondition(1, '.o_generator_menu_operator'), '!=');

            await testUtils.fields.editSelect(getCondition(2, '.o_generator_menu_field'), 'char_field');
            await testUtils.fields.editInput(getCondition(2, '.o_generator_menu_value .o_input'), "I will be deleted anyway");

            await testUtils.fields.editSelect(getCondition(3, '.o_generator_menu_field'), 'float_field');
            await testUtils.fields.editInput(getCondition(3, '.o_generator_menu_value .o_input'), 7.2);

            await testUtils.fields.editSelect(getCondition(4, '.o_generator_menu_field'), 'id');
            await testUtils.fields.editInput(getCondition(4, '.o_generator_menu_value .o_input'), 9);

            await testUtils.dom.click(getCondition(2, '.o_generator_menu_delete'));

            await helpers.applyFilter();

            fmg.destroy();
        });
    });
});
