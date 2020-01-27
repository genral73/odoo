# -*- coding: utf-8 -*-
# Part of Odoo. See LICENSE file for full copyright and licensing details.

from odoo import models


class EventRegistration(models.Model):
    _inherit = 'event.registration'

    def _get_registration_lead_values(self, rule):
        registration_lead_values = super(EventRegistration, self)._get_registration_lead_values(rule)
        registration_lead_values.update({
            'campaign_id': self.utm_campaign_id.id,
            'source_id': self.utm_source_id.id,
            'medium_id': self.utm_medium_id.id,
        })
        return registration_lead_values
