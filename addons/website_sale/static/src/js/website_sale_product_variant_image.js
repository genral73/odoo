odoo.define('website_sale.product_variant_image', function (require) {
"use strict";

var core = require('web.core');
var Widget = require('web.Widget');
var weWidgets = require('wysiwyg.widgets');

var _t = core._t;
var QWeb = core.qweb;

var productVariantImages = Widget.extend({
    xmlDependencies: ['/website_sale/static/src/xml/website_sale.xml'],
    events: {
        'click': '_onClick',
    },

    /**
     * @override
     */
    start: function () {
        const def = this._super.apply(this, arguments);
        this.productVariantImages = [];
        this.currentIndex = this.$el.data('slide-to');
        this.productID = this.$el.data('product-id');
        return def;
    },

    //--------------------------------------------------------------------------
    // Handlers
    //--------------------------------------------------------------------------

    /**
     * @private
     */
    _onClick: function (ev) {
        const self = this;
        const dialog = new weWidgets.Dialog(this, {
            size: 'large',
            title: _t(" Extra Product Media"),
            $content: $(QWeb.render('productImageVideoUploder', {})),
            buttons: [{
                text: _t("Add"),
                classes: 'btn-primary',
                click: function () {
                    let data = {
                        fields: this.$content.find('input'),
                        image: this.$content.find('img'),
                    };
                    self._updateCarouselIndicator(ev, data);
                }, close: true
            },{text: _t("Cancel"), close: true,}],
        });
        dialog.opened().then(function () {
            dialog.$('.o_wsale_product_image > img').on('dblclick', function (ev) {
                ev.preventDefault();
                self._uploadImage($(ev.currentTarget));
            });
        });
        dialog.open();
    },
    _uploadImage: function ($currentTarget) {
        //open media dialog for upload image
        const $image = $("<img/>");
        const mediaDialog = new weWidgets.MediaDialog(this, {
            onlyImages: true,
        }, $image[0]);
        mediaDialog.on('save', this, function (image) {
            $currentTarget.attr('src', image.src);
        });
        mediaDialog.open();
    },
    _updateCarouselIndicator: function (ev, data) {
        let $newli = $("<li class='d-inline-block m-1 align-top o_wsale_product_new_img' data-target='#o-carousel-product'/>").attr('data-slide-to', this.currentIndex);
        this.currentIndex = this.currentIndex + 1;
        this.$el.attr('data-slide-to', this.currentIndex);
        data.image.appendTo($newli);
        $newli.insertBefore(this.$el);
        this.productVariantImages.push(data);
    },
    _saveImageAndVideo: function () {
        debugger;
    }
});
return productVariantImages;
});
