odoo.define('web.filter_menu_tests', function (require) {
"use strict";

const testUtils = require('web.test_utils');

const { createControlPanel, mock } = testUtils;
const { patchDate } = mock;

const searchMenuTypes = ['filter'];

QUnit.module('FilterMenu', {
    beforeEach: function () {
        this.fields = {
            date_field: {string: "Date", type: "date", store: true, sortable: true, searchable: true},
            foo: {string: "Foo", type: "char", store: true, sortable: true},
        };
    },
}, function () {

    QUnit.test('simple rendering with no filter', async function (assert) {
        assert.expect(2);

        const params = {
            cpStoreConfig: { searchMenuTypes },
            cpProps: { fields: this.fields, searchMenuTypes },
        };
        const { parent , el, helpers } = await createControlPanel(params);

        await helpers.toggleFilterMenu();
        assert.containsNone(el, '.o_menu_item, .dropdown-divider');
        assert.containsOnce(el, 'div.o_menu_generator');

        parent.destroy();
    });

    QUnit.test('simple rendering with a single filter', async function (assert) {
        assert.expect(3);

        const arch = `
            <search>
                <filter string="Foo" name="foo" domain="[]"/>
            </search>`;
        const params = {
            cpStoreConfig: { viewInfo: { arch, fields: this.fields }, searchMenuTypes },
            cpProps: { fields: this.fields, searchMenuTypes },
        };
        const { parent , el, helpers } = await createControlPanel(params);

        await helpers.toggleFilterMenu();
        assert.containsOnce(el, '.o_menu_item');
        assert.containsOnce(el, '.dropdown-divider');
        assert.containsOnce(el, 'div.o_menu_generator');

        parent.destroy();
    });

    QUnit.test('should have Date and ID field proposed in that order in "Add custom Filter" submenu', async function (assert) {
        assert.expect(2);

        const params = {
            cpStoreConfig: { viewInfo: { fields: this.fields }, searchMenuTypes },
            cpProps: { fields: this.fields, searchMenuTypes },
        };
        const { parent , el, helpers } = await createControlPanel(params);

        await helpers.toggleFilterMenu();
        await helpers.toggleAddCustomFilter(el);
        const optionEls = el.querySelectorAll('div.o_filter_condition > select.o_menu_generator_field option');
        assert.strictEqual(optionEls[0].innerText, 'Date');
        assert.strictEqual(optionEls[1].innerText, 'ID');

        parent.destroy();
    });

    QUnit.test('toggle a "simple" filter in filter menu works', async function (assert) {
        assert.expect(10);

        const domains = [
            [['foo', '=', 'qsdf']],
            []
        ];
        const arch = `
        <search>
            <filter string="Foo" name="foo" domain="[['foo', '=', 'qsdf']]"/>
        </search>`;
        const params = {
            cpStoreConfig: { viewInfo: { arch }, searchMenuTypes },
            cpProps: { fields: {}, searchMenuTypes },
            handlers: {
                _onSearch: function (ev) {
                    const { domain } = ev.detail;
                    assert.deepEqual(domain, domains.shift());
                }
            },
        };
        const { parent, el, helpers } = await createControlPanel(params);

        await helpers.toggleFilterMenu();
        assert.containsNone(el, '.o_searchview .o_searchview_facet');
        const item = el.querySelector('div.o_filter_menu ul .o_menu_item > a');
        assert.doesNotHaveClass(item, 'selected');

        await testUtils.dom.click(item);
        assert.containsOnce(el, '.o_searchview .o_searchview_facet');
        assert.strictEqual(el.querySelector('.o_searchview .o_searchview_facet').innerText, 'Foo')
        assert.containsOnce(el.querySelector('.o_searchview .o_searchview_facet'),
            'span.fa.fa-filter.o_searchview_facet_label');
        assert.hasClass(item, 'selected');

        await testUtils.dom.click(item);
        assert.containsNone(el, '.o_searchview .o_searchview_facet');
        assert.doesNotHaveClass(item, 'selected');

        parent.destroy();
    });

    QUnit.test('add a custom filter works', async function (assert) {
        assert.expect(1);

        const params = {
            cpStoreConfig: { viewInfo: { fields: this.fields }, searchMenuTypes },
            cpProps: { fields: this.fields, searchMenuTypes },
        };
        const { parent, el, helpers } = await createControlPanel(params);

        await helpers.toggleFilterMenu();
        await helpers.toggleAddCustomFilter(el);
        // choose ID field in 'Add Custome filter' menu and value 1
        await testUtils.fields.editSelect(el.querySelector('div.o_filter_condition > select.o_menu_generator_field'), 'id');
        await testUtils.fields.editInput(el.querySelector('div.o_filter_condition > span.o_menu_generator_value > input'), 1);
        // apply condition
        await testUtils.dom.click(el.querySelector('div.o_add_filter_menu > button.o_apply_filter'));

        assert.strictEqual($('.o_searchview .o_searchview_facet .o_facet_values span').text().trim(),
            'ID is 1',
            'should have a facet with candle name');

        parent.destroy();
    });

    QUnit.test('deactivate a new custom filter works', async function (assert) {
        assert.expect(3);

        const params = {
            cpStoreConfig: { viewInfo: { fields: this.fields }, searchMenuTypes },
            cpProps: { fields: this.fields, searchMenuTypes },
        };
        const { parent, el, helpers } = await createControlPanel(params);

        await helpers.toggleFilterMenu();
        await helpers.toggleAddCustomFilter(el);
        await testUtils.dom.click(el.querySelector('div.o_add_filter_menu > button.o_apply_filter'));

        assert.containsOnce(el, '.o_searchview .o_searchview_facet');

        await testUtils.dom.click(el.querySelector('div.o_filter_menu ul .o_menu_item > a'));

        assert.containsNone(el, '.o_searchview .o_searchview_facet');
        assert.containsNone(el, 'div.o_filter_menu ul .o_menu_item > a.selected');

        parent.destroy();
    });

    QUnit.test('filter by a date field using period works', async function (assert) {
        assert.expect(56);

        const unpatchDate = patchDate(2017, 2, 22, 1, 0, 0);

        const basicDomains = [
            ["&",["date_field",">=","2017-01-01"],["date_field","<=","2017-12-31"]],
            ["&",["date_field",">=","2017-02-01"],["date_field","<=","2017-02-28"]],
            ["&",["date_field",">=","2017-01-01"],["date_field","<=","2017-12-31"]],
            ["&",["date_field",">=","2017-01-01"],["date_field","<=","2017-01-31"]],
            ["|",
                "&",["date_field",">=","2017-01-01"],["date_field","<=","2017-01-31"],
                "&",["date_field",">=","2017-10-01"],["date_field","<=","2017-12-31"]
            ],
            ["&",["date_field",">=","2017-10-01"],["date_field","<=","2017-12-31"]],
  	        ["&",["date_field",">=","2017-01-01"],["date_field","<=","2017-12-31"]],
            ["&",["date_field",">=","2017-01-01"],["date_field","<=","2017-03-31"]],
            ["&",["date_field",">=","2017-01-01"],["date_field","<=","2017-12-31"]],
            ["&",["date_field",">=","2017-01-01"],["date_field","<=","2017-12-31"]],
            ["|",
                "&",["date_field",">=","2017-01-01"],["date_field","<=","2017-12-31"],
                "&",["date_field",">=","2016-01-01"],["date_field","<=","2016-12-31"]
            ],
            ["|",
                "|",
                    "&",["date_field",">=","2017-01-01"],["date_field","<=","2017-12-31"],
                    "&",["date_field",">=","2016-01-01"],["date_field","<=","2016-12-31"],
                "&",["date_field",">=","2015-01-01"],["date_field","<=","2015-12-31"]
            ],
            ["|",
                "|",
                    "&", ["date_field",">=","2017-03-01"],["date_field","<=","2017-03-31"],
                    "&",["date_field",">=","2016-03-01"],["date_field","<=","2016-03-31"],
                "&",["date_field",">=","2015-03-01"],["date_field","<=","2015-03-31"]
            ]
        ];

        const arch = `
            <search>
                <filter string="Date" name="date_field" date="date_field"/>
            </search>`;
        const params = {
            cpStoreConfig: {
                viewInfo: { arch, fields: this.fields },
                searchMenuTypes,
                actionContext: { search_default_date_field: 1 },
            },
            cpProps: { fields: this.fields, searchMenuTypes },
            handlers: {
                _onSearch: function (ev) {
                    // we inspect query domain
                    const { domain } = ev.detail;
                    if (domain.length) {
                        assert.deepEqual(domain, basicDomains.shift());
                    }
                },
            },
        };
        const { parent, el, helpers } = await createControlPanel(params);

        await helpers.toggleFilterMenu();
        await testUtils.dom.click(el.querySelector('.o_menu_item > a'));

        const optionEls = el.querySelectorAll('ul.o_menu_item_options > li > a.o_item_option');

        // default filter should be activated with the global default period 'this_month'
        const { domain } = parent.controlPanelStore.getQuery();
        assert.deepEqual(
            domain,
            ["&",["date_field",">=","2017-03-01"],["date_field","<=","2017-03-31"]]
        );
        const item = el.querySelector('div.o_filter_menu ul .o_menu_item > a');
        assert.hasClass(item, 'selected');
        assert.hasClass(optionEls[0], 'selected');

        // check option descriptions
        const optionDescriptions = [...optionEls].map(e => {
            return e.innerText;
        })
        const expectedDescriptions = [
            'March', 'February', 'January',
            'Q4','Q3', 'Q2', 'Q1',
            '2017', '2016', '2015'
        ]
        assert.deepEqual(optionDescriptions, expectedDescriptions);

        // check generated domains
        const steps = [
            { description: 'March', facetContent: 'Date: 2017', selectedoptions: [7] },
            { description: 'February', facetContent: 'Date: February 2017', selectedoptions: [1, 7] },
            { description: 'February', facetContent: 'Date: 2017', selectedoptions: [7] },
            { description: 'January', facetContent: 'Date: January 2017', selectedoptions: [2, 7] },
            { description: 'Q4', facetContent: 'Date: January 2017 / Q4 2017', selectedoptions: [2, 3, 7] },
            { description: 'January', facetContent: 'Date: Q4 2017', selectedoptions: [3, 7] },
            { description: 'Q4', facetContent: 'Date: 2017', selectedoptions: [7] },
            { description: 'Q1', facetContent: 'Date: Q1 2017', selectedoptions: [6, 7] },
            { description: 'Q1', facetContent: 'Date: 2017', selectedoptions: [7] },
            { description: '2017', selectedoptions: [] },
            { description: '2017', facetContent: 'Date: 2017', selectedoptions: [7] },
            { description: '2016', facetContent: 'Date: 2017 / 2016', selectedoptions: [7, 8] },
            { description: '2015', facetContent: 'Date: 2017 / 2016 / 2015', selectedoptions: [7, 8, 9] },
            { description: 'March', facetContent: 'Date: March 2017 / March 2016 / March 2015', selectedoptions: [0, 7, 8, 9] }
        ]
        for (const s of steps) {
            const index = expectedDescriptions.indexOf(s.description);
            await testUtils.dom.click(optionEls[index]);
            if (s.facetContent) {
                const facetEl = el.querySelector('.o_searchview .o_searchview_facet');
                assert.strictEqual(facetEl.innerText, s.facetContent);
            } else {
                assert.containsNone(el, '.o_searchview .o_searchview_facet');
            }
            s.selectedoptions.forEach(index => {
                assert.hasClass(optionEls[index], 'selected',
                `at step ${steps.indexOf(s) + 1}, option ${expectedDescriptions[index]} should be selected`);
            });
        }

        parent.destroy();
        unpatchDate();
    });

    QUnit.test('`context` key in <filter> is used', async function (assert) {
        assert.expect(1);

        const arch = `
            <search>
                <filter string="Filter" name="some_filter" domain="[]" context="{'coucou_1': 1}"/>
            </search>`;
        const params = {
            cpStoreConfig: {
                viewInfo: { arch, fields: this.fields },
                searchMenuTypes
            },
            cpProps: { fields: this.fields, searchMenuTypes },
            handlers: {
                _onSearch: function (ev) {
                    // we inspect query context
                    const { context } = ev.detail;
                    assert.deepEqual(context, { coucou_1: 1});
                },
            },
        };
        const { parent, el, helpers } = await createControlPanel(params);

        await helpers.toggleFilterMenu();
        await testUtils.dom.click(el.querySelector('.o_menu_item > a'));

        parent.destroy();
    });

    QUnit.test('Filter with JSON-parsable domain works', async function (assert) {
        assert.expect(1);

        const originalDomain = [['foo' ,'=', 'Gently Weeps']];
        const xml_domain = JSON.stringify(originalDomain);

        const arch =
            `<search>
                <filter string="Foo" name="gently_weeps" domain="${_.escape(xml_domain)}"/>
            </search>`,
         params = {
            cpStoreConfig: {
                viewInfo: { arch, fields: this.fields },
                searchMenuTypes,
            },
            cpProps: { fields: this.fields, searchMenuTypes },
            handlers: {
                _onSearch: function (ev) {
                    const { domain } = ev.detail;
                    assert.deepEqual(domain, originalDomain,
                        'A JSON parsable xml domain should be handled just like any other'
                    );
                },
            },
        };
        const { parent, el, helpers } = await createControlPanel(params);

        await helpers.toggleFilterMenu();
        await testUtils.dom.click(el.querySelector('.o_menu_item > a'));

        parent.destroy();
    });

    QUnit.test('filter with date attribute set as search_default', async function (assert) {
        assert.expect(1);

        const unpatchDate = patchDate(2019,6,31,13,43,0);

        const arch =
            `<search>
                <filter string="Date" name="date_field" date="date_field" default_period="last_month"/>
            </search>`,
         params = {
            cpStoreConfig: {
                viewInfo: { arch, fields: this.fields },
                searchMenuTypes,
                actionContext: {
                    search_default_date_field: true
                }
            },
            cpProps: { fields: this.fields, searchMenuTypes },
        };
        const { parent, el } = await createControlPanel(params);

        assert.strictEqual(
            el.querySelector('.o_searchview_input_container .o_facet_values').innerText.trim(),
            "Date: June 2019"
        );

        parent.destroy();
        unpatchDate();
    });

    QUnit.test('filter domains are correcly combined by OR and AND', async function (assert) {
        assert.expect(2);

        const arch =
            `<search>
                <filter string="Filter Group 1" name="f_1_g1" domain="[['foo', '=', 'f1_g1']]"/>
                <separator/>
                <filter string="Filter 1 Group 2" name="f1_g2" domain="[['foo', '=', 'f1_g2']]"/>
                <filter string="Filter 2 GROUP 2" name="f2_g2" domain="[['foo', '=', 'f2_g2']]"/>
            </search>`,
         params = {
            cpStoreConfig: {
                viewInfo: { arch, fields: this.fields },
                searchMenuTypes,
                actionContext: {
                    search_default_f_1_g1: true,
                    search_default_f1_g2: true,
                    search_default_f2_g2: true,
                }
            },
            cpProps: { fields: this.fields, searchMenuTypes },
        };
        const { parent, el, helpers } = await createControlPanel(params);

        const { domain } = helpers.getQuery();
        assert.deepEqual(domain, ['&', ['foo', '=', 'f1_g1'], '|', ['foo', '=', 'f1_g2'], ['foo', '=', 'f2_g2']])

        assert.deepEqual(
            [...el.querySelectorAll('.o_searchview_input_container .o_facet_values')].map(e => e.innerText.trim()),
            ["Filter Group 1", "Filter 1 Group 2orFilter 2 GROUP 2"]
        );

        parent.destroy();
    });

    });
});