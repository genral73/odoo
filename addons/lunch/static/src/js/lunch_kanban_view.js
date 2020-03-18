odoo.define('lunch.LunchKanbanView', function (require) {
"use strict";

var LunchKanbanController = require('lunch.LunchKanbanController');
var LunchModel = require('lunch.LunchModel');
var LunchKanbanRenderer = require('lunch.LunchKanbanRenderer');

var core = require('web.core');
var KanbanView = require('web.KanbanView');
var view_registry = require('web.view_registry');

var _lt = core._lt;

var LunchKanbanView = KanbanView.extend({
    config: _.extend({}, KanbanView.prototype.config, {
        Controller: LunchKanbanController,
        Model: LunchModel,
        Renderer: LunchKanbanRenderer,
    }),
    display_name: _lt('Lunch Kanban'),

    //--------------------------------------------------------------------------
    // Private
    //--------------------------------------------------------------------------

    /**
     * Injects an additional domain in the search panel
     *
     * @private
     * @override
     */
    _createSearchPanel: function (parent, params) {
        var self = this;
        var model = this.getModel(parent);
        var _super = this._super.bind(this);
        return model.getLocationDomain().then(function (domain) {
            self.loadParams.domain = self.loadParams.domain.concat(domain);
            return _super(parent, params);
        });
    },
});

view_registry.add('lunch_kanban', LunchKanbanView);

return LunchKanbanView;

});
