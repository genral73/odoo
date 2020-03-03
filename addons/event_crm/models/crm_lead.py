# -*- coding: utf-8 -*-
# Part of Odoo. See LICENSE file for full copyright and licensing details.

from odoo import fields, models, api


class Lead(models.Model):
    _inherit = 'crm.lead'

    event_id = fields.Many2one('event.event', string="Related Event")
    registration_ids = fields.Many2many('event.registration', string="Registrations",
        help="Registrations linked to the lead")
    registration_count = fields.Integer(compute='_compute_registration_count', string="# Registrations",
        help="Counter for the registrations linked to this lead")
    registration_rule_id = fields.Many2one('event.lead.rule', string="Registration Rule",
        help="Rule that created this lead")

    @api.depends('registration_ids')
    def _compute_registration_count(self):
        for record in self:
            record.registration_count = len(record.registration_ids)
