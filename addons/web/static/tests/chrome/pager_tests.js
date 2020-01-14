odoo.define('web.pager_tests', function (require) {
    "use strict";

    const Pager = require('web.Pager');
    const testUtils = require('web.test_utils');

    const { createComponent } = testUtils;
    const { getHelpers } = testUtils.controlPanel;

    QUnit.module('Components', {}, function () {

        QUnit.module('Pager');

        QUnit.test('basic interactions', async function (assert) {
            assert.expect(2);

            const pager = await createComponent(Pager, {
                props: {
                    currentMinimum: 1,
                    limit: 4,
                    size: 10,
                },
                handlers: {
                    'pager-changed'(ev) {
                        Object.assign(this.state, ev.detail);
                    },
                },
            });
            const helpers = getHelpers(parent.el, "");

            assert.strictEqual(helpers.getPagerValue(), "1-4",
                "currentMinimum should be set to 1");

            await helpers.pagerNext();

            assert.strictEqual(helpers.getPagerValue(), "5-8",
                "currentMinimum should now be 5");

            pager.destroy();
        });

        QUnit.test('edit the pager', async function (assert) {
            assert.expect(4);

            const pager = await createComponent(Pager, {
                props: {
                    currentMinimum: 1,
                    limit: 4,
                    size: 10,
                },
                handlers: {
                    'pager-changed'(ev) {
                        Object.assign(this.state, ev.detail);
                    },
                },
            });
            const helpers = getHelpers(parent.el, "");

            await testUtils.dom.click(pager.el.querySelector('.o_pager_value'));

            assert.containsOnce(pager, 'input',
                "the pager should contain an input");
            assert.strictEqual(helpers.getPagerValue(), "1-4",
                "the input should have correct value");

            // change the limit
            await helpers.setPagerValue("1-6");

            assert.containsNone(pager, 'input',
                "the pager should not contain an input anymore");
            assert.strictEqual(helpers.getPagerValue(), "1-6",
                "the limit should have been updated");

            pager.destroy();
        });

        QUnit.test('pager value formatting', async function (assert) {
            assert.expect(8);

            const pager = await createComponent(Pager, {
                props: {
                    currentMinimum: 1,
                    limit: 4,
                    size: 10,
                },
                handlers: {
                    'pager-changed'(ev) {
                        Object.assign(this.state, ev.detail);
                    },
                },
            });
            const helpers = getHelpers(parent.el, "");

            assert.strictEqual(helpers.getPagerValue(), "1-4", "Initial value should be correct");

            async function inputAndAssert(input, expected, reason) {
                await helpers.setPagerValue(input);
                assert.strictEqual(helpers.getPagerValue(), expected,
                    `Pager value should be "${expected}" when given "${input}": ${reason}`);
            }

            await inputAndAssert("4-4", "4", "values are squashed when minimum = maximum");
            await inputAndAssert("1-11", "1-10", "maximum is floored to size when out of range");
            await inputAndAssert("20-15", "10", "combination of the 2 assertions above");
            await inputAndAssert("6-5", "10", "fallback to previous value when minimum > maximum");
            await inputAndAssert("definitelyValidNumber", "10", "fallback to previous value if not a number");
            await inputAndAssert(" 1 ,  2   ", "1-2", "value is normalized and accepts several separators");
            await inputAndAssert("3  8", "3-8", "value accepts whitespace(s) as a separator");

            pager.destroy();
        });

        QUnit.test('pager edition concurrency management', async function (assert) {
            assert.expect(2);

            const pagerChangedPromise = testUtils.makeTestPromise();
            const pager = await createComponent(Pager, {
                props: {
                    currentMinimum: 1,
                    limit: 4,
                    size: 10,
                },
                handlers: {
                    async 'pager-changed'(ev) {
                        await pagerChangedPromise;
                        Object.assign(this.state, ev.detail);
                    },
                },
            });
            const helpers = getHelpers(parent.el, "");

            await helpers.setPagerValue("1-3");

            try {
                await helpers.setPagerValue("1-7");
            } catch (err) {
                assert.ok(true, err.message);
            }

            pagerChangedPromise.resolve();
            await testUtils.nextTick();

            assert.strictEqual(helpers.getPagerValue(), "1-3");

            pager.destroy();
        });
    });
});
