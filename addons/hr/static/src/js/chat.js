odoo.define('hr.employee_chat', function (require) {
'use strict';

    var FormController = require('web.FormController');
    var FormView = require('web.FormView');
    var FormRenderer = require('web.FormRenderer');
    var viewRegistry = require('web.view_registry');

    var EmployeeFormRenderer = FormRenderer.extend({

        /**
         * @override
         */
        _render: function () {
            var self = this;
            return this._super.apply(this, arguments).then(function () {
                var $chat_button = self.$el.find('.o_employee_chat_btn');
                if (self.state.context.uid === self.state.data.user_id.res_id) { // Hide the button for yourself
                    $chat_button.hide();
                }
                else {
                    $chat_button.off('click').on('click', self._onOpenChat.bind(self));
                }
            });
        },

        destroy: function () {
            this.$el.find('.o_employee_chat_btn').off('click');
            return this._super();
        },

        _onOpenChat: function(ev) {
            ev.preventDefault();
            ev.stopImmediatePropagation();
            this.trigger_up('open_chat', {
                partner_id: this.state.data.user_partner_id.res_id
            });
            return true;
        },
    });

    var EmployeeFormController = FormController.extend({
        custom_events: _.extend({}, FormController.prototype.custom_events, {
            open_chat: '_onOpenChat'
        }),

        _onOpenChat: function (ev) {
            const env = this.call('messaging', 'env');
            const partner = env.entities.Partner.fromId(ev.data.partner_id);
            partner.openChat();
        },
    });

    var EmployeeFormView = FormView.extend({
        config: _.extend({}, FormView.prototype.config, {
            Controller: EmployeeFormController,
            Renderer: EmployeeFormRenderer
        }),
    });

    viewRegistry.add('hr_employee_form', EmployeeFormView);
    return EmployeeFormView;
});
