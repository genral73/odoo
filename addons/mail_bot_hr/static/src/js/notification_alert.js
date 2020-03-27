odoo.define('mail_bot_hr.NotificationAlert', function (require) {
    "use strict";

    var Widget = require('web.Widget');
    var widgetRegistry = require('web.widget_registry');

    // Dummy notification widget for the user preferences form view
    // The actualy functionality is implemented in the mail_bot module, but this dummy is added
    // here so the widget can be included in a view by some other module even if the
    // user uninstalls the mail_bot module
    var NotificationAlert = Widget.extend({
        template: 'mail.NotificationAlert',
        /**
         * @override
         */
        init: function () {
            this._super.apply(this, arguments);
            this.isNotificationBlocked = window.Notification && window.Notification.permission !== "granted";
        },
    });

    widgetRegistry.add('notification_alert', NotificationAlert);

    return NotificationAlert;
});
