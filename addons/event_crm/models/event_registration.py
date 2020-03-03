# -*- coding: utf-8 -*-
# Part of Odoo. See LICENSE file for full copyright and licensing details.

from odoo import api, fields, models, _


class EventRegistration(models.Model):
    _inherit = 'event.registration'

    lead_ids = fields.Many2many('crm.lead', string='Leads', readonly=True, copy=False,
        help="Leads generated from the registration.")
    lead_count = fields.Integer('# Leads', compute='_compute_lead_count',
        help="Counter for the leads linked to this registration")

    @api.depends('lead_ids')
    def _compute_lead_count(self):
        for record in self:
            record.lead_count = len(record.lead_ids)

    @api.model_create_multi
    def create(self, vals_list):
        registrations = super(EventRegistration, self).create(vals_list)
        self.env['event.lead.rule'].search([]).sudo()._create_leads(registrations)
        return registrations

    def write(self, vals):
        registration = super(EventRegistration, self).write(vals)
        if vals.get('partner_id') or vals.get('main_registration_id') or vals.get('event_id'):
            for lead in self.lead_ids.sorted('id'):
                vals = lead.registration_ids._get_registration_lead_values(lead.registration_rule_id)
                lead.write(vals)
        return registration

    def _get_registration_lead_values(self, rule):
        registration_lead_values = {
            'user_id': rule.lead_user_id.id,
            'type': rule.lead_type,
            'team_id': rule.lead_sales_team_id.id,
            'tag_ids': rule.lead_tag_ids.ids,
            'registration_rule_id': rule.id,
            'event_id': self.event_id.id,
            'referred': self.event_id.name,
            'registration_ids': self.ids,
        }
        if rule.lead_creation_basis == 'attendee':
            description = _("Participant:\n")
            description += self._get_lead_description()
            registration_lead_values.update({
                'description': description,
            })

            if self.partner_id and self.partner_id != self.env.ref('base.public_partner'):
                leads = self.main_registration_id.lead_ids.filtered(lambda lead: lead.registration_rule_id == rule)
                if not self.main_registration_id and not leads:
                    registration_lead_values.update({
                        'name': "%s - %s" % (self.event_id.name, self.partner_id.name),
                        'partner_id': self.partner_id.id,
                    })
                elif leads:
                    lead = leads[0] if leads[0].partner_id else False
                    if lead:
                        lead.write({
                            'partner_id': False,
                            'name': "%s - %s" % (self.event_id.name, self.main_registration_id.name),
                            'contact_name': self.main_registration_id.name,
                            'email_from': self.main_registration_id.email,
                            'phone': self.main_registration_id.phone,
                            'mobile': self.main_registration_id.mobile,
                        })
            if not registration_lead_values.get('name'):
                registration_lead_values.update({
                    'name': "%s - %s" % (self.event_id.name, self.name),
                    'contact_name': self.name,
                    'email_from': self.email,
                    'phone': self.phone,
                    'mobile': self.mobile,
                })
        else:
            description = _("Other Participants:\n") if not self.sorted('id')[0].main_registration_id else ""
            for registration in self:
                description += registration._get_lead_description()
            registration_lead_values.update({
                'description': description,
            })
            if self.partner_id and self.partner_id != self.env.ref('base.public_partner'):
                registration_lead_values.update({
                    'name': "%s - %s" % (self.event_id.name, self.partner_id.name),
                    'partner_id': self.partner_id.id,
                })
            else:
                registration_lead_values.update({
                    'name': "%s - %s" % (self.event_id.name, self[0].name),
                    'contact_name': self[0].name,
                    'email_from': self[0].email,
                    'phone': self[0].phone,
                    'mobile': self[0].mobile,
                })
        return registration_lead_values

    def _get_lead_description(self):
        """
        Build the description for the lead when a rule (per order) matchs for registrations.
        """
        return "\t%s %s %s\n" % (self.name, self.email if self.email else '', self.phone if self.phone else '')
