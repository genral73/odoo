odoo.define('web.FilterMenu', function (require) {
    "use strict";

    const DropdownMenu = require('web.DropdownMenu');
    const FilterGeneratorMenu = require('web.FilterGeneratorMenu');
    const { useListener } = require('web.custom_hooks');

    const { useDispatch, useGetters } = owl.hooks;

    class FilterMenu extends DropdownMenu {

        constructor() {
            super(...arguments);

            this.dispatch = useDispatch(this.env.controlPanelModel);
            this.getters = useGetters(this.env.controlPanelModel);
            useListener('item-selected', this._onItemSelected);
        }

        //--------------------------------------------------------------------------
        // Getters
        //--------------------------------------------------------------------------

        /**
         * @override
         */
        get items() {
            return this.getters.getFiltersOfType('filter');
        }

        //--------------------------------------------------------------------------
        // Handlers
        //--------------------------------------------------------------------------

        /**
         * @private
         * @param {OwlEvent} ev
         */
        _onCreateNewFilters(ev) {
            this.dispatch('createNewFilters', ev.detail.preFilters);
        }

        /**
         * @private
         * @param {OwlEvent} ev
         */
        _onItemSelected(ev) {
            ev.stopPropagation();
            const { item, option } = ev.detail;
            if (option) {
                this.dispatch('toggleFilterWithOptions', item.id, option.optionId);
            } else {
                this.dispatch('toggleFilter', item.id);
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
