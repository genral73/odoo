odoo.define('web.TimeRangeMenu', function (require) {
    "use strict";

    const { COMPARISON_TIME_RANGE_OPTIONS, DEFAULT_PERIOD, TIME_RANGE_OPTIONS } = require('web.searchUtils');
    const DropdownMenu = require('web.DropdownMenu');
    const { useModel } = require('web.model');

    const { useState } = owl.hooks;

    /**
     * 'Time ranges' menu
     *
     * Component used to create a time range from a field, a given range and optionally
     * another field to make a comparison.
     *
     * The component template overrides the dropdownmenu to keep the basic behaviours
     * (opening/closing, layout). The template itself iis a set of labels/inputs
     * used to select the field and range. There is also a checkbox used to determine
     * whether to render the comparison range field selection (input).
     * @extends DropdownMenu
     */
    class TimeRangeMenu extends DropdownMenu {
        constructor() {
            super(...arguments);

            this.model = useModel('controlPanelModel');

            this.fields = Object.keys(this.props.fields).reduce((acc, fieldName) => {
                const { sortable, string, type } = this.props.fields[fieldName];
                if (
                    ['date', 'datetime'].includes(type) && sortable &&
                    !acc.some(f => f.name === fieldName)
                ) {
                    acc.push({
                        name: fieldName,
                        description: string || fieldName,
                    });
                }
                return acc;
            }, []);

            const activeTimeRange = this.model.getFiltersOfType('timeRange').find(
                timeRange => timeRange.isActive
            );

            const initialState = Object.assign({
                fieldName: this.fields[0] && this.fields[0].name,
                rangeId: DEFAULT_PERIOD,
            }, activeTimeRange);

            this.state = useState(initialState);

            this.periodOptions = TIME_RANGE_OPTIONS;
            this.comparisonTimeRangeOptions = COMPARISON_TIME_RANGE_OPTIONS;
            this.periodGroups = Object.values(this.periodOptions).reduce((acc, o) => {
                if (!acc.includes(o.groupNumber)) {
                    acc.push(o.groupNumber);
                }
                return acc;
            }, []);

        }

        //---------------------------------------------------------------------
        // Handlers
        //---------------------------------------------------------------------

        /**
         * @private
         */
        _onApply() {
            this.model.dispatch('activateTimeRange',
                this.state.fieldName,
                this.state.rangeId,
                this.state.comparisonRangeId
            );
        }

        /**
         * @private
         */
        _onCheckboxClick() {
            if (!this.state.comparisonRangeId) {
                this.state.comparisonRangeId = 'previous_period'; // default
            } else {
                delete this.state.comparisonRangeId;
            }
        }
    }

    TimeRangeMenu.defaultProps = Object.assign({}, DropdownMenu.defaultProps, {
        icon: 'fa fa-calendar',
        title: "Time Ranges",
    });
    TimeRangeMenu.props = Object.assign({}, DropdownMenu.props, {
        fields: Object,
    });
    TimeRangeMenu.template = 'TimeRangeMenu';

    return TimeRangeMenu;

});
