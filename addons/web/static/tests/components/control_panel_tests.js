odoo.define('web.control_panel_tests', function (require) {
"use strict";

const testUtils = require('web.test_utils');

const { createControlPanel } = testUtils;

QUnit.module('ControlPanel', {
    beforeEach() {
        this.fields = {
            display_name: { string: "Displayed name", type: 'char', searchable: true },
            foo: {string: "Foo", type: "char", default: "My little Foo Value", store: true, sortable: true, searchable: true },
            date_field: {string: "Date", type: "date", store: true, sortable: true, searchable: true },
            float_field: {string: "Float", type: "float", searchable: true },
            bar: {string: "Bar", type: "many2one", relation: 'partner', searchable: true },
        };
    }
}, function () {

    QUnit.module('Keyboard navigation');

    QUnit.test('remove a facet with backspace', async function (assert) {
        assert.expect(3);

        const params = {
            cpStoreConfig: {
                viewInfo: {
                    arch: `<search> <field name="foo"/></search>`,
                    fields: this.fields,
                },
                actionContext: { search_default_foo: "a" },
            },
            cpProps: { fields: this.fields }
        };

        const { parent , el } = await createControlPanel(params);

        assert.containsOnce(el, 'div.o_searchview div.o_searchview_facet');
        assert.strictEqual(
            el.querySelector('div.o_searchview div.o_searchview_facet').innerText.replace(/[\s\t]+/g, ""),
            "Fooa"
        );

        // delete a facet
        const searchInput = el.querySelector('input.o_searchview_input');
        await testUtils.dom.triggerEvent(searchInput, 'keydown', { key: 'Backspace' });

        assert.containsNone(el, 'div.o_searchview div.o_searchview_facet');

        // delete nothing (should not crash)
        await testUtils.dom.triggerEvent(searchInput, 'keydown', { key: 'Backspace' });

        parent.destroy();
    });

    QUnit.skip('fields and filters with groups/invisible attribute', async function (assert) {
        //navigation and automatic menu closure don't work here (i don't know why yet) -->
        // should be tested separatly
        assert.expect(13);

        const arch = `
            <search>
                <field name="display_name" string="Foo B" invisible="1"/>
                <field name="foo" string="Foo A"/>
                <filter name="filterA" string="FA" domain="[]"/>
                <filter name="filterB" string="FB" invisible="1" domain="[]"/>
                <filter name="groupByA" string="GA" context="{ 'group_by': 'date_field:day' }"/>
                <filter name="groupByB" string="GB" context="{ 'group_by': 'date_field:day' }" invisible="1"/>
            </search>`;
        const searchMenuTypes = ['filter', 'groupBy'];
        const params = {
            cpStoreConfig: {
                viewInfo: { arch, fields: this.fields },
                actionContext: {
                    search_default_display_name: 'value',
                    search_default_filterB: true,
                    search_default_groupByB: true
                },
                searchMenuTypes
            },
            cpProps:  { fields: this.fields, searchMenuTypes }
        };
        const { parent , el } = await createControlPanel(params);

        function selectorContainsValue(selector, value, shouldContain) {
            const elements = [...el.querySelectorAll(selector)];
            const matches = elements.filter(el => el.innerText.match(value));
            assert.strictEqual(matches.length, shouldContain ? 1 : 0,
                `${selector} in the control panel should${shouldContain ? '' : ' not'} contain ${value}.`
            );
        }

        // default filters/fields should be activated even if invisible
        assert.containsN(el, 'div.o_searchview_facet', 3);
        assert.strictEqual(el.querySelector('.o_searchview_facet').innerText.replace(/[\s\t]+/g, ""),
            "FooBvalue");
        selectorContainsValue('.o_searchview_facet .o_facet_values', "FB", true);
        selectorContainsValue('.o_searchview_facet .o_facet_values', "GB", true);

        await testUtils.dom.click(el.querySelector('.o_filter_menu button'));
        selectorContainsValue('.o_menu_item a', "FA", true);
        selectorContainsValue('.o_menu_item a', "FB", false);

        await testUtils.dom.click(el.querySelector('.o_group_by_menu button'));

        selectorContainsValue('.o_menu_item a', "GA", true);
        selectorContainsValue('.o_menu_item a', "GB", false);

        // 'A' to filter nothing on bar
        const searchInput = el.querySelector('.o_searchview_input');
        await testUtils.fields.editInput(searchInput, 'A');
        // the only item in autocomplete menu should be FooA: a
        assert.strictEqual(el.querySelector('.o_searchview_autocomplete').innerText.replace(/[\s\t]+/g, ""), "SearchFooAfor:A");
        await testUtils.dom.triggerEvent(searchInput, 'keydown', { key: 'Enter' });
        selectorContainsValue('.o_searchview_facet .o_facet_values', "FooAa", true);

        // The items in the Filters menu and the Group By menu should be the same as before
        await testUtils.dom.click(el.querySelector('.o_filter_menu button'));

        selectorContainsValue('.o_menu_item a', "FA", true);
        selectorContainsValue('.o_menu_item a', "FB", false);

        await testUtils.dom.click(el.querySelector('.o_group_by_menu button'));

        selectorContainsValue('.o_menu_item a', "GA", true);
        selectorContainsValue('.o_menu_item a', "GB", false);

        parent.destroy();
    });

    // don't think it should be here (not control panel business)

    // QUnit.test('default breadcrumb in abstract action', async function (assert) {
    //     assert.expect(1);

    //     const ConcreteAction = AbstractAction.extend({
    //         hasControlPanel: true,
    //     });
    //     core.action_registry.add('ConcreteAction', ConcreteAction);

    //     const actionManager = await createActionManager();
    //     await actionManager.doAction({
    //         id: 1,
    //         name: "A Concrete Action",
    //         tag: 'ConcreteAction',
    //         type: 'ir.actions.client',
    //     });

    //     assert.strictEqual(actionManager.el.querySelector('.breadcrumb').innerText, "A Concrete Action");

    //     actionManager.destroy();
    // });


    // to do add tests about general form of control panel, e.ge. searchMenuTypes.
});
});
