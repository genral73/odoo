odoo.define('web.FilterMenu', function (require) {
    "use strict";

    const DropdownMenu = require('web.DropdownMenu');
    const FilterMenuGenerator = require('web.FilterMenuGenerator');

    const { useDispatch, useGetters } = owl.hooks;

    class FilterMenu extends DropdownMenu {

        constructor() {
            super(...arguments);

            this.fields = Object.keys(this.props.fields).reduce(
                (fields, fieldName) => {
                    const field = Object.assign({}, this.props.fields[fieldName], {
                        name: fieldName,
                    });
                    if (!field.deprecated && field.searchable) {
                        fields.push(field);
                    }
                    return fields;
                },
                [{ string: 'ID', type: 'id', name: 'id' }]
            ).sort(({ string: a }, { string: b }) => a > b ? 1 : a < b ? -1 : 0);

            this.dispatch = useDispatch(this.env.controlPanelStore);
            this.getters = useGetters(this.env.controlPanelStore);
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
            const { item, option } = ev.detail;
            if (option) {
                this.dispatch('toggleFilterWithOptions', item.id, option.optionId);
            } else {
                this.dispatch('toggleFilter', item.id);
            }
        }
    }

    FilterMenu.components = Object.assign({}, DropdownMenu.components, {
        FilterMenuGenerator,
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
