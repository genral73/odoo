odoo.define('lunch.LunchListView', function (require) {
"use strict";

var LunchListController = require('lunch.LunchListController');
var LunchModel = require('lunch.LunchModel');
var LunchListRenderer = require('lunch.LunchListRenderer');

var core = require('web.core');
var ListView = require('web.ListView');
var view_registry = require('web.view_registry');

var _lt = core._lt;

var LunchListView = ListView.extend({
    config: _.extend({}, ListView.prototype.config, {
        Controller: LunchListController,
        Model: LunchModel,
        Renderer: LunchListRenderer,
    }),
    display_name: _lt('Lunch List'),

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

view_registry.add('lunch_list', LunchListView);

return LunchListView;

});
