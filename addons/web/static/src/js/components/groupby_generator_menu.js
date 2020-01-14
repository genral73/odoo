odoo.define('web.GroupByGeneratorMenu', function (require) {
    "use strict";

    const DropdownMenuItem = require('web.DropdownMenuItem');

    class GroupByGeneratorMenu extends DropdownMenuItem {
        constructor() {
            super(...arguments);

            const fieldName = this.props.fields[0].name;
            this.state = owl.hooks.useState({
                fieldName,
                open: false,
            });
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
            const field = this.props.fields.find(f => f.name === this.state.fieldName);
            this.trigger('create-new-groupby', { field });
            this.state.open = false;
        }
    }

    GroupByGeneratorMenu.template = 'GroupByGeneratorMenu';
    GroupByGeneratorMenu.props = {
        fields: Array,
    };

    return GroupByGeneratorMenu;
});
