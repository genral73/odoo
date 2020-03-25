odoo.define('utm.campaing_kanban_examples', function (require) {
    'use strict';

    var core = require('web.core');
    var kanbanExamplesRegistry = require('web.kanban_examples_registry');

    var _lt = core._lt;

    kanbanExamplesRegistry.add('utm_campaign', {
        ghostColumns: [_lt('New'), _lt('Schedule'), _lt('Design'), _lt('Sent')],
        apply_example_text: _lt("Use This For My Campaigns"),
        examples: [{
            name: _lt('Event-driven Flow'),
            columns: [_lt('Later'), _lt('This Month'), _lt('This Week'), _lt('Running'), _lt('Sent')],
            description: "Track incoming events (e.g. : Christmas, Black Friday, ...) and publish timely content.",
        }, {
            name: _lt('Soft-Launch Flow'),
            columns: [_lt('Pre-Launch'), _lt('Soft-Launch'), _lt('Deploy'), _lt('Report'), _lt('Done')],
            description: "Prepare your Campaign, test it with part of your audience and deploy it fully afterwards.",
        }, {
            name: _lt('Creative Flow'),
            columns: [_lt('Ideas'), _lt('Design'), _lt('Review'), _lt('Send'), _lt('Done')],
            description: "Collect ideas, design creative content and publish it once reviewed.",
        }, {
            name: _lt('Audience-driven Flow'),
            columns: [_lt('New'), _lt('Gather Data'), _lt('List-Building'), _lt('Copywriting'), _lt('Sent')],
            description: "Gather data, build a list and write content based on your Marketing target.",
        }, {
            name: _lt('Approval-based Flow'),
            columns: [_lt('New'), _lt('To be Approved'), _lt('Approved'), _lt('Deployed')],
            description: "Prepare campaigns and get them approved before making them Go Live.",
        }],
    });
});
