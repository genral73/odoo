odoo.define('web.calendar_mobile_tests', function (require) {
"use strict";

var CalendarView = require('web.CalendarView');
var testUtils = require('web.test_utils');

var createView = testUtils.createView;

var initialDate = new Date(2016, 11, 12, 8, 0, 0);
initialDate = new Date(initialDate.getTime() - initialDate.getTimezoneOffset()*60*1000);


QUnit.module('Views', {
    beforeEach: function () {
        this.data = {
            event: {
                fields: {
                    id: {string: "ID", type: "integer"},
                    name: {string: "name", type: "char"},
                    start: {string: "start datetime", type: "datetime"},
                    stop: {string: "stop datetime", type: "datetime"},
                },
                records: [
                    {id: 1, name: "event 1", start: "2016-12-11 00:00:00", stop: "2016-12-11 00:00:00"},
                ],
                check_access_rights: function () {
                    return Promise.resolve(true);
                }
            },
        };
    }
}, function () {

    QUnit.module('CalendarView Mobile');

    QUnit.test('simple calendar rendering in mobile', function (assert) {
        assert.expect(3);
        var done = assert.async();

        createView({
            View: CalendarView,
            model: 'event',
            data: this.data,
            arch: '<calendar date_start="start" date_stop="stop">' +
                    '<field name="name"/>' +
                '</calendar>',
            viewOptions: {
                initialDate: initialDate,
            },
        }).then(function (calendar) {
            assert.containsNone(calendar.$buttons, '.o_calendar_button_prev',
                "prev button should be hidden");
            assert.containsNone(calendar.$buttons, '.o_calendar_button_next',
                "next button should be hidden");
            assert.isVisible($('.o_control_panel .o_cp_right button.o_cp_today_button'),
                "today button should be visible in the pager area (bottom right corner)");

            calendar.destroy();
            done();
        });
    });
});

});
