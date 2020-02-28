# -*- coding: utf-8 -*-
# Part of Odoo. See LICENSE file for full copyright and licensing details.

from odoo import api, fields, models


class EventType(models.Model):
    _inherit = 'event.type'

    use_questions = fields.Boolean('Questions to Attendees')
    question_ids = fields.One2many(
        'event.question', 'event_type_id',
        string='Questions', copy=True)


class EventEvent(models.Model):
    """ Override Event model to add optional questions when buying tickets. """
    _inherit = 'event.event'

    question_ids = fields.One2many('event.question', 'event_id', 'Questions', copy=True)
    general_question_ids = fields.One2many('event.question', 'event_id', 'General Questions',
                                           domain=[('is_individual', '=', False)])
    specific_question_ids = fields.One2many('event.question', 'event_id', 'Specific Questions',
                                            domain=[('is_individual', '=', True)])

    @api.onchange('event_type_id')
    def _onchange_type(self):
        super(EventEvent, self)._onchange_type()
        if self.event_type_id.use_questions and self.event_type_id.question_ids:
            self.with_context(duplicate_from_event_type_id=self.event_type_id.id).question_ids = [(5, 0, 0)] + [
                (0, 0, {
                    'title': question.title,
                    'sequence': question.sequence,
                    'is_individual': question.is_individual,
                    # 'answer_ids': [
                    #     (0, 0, {'name': answer.name, 'sequence': answer.sequence})
                    #     for answer in question.answer_ids
                    # ],
                })
                for question in self.event_type_id.question_ids
            ]
