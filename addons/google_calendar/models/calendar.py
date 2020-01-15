# -*- coding: utf-8 -*-
# Part of Odoo. See LICENSE file for full copyright and licensing details.

import pytz
from dateutil.parser import parse
from dateutil.relativedelta import relativedelta

from odoo import api, fields, models, _


class Meeting(models.Model):
    _name = 'calendar.event'
    _inherit = ['calendar.event', 'google.calendar.sync']

    google_id = fields.Char('Google Calendar Event Id', compute='_compute_google_id', store=True, readonly=False)

    @api.depends('recurrence_id.google_id')
    def _compute_google_id(self):
        # google ids of recurring events are built from the recurrence id and the
        # original starting time in the recurrence.
        # The `start` field does not appear in the dependencies on purpose!
        # Event if the event is moved, the google_id remains the same.
        for event in self:
            google_recurrence_id = event.recurrence_id._get_event_google_id(event)
            if google_recurrence_id:
                event.google_id = google_recurrence_id
            elif not event.google_id:
                event.google_id = False

    @api.model
    def _get_google_synced_fields(self):
        return {'name', 'description', 'allday', 'start', 'date_end', 'stop',
                'attendee_ids', 'alarm_ids', 'location', 'privacy', 'active'}

    @api.model_create_multi
    def create(self, vals_list):
        return super().create([
            dict(vals, need_sync=False) if vals.get('recurrency') else vals
            for vals in vals_list
        ])

    def write(self, values):
        recurrence_update_setting = values.get('recurrence_update')
        if recurrence_update_setting in ('all_events', 'future_events') and len(self) == 1:
            values = dict(values, need_sync=False)
        return super().write(values)

    def _get_sync_domain(self):
        return [('partner_ids.user_ids', 'in', self.env.user.id)]

    @api.model
    def _odoo_values(self, google_event, default_reminders=()):
        if google_event.is_cancelled():
            return {'active': False}

        alarm_commands = self._odoo_reminders_commands(google_event.reminders.get('overrides') or default_reminders)
        values = {
            'name': google_event.summary or _("(No title)"),
            'description': google_event.description,
            'location': google_event.location,
            'user_id': google_event.owner(self.env).id,
            'privacy': google_event.visibility or self.default_get(['privacy'])['privacy'],
            'attendee_ids': self._odoo_attendee_commands(google_event),
            'alarm_ids': alarm_commands,
            'recurrency': google_event.is_recurrent()
        }

        if google_event.reminders and google_event.reminders.get('useDefault'):
            values

        if not google_event.is_recurrence():
            values['google_id'] = google_event.id
        if google_event.start.get('dateTime'):
            # starting from python3.7, use the new [datetime, date].fromisoformat method
            start = parse(google_event.start.get('dateTime')).astimezone(pytz.utc).replace(tzinfo=None)
            stop = parse(google_event.end.get('dateTime')).astimezone(pytz.utc).replace(tzinfo=None)
            values['allday'] = False
        else:
            start = parse(google_event.start.get('date'))
            stop = parse(google_event.end.get('date')) - relativedelta(days=1)
            values['allday'] = True
        values['start'] = start
        values['stop'] = stop
        return values

    @api.model
    def _odoo_attendee_commands(self, google_event):
        commands = []
        if not google_event.attendees:
            return commands
        emails = [a.get('email') for a in google_event.attendees]
        existing_attendees = self.env['calendar.attendee']
        if google_event.exists(self.env):
            existing_attendees = self.env['calendar.attendee'].search([('event_id', '=', google_event.odoo_id(self.env)), ('email', 'in', emails)])
        attendees_by_emails = {a.email: a for a in existing_attendees}
        for attendee in google_event.attendees:
            email = attendee.get('email')

            if email in attendees_by_emails:
                # Update existing attendees
                commands += [(1, attendees_by_emails[email].id, {'state': attendee.get('responseStatus')})]
            else:
                # Create new attendees
                partner = self.env['res.partner'].find_or_create(attendee.get('email'))
                commands += [(0, 0, {'state': attendee.get('responseStatus'), 'partner_id': partner.id})]
                if attendee.get('displayName') and not partner.name:
                    partner.name = attendee.get('displayName')
        for odoo_attendee in attendees_by_emails.values():
            # Remove old attendees
            if odoo_attendee.email not in emails:
                commands += [(2, odoo_attendee.id)]
        return commands

    @api.model
    def _odoo_reminders_commands(self, reminders=()):
        commands = []
        for reminder in reminders:
            alarm_type = 'email' if reminder.get('method') == 'email' else 'notification'
            alarm_type_label = _("Email") if alarm_type == 'email' else _("Notification")

            minutes = reminder.get('minutes', 0)
            alarm = self.env['calendar.alarm'].search([
                ('alarm_type', '=', alarm_type),
                ('duration_minutes', '=', minutes)
            ], limit=1)
            if alarm:
                commands += [(4, alarm.id)]
            else:
                if minutes % (60*24) == 0:
                    interval = 'days'
                    duration = minutes / 60 / 24
                    name = _("%s - %s Days") % (alarm_type_label, duration)
                elif minutes % 60 == 0:
                    interval = 'hours'
                    duration = minutes / 60
                    name = _("%s - %s Hours") % (alarm_type_label, duration)
                else:
                    interval = 'minutes'
                    duration = minutes
                    name = _("%s - %s Minutes") % (alarm_type_label, duration)
                commands += [(0, 0, {'duration': duration, 'interval': interval, 'name': name, 'alarm_type': alarm_type})]
        reminders = {()}
        return commands

    def _google_values(self):
        if self.allday:
            start = {'date': self.start_date.isoformat()}
            end = {'date': (self.stop_date + relativedelta(days=1)).isoformat()}
        else:
            start = {'dateTime': pytz.utc.localize(self.start).isoformat()}
            end = {'dateTime': pytz.utc.localize(self.stop).isoformat()}

        reminders = [{
            'method': "email" if alarm.alarm_type == "email" else "popup",
            'minutes': alarm.duration_minutes
        } for alarm in self.alarm_ids]
        values = {
            'id': self.google_id,
            'start': start,
            'end': end,
            'summary': self.name,
            'description': self.description or '',
            'location': self.location or '',
            'guestsCanModify': True,
            'organizer': {'email': self.user_id.email, 'self': self.user_id == self.env.user},
            'attendees': [{'email': attendee.email, 'responseStatus': attendee.state} for attendee in self.attendee_ids],
            'extendedProperties': {
                'shared': {
                    '%s_odoo_id' % self.env.cr.dbname: self.id,
                },
            },
            'reminders': {
                'overrides': reminders,
                'useDefault': False,
            }
        }
        if self.privacy:
            values['visibility'] = self.privacy
        if self.user_id != self.env.user:
            values['extendedProperties']['shared']['%s_owner_id' % self.env.cr.dbname] = self.user_id.id

        if not self.active:
            values['status'] = 'cancelled'
        return values

class Attendee(models.Model):
    _inherit = 'calendar.attendee'

    google_internal_event_id = fields.Char('Google Calendar Event Id')
    oe_synchro_date = fields.Datetime('Odoo Synchro Date')

    _sql_constraints = [
        ('google_id_uniq', 'unique(google_internal_event_id,partner_id,event_id)', 'Google ID should be unique!')
    ]
