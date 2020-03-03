odoo.define('web.GroupByMenu', function (require) {
    "use strict";

    const { GROUPABLE_TYPES } = require('web.searchUtils');
    const DropdownMenu = require('web.DropdownMenu');
    const GroupByGeneratorMenu = require('web.GroupByGeneratorMenu');
    const { useListener } = require('web.custom_hooks');
    const { useModel } = require('web.model');

    /**
     * 'Group by' menu
     *
     * Simple rendering of the filters of type `groupBy` given by the control panel
     * model. It uses most of the behaviours implemented by the dropdown menu Component,
     * with the addition of a groupBy filter generator (@see GroupByGeneratorMenu).
     * @see DropdownMenu for additional details.
     * @extends DropdownMenu
     */
    class GroupByMenu extends DropdownMenu {

        constructor() {
            super(...arguments);

            this.fields = Object.keys(this.props.fields).reduce((fields, fieldName) => {
                const field = Object.assign({}, this.props.fields[fieldName], {
                    name: fieldName,
                });
                if (
                    field.sortable &&
                    field.name !== "id" &&
                    GROUPABLE_TYPES.includes(field.type)
                ) {
                    fields.push(field);
                }
                return fields;
            }, []).sort(({ string: a }, { string: b }) => a > b ? 1 : a < b ? -1 : 0);

            this.model = useModel('controlPanelModel');
            useListener('item-selected', this._onItemSelected);
        }

        //---------------------------------------------------------------------
        // Getters
        //---------------------------------------------------------------------


        get items() {
            return this.model.getFiltersOfType('groupBy');
        }

        //---------------------------------------------------------------------
        // Handlers
        //---------------------------------------------------------------------

        _onCreateNewGroupBy(ev) {
            this.model.dispatch('createNewGroupBy', ev.detail.field);
        }

        /**
         * @private
         * @param {OwlEvent} ev
         */
        _onItemSelected(ev) {
            ev.stopPropagation();
            const { item, option } = ev.detail;
            if (option) {
                this.model.dispatch('toggleFilterWithOptions', item.id, option.id);
            } else {
                this.model.dispatch('toggleFilter', item.id);
            }
        }
    }

    GroupByMenu.components = Object.assign({}, DropdownMenu.components, {
        GroupByGeneratorMenu,
    });
    GroupByMenu.defaultProps = Object.assign({}, DropdownMenu.defaultProps, {
        icon: 'fa fa-bars',
        title: "Group By",
        fields: {},
    });
    GroupByMenu.props = Object.assign({}, DropdownMenu.props, {
        fields: Object,
    });
    GroupByMenu.template = 'GroupByMenu';

    return GroupByMenu;
});
