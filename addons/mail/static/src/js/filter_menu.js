odoo.define('mail.FilterGeneratorMenu', function (require) {
    "use strict";

    const FilterGeneratorMenu = require('web.FilterGeneratorMenu');
    const utils = require('web.utils');

    utils.patch(FilterGeneratorMenu, 'mail.FilterGeneratorMenu', {

        /**
         * With the `mail` module installed, we want to filter out some of the
         * available fields in 'Add custom filter' menu (@see FilterGeneratorMenu).
         * @override
         */
        _validateField(field) {
            return this._super(field) &&
                field.relation !== 'mail.message' &&
                field.name !== 'message_ids';
        },
    });

    return FilterGeneratorMenu;
});
