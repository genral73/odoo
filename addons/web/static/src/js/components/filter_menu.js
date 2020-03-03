odoo.define('web.FilterMenu', function (require) {
    "use strict";

    const DropdownMenu = require('web.DropdownMenu');
    const FilterGeneratorMenu = require('web.FilterGeneratorMenu');
    const { useListener } = require('web.custom_hooks');
    const { useModel } = require('web.model');

    /**
     * 'Filters' menu
     *
     * Simple rendering of the filters of type `filter` given by the control panel
     * model. It uses most of the behaviours implemented by the dropdown menu Component,
     * with the addition of a filter generator (@see FilterGeneratorMenu).
     * @see DropdownMenu for additional details.
     * @extends DropdownMenu
     */
    class FilterMenu extends DropdownMenu {

        constructor() {
            super(...arguments);
            this.model = useModel('controlPanelModel');
            useListener('item-selected', this._onItemSelected);
        }

        //---------------------------------------------------------------------
        // Getters
        //---------------------------------------------------------------------

        /**
         * @override
         */
        get items() {
            return this.model.getFiltersOfType('filter');
        }

        //---------------------------------------------------------------------
        // Handlers
        //---------------------------------------------------------------------

        /**
         * @private
         * @param {OwlEvent} ev
         */
        _onCreateNewFilters(ev) {
            this.model.dispatch('createNewFilters', ev.detail.preFilters);
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

    FilterMenu.components = Object.assign({}, DropdownMenu.components, {
        FilterGeneratorMenu,
    });
    FilterMenu.defaultProps = Object.assign({}, DropdownMenu.defaultProps, {
        icon: 'fa fa-filter',
        title: "Filters",
    });
    FilterMenu.props = Object.assign({}, DropdownMenu.props, {
        fields: Object,
    });
    FilterMenu.template = 'FilterMenu';

    return FilterMenu;
});
