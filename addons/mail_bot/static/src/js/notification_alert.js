odoo.define('mail_bot.NotificationAlert', function (require) {
"use strict";

var NotificationAlert = require('mail_bot_hr.NotificationAlert');

// -----------------------------------------------------------------------------
// Display Notification alert on user preferences form view
// -----------------------------------------------------------------------------
NotificationAlert.include({
    /**
     * @override
     */
    init: function () {
        this._super.apply(this, arguments);
        var hasRequest = this.call('mailbot_service', 'isRequestingForNativeNotifications');
        this.isNotificationBlocked = window.Notification && window.Notification.permission !== "granted" && !hasRequest;
    },
});

return NotificationAlert;
});
