odoo.define('web.FilterGeneratorMenu', function (require) {
    "use strict";

    const { DatePicker, DateTimePicker } = require('web.DatePickerOwl');
    const Domain = require('web.Domain');
    const DropdownMenuItem = require('web.DropdownMenuItem');
    const { FIELD_OPERATORS, FIELD_TYPES } = require('web.controlPanelParameters');
    const field_utils = require('web.field_utils');

    const { useState } = owl.hooks;

    class FilterGeneratorMenu extends DropdownMenuItem {
        constructor() {
            super(...arguments);

            this.state = useState({
                conditions: [],
                open: false,
            });

            // Format, filter and sort the fields props
            this.fields = Object.keys(this.props.fields).reduce(
                (fields, fieldName) => {
                    const field = Object.assign({}, this.props.fields[fieldName], {
                        name: fieldName,
                    });
                    if (
                        !field.deprecated &&
                        field.searchable &&
                        FIELD_TYPES[field.type] &&
                        fieldName !== 'id'
                    ) {
                        fields.push(field);
                    }
                    return fields;
                },
                [{ string: 'ID', type: 'id', name: 'id' }]
            ).sort(({ string: a }, { string: b }) => a > b ? 1 : a < b ? -1 : 0);

            // Add default empty condition
            this._addDefaultCondition();

            // Give access to constants variables to the template.
            this.DECIMAL_POINT = this.env._t.database.parameters.decimal_point;
            this.OPERATORS = FIELD_OPERATORS;
            this.FIELD_TYPES = FIELD_TYPES;
        }

        //--------------------------------------------------------------------------
        // Getters
        //--------------------------------------------------------------------------

        /**
         * @override
         */
        get canBeOpened() {
            return true;
        }

        //--------------------------------------------------------------------------
        // Private
        //--------------------------------------------------------------------------

        /**
         * Populates the conditions list with a default condition having as properties:
         * - the first available field
         * - the first available operator
         * - an null or empty array value
         * @private
         */
        _addDefaultCondition() {
            const condition = {
                field: 0,
                operator: 0,
            };
            this._setDefaultValue(condition);
            this.state.conditions.push(condition);
        }

        _setDefaultValue(condition) {
            const fieldType = this.fields[condition.field].type;
            const genericType = FIELD_TYPES[fieldType];
            const operator = FIELD_OPERATORS[genericType][condition.operator];
            switch (genericType) {
                case 'char':
                    condition.value = "";
                    break;
                case 'number':
                    condition.value = 0;
                    break;
                case 'date':
                    condition.value = [moment()];
                    if (operator.symbol === 'between') {
                        condition.value.push(moment());
                    }
                    break;
                case 'datetime':
                    condition.value = [moment('00:00:00', 'hh:mm:ss')];
                    if (operator.symbol === 'between') {
                        condition.value.push(moment('23:59:59', 'hh:mm:ss'));
                    }
                    break;
            }
        }

        /**
         * @private
         * @param {Object} operator
         * @returns {boolean}
         */
        _hasValue(operator) {
            return 'value' in operator;
        }

        /**
         * Returns a sequence of numbers whose length is equal to the given size.
         * @private
         * @param {number} size
         * @returns {number[]}
         */
        _range(size) {
            return new Array(size).fill().map((_, i) => i);
        }

        //--------------------------------------------------------------------------
        // Handlers
        //--------------------------------------------------------------------------

        /**
         * Convert all conditions to prefilters.
         * @private
         */
        _onApply() {
            const preFilters = this.state.conditions.map(condition => {
                const field = this.fields[condition.field];
                const type = this.FIELD_TYPES[field.type];
                const operator = this.OPERATORS[type][condition.operator];
                const descriptionArray = [field.string, operator.description];
                const domainArray = [];
                let domainValue;
                // Field type specifics
                if (this._hasValue(operator)) {
                    domainValue = [operator.value];
                    // No description to push here
                } else if (['date', 'datetime'].includes(type)) {
                    domainValue = condition.value.map(
                        val => field_utils.parse[type](val, { type }, { timezone: true })
                    );
                    const dateValue = condition.value.map(
                        val => field_utils.format[type](val, { type }, { timezone: false })
                    );
                    descriptionArray.push(`"${dateValue.join(" " + this.env._t("and") + " ")}"`);
                } else {
                    domainValue = [condition.value];
                    descriptionArray.push(`"${condition.value}"`);
                }
                // Operator specifics
                if (operator.symbol === 'between') {
                    domainArray.push(
                        [field.name, '>=', domainValue[0]],
                        [field.name, '<=', domainValue[1]]
                    );
                } else {
                    domainArray.push([field.name, operator.symbol, domainValue[0]]);
                }
                const preFilter = {
                    description: descriptionArray.join(" "),
                    domain: Domain.prototype.arrayToString(domainArray),
                    type: 'filter',
                };
                return preFilter;
            });

            this.trigger('create-new-filters', { preFilters });

            // Reset state
            this.state.open = false;
            this.state.conditions = [];
            this._addDefaultCondition();
        }

        /**
         * @private
         * @param {Object} condition
         * @param {number} valueIndex
         * @param {OwlEvent} ev
         */
        _onDateChanged(condition, valueIndex, ev) {
            condition.value[valueIndex] = ev.detail.value;
        }

        /**
         * @private
         * @param {Object} condition
         * @param {Event} ev
         */
        _onFieldSelect(condition, ev) {
            Object.assign(condition, {
                field: ev.target.selectedIndex,
                operator: 0,
            });
            this._setDefaultValue(condition);
        }

        /**
         * @private
         * @param {Object} condition
         * @param {Event} ev
         */
        _onOperatorSelect(condition, ev) {
            condition.operator =  ev.target.selectedIndex;
            this._setDefaultValue(condition);
        }

        /**
         * @private
         * @param {Object} condition
         */
        _onRemoveCondition(conditionIndex) {
            this.state.conditions.splice(conditionIndex, 1);
        }

        /**
         * @private
         * @param {Object} condition
         * @param {Event} ev
         */
        _onValueInput(condition, ev) {
            const type = this.fields[condition.field].type;
            if (['float', 'integer', 'id'].includes(type)) {
                const previousValue = condition.value;
                const defaultValue = type === 'float' ? 0.0 : 0;
                const parser = field_utils.parse[type === 'float' ? 'float' : 'integer'];
                try {
                    const parsed = parser(ev.target.value || defaultValue);
                    // Force parsed value in the input.
                    ev.target.value = condition.value = (parsed || defaultValue);
                } catch (err) {
                    // Force previous value if non-parseable.
                    ev.target.value = previousValue || defaultValue;
                }
            } else {
                condition.value = ev.target.value || "";
            }
        }
    }

    FilterGeneratorMenu.components = { DatePicker, DateTimePicker };
    FilterGeneratorMenu.props = {
        fields: Object,
    };
    FilterGeneratorMenu.template = 'FilterGeneratorMenu';

    return FilterGeneratorMenu;
});
