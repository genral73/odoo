odoo.define('web.GroupByMenuGenerator', function (require) {
    "use strict";

    const DropdownMenuItem = require('web.DropdownMenuItem');

    class GroupByMenuGenerator extends DropdownMenuItem {
        constructor() {
            super(...arguments);

            this.fieldIndex = 0;
            this.state = owl.hooks.useState({ open: false });
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
        // Handlers
        //--------------------------------------------------------------------------

        /**
         * @private
         */
        _onApply() {
            this.trigger('create-new-groupby', { field: this.props.fields[this.fieldIndex] });
            this.state.open = false;
        }

        /**
         * @private
         * @param {Event} ev
         */
        _onFieldSelected(ev) {
            this.fieldIndex = ev.target.selectedIndex;
        }
    }

    GroupByMenuGenerator.template = 'GroupByMenuGenerator';
    GroupByMenuGenerator.props = {
        fields: Object,
    };

    return GroupByMenuGenerator;
});
