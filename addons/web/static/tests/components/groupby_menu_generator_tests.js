odoo.define('web.groupby_menu_generator_tests', function (require) {
"use strict";

const GroupByMenuGenerator = require('web.GroupByMenuGenerator');
const makeTestEnvironment = require('web.test_env');
const testUtils = require('web.test_utils');

async function createGroupByMenuGenerator(fields={}, handler=null, debug=false) {
    class Parent extends owl.Component {
        constructor() {
            super();
            this.state = owl.hooks.useState({ fields });
        }
        _onCreateNewGroupBy(ev) {
            if (handler) {
                handler.bind(this)(ev);
            }
        }
    }
    Parent.env = makeTestEnvironment();
    Parent.components = { GroupByMenuGenerator };
    Parent.template = owl.tags.xml`<GroupByMenuGenerator t-props="state"
                                    t-on-create-new-groupby="_onCreateNewGroupBy"/>`;
    const parent = new Parent();
    await parent.mount(testUtils.prepareTarget(debug));
    return { parent,  el: parent.el };
}

QUnit.module('GroupByMenuGenerator', {
    beforeEach: function () {
        this.fields = [{ sortable: true, name: "date", string: 'Super Date', type: 'date' }];
    },
}, function () {

    QUnit.test('click on add custom group toggle group selector', async function (assert) {
        assert.expect(6);

        const { parent, el } = await createGroupByMenuGenerator(this.fields);

        assert.strictEqual(el.innerText, "Add Custom Group");
        assert.hasClass(el, 'o_menu_generator');
        assert.strictEqual(el.children.length, 1);

        await testUtils.dom.click(el.querySelector('button.o_add_custom_group_by'));

        // Single select node with a single option
        assert.containsOnce(el, 'div > select.o_group_selector');
        assert.strictEqual(el.querySelector('div > select.o_group_selector option').innerText,
            "Super Date");

        // Button apply
        assert.containsOnce(el, 'div > button.o_apply_group');

        parent.destroy();
    });

    QUnit.test('select a field name in Add Custom Group menu properly trigger the corresponding field', async function (assert) {
        assert.expect(3);

        this.fields = [{ sortable: true, name: 'candlelight', string: 'Candlelight', type: 'boolean' }];

        function handler(ev) {
            const { field } = ev.detail;
            assert.deepEqual(field, this.state.fields[0]);
        }

        const { parent, el } = await createGroupByMenuGenerator(this.fields, handler);

        await testUtils.dom.click(el.querySelector('button.o_add_custom_group_by'));
        await testUtils.dom.click(el.querySelector('button.o_apply_group'));

        // The only thing visible should be the button 'Add Custome Group';
        assert.strictEqual(el.children.length, 1);
        assert.containsOnce(el, 'button.o_add_custom_group_by');

        parent.destroy();
    });

});
});
