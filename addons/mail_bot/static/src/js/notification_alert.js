odoo.define('mail.NotificationAlert', function (require) {
"use strict";

var Widget = require('web.Widget');
var widgetRegistry = require('web.widget_registry');

// -----------------------------------------------------------------------------
// Display Notification alert on user preferences form view
// -----------------------------------------------------------------------------
var NotificationAlert = Widget.extend({
    template: 'mail.NotificationAlert',
    /**
     * @override
     */
    init: function () {
        this._super.apply(this, arguments);
        var hasRequest = this.call('mailbot_service', 'isRequestingForNativeNotifications');
        this.isNotificationBlocked = window.Notification && window.Notification.permission !== "granted" && !hasRequest;
        if (this.isNotificationBlocked) {
            if (navigator.userAgent.search("Chrome") != -1) {
                this.settingUrl = "chrome://settings/content/siteDetails?site=https%3A%2F%2Fdatabasename.odoo.com";
            } else if (navigator.userAgent.search("Firefox") != -1) {
                this.settingUrl = "about:preferences#privacy";
            } else if (navigator.userAgent.search("Safari") != -1) {
                this.settingPath = "(path:Safari > Preferences > Website > Notifications)";
            }
        }
    },
    /**
     * Copies the browser settings URL link to the clipboard.
     *
     * @override
     */
    start: function() {
        this._super.apply(this, arguments);
        var self = this;
        if (this.isNotificationBlocked && this.settingUrl) {
            var $clipboardBtn = this.$('.o_clipboard_button');
            $clipboardBtn.tooltip({title: 'Copied !', trigger: "manual", placement: "right"});
            var clipboard = new ClipboardJS($clipboardBtn[0], {
                text: function () { return self.settingUrl; },
                container: this.el,
            });
            clipboard.on("success", function (e) {
                clipboard.destroy();
                _.defer(function () {
                    $clipboardBtn.tooltip("show");
                    _.delay(function () { $clipboardBtn.tooltip("hide"); }, 800);
                });
            });
            clipboard.on('error', function (e) {
                clipboard.destroy();
            });
        }
    },
});

widgetRegistry.add('notification_alert', NotificationAlert);

return NotificationAlert;

});
