odoo.define('google_drive.Sidebar', function (require) {
    "use strict";

    const DropdownMenuItem = require('web.DropdownMenuItem');
    const SidebarRegistry = require('web.SidebarRegistry');

    /**
     * Google drive menu
     *
     * This component is actually a set of list items used to enrich the SideBar's
     * "Action" dropdown list (@see SideBar and SideBarRegistry). It will fetch
     * the current user's google drive configuration and set the result as its
     * items if any.
     * @extends DropdownMenuItem
     */
    class GoogleDriveMenu extends DropdownMenuItem {

        async willStart() {
            if (this.props.viewType === "form" && this.props.activeIds[0]) {
                this.gdriveItems = await this._getGoogleDocItems();
            } else {
                this.gdriveItems = [];
            }
        }

        //---------------------------------------------------------------------
        // Private
        //---------------------------------------------------------------------

        async _getGoogleDocItems() {
            const items = await this.rpc({
                args: [this.env.action.res_model, this.props.activeIds[0]],
                context: this.props.context,
                method: 'get_google_drive_config',
                model: 'google.drive.config',
            });
            return items;
        }

        //---------------------------------------------------------------------
        // Handlers
        //---------------------------------------------------------------------

        /**
         * @private
         * @param {number} itemId
         */
        async _onGoogleDocItemClick(itemId) {
            const resID = this.props.activeIds[0];
            const domain = [['id', '=', itemId]];
            const fields = ['google_drive_resource_id', 'google_drive_client_id'];
            const configs = await this.rpc({
                args: [domain, fields],
                method: 'search_read',
                model: 'google.drive.config',
            });
            const url = await this.rpc({
                args: [itemId, resID, configs[0].google_drive_resource_id],
                context: this.props.context,
                method: 'get_google_drive_url',
                model: 'google.drive.config',
            });
            if (url) {
                window.open(url, '_blank');
            }
        }
    }
    GoogleDriveMenu.props = {
        activeIds: Array,
        context: Object,
        viewType: String,
    };
    GoogleDriveMenu.template = 'GoogleDriveMenu';

    SidebarRegistry.add('google-drive-menu', {
        Component: GoogleDriveMenu,
        getProps() {
            return {
                activeIds: this.props.activeIds,
                context: this.props.context,
                viewType: this.props.viewType,
            };
        },
    });

    return GoogleDriveMenu;
});
