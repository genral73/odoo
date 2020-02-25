odoo.define('web.controlPanelParameters', function (require) {
    "use strict";

    const { _lt } = require('web.core');

    // Filter menu parameters
    const FIELD_OPERATORS = {
        boolean: [
            { symbol: "=", description: _lt("is true"), value: true },
            { symbol: "!=", description: _lt("is false"), value: true },
        ],
        char: [
            { symbol: "ilike", description:_lt("contains") },
            { symbol: "not ilike", description: _lt("doesn't contain") },
            { symbol: "=", description: _lt("is equal to") },
            { symbol: "!=", description: _lt("is not equal to") },
            { symbol: "!=", description: _lt("is set"), value: false },
            { symbol: "=", description: _lt("is not set"), value: false },
        ],
        date: [
            { symbol: "=", description: _lt("is equal to") },
            { symbol: "!=", description: _lt("is not equal to") },
            { symbol: ">", description: _lt("is after") },
            { symbol: "<", description: _lt("is before") },
            { symbol: ">=", description: _lt("is after or equal to") },
            { symbol: "<=", description: _lt("is before or equal to") },
            { symbol: "between", description: _lt("is between") },
            { symbol: "!=", description: _lt("is set"), value: false },
            { symbol: "=", description: _lt("is not set"), value: false },
        ],
        datetime: [
            { symbol: "between", description: _lt("is between") },
            { symbol: "=", description: _lt("is equal to") },
            { symbol: "!=", description: _lt("is not equal to") },
            { symbol: ">", description: _lt("is after") },
            { symbol: "<", description: _lt("is before") },
            { symbol: ">=", description: _lt("is after or equal to") },
            { symbol: "<=", description: _lt("is before or equal to") },
            { symbol: "!=", description: _lt("is set"), value: false },
            { symbol: "=", description: _lt("is not set"), value: false },
        ],
        id: [
            { symbol: "=", description:_lt("is")},
        ],
        number: [
            { symbol: "=", description: _lt("is equal to") },
            { symbol: "!=", description: _lt("is not equal to") },
            { symbol: ">", description: _lt("greater than") },
            { symbol: "<", description: _lt("less than") },
            { symbol: ">=", description: _lt("greater than or equal to") },
            { symbol: "<=", description: _lt("less than or equal to") },
            { symbol: "!=", description: _lt("is set"), value: false },
            { symbol: "=", description: _lt("is not set"), value: false },
        ],
        selection: [
            { symbol: "=", description:_lt("is")},
            { symbol: "!=", description: _lt("is not") },
            { symbol: "!=", description: _lt("is set"), value: false },
            { symbol: "=", description: _lt("is not set"), value: false },
        ],
    };
    const FIELD_TYPES = {
        boolean: 'boolean',
        char: 'char',
        date: 'date',
        datetime: 'datetime',
        float: 'number',
        id: 'id',
        integer: 'number',
        html: 'char',
        many2many: 'char',
        many2one: 'char',
        monetary: 'number',
        one2many: 'char',
        text: 'char',
        selection: 'selection',
    };
    const DEFAULT_PERIOD = 'this_month';
    const MONTH_OPTIONS = {
        this_month: { optionId: 'this_month', groupNumber: 1, format: 'MMMM', addParam: {}, setParam: {}, granularity: 'month' },
        last_month: { optionId: 'last_month', groupNumber: 1, format: 'MMMM', addParam: { months: -1 }, setParam: {}, granularity: 'month' },
        antepenultimate_month: { optionId: 'antepenultimate_month', groupNumber: 1, format: 'MMMM', addParam: { months: -2 }, setParam: {}, granularity: 'month' },
    };
    const QUARTER_OPTIONS = {
        fourth_quarter: { optionId: 'fourth_quarter', groupNumber: 1, description: "Q4", addParam: {}, setParam: { quarter: 4 }, granularity: 'quarter' },
        third_quarter: { optionId: 'third_quarter', groupNumber: 1, description: "Q3", addParam: {}, setParam: { quarter: 3 }, granularity: 'quarter' },
        second_quarter: { optionId: 'second_quarter', groupNumber: 1, description: "Q2", addParam: {}, setParam: { quarter: 2 }, granularity: 'quarter' },
        first_quarter: { optionId: 'first_quarter', groupNumber: 1, description: "Q1", addParam: {}, setParam: { quarter: 1 }, granularity: 'quarter' },
    };
    const YEAR_OPTIONS = {
        this_year: { optionId: 'this_year', groupNumber: 2, format: 'YYYY', addParam: {}, setParam: {}, granularity: 'year' },
        last_year: { optionId: 'last_year', groupNumber: 2, format: 'YYYY', addParam: { years: -1 }, setParam: {}, granularity: 'year' },
        antepenultimate_year: { optionId: 'antepenultimate_year', groupNumber: 2, format: 'YYYY', addParam: { years: -2 }, setParam: {}, granularity: 'year' },
    };
    const OPTION_GENERATORS = Object.assign({}, MONTH_OPTIONS, QUARTER_OPTIONS, YEAR_OPTIONS);

    function rankPeriod(oId) {
        return Object.keys(OPTION_GENERATORS).indexOf(oId);
    }

    // GroupBy menu parameters
    const GROUPABLE_TYPES = ['many2one', 'char', 'boolean', 'selection', 'date', 'datetime', 'integer'];
    const DEFAULT_INTERVAL = 'month';
    const INTERVAL_OPTIONS = {
        year: { description: 'Year', optionId: 'year', groupNumber: 1 },
        quarter: { description: 'Quarter', optionId: 'quarter', groupNumber: 1 },
        month: { description: 'Month', optionId: 'month', groupNumber: 1 },
        week: { description: 'Week', optionId: 'week', groupNumber: 1 },
        day: { description: 'Day', optionId: 'day', groupNumber: 1 }
    };

    // TimeRange menu parameters
    const TIME_RANGE_OPTIONS = {
        last_7_days: { description: 'Last 7 Days', id: 'last_7_days', groupNumber: 1 },
        last_30_days: { description: 'Last 30 Days', id: 'last_30_days', groupNumber: 1 },
        last_365_days: { description: 'Last 365 Days', id: 'last_365_days', groupNumber: 1 },
        last_5_years: { description: 'Last 5 Years', id: 'last_5_years', groupNumber: 1 },
        today: { description: 'Today', id: 'today', groupNumber: 2 },
        this_week: { description: 'This Week', id: 'this_week', groupNumber: 2 },
        this_month: { description: 'This Month', id: 'this_month', groupNumber: 2 },
        this_quarter: { description: 'This Quarter', id: 'this_quarter', groupNumber: 2 },
        this_year: { description: 'This Year', id: 'this_year', groupNumber: 2 },
        yesterday: { description: 'Yesterday', id: 'yesterday', groupNumber: 3 },
        last_week: { description: 'Last Week', id: 'last_week', groupNumber: 3 },
        last_month: { description: 'Last Month', id: 'last_month', groupNumber: 3 },
        last_quarter: { description: 'Last Quarter', id: 'last_quarter', groupNumber: 3 },
        last_year: { description: 'Last Year', id: 'last_year', groupNumber: 3 },
    };
    const COMPARISON_TIME_RANGE_OPTIONS = {
        previous_period: { description: 'Previous Period', id: 'previous_period' },
        previous_year: { description: 'Previous Year', id: 'previous_year' },
    };

    return {
        COMPARISON_TIME_RANGE_OPTIONS,
        DEFAULT_INTERVAL,
        DEFAULT_PERIOD,
        FIELD_OPERATORS,
        FIELD_TYPES,
        GROUPABLE_TYPES,
        INTERVAL_OPTIONS,
        OPTION_GENERATORS,
        TIME_RANGE_OPTIONS,
        YEAR_OPTIONS,

        rankPeriod,
    };
});
