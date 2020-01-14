odoo.define('web.control_panel_store_tests', function (require) {
"use strict";

const ControlPanelStore = require('web.ControlPanelStore');
const makeTestEnvironment = require('web.test_env');

let store;
function createControlPanelStore(config = {}) {
    store = new ControlPanelStore(Object.assign(
        { env: makeTestEnvironment() },
        config
    ));
    return store;
}

function filtersAreEqualTo(assert, comparison=[]) {
    const filters = Object.values(store.state.filters).map(filter => {
        const copy = Object.assign({}, filter);
        delete copy.groupId;
        delete copy.groupNumber;
        delete copy.id;
        return copy;
    });
    return assert.deepEqual(filters, comparison,
        `Control Panel state should have ${comparison.length} filters.`
    );
}

QUnit.module('ControlPanelStore', {
    beforeEach() {
        this.fields = {
            display_name: { string: "Displayed name", type: 'char' },
            foo: {string: "Foo", type: "char", default: "My little Foo Value", store: true, sortable: true},
            date_field: {string: "Date", type: "date", store: true, sortable: true},
            float_field: {string: "Float", type: "float"},
            bar: {string: "Bar", type: "many2one", relation: 'partner'},
        };
    }
}, function () {
    QUnit.module('Arch parsing');

    QUnit.test('empty arch', function (assert) {
        assert.expect(1);

        createControlPanelStore();
        filtersAreEqualTo(assert, [{ type: 'timeRange' }]);
    });

    QUnit.test('one field tag', function (assert) {
        assert.expect(1);
        const arch = `
            <search>
                <field name="bar"/>
            </search>`;
        const fields = this.fields;
        createControlPanelStore({ viewInfo: { arch, fields } });
        filtersAreEqualTo(assert, [
            {
                description: "Bar",
                fieldName: "bar",
                fieldType: "many2one",
                type: "field"
            },
            { type: 'timeRange' }
        ]);
    });

    QUnit.test('one separator tag', function (assert) {
        assert.expect(1);
        const arch = `
            <search>
                <separator/>
            </search>`;
        const fields = this.fields;
        createControlPanelStore({ viewInfo: { arch, fields } });
        filtersAreEqualTo(assert, [{ type: 'timeRange' }]);
    });

    QUnit.test('one separator tag and one field tag', function (assert) {
        assert.expect(1);
        const arch =
            `<search>
                <separator/>
                <field name="bar"/>
            </search>`;
        const fields = this.fields;
        createControlPanelStore({ viewInfo: { arch, fields } });
        filtersAreEqualTo(assert, [
            {
                description: "Bar",
                fieldName: "bar",
                fieldType: "many2one",
                type: "field"
            },
            { type: 'timeRange' }
        ]);
    });

    QUnit.test('one filter tag', function (assert) {
        assert.expect(1);
        const arch = `
            <search>
                <filter name="filter" string="Hello" domain="[]"/>
            </search>`;
        const fields = this.fields;
        createControlPanelStore({ viewInfo: { arch, fields } });
        filtersAreEqualTo(assert, [
            {
                description: "Hello",
                domain: "[]",
                type: "filter",
            },
            { type: 'timeRange' }
        ]);
    });

    QUnit.test('one groupBy tag', function (assert) {
        assert.expect(1);
        const arch = `
            <search>
                <filter name="groupby" string="Hi" context="{ 'group_by': 'date_field:day'}"/>
            </search>`;
        const fields = this.fields;
        createControlPanelStore({ viewInfo: { arch, fields } });
        filtersAreEqualTo(assert, [
            {
                defaultOptionId: "day",
                description: "Hi",
                fieldName: "date_field",
                fieldType: "date",
                hasOptions: true,
                type: "groupBy",
            },
            { type: 'timeRange' }
        ]);
    });

    QUnit.test('two filter tags', function (assert) {
        assert.expect(1);
        const arch = `
            <search>
                <filter name="filter_1" string="Hello One" domain="[]"/>
                <filter name="filter_2" string="Hello Two" domain="[('bar', '=', 3)]"/>
            </search>`;
        const fields = this.fields;
        createControlPanelStore({ viewInfo: { arch, fields } });
        filtersAreEqualTo(assert, [
            {
                description: "Hello One",
                domain: "[]",
                type: "filter",
            },
            {
                description: "Hello Two",
                domain: "[('bar', '=', 3)]",
                type: "filter",
            },
            { type: 'timeRange' }
        ]);
    });

    QUnit.test('two filter tags separated by a separator', function (assert) {
        assert.expect(1);
        const arch = `
            <search>
                <filter name="filter_1" string="Hello One" domain="[]"/>
                <separator/>
                <filter name="filter_2" string="Hello Two" domain="[('bar', '=', 3)]"/>
            </search>`;
        const fields = this.fields;
        createControlPanelStore({ viewInfo: { arch, fields } });
        filtersAreEqualTo(assert, [
            {
                description: "Hello One",
                domain: "[]",
                type: "filter",
            },
            {
                description: "Hello Two",
                domain: "[('bar', '=', 3)]",
                type: "filter",
            },
            { type: 'timeRange' }
        ]);
    });

    QUnit.test('one filter tag and one field', function (assert) {
        assert.expect(1);
        const arch = `
            <search>
                <filter name="filter" string="Hello" domain="[]"/>
                <field name="bar"/>
            </search>`;
        const fields = this.fields;
        createControlPanelStore({ viewInfo: { arch, fields } });
        filtersAreEqualTo(assert, [
            {
                description: "Hello",
                domain: "[]",
                type: "filter",
            },
            {
                description: "Bar",
                fieldName: "bar",
                fieldType: "many2one",
                type: "field",
            },
            { type: 'timeRange' }
        ]);
    });

    QUnit.test('two field tags', function (assert) {
        assert.expect(1);
        const arch = `
            <search>
                <field name="foo"/>
                <field name="bar"/>
            </search>`;
        const fields = this.fields;
        createControlPanelStore({ viewInfo: { arch, fields } });
        filtersAreEqualTo(assert, [
            {
                description: "Foo",
                fieldName: "foo",
                fieldType: "char",
                type: "field"
              },
              {
                description: "Bar",
                fieldName: "bar",
                fieldType: "many2one",
                type: "field"
              },
            { type: 'timeRange' }
        ]);
    });

    QUnit.module('Preparing initial state');

    QUnit.test('process favorite filters', async function (assert) {
        assert.expect(1);
        const favoriteFilters =  [{
            user_id: [2, "Mitchell Admin"],
            name: 'Sorted filter',
            id: 5,
            context: {
                group_by: ['foo', 'bar']
            },
            sort: '["foo", "-bar"]',
            domain: "[('user_id', '=', uid)]",
        }]

        createControlPanelStore({ viewInfo: { favoriteFilters } });
        filtersAreEqualTo(assert, [
            {
                context: {},
                description: "Sorted filter",
                domain: "[('user_id', '=', uid)]",
                editable: true,
                groupBys: ['foo', 'bar'],
                orderedBy: [
                  {
                    asc: true,
                    name: "foo"
                  },
                  {
                    asc: false,
                    name: "bar"
                  }
                ],
                removable: true,
                serverSideId: 5,
                type: "favorite",
                userId: 2
            },
            { type: 'timeRange' }
        ]);

    });

    QUnit.test('process dynamic filters', async function (assert) {
        assert.expect(1);
        const dynamicFilters = [{
            description: 'Quick search',
            domain: [['id', 'in', [1, 3, 4]]]
        }];

        createControlPanelStore({ dynamicFilters });
        filtersAreEqualTo(assert, [
            {
                description: 'Quick search',
                domain: "[[\"id\",\"in\",[1,3,4]]]",
                isDefault: true,
                type: 'filter'
            },
            { type: 'timeRange' }
        ]);

    });


});
});
