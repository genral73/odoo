odoo.define('web.time_range_menu_tests', function (require) {
"use strict";

const testUtils = require('web.test_utils');
const { TIME_RANGE_OPTIONS, COMPARISON_TIME_RANGE_OPTIONS } = require('web.controlPanelParameters');

const { createControlPanel, mock } = testUtils;
const { patchDate } = mock;

const searchMenuTypes = ['timeRange'];

QUnit.module('TimeRangeMenu', {
    beforeEach: function () {
        this.fields = {
            birthday: {string: "Birthday", type: "date", store: true, sortable: true},
            date_field: {string: "Date", type: "date", store: true, sortable: true},
            float_field: {string: "Float", type: "float", group_operator: 'sum'},
            foo: {string: "Foo", type: "char", store: true, sortable: true},
        };
    },
}, function () {

    QUnit.test('simple rendering', async function (assert) {
        assert.expect(14);

        const params = {
            cpStoreConfig: { viewInfo: { fields: this.fields }, searchMenuTypes },
            cpProps: { fields: this.fields, searchMenuTypes },
        };
        const { parent , el, helpers } = await createControlPanel(params);

        assert.containsOnce(el, 'div.o_time_range_menu > button i.fa.fa-calendar');
        assert.strictEqual(el.querySelector('div.o_time_range_menu > button span').innerText, 'Time Ranges');
        // todo put that in dropdown_menu_tests
        assert.containsOnce(el, 'div.o_time_range_menu > button i.fa.fa-caret-right');
        //

        await helpers.toggleTimeRangeMenu();
        // todo put that in dropdown_menu_tests
        assert.containsOnce(el, 'div.o_time_range_menu > button i.fa.fa-caret-down');
        //
        assert.containsN(el, 'div.o_time_range_section', 3);

        let selectEls = el.querySelectorAll('div.o_time_range_section select');
        assert.strictEqual(selectEls.length, 2);
        assert.deepEqual([...selectEls].map(e => e.value), ['birthday', 'this_month']);
        assert.containsN(el, 'div.o_time_range_section label', 3);

        const labelEls = el.querySelectorAll('div.o_time_range_section label');
        assert.deepEqual([...labelEls].map(e => e.innerText), ['Based On', 'Range', 'Compare To']);
        assert.containsOnce(el, 'div.o_time_range_section input[type="checkbox"]');

        assert.containsOnce(el, 'div.o_time_range_menu ul button');
        assert.strictEqual(el.querySelector('div.o_time_range_menu ul button').innerText, 'APPLY');

        await helpers.toggleTimeRangeMenuBox();

        selectEls = el.querySelectorAll('div.o_time_range_section select');
        assert.strictEqual(selectEls.length, 3);
        assert.strictEqual(selectEls[2].value, 'previous_period');

        parent.destroy();
    });

    QUnit.test('initialization with default time range without comparisonRange', async function (assert) {
        assert.expect(6);

        const unpatchDate = patchDate(2020, 0, 29, 15, 0, 0);

        const params = {
            cpStoreConfig: {
                viewInfo: { fields: this.fields },
                searchMenuTypes,
                actionContext: {
                    time_ranges: { field: 'date_field', range: 'this_week' }
                }
            },
            cpProps: { fields: this.fields, searchMenuTypes },
        };
        const { parent , el, helpers } = await createControlPanel(params);

        const { timeRanges } = helpers.getQuery();
        assert.deepEqual(timeRanges, {
            fieldDescription: "Date",
            fieldName: "date_field",
            range: [
                "&",
                ["date_field", ">=", "2020-01-27"],
                ["date_field", "<", "2020-02-03"]
            ],
            rangeDescription: "This Week",
            rangeId: "this_week"
        });

        await helpers.toggleTimeRangeMenu();

        const selectEls = el.querySelectorAll('div.o_time_range_section select');
        assert.strictEqual(selectEls.length, 2);
        assert.deepEqual(
            [...selectEls].map(e => e.value),
            ['date_field', 'this_week']
        );

        assert.containsOnce(el, '.o_searchview .o_searchview_facet');
        assert.strictEqual(el.querySelector('.o_searchview .o_searchview_facet').innerText,
            'Date: This Week');
        assert.containsOnce(el.querySelector('.o_searchview .o_searchview_facet'),
        'span.fa.fa-calendar.o_searchview_facet_label');

        parent.destroy();
        unpatchDate();
    });

    QUnit.test('initialization with default time range with comparisonRange', async function (assert) {
        assert.expect(5);

        const unpatchDate = patchDate(2020, 0, 29, 15, 0, 0);

        const params = {
            cpStoreConfig: {
                viewInfo: { fields: this.fields },
                searchMenuTypes,
                actionContext: {
                    time_ranges: { field: 'date_field', range: 'today', comparisonRange: 'previous_year' }
                }
            },
            cpProps: { fields: this.fields, searchMenuTypes },
        };
        const { parent , el, helpers } = await createControlPanel(params);

        const { timeRanges } = helpers.getQuery();
        assert.deepEqual(timeRanges, {
            comparisonRange: [
                "&",
                [ "date_field", ">=", "2019-01-29"],
                ["date_field", "<", "2019-01-30"]
              ],
              comparisonRangeDescription: "Previous Year",
              comparisonRangeId: "previous_year",
              fieldDescription: "Date",
              fieldName: "date_field",
              range: [
                "&",
                ["date_field", ">=", "2020-01-29"],
                ["date_field", "<", "2020-01-30"]
              ],
              rangeDescription: "Today",
              rangeId: "today"
        });

        await helpers.toggleTimeRangeMenu();

        const selectEls = el.querySelectorAll('div.o_time_range_section select');
        assert.strictEqual(selectEls.length, 3);
        assert.deepEqual(
            [...selectEls].map(e => e.value),
            ['date_field', 'today', 'previous_year']
        );

        assert.containsOnce(el, '.o_searchview .o_searchview_facet');
        assert.strictEqual(el.querySelector('.o_searchview .o_searchview_facet').innerText,
            'Date: Today / Previous Year');

        parent.destroy();
        unpatchDate();
    });

    QUnit.test('activate a time range works', async function (assert) {
        assert.expect(4);

        const unpatchDate = patchDate(2020, 0, 29, 1, 0, 0);

        const params = {
            cpStoreConfig: {
                viewInfo: { fields: this.fields },
                searchMenuTypes,
            },
            cpProps: { fields: this.fields, searchMenuTypes },
            handlers: {
                _onSearch: function(ev) {
                    const { timeRanges } = ev.detail;
                    assert.deepEqual(timeRanges, {
                        comparisonRange: [
                            "&",
                            [ "birthday", ">=", "2019-01-29"],
                            ["birthday", "<", "2019-01-30"]
                          ],
                          comparisonRangeDescription: "Previous Year",
                          comparisonRangeId: "previous_year",
                          fieldDescription: "Birthday",
                          fieldName: "birthday",
                          range: [
                            "&",
                            ["birthday", ">=", "2020-01-29"],
                            ["birthday", "<", "2020-01-30"]
                          ],
                          rangeDescription: "Today",
                          rangeId: "today"
                    });
                }
            }
        };
        const { parent , el, helpers } = await createControlPanel(params);

        assert.containsNone(el, '.o_searchview .o_searchview_facet');

        await helpers.toggleTimeRangeMenu();
        await helpers.toggleTimeRangeMenuBox();

        await helpers.selectField('birthday');
        await helpers.selectRange('today');
        await helpers.selectComparisonRange('previous_year');

        await helpers.applyTimeRange();

        assert.containsOnce(el, '.o_searchview .o_searchview_facet');
        assert.strictEqual(el.querySelector('.o_searchview .o_searchview_facet').innerText,
            'Birthday: Today / Previous Year');

        parent.destroy();
        unpatchDate();
    });

    QUnit.test('no timeRanges key in search query if "timeRange" not in searchMenuTypes', async function (assert) {
        assert.expect(1);

        const params = {
            cpStoreConfig: {
                viewInfo: { fields: this.fields },
                actionContext: {
                    time_ranges: { field: 'date_field', range: 'this_week' }
                }
            },
            cpProps: { fields: this.fields },
        };
        const { parent, helpers } = await createControlPanel(params);

        const { timeRanges } = helpers.getQuery();
        assert.strictEqual(timeRanges, undefined);

        parent.destroy();
    });

    QUnit.test('time ranges generated are correct', async function (assert) {
        assert.expect(85);

        const unpatchDate = patchDate(2017, 2, 22, 1, 0, 0);

        const ranges = {
            last_7_days: ['&', ["birthday", ">=", "2017-03-15"], ["birthday", "<", "2017-03-22"]],
            last_30_days: ['&', ["birthday", ">=", "2017-02-20"], ["birthday", "<", "2017-03-22"]],
            last_365_days: ['&', ["birthday", ">=", "2016-03-22"], ["birthday", "<", "2017-03-22"]],
            last_5_years: ['&', ["birthday", ">=", "2012-03-22"], ["birthday", "<", "2017-03-22"]],
            today: ['&', ["birthday", ">=", "2017-03-22"], ["birthday", "<", "2017-03-23"]],
            this_week: ['&', ["birthday", ">=", "2017-03-20"], ["birthday", "<", "2017-03-27"]],
            this_month: ['&', ["birthday", ">=", "2017-03-01"], ["birthday", "<", "2017-04-01"]],
            this_quarter: ['&', ["birthday", ">=", "2017-01-01"], ["birthday", "<", "2017-04-01"]],
            this_year: ['&', ["birthday", ">=", "2017-01-01"], ["birthday", "<", "2018-01-01"]],
            yesterday: ['&', ["birthday", ">=", "2017-03-21"], ["birthday", "<", "2017-03-22"]],
            last_week: ['&', ["birthday", ">=", "2017-03-13"], ["birthday", "<", "2017-03-20"]],
            last_month: ['&', ["birthday", ">=", "2017-02-01"], ["birthday", "<", "2017-03-01"]],
            last_quarter: ['&', ["birthday", ">=", "2016-10-01"], ["birthday", "<", "2017-01-01"]],
            last_year: ['&', ["birthday", ">=", "2016-01-01"], ["birthday", "<", "2017-01-01"]],
        }
        const comparisonRanges = {
            previous_period: {
                last_7_days: ['&', ["birthday", ">=", "2017-03-08"], ["birthday", "<", "2017-03-15"]],
                last_30_days: ['&', ["birthday", ">=", "2017-01-21"], ["birthday", "<", "2017-02-20"]],
                last_365_days: ['&', ["birthday", ">=", "2015-03-23"], ["birthday", "<", "2016-03-22"]],
                last_5_years: ['&', ["birthday", ">=", "2007-03-22"], ["birthday", "<", "2012-03-22"]],
                today: ['&', ["birthday", ">=", "2017-03-21"], ["birthday", "<", "2017-03-22"]],
                this_week: ['&', ["birthday", ">=", "2017-03-13"], ["birthday", "<", "2017-03-20"]],
                this_month: ['&', ["birthday", ">=", "2017-02-01"], ["birthday", "<", "2017-03-01"]],
                this_quarter: ['&', ["birthday", ">=", "2016-10-01"], ["birthday", "<", "2017-01-01"]],
                this_year: ['&', ["birthday", ">=", "2016-01-01"], ["birthday", "<", "2017-01-01"]],
                yesterday: ['&', ["birthday", ">=", "2017-03-20"], ["birthday", "<", "2017-03-21"]],
                last_week: ['&', ["birthday", ">=", "2017-03-06"], ["birthday", "<", "2017-03-13"]],
                last_month: ['&', ["birthday", ">=", "2017-01-01"], ["birthday", "<", "2017-02-01"]],
                last_quarter: ['&', ["birthday", ">=", "2016-07-01"], ["birthday", "<", "2016-10-01"]],
                last_year: ['&', ["birthday", ">=", "2015-01-01"], ["birthday", "<", "2016-01-01"]],
            },
            previous_year: {
                last_7_days: ["&", ["birthday", ">=", "2016-03-15"], ["birthday", "<", "2016-03-22"]],
                last_30_days: ["&", ["birthday", ">=", "2016-02-21"], ["birthday", "<", "2016-03-22"]],
                last_365_days: ["&", ["birthday", ">=", "2015-03-23"], ["birthday", "<", "2016-03-22"]],
                last_5_years: ["&", ["birthday", ">=", "2011-03-22"], ["birthday", "<", "2016-03-22"]],
                today: ["&", ["birthday", ">=", "2016-03-22"], ["birthday", "<", "2016-03-23"]],
                this_week: ["&", ["birthday", ">=", "2016-03-21"], ["birthday", "<", "2016-03-28"]],
                this_month: ["&", ["birthday", ">=", "2016-03-01"], ["birthday", "<", "2016-04-01"]],
                this_quarter: ["&", ["birthday", ">=", "2016-01-01"], ["birthday", "<", "2016-04-01"]],
                this_year: ["&", ["birthday", ">=", "2016-01-01"], ["birthday", "<", "2017-01-01"]],
                yesterday: ["&", ["birthday", ">=", "2016-03-21"], ["birthday", "<", "2016-03-22"]],
                last_week: ["&", ["birthday", ">=", "2016-03-14"], ["birthday", "<", "2016-03-21"]],
                last_month: ["&", ["birthday", ">=", "2016-02-01"], ["birthday", "<", "2016-03-01"]],
                last_quarter: ["&", ["birthday", ">=", "2015-10-01"], ["birthday", "<", "2016-01-01"]],
                last_year: ["&", ["birthday", ">=", "2015-01-01"], ["birthday", "<", "2016-01-01"]],
            }
        };

        const params = {
            cpStoreConfig: {
                viewInfo: { fields: this.fields },
                searchMenuTypes,
            },
            cpProps: { fields: this.fields, searchMenuTypes },
            handlers: {
                _onSearch: function(ev) {
                    const { timeRanges } = ev.detail;
                    const { range, comparisonRange, rangeId, comparisonRangeId } = timeRanges;
                    if (!comparisonRangeId) {
                        assert.deepEqual(range, ranges[rangeId]);
                    } else {
                        assert.deepEqual(comparisonRange, comparisonRanges[comparisonRangeId][rangeId]);
                    }
                }
            }
        };
        const { parent , el, helpers } = await createControlPanel(params);

        assert.containsNone(el, '.o_searchview .o_searchview_facet');

        await helpers.toggleTimeRangeMenu();

        for (const o of Object.values(TIME_RANGE_OPTIONS)) {
            await helpers.selectRange(o.id);
            await helpers.applyTimeRange();
            assert.strictEqual(el.querySelector('.o_searchview .o_searchview_facet').innerText,
                `Birthday: ${o.description}`);

            await helpers.toggleTimeRangeMenuBox();
            for (const co of Object.values(COMPARISON_TIME_RANGE_OPTIONS)) {
                await helpers.selectComparisonRange(co.id);
                await helpers.applyTimeRange();
                assert.strictEqual(el.querySelector('.o_searchview .o_searchview_facet').innerText,
                `Birthday: ${o.description} / ${co.description}`);
            }
            await helpers.toggleTimeRangeMenuBox();
        }

        parent.destroy();
        unpatchDate();
    });

    });
});