# -*- coding: utf-8 -*-
# Part of Odoo. See LICENSE file for full copyright and licensing details.

from odoo import api, fields, models


class ProjectDelete(models.TransientModel):
    _name = 'project.delete.wizard'
    _description = 'Project Delete Wizard'

    project_ids = fields.Many2many('project.project', string='Projects')
    task_count = fields.Integer(compute='_compute_task_count')

    def _compute_task_count(self):
        self = self.with_context(active_test=False)
        self.task_count = sum(self.project_ids.mapped('task_count'))

    def action_archive(self):
        self.project_ids.write({'active': False})
        action = self.env.ref('project.open_view_project_all').read()[0]
        return action

    def confirm_delete(self):
        self = self.with_context(active_test=False)
        self.project_ids.unlink()
        action = self.env.ref('project.open_view_project_all').read()[0]
        return action
