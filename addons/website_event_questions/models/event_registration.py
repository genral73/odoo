# -*- coding: utf-8 -*-
# Part of Odoo. See LICENSE file for full copyright and licensing details.

from odoo import fields, models


class EventRegistration(models.Model):
    """ Store answers on attendees. """
    _inherit = 'event.registration'

    registration_answer_ids = fields.One2many('event.registration.answer', 'registration_id', string='Attendee Answers')
