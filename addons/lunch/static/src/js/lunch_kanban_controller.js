odoo.define('lunch.LunchKanbanController', function (require) {
"use strict";

/**
 * This file defines the Controller for the Lunch Kanban view, which is an
 * override of the KanbanController.
 */

var KanbanController = require('web.KanbanController');
var LunchControllerCommon = require('lunch.LunchControllerCommon');

var LunchKanbanController = KanbanController.extend({
    custom_events: _.extend({}, KanbanController.prototype.custom_events, LunchControllerCommon.common_events),
}, LunchControllerCommon.common_functions);

return LunchKanbanController;

});
