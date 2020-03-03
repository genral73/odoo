odoo.define('web.SearchFacet', function (require) {
    "use strict";

    const FACET_ICONS = {
        filter: 'fa-filter',
        groupBy: 'fa-bars',
        favorite: 'fa-star',
        timeRange: 'fa-calendar',
    };

    const { Component } = owl;
    class SearchFacet extends Component {

        //--------------------------------------------------------------------------
        // Getters
        //--------------------------------------------------------------------------

        /**
         * @returns {string}
         */
        get icon() {
            return FACET_ICONS[this.props.group.type];
        }

        /**
         * @returns {string}
         */
        get separator() {
            return this.props.group.type === 'groupBy' ? '>' : this.env._t("or");
        }

        /**
         * @returns {string[]}
         */
        get values() {
            const filters = Object.values(this.props.filters);
            if (this.props.group.type === 'field') {
                return filters[0].descriptionInFacet;
            }
            return filters.map(filter => filter.descriptionInFacet);
        }

        //--------------------------------------------------------------------------
        // Handlers
        //--------------------------------------------------------------------------

        /**
         * @private
         * @param {KeyboardEvent} ev
         */
        _onKeydown(ev) {
            switch (ev.key) {
                case 'ArrowLeft':
                    this.trigger('navigation-move', { direction: 'left' });
                    break;
                case 'ArrowRight':
                    this.trigger('navigation-move', { direction: 'right' });
                    break;
                case 'Backspace':
                    this.trigger('remove-facet', this.props);
                    break;
            }
        }
    }

    SearchFacet.props = {
        filters: Object,
        group: Object,
        tooltipPosition: { type: String, optional: 1 },
    };
    SearchFacet.template = 'SearchFacet';

    return SearchFacet;
});
