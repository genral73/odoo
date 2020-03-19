odoo.define('website.slides.portal.chatter', function (require) {
'use strict';

var portalChatter = require('portal.chatter');

var PortalChatter = portalChatter.PortalChatter;

/**
 * PortalChatter
 *
 * Extends Frontend Chatter to handle rating count on review tab
 */
PortalChatter.include({

    /**
     * Update review count on review tab in courses
     * @override
     * @private
     */
    _reloadChatterContent: async function (newMessage) {
        await this._super.apply(this, arguments);
        if (this.options.res_model === "slide.channel") {
            $('#review-tab').html('Reviews (' + newMessage.data.ratingTotal + ')');
        }
    },

});
});
