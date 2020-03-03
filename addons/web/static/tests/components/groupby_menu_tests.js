odoo.define('web.groupby_menu_tests', function (require) {
    "use strict";

    const testUtils = require('web.test_utils');

    const { createControlPanel } = testUtils;

    const searchMenuTypes = ['groupBy'];

    QUnit.module('Components', {
        beforeEach: function () {
            this.fields = {
                bar: { string: "Bar", type: "many2one", relation: 'partner' },
                birthday: { string: "Birthday", type: "date", store: true, sortable: true },
                date_field: { string: "Date", type: "date", store: true, sortable: true },
                float_field: { string: "Float", type: "float", group_operator: 'sum' },
                foo: { string: "Foo", type: "char", store: true, sortable: true },
            };
        },
    }, function () {

        QUnit.module('GroupByMenu');

        QUnit.test('simple rendering with neither groupbys nor groupable fields', async function (assert) {

            assert.expect(1);
            const params = {
                cpStoreConfig: { searchMenuTypes },
                cpProps: { fields: {}, searchMenuTypes },
            };
            const { controlPanel, el } = await createControlPanel(params);

            assert.containsNone(el, '.o_menu_item, .dropdown-divider, div.o_generator_menu');

            controlPanel.destroy();
        });

        QUnit.test('simple rendering with no groupby', async function (assert) {
            assert.expect(5);

            const params = {
                cpStoreConfig: { searchMenuTypes },
                cpProps: { fields: this.fields, searchMenuTypes },
            };
            const { controlPanel, el, helpers } = await createControlPanel(params);

            await helpers.toggleGroupByMenu();
            assert.containsNone(el, '.o_menu_item, .dropdown-divider');
            assert.containsOnce(el, 'div.o_generator_menu');

            await helpers.toggleAddCustomGroup();

            const optionEls = el.querySelectorAll('div.o_generator_menu select.o_group_by_selector option');
            assert.strictEqual(optionEls[0].innerText.trim(), 'Birthday');
            assert.strictEqual(optionEls[1].innerText.trim(), 'Date');
            assert.strictEqual(optionEls[2].innerText.trim(), 'Foo');

            controlPanel.destroy();
        });

        QUnit.test('simple rendering with a single groupby', async function (assert) {
            assert.expect(4);

            const arch = `
                <search>
                    <filter string="Groupby Foo" name="gb_foo" context="{'group_by': 'foo'}"/>
                </search>`;
            const params = {
                cpStoreConfig: { viewInfo: { arch, fields: this.fields }, searchMenuTypes },
                cpProps: { fields: this.fields, searchMenuTypes },
            };
            const { controlPanel, el, helpers } = await createControlPanel(params);

            await helpers.toggleGroupByMenu();
            assert.containsOnce(el, '.o_menu_item');
            assert.strictEqual(el.querySelector('.o_menu_item').innerText.trim(), "Groupby Foo");
            assert.containsOnce(el, '.dropdown-divider');
            assert.containsOnce(el, 'div.o_generator_menu');

            controlPanel.destroy();
        });

        QUnit.test('toggle a "simple" groupby in groupby menu works', async function (assert) {
            assert.expect(9);

            const groupBys = [['foo'], []];
            const arch = `
                <search>
                    <filter string="Groupby Foo" name="gb_foo" context="{'group_by': 'foo'}"/>
                </search>`;
            const params = {
                cpStoreConfig: { viewInfo: { arch, fields: this.fields }, searchMenuTypes },
                cpProps: { fields: this.fields, searchMenuTypes },
                search: function (searchQuery) {
                    const { groupBy } = searchQuery;
                    assert.deepEqual(groupBy, groupBys.shift());
                },
            };
            const { controlPanel, el, helpers } = await createControlPanel(params);

            await helpers.toggleGroupByMenu();
            assert.deepEqual(helpers.getFacetTexts(), []);

            assert.notOk(helpers.isItemSelected(0));

            await helpers.toggleMenuItem(0);
            assert.deepEqual(helpers.getFacetTexts(), ['Groupby Foo']);
            assert.containsOnce(el.querySelector('.o_searchview .o_searchview_facet'),
                'span.fa.fa-bars.o_searchview_facet_label');
            assert.ok(helpers.isItemSelected(0));

            await helpers.toggleMenuItem(0);
            assert.deepEqual(helpers.getFacetTexts(), []);
            assert.notOk(helpers.isItemSelected(0));

            controlPanel.destroy();
        });

        QUnit.test('toggle a "simple" groupby quickly does not crash', async function (assert) {
            assert.expect(1);

            const arch = `
                <search>
                    <filter string="Groupby Foo" name="gb_foo" context="{'group_by': 'foo'}"/>
                </search>`;
            const params = {
                cpStoreConfig: { viewInfo: { arch, fields: this.fields }, searchMenuTypes },
                cpProps: { fields: this.fields, searchMenuTypes },
            };
            const { controlPanel, helpers } = await createControlPanel(params);

            await helpers.toggleGroupByMenu();

            helpers.toggleMenuItem(0);
            helpers.toggleMenuItem(0);

            assert.ok(true);
            controlPanel.destroy();
        });

        QUnit.test('remove a "Group By" facet properly unchecks groupbys in groupby menu', async function (assert) {
            assert.expect(5);

            const arch = `
                <search>
                    <filter string="Groupby Foo" name="gb_foo" context="{'group_by': 'foo'}"/>
                </search>`;
            const params = {
                cpStoreConfig: {
                    viewInfo: { arch, fields: this.fields },
                    searchMenuTypes,
                    actionContext: { search_default_gb_foo: 1 }
                },
                cpProps: { fields: this.fields, searchMenuTypes },
                search: function (searchQuery) {
                    const { groupBy } = searchQuery;
                    assert.deepEqual(groupBy, []);
                },
            };
            const { controlPanel, el, helpers } = await createControlPanel(params);

            await helpers.toggleGroupByMenu();
            const facetEl = el.querySelector('.o_searchview .o_searchview_facet');
            assert.strictEqual(facetEl.innerText.trim(), "Groupby Foo");
            assert.ok(helpers.isItemSelected(0));

            await testUtils.dom.click(facetEl.querySelector('i.o_facet_remove'));
            assert.containsNone(el, '.o_searchview .o_searchview_facet');
            await helpers.toggleGroupByMenu();
            assert.notOk(helpers.isItemSelected(0));

            controlPanel.destroy();
        });

        QUnit.test('group by a date field using interval works', async function (assert) {
            assert.expect(21);

            const groupBys = [
                ['date_field:year', 'date_field:week' ],
                ['date_field:year', 'date_field:month', 'date_field:week'],
                ['date_field:year', 'date_field:month'],
                ['date_field:year'],
                []
            ];

            const arch = `
                <search>
                    <filter string="Date" name="date" context="{'group_by': 'date_field:week'}"/>
                </search>`;
            const params = {
                cpStoreConfig: {
                    viewInfo: { arch, fields: this.fields },
                    searchMenuTypes,
                    actionContext: { search_default_date: 1 }
                },
                cpProps: { fields: this.fields, searchMenuTypes },
                search: function (searchQuery) {
                    const { groupBy } = searchQuery;
                    assert.deepEqual(groupBy, groupBys.shift());
                },
            };

            const { controlPanel, el, helpers } = await createControlPanel(params);

            await helpers.toggleGroupByMenu();
            await helpers.toggleMenuItem(0);

            const optionEls = el.querySelectorAll('ul.o_menu_item_options > li.o_item_option > a');

            // default groupby should be activated with the  default inteval 'week'
            const { groupBy } = helpers.getQuery();
            assert.deepEqual(groupBy, ['date_field:week']);

            assert.ok(helpers.isOptionSelected(0, 3));

            // check option descriptions
            const optionDescriptions = [...optionEls].map(e => e.innerText.trim());
            const expectedDescriptions = ['Year', 'Quarter', 'Month', 'Week', 'Day'];
            assert.deepEqual(optionDescriptions, expectedDescriptions);

            const steps = [
                { description: 'Year', facetContent: 'Date: Year>Date: Week', selectedoptions: [0, 3] },
                { description: 'Month', facetContent: 'Date: Year>Date: Month>Date: Week', selectedoptions: [0, 2, 3] },
                { description: 'Week', facetContent: 'Date: Year>Date: Month', selectedoptions: [0, 2] },
                { description: 'Month', facetContent: 'Date: Year', selectedoptions: [0] },
                { description: 'Year', selectedoptions: [] },
            ];
            for (const s of steps) {
                const index = expectedDescriptions.indexOf(s.description);
                await helpers.toggleMenuItemOption(0, index);
                if (s.facetContent) {
                    assert.deepEqual(helpers.getFacetTexts(), [s.facetContent]);
                } else {
                    assert.deepEqual(helpers.getFacetTexts(), []);
                }
                s.selectedoptions.forEach(index => {
                    assert.ok(helpers.isOptionSelected(0, index));
                });
            }
            controlPanel.destroy();
        });

        QUnit.test('interval options are correctly grouped and ordered', async function (assert) {
            assert.expect(8);

            const arch = `
                <search>
                    <filter string="Bar" name="bar" context="{'group_by': 'bar'}"/>
                    <filter string="Date" name="date" context="{'group_by': 'date_field'}"/>
                    <filter string="Foo" name="foo" context="{'group_by': 'foo'}"/>
                </search>
            `;
            const params = {
                cpStoreConfig: {
                    viewInfo: { arch, fields: this.fields },
                    searchMenuTypes,
                    actionContext: { search_default_bar: 1 }
                },
                cpProps: { fields: this.fields, searchMenuTypes },
            };

            const { controlPanel, helpers } = await createControlPanel(params);

            assert.deepEqual(helpers.getFacetTexts(), ['Bar']);

            // open menu 'Group By'
            await helpers.toggleGroupByMenu();

            // Open the groupby 'Date'
            await helpers.toggleMenuItem('Date');
            // select option 'week'
            await helpers.toggleMenuItemOption('Date', 'Week');
            assert.deepEqual(helpers.getFacetTexts(), ['Bar>Date: Week']);

            // select option 'day'
            await helpers.toggleMenuItemOption('Date', 'Day');
            assert.deepEqual(helpers.getFacetTexts(), ['Bar>Date: Week>Date: Day']);

            // select option 'year'
            await helpers.toggleMenuItemOption('Date', 'Year');
            assert.deepEqual(helpers.getFacetTexts(), ['Bar>Date: Year>Date: Week>Date: Day']);

            // select 'Foo'
            await helpers.toggleMenuItem('Foo');
            assert.deepEqual(helpers.getFacetTexts(), ['Bar>Date: Year>Date: Week>Date: Day>Foo']);

            // select option 'quarter'
            await helpers.toggleMenuItemOption('Date', 'Quarter');
            assert.deepEqual(helpers.getFacetTexts(), ['Bar>Date: Year>Date: Quarter>Date: Week>Date: Day>Foo']);

            // unselect 'Bar'
            await helpers.toggleMenuItem('Bar');
            assert.deepEqual(helpers.getFacetTexts(), ['Date: Year>Date: Quarter>Date: Week>Date: Day>Foo']);

            // unselect option 'week'
            await helpers.toggleMenuItemOption('Date', 'Week');
            assert.deepEqual(helpers.getFacetTexts(), ['Date: Year>Date: Quarter>Date: Day>Foo']);

            controlPanel.destroy();
        });

        QUnit.test('the ID field should not be proposed in "Add Custom Group" menu', async function (assert) {
            assert.expect(2);

            const fields = {
                foo: { string: "Foo", type: "char", store: true, sortable: true },
                id: { sortable: true, string: 'ID', type: 'integer' }
            };
            const params = {
                cpStoreConfig: { searchMenuTypes },
                cpProps: { fields, searchMenuTypes },
            };
            const { controlPanel, el, helpers } = await createControlPanel(params);

            await helpers.toggleGroupByMenu();
            await helpers.toggleAddCustomGroup();

            const optionEls = el.querySelectorAll('div.o_generator_menu select.o_group_by_selector option');
            assert.strictEqual(optionEls.length, 1);
            assert.strictEqual(optionEls[0].innerText.trim(), "Foo");

            controlPanel.destroy();
        });

        QUnit.test('add a date field in "Add Custome Group" activate a groupby with global default option "month"', async function (assert) {
            assert.expect(4);

            const fields = {
                date_field: { string: "Date", type: "date", store: true, sortable: true },
                id: { sortable: true, string: 'ID', type: 'integer' }
            };
            const params = {
                cpStoreConfig: { viewInfo: { fields }, searchMenuTypes },
                cpProps: { fields, searchMenuTypes },
                search: function (searchQuery) {
                    const { groupBy } = searchQuery;
                    assert.deepEqual(groupBy, ['date_field:month']);
                }
            };
            const { controlPanel, helpers } = await createControlPanel(params);

            await helpers.toggleGroupByMenu();
            await helpers.toggleAddCustomGroup();
            await helpers.applyGroup();

            assert.deepEqual(helpers.getFacetTexts(), ['Date: Month']);

            assert.ok(helpers.isItemSelected("Date"));
            await helpers.toggleMenuItem("Date");
            assert.ok(helpers.isOptionSelected("Date", "Month"));

            controlPanel.destroy();
        });

        QUnit.test('default groupbys can be ordered', async function (assert) {
            assert.expect(2);

            const arch = `
                <search>
                    <filter string="Birthday" name="birthday" context="{'group_by': 'birthday'}"/>
                    <filter string="Date" name="date" context="{'group_by': 'date_field:week'}"/>
                </search>`;
            const params = {
                cpStoreConfig: {
                    viewInfo: { arch, fields: this.fields },
                    searchMenuTypes,
                    actionContext: { search_default_birthday: 2, search_default_date: 1 }
                },
                cpProps: { fields: this.fields, searchMenuTypes },
            };

            const { controlPanel, helpers } = await createControlPanel(params);

            // the defautl groupbys should be activated in the right order
            const { groupBy } = helpers.getQuery();
            assert.deepEqual(groupBy, ['date_field:week', 'birthday:month']);
            assert.deepEqual(helpers.getFacetTexts(), ['Date: Week>Birthday: Month']);

            controlPanel.destroy();
        });

        QUnit.test('a separator in groupbys does not cause problems', async function (assert) {
            assert.expect(23);

            const arch = `
                <search>
                    <filter string="Date" name="coolName" context="{'group_by': 'date_field'}"/>
                    <separator/>
                    <filter string="Bar" name="superName" context="{'group_by': 'bar'}"/>
                '</search>`;

            const params = {
                cpStoreConfig: {
                    viewInfo: { arch, fields: this.fields },
                    searchMenuTypes,
                },
                cpProps: { fields: this.fields, searchMenuTypes },
            };

            const { controlPanel, el, helpers } = await createControlPanel(params);

            await helpers.toggleGroupByMenu();
            await helpers.toggleMenuItem(0);
            await helpers.toggleMenuItemOption(0, 4);

            assert.ok(helpers.isItemSelected(0));
            assert.notOk(helpers.isItemSelected(1));
            assert.ok(helpers.isOptionSelected(0, 4), 'selected');
            assert.deepEqual(helpers.getFacetTexts(), ['Date: Day']);

            await helpers.toggleMenuItem(1);
            assert.ok(helpers.isItemSelected(0));
            assert.ok(helpers.isItemSelected(1));
            assert.ok(helpers.isOptionSelected(0, 4), 'selected');
            assert.deepEqual(helpers.getFacetTexts(), ['Date: Day>Bar']);

            await helpers.toggleMenuItemOption(0, 1);
            assert.ok(helpers.isItemSelected(0));
            assert.ok(helpers.isItemSelected(1));
            assert.ok(helpers.isOptionSelected(0, 1), 'selected');
            assert.ok(helpers.isOptionSelected(0, 4), 'selected');
            assert.deepEqual(helpers.getFacetTexts(), ['Date: Quarter>Date: Day>Bar']);

            await helpers.toggleMenuItem(1);
            assert.ok(helpers.isItemSelected(0));
            assert.notOk(helpers.isItemSelected(1));
            assert.ok(helpers.isOptionSelected(0, 1), 'selected');
            assert.ok(helpers.isOptionSelected(0, 4), 'selected');
            assert.deepEqual(helpers.getFacetTexts(), ['Date: Quarter>Date: Day']);

            await testUtils.dom.click(el.querySelector('.o_searchview_facet i.o_facet_remove'));
            assert.deepEqual(helpers.getFacetTexts(), []);

            await helpers.toggleGroupByMenu();
            await helpers.toggleMenuItem(0);
            assert.notOk(helpers.isItemSelected(0));
            assert.notOk(helpers.isItemSelected(1));
            assert.notOk(helpers.isOptionSelected(0, 1), 'selected');
            assert.notOk(helpers.isOptionSelected(0, 4), 'selected');

            controlPanel.destroy();
        });
    });
});