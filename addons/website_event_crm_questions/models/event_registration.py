# -*- coding: utf-8 -*-
# Part of Odoo. See LICENSE file for full copyright and licensing details.

from odoo import models, _


class EventRegistration(models.Model):
    _inherit = 'event.registration'

    def _get_lead_description(self):
        """Add the questions and answers linked to the registrations into the description of the lead."""
        description = super(EventRegistration, self)._get_lead_description()
        if self.answer_ids:
            description += _("\t\tQuestions:\n")
            for answer in self.answer_ids:
                description += "\t\t\t%s %s\n" % (answer.question_id.title, answer.name)
        return description
