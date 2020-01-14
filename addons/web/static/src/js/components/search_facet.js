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
            return filters.reduce(
                (filters, filter) => [...filters, ...filter.autoCompleteValues.map(acv => acv.label)],
                []
            );
        } else {
            return filters.map(filter => this._getFilterDescription(filter));
        }
    }

    //--------------------------------------------------------------------------
    // Private
    //--------------------------------------------------------------------------

    /**
     * Get the correct description according to filter.
     *
     * @private
     * @returns {string}
     */
    _getFilterDescription(filter) {
        if (filter.type === 'timeRange') {
            let description = `${filter.fieldDescription}: ${filter.rangeDescription}`;
            if (filter.comparisonRangeDescription) {
                description += ` / ${filter.comparisonRangeDescription}`;
            }
            return description;
        }

        let description = filter.description;
        if (filter.hasOptions) {

            const currentOptions = filter.options.filter(o => o.isActive);
            const descriptions = [];

            if (filter.type === 'filter') {
                const unsortedYearIds = [];
                const unsortedOtherOptionIds = [];
                currentOptions.forEach(o => {
                    if (o.groupNumber === 2) {
                        unsortedYearIds.push(o.optionId);
                    } else {
                        unsortedOtherOptionIds.push(o.optionId);
                    }
                });
                const sortOptionIds = (a, b) =>
                    filter.options.findIndex(({ optionId }) => optionId === a) -
                    filter.options.findIndex(({ optionId }) => optionId === b);

                const yearIds = unsortedYearIds.sort(sortOptionIds);
                const otherOptionIds = unsortedOtherOptionIds.sort(sortOptionIds);

                if (otherOptionIds.length) {
                    otherOptionIds.forEach(optionId => {
                        yearIds.forEach(yearId => {
                            descriptions.push(filter.basicDomains[`${yearId}__${optionId}`].description);
                        });
                    });
                } else {
                    yearIds.forEach(yearId => {
                        descriptions.push(filter.basicDomains[yearId].description);
                    });
                }
            } else {
                descriptions.push(...currentOptions.map(o => o.description));
            }
            description += `: ${descriptions.join(" / ")}`;
        }
        return description;

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
