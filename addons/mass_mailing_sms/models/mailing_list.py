# -*- coding: utf-8 -*-
# Part of Odoo. See LICENSE file for full copyright and licensing details.

from odoo import models, fields, api


class MailingList(models.Model):
    _inherit = 'mailing.list'

    contact_ids_valid_sms = fields.Many2many(
        'mailing.contact', 'mailing_contact_list_rel', 'list_id', 'contact_id',
        compute='_compute_sms_statistic', string='Valid sms'
    )
    contact_valid_sms_count = fields.Integer(compute='_compute_sms_statistic', string='Number of Valid contacts')


    def action_view_valid_email_contacts(self):
        if self.env.context.get('mailing_sms'):
            action = self.env.ref('mass_mailing_sms.mailing_contact_action_sms').read()[0]
            action['domain'] = [('list_ids', 'in', self.ids)]
            context = dict(self.env.context, search_default_filter_valid_sms_recipient=1, default_list_ids=self.ids)
            action['context'] = context
            return action
        return super(MailingList, self).action_view_contacts()

    
    @api.depends('contact_ids')
    def _compute_sms_statistic(self):
        for sms_list in self:
            contact_ids = sms_list.contact_ids.with_context({'default_list_ids': [sms_list.id]})
            sms_list.contact_ids_valid_sms = contact_ids.filtered(
                lambda contact: contact.mobile and not contact.is_blacklisted and not contact.opt_out
            )
            sms_list.contact_valid_sms_count = len(sms_list.contact_ids_valid_sms)
