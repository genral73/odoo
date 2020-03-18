# -*- coding: utf-8 -*-
# Part of Odoo. See LICENSE file for full copyright and licensing details.

from odoo import api, fields, models

class ForumPostClose(models.TransientModel):
    _name = 'forum.post.close'
    _description = "Close a forum post and add a reason"

    @api.model
    def default_get(self, fields):
        result = super(ForumPostClose, self).default_get(fields)

        active_id = self._context.get('active_id')
        if active_id:
            result['post_id'] = self.env['forum.post'].browse(active_id).id
        return result

    post_id = fields.Many2one('forum.post')
    close_reason = fields.Many2one('forum.post.reason', string='Reason', required=True, domain="[('reason_type', '=', 'basic')]")

    def close_with_reason(self):
        return self.post_id.close(reason_id=self.close_reason.id)

class ForumPostOffensive(models.TransientModel):
    _name = 'forum.post.offensive'
    _description = "Mark a forum post as offensive and add a reason"

    @api.model
    def default_get(self, fields):
        result = super(ForumPostOffensive, self).default_get(fields)

        active_id = self._context.get('active_id')
        if active_id:
            result['post_id'] = self.env['forum.post'].browse(active_id).id
        return result

    post_id = fields.Many2one('forum.post')
    offensive_reason = fields.Many2one('forum.post.reason', string='Reason', required=True, domain="[('reason_type', '=', 'offensive')]")

    def mark_as_offensive_with_reason(self):
        return self.post_id.mark_as_offensive(reason_id=self.offensive_reason.id)
