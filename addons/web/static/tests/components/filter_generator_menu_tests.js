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

    QUnit.module('FilterGeneratorMenu', {
        beforeEach: function () {
            this.fields = {
                date_field: { string: "A date", type: "date", searchable: true },
                date_time_field: { string: "DateTime", type: "datetime", searchable: true },
                boolean_field: { string: "Boolean Field", type: "boolean", default: true, searchable: true },
                char_field: { string: "Char Field", type: "char", default: "foo", trim: true, searchable: true },
            };
        },
    }, function () {

        QUnit.test('click on add custom filter opens the submenu', async function (assert) {
            assert.expect(11);

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

            // no deletion allowed on single condition
            assert.containsNone(fmg, 'div.o_filter_condition > i.o_generator_menu_delete');

            // Buttons
            assert.containsOnce(fmg, 'div.o_add_filter_menu');
            assert.containsOnce(fmg, 'div.o_add_filter_menu > button.o_apply_filter');
            assert.containsOnce(fmg, 'div.o_add_filter_menu > button.o_add_condition');

            fmg.destroy();
        });

        QUnit.test('adding a simple filter works', async function (assert) {
            assert.expect(5);

            delete this.fields.date_field;

            const fmg = await createComponent(FilterGeneratorMenu, {
                props: {
                    fields: this.fields,
                },
                handlers: {
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
                handlers: {
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

        QUnit.test('Custom Filter datetime with equal operator', async function (assert) {
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
                handlers: {
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

        QUnit.test('Custom Filter datetime between operator', async function (assert) {
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
                handlers: {
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

        // TODO(dam): there should be more tests here!
    });
});
