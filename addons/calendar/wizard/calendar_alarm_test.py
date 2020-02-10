# -*- coding: utf-8 -*-
# Part of Odoo. See LICENSE file for full copyright and licensing details.
from datetime import datetime

from odoo import fields, models, tools


class TestCalendarAlarm(models.TransientModel):
    _name = 'calendar.alarm.test'
    _description = 'Test Reminder Wizard'

    event_id = fields.Many2one('calendar.event', string='Event', required=True, ondelete='cascade')

    alarm_id = fields.Many2one('calendar.alarm', string='Reminder', required=True, ondelete='cascade')

    def send_reminder_test(self):
        self.ensure_one()
        ctx = dict(self.env.context)
        self = self.with_context(ctx)

        if self.alarm_id.alarm_type == 'email':
            for attendee in self.event_id.attendee_ids:
                self.alarm_id.mail_template_id.send_mail(attendee.id, force_send=True, notif_layout='mail.mail_notification_light')
        elif self.alarm_id.alarm_type == 'notification':
            notif = {
                'alarm_id': self.alarm_id.id,
                'event_id': self.event_id.id,
                'title': self.event_id.name,
                'message': '%s %s' % (self.event_id.display_time, (self.alarm_id.body or '')),
                'delta': 0,
                'notify_at': datetime.now(),
            }
            notifications = [
                [(self._cr.dbname, 'calendar.alarm', self.env.user.partner_id.id), [notif]]
            ]
            self.env['bus.bus'].sendmany(notifications)
        return True
