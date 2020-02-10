# -*- coding: utf-8 -*-
# Part of Odoo. See LICENSE file for full copyright and licensing details.

from odoo import models, _


class TestCalendarAlarm(models.TransientModel):
    _inherit = 'calendar.alarm.test'

    def send_reminder_test(self):
        res = super(TestCalendarAlarm, self).send_reminder_test()
        if self.alarm_id.alarm_type == 'sms':
            self.event_id._message_sms_with_template(
                template=self.alarm_id.sms_template_id,
                template_fallback=_("Event reminder: %s, %s.") % (self.event_id.name, self.event_id.display_time),
                partner_ids=self.event_id.attendee_ids.partner_id.ids,
                put_in_queue=False
            )
        return res
