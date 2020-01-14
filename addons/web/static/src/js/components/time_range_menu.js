odoo.define('web.TimeRangeMenu', function (require) {
    "use strict";

    const { COMPARISON_TIME_RANGE_OPTIONS, DEFAULT_PERIOD, TIME_RANGE_OPTIONS } = require('web.controlPanelParameters');
    const DropdownMenu = require('web.DropdownMenu');

    const { useDispatch, useGetters, useState } = owl.hooks;

    class TimeRangeMenu extends DropdownMenu {
        constructor() {
            super(...arguments);

            this.dispatch = useDispatch(this.env.controlPanelModel);
            this.getters = useGetters(this.env.controlPanelModel);

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

            const activeTimeRange = this.getters.getFiltersOfType('timeRange').find(
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

        //--------------------------------------------------------------------------
        // Handlers
        //--------------------------------------------------------------------------

        /**
         * @private
         */
        _onApply() {
            this.dispatch('activateTimeRange',
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
