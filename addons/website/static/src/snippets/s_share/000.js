odoo.define('website.s_share', function (require) {
'use strict';

const publicWidget = require('web.public.widget');

const ShareWidget = publicWidget.Widget.extend({
    selector: '.s_share, .oe_share', // oe_share for compatibility

    /**
     * @override
     */
    start: function () {
        var urlRegex = /(\?(?:|.*&)(?:u|url|body)=)(.*?)(&|#|$)/;
        var titleRegex = /(\?(?:|.*&)(?:title|text|subject|description)=)(.*?)(&|#|$)/;
        var mediaRegex = /(\?(?:|.*&)(?:media)=)(.*?)(&|#|$)/;
        this.$('a').each(function () {
            var $a = $(this);
            if (($a.attr('target') && $a.attr('target').match(/_blank|_self/i) && !$a.closest('.o_editable').length)) {
                $a.on('click', function () {
                    let url = encodeURIComponent(window.location.href),title = encodeURIComponent($('title').text()),media = encodeURIComponent(window.location.origin + $('.product_detail_img').attr('src'));
                     $a.attr('href', function (i, href) {
                        return href.replace(urlRegex, function (match, a, b, c) {
                            return a + url + c;
                        })
                        .replace(titleRegex, function (match, a, b, c) {
                            return ($a.hasClass('s_share_whatsapp')? a + title +url+ c : a + title + c);
                        }).replace(mediaRegex,function(match, a, b, c){
                            return a + media + c;
                        });
                    });
                    window.open(this.href, this.target, 'menubar=no,toolbar=no,resizable=yes,scrollbars=yes,height=550,width=600');
                    return false;
                });
            }
        });

        return this._super.apply(this, arguments);
    },
});

publicWidget.registry.share = ShareWidget;

return ShareWidget;
});
