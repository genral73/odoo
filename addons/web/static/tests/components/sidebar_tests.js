odoo.define('web.sidebar_tests', function (require) {
    "use strict";

    const Sidebar = require('web.Sidebar');
    const testUtils = require('web.test_utils');

    const { createComponent } = testUtils;
    const { getHelpers } = testUtils.controlPanel;

    QUnit.module('Components', {
        beforeEach() {
            this.callbacks = [
                testUtils.makeTestPromise(),
                testUtils.makeTestPromise(),
                testUtils.makeTestPromise(),
            ];
            this.items = {
                action: [
                    { action: { id: 1 }, name: "What's taters, precious ?", id: 1 },
                ],
                print: [
                    { action: { id: 2 }, name: "Po-ta-toes", id: 2 },
                ],
                other: [
                    { description: "Boil'em", callback: this.callbacks[0].resolve },
                    { description: "Mash'em", callback: this.callbacks[1].resolve },
                    { description: "Stick it in a stew", callback: this.callbacks[2].resolve },
                ],
            };
        },
    }, function () {

        QUnit.module('Sidebar');

        QUnit.skip('basic interactions', async function (assert) {
            assert.expect(2);

            const sidebar = await createComponent(Sidebar, {
                props: {
                    items: this.items,
                },
                debug: 1,
            });
            const helpers = getHelpers(parent.el, "");

            // sidebar.destroy();
        });
    });
});
