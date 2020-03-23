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
                    self._updateCarouselIndicatorAndInnerItem(ev, data);
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
    _updateCarouselIndicatorAndInnerItem: function (ev, data) {
        // carousel indicator
        let src = data.image.attr('src');
        const $newli = $(QWeb.render('carouselIndicator', {'index': this.currentIndex, 'src': src}));
        this.currentIndex = this.currentIndex + 1;
        this.$el.attr('data-slide-to', this.currentIndex);
        $newli.insertBefore(this.$el);

        // carousel inner item
        const $carousel = $('#product_detail #o-carousel-product .carousel-inner');
        let $newInnerItem = $(QWeb.render('carouselInnerItem', {'src': src, 'alt': 'test'}));
        $newInnerItem.appendTo($carousel);
        this.productVariantImages.push(data);
    },
    _saveImageAndVideo: function () {
        const self = this;
        const args = [];
        _.each(this.productVariantImages, (data) => {
            let canvas = document.createElement("CANVAS");
            let ctx = canvas.getContext("2d");
            const img = new Image();
            img.onload = function () {
                canvas.width = this.width;
                canvas.height = this.height;
                ctx.drawImage(this, 0, 0);
                args.push({
                    'name': 'test', // TODO
                    'product_tmpl_id': self.productID,
                    'image_1920': canvas.toDataURL("image/jpeg").replace(/^data:image\/[a-z]+;base64,/, ""),
                });
                canvas = null;
            };
            img.src = data.image.attr('src');
        });
        // TODO: raise warning with proper message if rpc fail
        return new Promise (function (resolve, reject) {
            self._rpc({
                model: 'product.image',
                method: 'create',
                args: [args],
            }).catch(function (data) {
                reject();
            }).then( function () {
                resolve();
            });
        });
    }
});
return productVariantImages;
});
