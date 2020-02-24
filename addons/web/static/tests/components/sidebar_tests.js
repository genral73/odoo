odoo.define('web.sidebar_tests', function (require) {
    "use strict";

    const Sidebar = require('web.Sidebar');
    const testUtils = require('web.test_utils');

    const { createComponent } = testUtils;
    const { getHelpers } = testUtils.controlPanel;

    QUnit.module('Components', {
        beforeEach() {
            this.action = {
                res_model: 'hobbit',
            };
            this.props = {
                activeIds: [23],
                context: {},
                items: {
                    action: [
                        { action: { id: 1 }, name: "What's taters, precious ?", id: 1 },
                    ],
                    print: [
                        { action: { id: 2 }, name: "Po-ta-toes", id: 2 },
                    ],
                    other: [
                        { description: "Boil'em", callback() { } },
                        { description: "Mash'em", callback() { } },
                        { description: "Stick it in a stew", url: '#stew' },
                    ],
                },
                viewType: 'form',
            };
        },
    }, function () {

        QUnit.module('Sidebar');

        QUnit.test('basic interactions', async function (assert) {
            assert.expect(10);

            const sidebar = await createComponent(Sidebar, {
                env: { action: this.action },
                props: this.props,
            });
            const helpers = getHelpers(sidebar.el, "");

            const dropdowns = sidebar.el.getElementsByClassName('o_dropdown');
            assert.strictEqual(dropdowns.length, 2, "Sidebar should contain 2 menus");
            assert.strictEqual(dropdowns[0].querySelector('.o_dropdown_title').innerText.trim(), "Print");
            assert.strictEqual(dropdowns[1].querySelector('.o_dropdown_title').innerText.trim(), "Action");
            assert.containsNone(sidebar, '.o_dropdown_menu');

            await helpers.toggleSideBar("Action");

            assert.containsOnce(sidebar, '.o_dropdown_menu');
            assert.containsN(sidebar, '.o_dropdown_menu .o_menu_item', 4);
            const actionsTexts = [...dropdowns[1].querySelectorAll('.o_menu_item')].map(el => el.innerText.trim());
            assert.deepEqual(actionsTexts, [
                "Boil'em",
                "Mash'em",
                "Stick it in a stew",
                "What's taters, precious ?",
            ], "callbacks should appear before actions");

            await helpers.toggleSideBar("Print");

            assert.containsOnce(sidebar, '.o_dropdown_menu');
            assert.containsN(sidebar, '.o_dropdown_menu .o_menu_item', 1);

            await helpers.toggleSideBar("Print");

            assert.containsNone(sidebar, '.o_dropdown_menu');

            sidebar.destroy();
        });

        QUnit.test('execute action', async function (assert) {
            assert.expect(4);

            const sidebar = await createComponent(Sidebar, {
                env: { action: this.action },
                props: this.props,
                intercepts: {
                    'do-action'(ev) {
                        assert.step('do-action');
                    },
                },
                async mockRPC(route, args) {
                    switch (route) {
                        case '/web/action/load':
                            const expectedContext = {
                                active_id: 23,
                                active_ids: [23],
                                active_model: 'hobbit',
                            };
                            assert.deepEqual(args.context, expectedContext);
                            assert.step('load-action');
                            return { context: {}, flags: {} };
                        default:
                            return this._super(...arguments);

                    }
                },
            });
            const helpers = getHelpers(sidebar.el, "");

            await helpers.toggleSideBar("Action");
            await helpers.toggleMenuItem("What's taters, precious ?");

            assert.verifySteps(['load-action', 'do-action']);

            sidebar.destroy();
        });

        QUnit.test('execute callback action', async function (assert) {
            assert.expect(2);

            const callbackPromise = testUtils.makeTestPromise();
            this.props.items.other[0].callback = function(items) {
                assert.strictEqual(items.length, 1);
                assert.strictEqual(items[0].description, "Boil'em");
                callbackPromise.resolve();
            };

            const sidebar = await createComponent(Sidebar, {
                env: { action: this.action },
                props: this.props,
                async mockRPC(route, args) {
                    switch (route) {
                        case '/web/action/load':
                            throw new Error("No action should be loaded.");
                        default:
                            return this._super(...arguments);
                    }
                },
            });
            const helpers = getHelpers(sidebar.el, "");

            await helpers.toggleSideBar("Action");
            await helpers.toggleMenuItem("Boil'em");

            await callbackPromise;

            sidebar.destroy();
        });

        QUnit.test('execute print action', async function (assert) {
            assert.expect(4);

            const sidebar = await createComponent(Sidebar, {
                env: { action: this.action },
                intercepts: {
                    'do-action'(ev) {
                        assert.step('do-action');
                    },
                },
                props: this.props,
                async mockRPC(route, args) {
                    switch (route) {
                        case '/web/action/load':
                            const expectedContext = {
                                active_id: 23,
                                active_ids: [23],
                                active_model: 'hobbit',
                            };
                            assert.deepEqual(args.context, expectedContext);
                            assert.step('load-action');
                            return { context: {}, flags: {} };
                        default:
                            return this._super(...arguments);

                    }
                },
            });
            const helpers = getHelpers(sidebar.el, "");

            await helpers.toggleSideBar("Print");
            await helpers.toggleMenuItem("Po-ta-toes");

            assert.verifySteps(['load-action', 'do-action']);

            sidebar.destroy();
        });

        QUnit.test('execute url action', async function (assert) {
            assert.expect(1);

            const originalHash = window.location.hash;
            const sidebar = await createComponent(Sidebar, {
                env: { action: this.action },
                props: this.props,
                async mockRPC(route, args) {
                    switch (route) {
                        case '/web/action/load':
                            throw new Error("No action should be loaded.");
                        default:
                            return this._super(...arguments);
                    }
                },
            });
            const helpers = getHelpers(sidebar.el, "");

            await helpers.toggleSideBar("Action");
            await helpers.toggleMenuItem("Stick it in a stew");

            assert.strictEqual(window.location.hash, '#stew');

            sidebar.destroy();
            window.location.hash = originalHash;
        });
    });
});
