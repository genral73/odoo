odoo.define('stock.StockOrderpointListController', function (require) {
"use strict";

var core = require('web.core');
var ListController = require('web.ListController');

var qweb = core.qweb;


var StockOrderpointListController = ListController.extend({

    // -------------------------------------------------------------------------
    // Public
    // -------------------------------------------------------------------------

    init: function (parent, model, renderer, params) {
        this.context = renderer.state.getContext();
        return this._super.apply(this, arguments);
    },

    /**
     * @override
     */
    renderButtons: function () {
        this._super.apply(this, arguments);
        this.$buttons.find('.o_button_import').addClass('d-none');
        this.$buttons.find('.o_list_export_xlsx').addClass('d-none');
        this.$buttons.find('.o_list_button_add').removeClass('btn-primary').addClass('btn-secondary');
        var $buttons = $(qweb.render('StockOrderpoint.Buttons'));
        var $buttonOrder = $buttons.find('.o_button_order');
        $buttonOrder.on('click', this._onReplenish.bind(this));
        $buttonOrder.prependTo(this.$buttons);
    },

    // -------------------------------------------------------------------------
    // Handlers
    // -------------------------------------------------------------------------

    _onReplenish: function () {
        var records = this.getSelectedRecords();
        if (records.length > 0) {
            this.model.replenish(records);
        }
    },

    _onSelectionChanged: function (ev) {
        this._super(ev);
        var $buttonOrder = this.$el.find('.o_button_order');
        if (this.getSelectedIds().length === 0){
            $buttonOrder.removeClass('btn-primary').addClass('btn-secondary');
        } else {
            $buttonOrder.removeClass('btn-secondary').addClass('btn-primary');
        }
    },
});

return StockOrderpointListController;

});
