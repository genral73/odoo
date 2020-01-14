odoo.define('web.Pager', function (require) {
    "use strict";

    const { useFocusOnUpdate } = require('web.custom_hooks');

    const { Component, hooks } = owl;
    const { useState } = hooks;

    /**
     * Pager
     *
     * The pager goes from 1 to size (included).
     * The current value is currentMinimum if limit === 1 or
     * the interval [currentMinimum, currentMinimum + limit[ if limit > 1
     */
    class Pager extends Component {
        /**
         * @param {Object} [props]
         * @param {int} [props.size] the total number of elements
         * @param {int} [props.currentMinimum] the first element of the current_page
         * @param {int} [props.limit] the number of elements per page
         * @param {boolean} [props.editable] editable feature of the pager
         * @param {boolean} [props.hiddenInSinglePage] (not) to display the pager
         *   if only one page
         * @param {function} [props.validate] callback returning a Promise to
         *   validate changes
         * @param {boolean} [props.withAccessKey] can be disabled, for example,
         *   for x2m widgets
         */
        constructor() {
            super(...arguments);

            this.state = useState({
                editing: false,
            });
            this.isUpdating = false;

            this.focusOnUpdate = useFocusOnUpdate();
            this.focusOnUpdate();
        }

        async willUpdateProps() {
            this.state.editing = false;
            this.isUpdating = false;
        }

        //--------------------------------------------------------------------------
        // Getters
        //--------------------------------------------------------------------------

        /**
         * @returns {Number}
         */
        get maximum() {
            return Math.min(this.props.currentMinimum + this.props.limit - 1, this.props.size);
        }

        /**
         * @returns {boolean} true iff there is only one page
         */
        get singlePage() {
            const { currentMinimum, size } = this.props;
            return (1 === currentMinimum) && (this.maximum === size);
        }

        /**
         * @returns {Number}
         */
        get value() {
            return this.props.currentMinimum + (this.props.limit > 1 ? `-${this.maximum}` : '');
        }

        //--------------------------------------------------------------------------
        // Private
        //--------------------------------------------------------------------------

        /**
         * Private function that updates the pager's state according to a pager action
         *
         * @param {number} [direction] the action (previous or next) on the pager
         */
        async _changeSelection(direction) {
            try {
                await this.props.validate();
            } catch (err) {
                return;
            }
            const { limit, size } = this.props;

            // Compute the new currentMinimum
            let currentMinimum = (this.props.currentMinimum + limit * direction);
            if (currentMinimum > size) {
                currentMinimum = 1;
            } else if ((currentMinimum < 1) && (limit === 1)) {
                currentMinimum = size;
            } else if ((currentMinimum < 1) && (limit > 1)) {
                currentMinimum = size - ((size % limit) || limit) + 1;
            }

            // The re-rendering of the pager must be done before the trigger of
            // event 'pager-changed' as the rendering may enable the pager
            // (and a common use is to disable the pager when this event is
            // triggered, and to re-enable it when the data have been reloaded)
            this.trigger('pager-changed', { limit, currentMinimum });
        }

        /**
         * Private function that saves the state from the content of the input
         * @param {string} value the new raw pager value
         */
        async _saveValue(value) {
            try {
                await this.props.validate();
            } catch (err) {
                return;
            }
            const [min, max] = value.trim().split(/\s*[\-\s,;]\s*/);

            let currentMinimum = Math.max(Math.min(parseInt(min, 10), this.props.size), 1);
            let maximum = max ? Math.max(Math.min(parseInt(max, 10), this.props.size), 1) : min;

            if (
                !isNaN(currentMinimum) &&
                !isNaN(maximum) &&
                currentMinimum <= maximum
            ) {
                const limit = Math.max(maximum - currentMinimum) + 1;
                this.isUpdating = true;
                this.trigger('pager-changed', { limit, currentMinimum });
            }
        }

        //--------------------------------------------------------------------------
        // Handlers
        //--------------------------------------------------------------------------

        /**
         * @private
         */
        async _onEdit() {
            if (
                !this.state.editing && // not already editing
                this.props.editable && // editable
                !this.isUpdating // not performing any 'pager-changed'
            ) {
                this.state.editing = true;
                this.focusOnUpdate();
            }
        }

        /**
         * @private
         * @param {InputEvent} ev
         */
        _onValueChange(ev) {
            this._saveValue(ev.currentTarget.value);
            if (!this.isUpdating) {
                ev.preventDefault();
            }
        }

        /**
         * @private
         * @param {KeyboardEvent} ev
         */
        _onValueKeydown(ev) {
            switch (ev.key) {
                case 'Enter':
                    ev.preventDefault();
                    ev.stopPropagation();
                    this._saveValue(ev.currentTarget.value);
                    break;
                case 'Escape':
                    ev.preventDefault();
                    ev.stopPropagation();
                    this.state.editing = false;
                    break;
            }
        }
    }

    Pager.defaultProps = {
        editable: true,
        hiddenInSinglePage: false,
        validate: async () => { },
        withAccessKey: true,
    };
    Pager.props = {
        currentMinimum: { type: Number, optional: 1 },
        editable: Boolean,
        hiddenInSinglePage: Boolean,
        limit: { validate: l => !isNaN(l), optional: 1 },
        role: { type: String, optional: 1 },
        size: { type: Number, optional: 1 },
        validate: Function,
        withAccessKey: Boolean,
    };
    Pager.template = 'Pager';

    return Pager;
});
