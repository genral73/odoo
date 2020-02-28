odoo.define('rating.portal.composer', function (require) {
'use strict';

var core = require('web.core');
var portalComposer = require('portal.composer');

var _t = core._t;

var PortalComposer = portalComposer.PortalComposer;

var STAR_RATING_RATIO = 2;  // conversion factor from the star (1-5) to the db rating range (1-10)

/**
 * PortalComposer
 *
 * Extends Portal Composer to handle rating submission
 */
PortalComposer.include({
    events: _.extend({}, PortalComposer.prototype.events, {
        'click .stars i': '_onClickStar',
        'mouseleave .stars': '_onMouseleaveStarBlock',
        'mousemove .stars i': '_onMoveStar',
        'mouseleave .stars i': '_onMoveLeaveStar',
    }),

    /**
     * @constructor
     */
    init: function (parent, options) {
        this._super.apply(this, arguments);

        // apply ratio to default rating value
        if (options.default_rating_value) {
            options.default_rating_value = parseFloat(options.default_rating_value) / STAR_RATING_RATIO;
        }

        // default options
        this.options = _.defaults(this.options, {
            'default_message': false,
            'default_message_id': false,
            'default_rating_value': false,
            'force_submit_url': false,
        });
        // star input widget
        this.labels = {
            '0': "",
            '1': _t("I hate it"),
            '2': _t("I don't like it"),
            '3': _t("It's okay"),
            '4': _t("I like it"),
            '5': _t("I love it"),
        };
        this.user_click = false; // user has click or not
        this.set("star_value", this.options.default_rating_value);
        this.on("change:star_value", this, this._onChangeStarValue);
    },
    /**
     * @override
     */
    start: function () {
        var self = this;
        return this._super.apply(this, arguments).then(function () {
            // rating stars
            self.$inputRating = self.$('input[name="rating_value"]');
            self.$star_list = self.$('.stars').find('i');

            // set the default value to trigger the display of star widget and update the hidden input value.
            self.set("star_value", self.options.default_rating_value); 
            self.$inputRating.val(self.options.default_rating_value * STAR_RATING_RATIO);
        });
    },

    //--------------------------------------------------------------------------
    // Handlers
    //--------------------------------------------------------------------------

    /**
     * @override
     * @private
     */
    _onSubmitButtonClick: function (ev) {
        //close rating bootstrap modal
        this.$el.closest('#ratingpopupcomposer').modal('hide');
        return this._super.apply(this, arguments);
    },
    /**
     * @override
     * @private
     */
    _prepareMessageData: function () {
        return _.extend(this._super.apply(this, arguments) || {}, {
            'message_id': this.options.default_message_id,
            'rating_value': this.$inputRating.val()
        });
    },
    /**
     * @private
     */
    _onChangeStarValue: function () {
        var val = this.get("star_value");
        var index = Math.floor(val);
        var decimal = val - index;
        // reset the stars
        this.$star_list.removeClass('fa-star fa-star-half-o').addClass('fa-star-o');

        this.$('.stars').find("i:lt(" + index + ")").removeClass('fa-star-o fa-star-half-o').addClass('fa-star');
        if (decimal) {
            this.$('.stars').find("i:eq(" + index + ")").removeClass('fa-star-o fa-star fa-star-half-o').addClass('fa-star-half-o');
        }
        this.$('.rate_text .badge').text(this.labels[index]);
    },
    /**
     * @private
     */
    _onClickStar: function (ev) {
        var index = this.$('.stars i').index(ev.currentTarget);
        this.set("star_value", index + 1);
        this.user_click = true;
        this.$inputRating.val(this.get("star_value") * STAR_RATING_RATIO);
    },
    /**
     * @private
     */
    _onMouseleaveStarBlock: function () {
        this.$('.rate_text').hide();
    },
    /**
     * @private
     * @param {MouseEvent} ev
     */
    _onMoveStar: function (ev) {
        var index = this.$('.stars i').index(ev.currentTarget);
        this.$('.rate_text').show();
        this.set("star_value", index + 1);
    },
    /**
     * @private
     */
    _onMoveLeaveStar: function () {
        if (!this.user_click) {
            this.set("star_value", parseInt(this.$inputRating.val()));
        }
        this.user_click = false;
    },
});
});
