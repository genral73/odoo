# -*- coding: utf-8 -*-
# Part of Odoo. See LICENSE file for full copyright and licensing details.

from odoo import api, fields, models, _
from odoo.exceptions import UserError


class EventQuestion(models.Model):
    _name = 'event.question'
    _rec_name = 'title'
    _order = 'sequence,id'
    _description = 'Event Question'

    @api.model
    def default_get(self, fields):
        res = super(EventQuestion, self).default_get(fields)
        if self.env.context.get('duplicate_from_event_type_id'):
            event_type = self.env['event.type'].browse(self.env.context['duplicate_from_event_type_id'])
            if not res.get('answer_ids'):
                res['answer_ids'] = [(0, 0, {})
                    ]
        print(self, self._context, fields)
        print('\tres', res)
        return res

    title = fields.Char(required=True, translate=True)
    event_type_id = fields.Many2one('event.type', 'Event Type', ondelete='cascade')
    event_id = fields.Many2one('event.event', 'Event', ondelete='cascade')
    answer_ids = fields.One2many('event.answer', 'question_id', "Answers", required=True, copy=True)
    sequence = fields.Integer(default=10)
    is_individual = fields.Boolean('Ask each attendee',
                                   help="If True, this question will be asked for every attendee of a reservation. If "
                                        "not it will be asked only once and its value propagated to every attendees.")

    @api.onchange('event_id')
    def _onchange_event_id(self):
        print(self, self.ids, self.id, self._origin.ids, self._origin.id)
        print('cacaboom', self.event_id, self._context)

    @api.constrains('event_type_id', 'event_id')
    def _constrains_event(self):
        if any(question.event_type_id and question.event_id for question in self):
            raise UserError(_('Question cannot belong to both the event category and itself.'))

    @api.model
    def create(self, vals):
        print('creating question with', vals)
        # event_id = vals.get('event_id', False)
        # if event_id:
        #     event = self.env['event.event'].browse([event_id])
        #     if event.event_type_id.use_questions and event.event_type_id.question_ids:
        #         vals['answer_ids'] = vals.get('answer_ids', []) + [(0, 0, {
        #             'name': answer.name,
        #             'sequence': answer.sequence,
        #         }) for answer in event.event_type_id.question_ids.filtered(lambda question: question.title == vals.get('title')).mapped('answer_ids')]
        return super(EventQuestion, self).create(vals)


class EventAnswer(models.Model):
    _name = 'event.answer'
    _order = 'sequence,id'
    _description = 'Event Answer'

    name = fields.Char('Answer', required=True, translate=True)
    question_id = fields.Many2one('event.question', required=True, ondelete='cascade')
    sequence = fields.Integer(default=10)

    @api.model
    def create(self, vals):
        print('creating answer with', vals)
        return super(EventAnswer, self).create(vals)
