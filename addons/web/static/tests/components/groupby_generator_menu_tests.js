odoo.define('web.groupby_menu_generator_tests', function (require) {
    "use strict";

    const GroupByGeneratorMenu = require('web.GroupByGeneratorMenu');
    const testUtils = require('web.test_utils');

    const { createComponent } = testUtils;

    QUnit.module('GroupByGeneratorMenu', {}, function () {

        QUnit.test('click on add custom group toggle group selector', async function (assert) {
            assert.expect(6);

            const gbmg = await createComponent(GroupByGeneratorMenu, {
                props: {
                    fields: [
                        { sortable: true, name: "date", string: 'Super Date', type: 'date' },
                    ],
                },
            });

            assert.strictEqual(gbmg.el.innerText.trim(), "Add Custom Group");
            assert.hasClass(gbmg.el, 'o_generator_menu');
            assert.strictEqual(gbmg.el.children.length, 1);

            await testUtils.dom.click(gbmg.el.querySelector('.o_generator_menu button.o_add_custom_group_by'));

            // Single select node with a single option
            assert.containsOnce(gbmg, 'div > select.o_group_by_selector');
            assert.strictEqual(gbmg.el.querySelector('div > select.o_group_by_selector option').innerText.trim(),
                "Super Date");

            // Button apply
            assert.containsOnce(gbmg, 'button.o_apply_group_by');

            gbmg.destroy();
        });

        QUnit.test('select a field name in Add Custom Group menu properly trigger the corresponding field', async function (assert) {
            assert.expect(3);

            const gbmg = await createComponent(GroupByGeneratorMenu, {
                props: {
                    fields: [
                        { sortable: true, name: 'candlelight', string: 'Candlelight', type: 'boolean' },
                    ],
                },
                intercepts: {
                    'create-new-groupby': function (ev) {
                        const { field } = ev.detail;
                        assert.deepEqual(field, this.state.fields[0]);
                    },
                },
            });

            await testUtils.dom.click(gbmg.el.querySelector('.o_generator_menu button.o_add_custom_group_by'));
            await testUtils.dom.click(gbmg.el.querySelector('.o_generator_menu button.o_apply_group_by'));

            // The only thing visible should be the button 'Add Custome Group';
            assert.strictEqual(gbmg.el.children.length, 1);
            assert.containsOnce(gbmg, 'button.o_add_custom_group_by');

            gbmg.destroy();
        });
    });
});
