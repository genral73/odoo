odoo.define('purchase.dashboard', function (require) {
"use strict";

/**
 * This file defines the Purchase Dashboard view (alongside its renderer, model
 * and controller). This Dashboard is added to the top of list and kanban Purchase
 * views, it extends both views with essentially the same code except for
 * _onDashboardActionClicked function so we can apply filters without changing our
 * current view.
 */

var core = require('web.core');
var ListController = require('web.ListController');
var ListModel = require('web.ListModel');
var ListRenderer = require('web.ListRenderer');
var ListView = require('web.ListView');
var KanbanController = require('web.KanbanController');
var KanbanModel = require('web.KanbanModel');
var KanbanRenderer = require('web.KanbanRenderer');
var KanbanView = require('web.KanbanView');
var view_registry = require('web.view_registry');

var QWeb = core.qweb;

//--------------------------------------------------------------------------
// List View
//--------------------------------------------------------------------------

var PurchaseListDashboardRenderer = ListRenderer.extend({
    events:_.extend({}, ListRenderer.prototype.events, {
        'click .o_dashboard_action': '_onDashboardActionClicked',
    }),
    /**
     * @override
     * @private
     * @returns {Promise}
     */
    _renderView: function () {
        var self = this;
        return this._super.apply(this, arguments).then(function () {
            var values = self.state.dashboardValues;
            var purchase_dashboard = QWeb.render('purchase.PurchaseDashboard', {
                values: values,
            });
            self.$el.prepend(purchase_dashboard);
        });
    },

    /**
     * @private
     * @param {MouseEvent}
     */
    _onDashboardActionClicked: function (e) {
        e.preventDefault();
        var $action = $(e.currentTarget);
        this.trigger_up('dashboard_open_action', {
            action_name: $action.attr('name')+"_list",
        });
    },
});

var PurchaseListDashboardModel = ListModel.extend({
    /**
     * @override
     */
    init: function () {
        this.dashboardValues = {};
        this._super.apply(this, arguments);
    },

    /**
     * @override
     */
    get: function (localID) {
        var result = this._super.apply(this, arguments);
        if (_.isObject(result)) {
            result.dashboardValues = this.dashboardValues[localID];
        }
        return result;
    },
    /**
     * @override
     * @returns {Promise}
     */
    load: function () {
        return this._loadDashboard(this._super.apply(this, arguments));
    },
    /**
     * @override
     * @returns {Promise}
     */
    reload: function () {
        return this._loadDashboard(this._super.apply(this, arguments));
    },

    /**
     * @private
     * @param {Promise} super_def a promise that resolves with a dataPoint id
     * @returns {Promise -> string} resolves to the dataPoint id
     */
    _loadDashboard: function (super_def) {
        var self = this;
        var dashboard_def = this._rpc({
            model: 'purchase.order',
            method: 'retrieve_dashboard',
        });
        return Promise.all([super_def, dashboard_def]).then(function(results) {
            var id = results[0];
            var dashboardValues = results[1];
            self.dashboardValues[id] = dashboardValues;
            return id;
        });
    },
});

var PurchaseListDashboardController = ListController.extend({
    custom_events: _.extend({}, ListController.prototype.custom_events, {
        dashboard_open_action: '_onDashboardOpenAction',
    }),

    /**
     * @private
     * @param {OdooEvent} e
     */
    _onDashboardOpenAction: function (e) {
        return this.do_action(e.data.action_name);
    },
});

var PurchaseListDashboardView = ListView.extend({
    config: _.extend({}, ListView.prototype.config, {
        Model: PurchaseListDashboardModel,
        Renderer: PurchaseListDashboardRenderer,
        Controller: PurchaseListDashboardController,
    }),
});

//--------------------------------------------------------------------------
// Kanban View
//--------------------------------------------------------------------------

var PurchaseKanbanDashboardRenderer = KanbanRenderer.extend({
    events:_.extend({}, KanbanRenderer.prototype.events, {
        'click .o_dashboard_action': '_onDashboardActionClicked',
    }),
    /**
     * @override
     * @private
     * @returns {Promise}
     */
    _render: function () {
        var self = this;
        return this._super.apply(this, arguments).then(function () {
            var values = self.state.dashboardValues;
            var purchase_dashboard = QWeb.render('purchase.PurchaseDashboard', {
                values: values,
            });
            self.$el.prepend(purchase_dashboard);
        });
    },

    /**
     * @private
     * @param {MouseEvent}
     */
    _onDashboardActionClicked: function (e) {
        e.preventDefault();
        var $action = $(e.currentTarget);
        this.trigger_up('dashboard_open_action', {
            action_name: $action.attr('name')+"_kanban",
        });
    },
});

var PurchaseKanbanDashboardModel = KanbanModel.extend({
    /**
     * @override
     */
    init: function () {
        this.dashboardValues = {};
        this._super.apply(this, arguments);
    },

    /**
     * @override
     */
    get: function (localID) {
        var result = this._super.apply(this, arguments);
        if (_.isObject(result)) {
            result.dashboardValues = this.dashboardValues[localID];
        }
        return result;
    },
    /**
     * @override
     * @returns {Promise}
     */
    load: function () {
        return this._loadDashboard(this._super.apply(this, arguments));
    },
    /**
     * @override
     * @returns {Promise}
     */
    reload: function () {
        return this._loadDashboard(this._super.apply(this, arguments));
    },

    /**
     * @private
     * @param {Promise} super_def a promise that resolves with a dataPoint id
     * @returns {Promise -> string} resolves to the dataPoint id
     */
    _loadDashboard: function (super_def) {
        var self = this;
        var dashboard_def = this._rpc({
            model: 'purchase.order',
            method: 'retrieve_dashboard',
        });
        return Promise.all([super_def, dashboard_def]).then(function(results) {
            var id = results[0];
            var dashboardValues = results[1];
            self.dashboardValues[id] = dashboardValues;
            return id;
        });
    },
});

var PurchaseKanbanDashboardController = KanbanController.extend({
    custom_events: _.extend({}, KanbanController.prototype.custom_events, {
        dashboard_open_action: '_onDashboardOpenAction',
    }),

    /**
     * @private
     * @param {OdooEvent} e
     */
    _onDashboardOpenAction: function (e) {
        return this.do_action(e.data.action_name);
    },
});

var PurchaseKanbanDashboardView = KanbanView.extend({
    config: _.extend({}, KanbanView.prototype.config, {
        Model: PurchaseKanbanDashboardModel,
        Renderer: PurchaseKanbanDashboardRenderer,
        Controller: PurchaseKanbanDashboardController,
    }),
});

view_registry.add('purchase_list_dashboard', PurchaseListDashboardView);
view_registry.add('purchase_kanban_dashboard', PurchaseKanbanDashboardView);

return {
    PurchaseListDashboardModel: PurchaseListDashboardModel,
    PurchaseListDashboardRenderer: PurchaseListDashboardRenderer,
    PurchaseListDashboardController: PurchaseListDashboardController,
    PurchaseKanbanDashboardModel: PurchaseKanbanDashboardModel,
    PurchaseKanbanDashboardRenderer: PurchaseKanbanDashboardRenderer,
    PurchaseKanbanDashboardController: PurchaseKanbanDashboardController
};

});
