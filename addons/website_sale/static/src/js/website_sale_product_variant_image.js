odoo.define('website_sale.product_variant_image', function (require) {
"use strict";

// var core = require('web.core');
var Widget = require('web.Widget');
var MediaDialog = require('wysiwyg.widgets').MediaDialog;

// var _t = core._t;
// var QWeb = core.qweb;

var productVariantImages = Widget.extend({

    events: {
        'click': '_onClick',
    },

    //--------------------------------------------------------------------------
    // Handlers
    //--------------------------------------------------------------------------

    /**
     * @private
     */
    _onClick: function (ev) {
        var $image = $("<img/>");
        var mediaDialog = new MediaDialog(this, {
            noIcons: true,
            noDocuments: true,
        },$image[0]);
        mediaDialog.open();
    },
});
return productVariantImages;
});
