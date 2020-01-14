odoo.define('web.groupby_menu_tests', function (require) {
"use strict";

const testUtils = require('web.test_utils');

const { createControlPanel } = testUtils;

const searchMenuTypes = ['groupBy'];

async function toggleGroupByMenu(el) {
    await testUtils.dom.click(el.querySelector('div.o_group_by_menu button'));
}

async function toggleAddCustomGroupMenu(el) {
    await testUtils.dom.click(el.querySelector('button.o_add_custom_group_by'));
}

QUnit.module('GroupByMenu', {
    beforeEach: function () {
        this.fields = {
            bar: {string: "Bar", type: "many2one", relation: 'partner'},
            birthday: {string: "Birthday", type: "date", store: true, sortable: true},
            date_field: {string: "Date", type: "date", store: true, sortable: true},
            float_field: {string: "Float", type: "float", group_operator: 'sum'},
            foo: {string: "Foo", type: "char", store: true, sortable: true},
        };
    },
}, function () {

    QUnit.test('simple rendering with neither groupbys nor groupable fields', async function (assert) {

        assert.expect(1);
        const params = {
            cpStoreConfig: { searchMenuTypes },
            cpProps: { fields: {}, searchMenuTypes },
        };
        const { parent , el } = await createControlPanel(params);

        assert.containsNone(el, '.o_menu_item, .dropdown-divider, div.o_menu_generator');

        parent.destroy();
    });

    QUnit.test('simple rendering with no groupby', async function (assert) {
        assert.expect(5);

        const params = {
            cpStoreConfig: { searchMenuTypes },
            cpProps: { fields: this.fields, searchMenuTypes },
        };
        const { parent , el } = await createControlPanel(params);

        await toggleGroupByMenu(el);
        assert.containsNone(el, '.o_menu_item, .dropdown-divider');
        assert.containsOnce(el, 'div.o_menu_generator');

        await toggleAddCustomGroupMenu(el);

        const optionEls = el.querySelectorAll('div.o_menu_generator select.o_group_selector option');
        assert.strictEqual(optionEls[0].innerText, 'Birthday');
        assert.strictEqual(optionEls[1].innerText, 'Date');
        assert.strictEqual(optionEls[2].innerText, 'Foo');

        parent.destroy();
    });

    QUnit.test('simple rendering with a single groupby', async function (assert) {
        assert.expect(4);

        const arch = `
            <search>
                <filter string="Groupby Foo" name="gb_foo" context="{'group_by': 'foo'}"/>
            </search>
            `
        const params = {
            cpStoreConfig: { viewInfo: { arch, fields: this.fields }, searchMenuTypes },
            cpProps: { fields: this.fields, searchMenuTypes },
        };
        const { parent , el } = await createControlPanel(params);

        await toggleGroupByMenu(el);
        assert.containsOnce(el, '.o_menu_item');
        assert.strictEqual(el.querySelector('.o_menu_item').innerText, 'Groupby Foo');
        assert.containsOnce(el, '.dropdown-divider');
        assert.containsOnce(el, 'div.o_menu_generator');

        parent.destroy();
    });

    QUnit.test('toggle a "simple" groupby in groupby menu works', async function (assert) {
        assert.expect(10);

        const groupBys = [['foo'], []];
        const arch = `
        <search>
            <filter string="Groupby Foo" name="gb_foo" context="{'group_by': 'foo'}"/>
        </search>`;
        const params = {
            cpStoreConfig: { viewInfo: { arch, fields: this.fields }, searchMenuTypes },
            cpProps: { fields: this.fields, searchMenuTypes },
            handlers: {
                _onSearch: function (ev) {
                    const { groupBy } = ev.detail;
                    assert.deepEqual(groupBy, groupBys.shift());
                }
            },
        };
        const { parent , el } = await createControlPanel(params);

        await toggleGroupByMenu(el);
        assert.containsNone(el, '.o_searchview .o_searchview_facet');
        const item = el.querySelector('div.o_group_by_menu ul .o_menu_item > a');
        assert.doesNotHaveClass(item, 'selected');

        await testUtils.dom.click(item);
        assert.containsOnce(el, '.o_searchview .o_searchview_facet');
        assert.strictEqual(el.querySelector('.o_searchview .o_searchview_facet').innerText, 'Groupby Foo');
        assert.containsOnce(el.querySelector('.o_searchview .o_searchview_facet'),
            'span.fa.fa-bars.o_searchview_facet_label');
        assert.hasClass(item, 'selected');

        await testUtils.dom.click(item);
        assert.containsNone(el, '.o_searchview .o_searchview_facet');
        assert.doesNotHaveClass(item, 'selected');

        parent.destroy();
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
        const { parent , el } = await createControlPanel(params);

        await toggleGroupByMenu(el);

        const item = el.querySelector('div.o_group_by_menu ul .o_menu_item > a');
        testUtils.dom.click(item);
        testUtils.dom.click(item);

        assert.ok(true);
        parent.destroy();
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
            handlers: {
                _onSearch: function (ev) {
                    const { groupBy } = ev.detail;
                    assert.deepEqual(groupBy, []);
                }
            },
        };
        const { parent , el } = await createControlPanel(params);

        await toggleGroupByMenu(el);
        const facetEl = el.querySelector('.o_searchview .o_searchview_facet');
        assert.strictEqual(facetEl.innerText, 'Groupby Foo');
        const item = el.querySelector('div.o_group_by_menu ul .o_menu_item > a');
        assert.hasClass(item, 'selected');

        await testUtils.dom.click(facetEl.querySelector('i.o_facet_remove'));
        assert.containsNone(el, '.o_searchview .o_searchview_facet');
        assert.doesNotHaveClass(item, 'selected');

        parent.destroy();
    });

     QUnit.test('group by a date field using interval works', async function (assert) {
        assert.expect(22);

        const groupBys = [
            ['date_field:week', 'date_field:year'],
            ['date_field:week', 'date_field:year', 'date_field:month'],
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
            handlers: {
                _onSearch: function (ev) {
                    const { groupBy } = ev.detail;
                    assert.deepEqual(groupBy, groupBys.shift());
                }
            },
        };

        const { parent , el } = await createControlPanel(params);

        await toggleGroupByMenu(el);
        await testUtils.dom.click(el.querySelector('.o_menu_item > a'));

        const optionEls = el.querySelectorAll('ul.o_menu_item_options > li > a.o_item_option');

        // default groupby should be activated with the global default inteval 'month'
        const { groupBy } = parent.controlPanelStore.getQuery();
        assert.deepEqual(groupBy, ['date_field:week']);

        const item = el.querySelector('div.o_group_by_menu ul .o_menu_item > a');
        assert.hasClass(item, 'selected');
        assert.hasClass(optionEls[3], 'selected');

        // check option descriptions
        const optionDescriptions = [...optionEls].map(e => {
            return e.innerText;
        })
        const expectedDescriptions = ['Year', 'Quarter', 'Month', 'Week', 'Day'];
        assert.deepEqual(optionDescriptions, expectedDescriptions);

        const steps = [
            { description: 'Year', facetContent: 'Date: Week>Date: Year', selectedoptions: [0, 3]},
            { description: 'Month', facetContent: 'Date: Week>Date: Year>Date: Month', selectedoptions: [0, 2, 3]},
            { description: 'Week', facetContent: 'Date: Year>Date: Month', selectedoptions: [0, 2]},
            { description: 'Month', facetContent: 'Date: Year', selectedoptions: [0]},
            { description: 'Year', selectedoptions: []},
        ];
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
                assert.hasClass(optionEls[index], 'selected')
            });
        }
        parent.destroy();
    });

    QUnit.test('the ID field should not be proposed in "Add Custom Group" menu', async function (assert) {
        assert.expect(2);

        const fields = {
            foo: {string: "Foo", type: "char", store: true, sortable: true},
            id: { sortable: true, string: 'ID', type: 'integer'}
        };
        const params = {
            cpStoreConfig: { searchMenuTypes },
            cpProps: { fields, searchMenuTypes },
        };
        const { parent , el } = await createControlPanel(params);

        await toggleGroupByMenu(el);
        await toggleAddCustomGroupMenu(el);

        const optionEls = el.querySelectorAll('div.o_menu_generator select.o_group_selector option');
        assert.strictEqual(optionEls.length, 1);
        assert.strictEqual(optionEls[0].innerText, 'Foo');

        parent.destroy();
    });

    QUnit.test('add a date field in "Add Custome Group" activate a groupby with global default option "month"', async function (assert) {
        assert.expect(4);

        const fields = {
            date_field: {string: "Date", type: "date", store: true, sortable: true},
            id: { sortable: true, string: 'ID', type: 'integer'}
        };
        const params = {
            cpStoreConfig: { viewInfo: { fields }, searchMenuTypes },
            cpProps: { fields, searchMenuTypes },
            handlers: {
                _onSearch: function (ev) {
                    const { groupBy } = ev.detail;
                    assert.deepEqual(groupBy, ['date_field:month']);
                }
            }
        };
        const { parent , el } = await createControlPanel(params);

        await toggleGroupByMenu(el);
        await toggleAddCustomGroupMenu(el);
        await testUtils.dom.click(el.querySelector('button.o_apply_group'));

        assert.strictEqual( el.querySelector('.o_searchview .o_searchview_facet').innerText,'Date: Month');

        const itemEl = el.querySelector('.o_menu_item > a');
        assert.hasClass(itemEl, 'selected');
        await testUtils.dom.click(itemEl);
        const optionEls = el.querySelectorAll('ul.o_menu_item_options > li > a.o_item_option');
        assert.hasClass(optionEls[2], 'selected');

        parent.destroy();
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

        const { parent, el } = await createControlPanel(params);

        // the defautl groupbys should be activated in the right order
        const { groupBy } = parent.controlPanelStore.getQuery();
        assert.deepEqual(groupBy, ['date_field:week', 'birthday:month']);
        assert.strictEqual(el.querySelector('.o_searchview .o_searchview_facet').innerText,
            'Date: Week>Birthday: Month');

        parent.destroy();
    });

    QUnit.skip('a separator in groupbys does not cause problems', async function (assert) {
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

        const { parent, el } = await createControlPanel(params);

        await toggleGroupByMenu(el);

        let itemEls = el.querySelectorAll('.o_menu_item > a');
        await testUtils.dom.click(itemEls[0]);
        let optionEls = el.querySelectorAll('ul.o_menu_item_options > li > a.o_item_option');
        await testUtils.dom.click(optionEls[4]);
        assert.hasClass(itemEls[0], 'selected');
        assert.doesNotHaveClass(itemEls[1], 'selected');
        assert.hasClass(optionEls[4], 'selected');
        assert.strictEqual(el.querySelector('.o_searchview .o_searchview_facet').innerText, 'Date: Day');

        await testUtils.dom.click(itemEls[1]);
        assert.hasClass(itemEls[0], 'selected');
        assert.hasClass(itemEls[1], 'selected');
        assert.hasClass(optionEls[4], 'selected');
        assert.strictEqual(el.querySelector('.o_searchview .o_searchview_facet').innerText, 'Date: Day>Bar');

        await testUtils.dom.click(optionEls[1]);
        assert.hasClass(itemEls[0], 'selected');
        assert.hasClass(itemEls[1], 'selected');
        assert.hasClass(optionEls[4], 'selected');
        assert.hasClass(optionEls[1], 'selected');
        assert.strictEqual(el.querySelector('.o_searchview .o_searchview_facet').innerText,
            'Date: Day>Bar>Date: Quarter');

        await testUtils.dom.click(itemEls[1]);
        assert.hasClass(itemEls[0], 'selected');
        assert.doesNotHaveClass(itemEls[1], 'selected');
        assert.hasClass(optionEls[4], 'selected');
        assert.hasClass(optionEls[1], 'selected');
        assert.strictEqual(el.querySelector('.o_searchview .o_searchview_facet').innerText,
            'Date: Day>Date: Quarter');

        await testUtils.dom.click(el.querySelector('.o_searchview_facet i.o_facet_remove'));
        assert.containsNone(el, '.o_searchview .o_searchview_facet');

        // todo: remove comments does not work because the Group By menu does not close after the click on
        // '.o_facet_remove'
        // await toggleGroupByMenu(el);
        itemEls = el.querySelectorAll('.o_menu_item > a');
        // await testUtils.dom.click(itemEls[0]);
        optionEls = el.querySelectorAll('ul.o_menu_item_options > li > a.o_item_option');
        assert.doesNotHaveClass(itemEls[0], 'selected');
        assert.doesNotHaveClass(itemEls[1], 'selected');
        assert.doesNotHaveClass(optionEls[4], 'selected');
        assert.doesNotHaveClass(optionEls[1], 'selected');

        parent.destroy();
    });

    });
});