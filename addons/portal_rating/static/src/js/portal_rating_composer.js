odoo.define('portal.rating.composer', function (require) {
'use strict';

var core = require('web.core');
var publicWidget = require('web.public.widget');
var session = require('web.session');
var portalComposer = require('portal.composer');

var PortalComposer = portalComposer.PortalComposer;

var STAR_RATING_RATIO = 2;  // conversion factor from the star (1-5) to the db rating range (1-10)

/**
 * RatingPopupComposer
 *
 * Display the rating average with a static star widget, and open
 * a popup with the portal composer when clicking on it.
 **/
var RatingPopupComposer = publicWidget.Widget.extend({
    template: 'portal_rating.PopupComposer',
    xmlDependencies: [
        '/portal/static/src/xml/portal_chatter.xml',
        '/portal_rating/static/src/xml/portal_tools.xml',
        '/portal_rating/static/src/xml/portal_rating_composer.xml',
    ],

    init: function (parent, options) {
        this._super.apply(this, arguments);
        this.rating_avg = Math.round(options['ratingAvg'] / STAR_RATING_RATIO * 100) / 100 || 0.0;
        this.rating_total = options['ratingTotal'] || 0.0;

        this.options = _.defaults({}, options, {
            'token': false,
            'res_model': false,
            'res_id': false,
            'pid': 0,
            'display_composer': options['disable_composer'] ? false : !session.is_website_user,
            'display_rating': true,
            'csrf_token': odoo.csrf_token,
            'user_id': session.user_id,
        });
    },
    /**
     * @override
     */
    start: function () {
        var defs = [];
        defs.push(this._super.apply(this, arguments));

        // instanciate and insert composer widget
        this._composer = new PortalComposer(this, this.options);
        defs.push(this._composer.replace(this.$('.o_portal_chatter_composer')));

        return Promise.all(defs);
    },
});

publicWidget.registry.RatingPopupComposer = publicWidget.Widget.extend({
    selector: '.o_rating_popup_composer',

    /**
     * @override
     */
    start: function () {
        this.ratingPopupData = this.$el.data();
        this.ratingPopupData.display_composer = this.ratingPopupData.disable_composer ? false : !session.is_website_user;
        this.ratingPopup = new RatingPopupComposer(this, this.ratingPopupData);
        this.ratingPopup.on('reload_composer_widget', null, this._reloadRatingPopupComposerWidget.bind(this));
        return Promise.all([
            this._super.apply(this, arguments),
            this.ratingPopup.appendTo(this.$el)
        ]);
    },
    _reloadRatingPopupComposerWidget: function (newMessage) {
        // destroy existing ratingPopup
        let data = newMessage.data;
        var oldComposer = this.ratingPopup;
        if (oldComposer) {
            oldComposer.destroy();
            // load last message value for portal chatter review
            core.bus.trigger('reload_chatter_content', newMessage);
        }
        // instanciate and insert ratingPopup widget
        if (this.ratingPopupData['display_composer']) {
            this.ratingPopupData = Object.assign(this.ratingPopupData, data);
            this.ratingPopup = new RatingPopupComposer(this, this.ratingPopupData);
            this.ratingPopup.appendTo(this.$el);
            this.ratingPopup.on('reload_composer_widget', null, this._reloadRatingPopupComposerWidget.bind(this));
        }
    },
});
});
