odoo.define('web.ControlPanelMobile', function (require) {
    "use strict";

    const ControlPanel = require('web.ControlPanel');
    const { device } = require('web.config');
    const utils = require('web.utils');

    // TODO(jum): perhaps this all should be moved to web_mobile ?
    if (!device.isMobile) {
        return;
    }

    // Switch to a more appropriate template.
    ControlPanel.template = 'ControlPanelMobile';

    /**
     * Control panel: mobile
     *
     * The mobile version of the control panel. Most changes are in the layout (xml).
     */
    utils.patch(ControlPanel, 'ControlPanel.mobile', {

        //--------------------------------------------------------------------------
        // Private
        //--------------------------------------------------------------------------

        /**
         * @override
         */
        _getInitialState() {
            if (this.env.controlPanelModel) {
                this.dispatch = owl.hooks.useDispatch(this.env.controlPanelModel);
            }
            return Object.assign(this._super(), {
                isSearching: false,
                viewSwitcherOpen: false,
            });
        },
    });
});
