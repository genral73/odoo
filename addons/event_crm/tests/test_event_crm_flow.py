# -*- coding: utf-8 -*-
# Part of Odoo. See LICENSE file for full copyright and licensing details.
from odoo.addons.event_crm.tests.common import TestEventCommon
from odoo.tools import mute_logger
from odoo import _


class TestEventCrmFlow(TestEventCommon):

    @mute_logger('odoo.addons.base.models.ir_model', 'odoo.models')
    def test_event_crm_flow_one_per_attendee(self):
        leads = self.env['crm.lead'].search([
            ('event_id', '=', self.test_event.id),
            ('registration_rule_id', '=', self.test_rule_attendee.id)
        ])

        self.assertEqual(len(leads), 3,
            "Event CRM: registration which does not check the rule should not create lead")

        self.assertEqual(len(leads.event_id.registration_ids), 4,
            "Event CRM: three registrations should have been created for the event")

    @mute_logger('odoo.addons.base.models.ir_model', 'odoo.models')
    def test_event_crm_flow_one_per_order(self):
        lead = self.env['crm.lead'].search([
            ('event_id', '=', self.test_event.id),
            ('registration_rule_id', '=', self.test_rule_order.id)
        ])

        self.assertEqual(len(lead), 1,
            "Event CRM: one lead sould be created for the set of attendees")

        self.assertEqual(lead.registration_count, 3,
            "Event CRM: registration which does not check the rule should not be linked to the lead")

        self.assertEqual(len(lead.event_id.registration_ids), 4,
            "Event CRM: four registrations should have been created for the event")

        self.check_description(lead)

    @mute_logger('odoo.addons.base.models.ir_model', 'odoo.models')
    def test_event_crm_multi_rules(self):
        leads = self.env['crm.lead'].search([
            ('event_id', '=', self.test_event.id),
            ('registration_rule_id', 'in', [self.test_rule_attendee.id, self.test_rule_order.id])
        ])

        self.assertEqual(len(leads), 4,
            "Event CRM: four leads sould be created for the set of attendees")

        self.assertEqual(len(leads.event_id.registration_ids), 4,
            "Event CRM: four registrations should have been created for the event")

        for lead in leads:
            self.check_description(lead)

    def check_description(self, lead):
        description_lines = lead.description.split('\n')
        registration_ids = lead.registration_ids.sorted(key='id')

        if lead.registration_rule_id.lead_creation_basis == 'attendee':
            first_line = _('Participant:')
        else:
            first_line = _('Other Participants:')

        self.assertEqual(description_lines[0], first_line,
            "Event CRM: the description of the lead created should begins by: " + first_line)

        for i in range(1, len(description_lines) - 1):
            lead_registration_line = "\t" + registration_ids[i - 1].name + " " + registration_ids[i - 1].email + " " + registration_ids[i - 1].phone
            self.assertEqual(description_lines[i], lead_registration_line,
                "Event CRM: the registration " + str(i) + " should appear on the description")

        self.assertEqual(description_lines[len(description_lines) - 1], '',
            "Event CRM: there should be no more registration writen on the description")
