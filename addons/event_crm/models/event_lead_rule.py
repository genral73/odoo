# -*- coding: utf-8 -*-
# Part of Odoo. See LICENSE file for full copyright and licensing details.

from ast import literal_eval

from odoo import fields, models
from odoo.osv import expression


class EventCrmRule(models.Model):
    """
    When registrations are created, if they match rules, we create leads depending of the
    lead_creation_basis and we link those leads to the registrations. The lead creation type
    determines the number of leads to create: one per order or one per attendee.
    A rule can have 4 types of restrictions:
        - The company of the event link to the registration
        - The type of the event
        - The event itself
        - A domain set on event.registration

    When setting the rule you can choose multiple event types and/or one particular event, so
    it's totally possible to have a rule on multiple event types and specified one event which
    does not belong to this categories.
    """
    _name = "event.lead.rule"
    _description = "Event CRM Rules"
    _order = "sequence, id"

    # Rule configuration fields
    name = fields.Char('Rule Name', required=True, translate=True)
    sequence = fields.Integer(default=10)
    active = fields.Boolean('Active', default=True)
    lead_creation_basis = fields.Selection([
        ('attendee', 'Per Attendee'), ('order', 'Per Order')],
        string='Create', default='attendee', required=True,
        help='One per Attendee : A Lead is created for each Attendee (B2C).\n'
            'One per Order : A single Lead is created per Ticket Batch/Sale Order (B2B)')
    event_type_ids = fields.Many2many('event.type',
        string='Event Categories',
        help='Filter the attendees to include those of this specific event category. If not set, no event category restriction will be applied.')
    event_id = fields.Many2one('event.event',
        string='Event', domain="[('company_id', 'in', [company_id or current_company_id, False])]",
        help='Filter the attendees to include those of this specific event. If not set, no event restriction will be applied.')
    company_id = fields.Many2one('res.company', string='Company',
        help="Restrict the trigger of this rule to events belonging to a specific company.\nIf not set, no company restriction will be applied.")
    event_registration_filter = fields.Text(string="Registrations Domain",
        help="Filter the attendees that will or not generate leads.")

    # Lead default_value fields
    lead_type = fields.Selection([
        ('lead', 'Lead'), ('opportunity', 'Opportunity')], string="Lead Type", required=True,
        default=lambda self: 'lead' if self.env['res.users'].has_group('crm.group_use_lead') else 'opportunity',
        help="Default lead type when this rule is applied.")
    lead_sales_team_id = fields.Many2one('crm.team', string='Sales Team', help="Automatically assign the created leads to this Sales Team.")
    lead_user_id = fields.Many2one('res.users', string='Salesperson', help="Automatically assign the created leads to this Salesperson.")
    lead_tag_ids = fields.Many2many('crm.tag', string='Tags', help="Automatically add these tags to the created leads.")

    def _create_leads(self, registrations):
        """
        Create leads based on lead creation type of the rule and apply to this leads
        some prefilled values based on the rule and the registration.
        """
        leads = self.env['crm.lead']
        for rule in self:
            vals_list = []
            filtered_registrations = rule._filter_registrations(registrations)
            if filtered_registrations:
                if rule.lead_creation_basis == 'attendee':
                    for registration in filtered_registrations:
                        vals_list.append(registration._get_registration_lead_values(rule))
                else:
                    if not filtered_registrations[0].main_registration_id:
                        vals_list.append(filtered_registrations._get_registration_lead_values(rule))
                    else:
                        # Update the description of the lead linked to the main registration instead of creating a new one
                        for registration in filtered_registrations:
                            leads = registration.main_registration_id.lead_ids.filtered(lambda lead: lead.registration_rule_id == rule)
                            for lead in leads:
                                lead.description += registration._get_lead_description()
                                registration.lead_ids += lead

                if vals_list:
                    leads |= self.env['crm.lead'].create(vals_list)
        return leads

    def _filter_registrations(self, registrations):
        """
        Check if the registrations match with the rule's conditions.
        """
        if self.event_registration_filter and self.event_registration_filter != '[]':
            registrations = registrations.search(expression.AND([[('id', 'in', registrations.ids)], literal_eval(self.event_registration_filter)]))

        event_type_ok = (lambda registration: registration.event_id.event_type_id in self.event_type_ids if self.event_type_ids else True)
        event_ok = (lambda registration: registration.event_id == self.event_id if self.event_id else True)
        company_ok = (lambda registration: registration.company_id == self.company_id if self.company_id else True)

        return registrations.filtered(lambda r: company_ok(r) and event_type_ok(r) and event_ok(r)).sorted('id')
