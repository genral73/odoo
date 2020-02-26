# -*- coding: utf-8 -*-
# Part of Odoo. See LICENSE file for full copyright and licensing details.

from odoo import api, fields, models
from odoo.exceptions import ValidationError


class ProjectTaskTypeDeleteMoveLine(models.TransientModel):
    """

    """

    _name = 'project.task.type.delete.move.line.wizard'
    _description = 'Project Stage Delete Move Line'

    def _get_project_id_domain(self):
        return ['|', ('active', '=', False), ('active', '=', True), ('id', 'in', self.env.context.get('project_ids'))]

    wizard_id = fields.Many2one('project.task.type.delete.wizard', required=True)
    project_id = fields.Many2one('project.project', domain=_get_project_id_domain, string='Project', required=True)
    stage_id = fields.Many2one('project.task.type', related='wizard_id.stage_id')
    new_stage_id = fields.Many2one('project.task.type', string='Move To Stage', domain="[('id', '!=', stage_id), ('project_ids', 'in', project_id)]")

    _sql_constraints = [
        ('uniq_wizard_project', 'UNIQUE(wizard_id, project_id)', 'A project can only appear once')
    ]

    def move(self, unlink=True):
        for line in self:
            tasks = self.env['project.task'].with_context(active_test=False).search([('stage_id', '=', line.stage_id.id), ('project_id', '=', line.project_id.id)])
            tasks.stage_id = line.new_stage_id
            line.new_stage_id.write({'project_ids': [(4, line.project_id.id, 0)]})

        self.stage_id.write({'project_ids': [(3, project_id, 0) for project_id in self.project_id.ids]})

        if unlink:
            self.stage_id.unlink()

class ProjectTaskTypeDelete(models.TransientModel):
    """

    """

    _name = 'project.task.type.delete.wizard'
    _description = 'Project Stage Delete Wizard'

    project_ids = fields.Many2many('project.project', domain="['|', ('active', '=', False), ('active', '=', True)]", string='Projects')
    move_line_ids = fields.One2many('project.task.type.delete.move.line.wizard', 'wizard_id')
    stage_id = fields.Many2one('project.task.type', string='Stage To Delete')
    task_count = fields.Integer(compute='_compute_tasks_count')

    action = fields.Selection([
        ('move', 'Delete this stage and move its tasks to another one'),
        ('delete', 'Delete this stage and its tasks'),
    ], default='move')

    delete_from = fields.Selection([
        ('single', 'One Project'),
        ('all', 'All Projects')
    ], "Delete This Stage From", default='single')

    @api.model
    def _default_project_id(self):
        return self.env.context.get('default_project_id', False)

    single_project = fields.Boolean(compute='_compute_single_project', store=True)
    project_id = fields.Many2one('project.project', domain="[('id', 'in', project_ids)]", default=_default_project_id)
    new_stage_id = fields.Many2one('project.task.type', compute='_compute_new_stage_id', inverse='_inverse_new_stage_id', domain="[('id', '!=', stage_id), ('project_ids', 'in', project_id)]")

    @api.depends('project_ids', 'stage_id')
    def _compute_tasks_count(self):
        self.task_count = self.with_context(active_test=False).env['project.task'].search_count([('stage_id', 'in', self.stage_id.ids)])

    @api.depends('project_ids')
    def _compute_single_project(self):
        self.ensure_one()
        self = self.with_context(active_test=False)
        self.single_project = len(self.project_ids) == 1
        if self.single_project:
            self.project_id = self.project_ids[0]

    @api.depends('project_id')
    def _compute_new_stage_id(self):
        if self.project_id:
            self.new_stage_id = self.move_line_ids.filtered(lambda ml: ml.project_id == self.project_id).new_stage_id
        else:
            self.new_stage_id = False

    def _inverse_new_stage_id(self):
        self.ensure_one()
        self.move_line_ids.filtered(lambda ml: ml.project_id == self.project_id).new_stage_id = self.new_stage_id

    @api.model
    def default_get(self, fields_list):
        values = super(ProjectTaskTypeDelete, self).default_get(fields_list)
        if 'move_line_ids' in fields_list:
            project_ids = self.env.context.get('project_ids', [])

            values['move_line_ids'] = [
                (0, 0, {'project_id': project_id}) for project_id in project_ids
            ]

        return values

    @api.constrains('move_line_ids')
    def _check_move_line_ids(self):
        if not set(self.project_ids.ids).issubset(self.move_line_ids.project_id.ids):
            raise ValidationError('All the projects from the stage must be selected.')

    def move(self):
        project_id = self.env.context.get('default_project_id')
        selected_project_ids = self.project_id.ids if self.delete_from == 'single' else self.project_ids.ids

        if self.action == 'delete' or (self.single_project and not self.task_count):
            tasks = self.env['project.task'].with_context(active_test=False).search([('project_id', 'in', selected_project_ids), ('stage_id', '=', self.stage_id.id)])
            tasks.unlink()
            if self.delete_from == 'single':
                self = self.with_context(default_project_ids=selected_project_ids)
            else:
                self.stage_id.write({'project_ids': [(3, project_id, 0) for project_id in selected_project_ids]})
            self.stage_id.unlink()
        else:
            # Really delete the stage if it's to be removed from all projects 
            # OR there's only one project linked to that stage
            if self.delete_from == 'all':
                if any([not line.new_stage_id for line in self.move_line_ids]):
                    raise ValidationError('A new stage is required for each project.')
                self.move_line_ids.move()
            else:
                self.move_line_ids.filtered(lambda ml: ml.project_id == self.project_id).move(unlink=False)

        if project_id:
            action = self.env.ref('project.action_view_task').read()[0]
            action['domain'] = [('project_id', '=', project_id)]
            action['context'] = {
                'pivot_row_groupby': ['user_id'],
                'default_project_id': project_id,
            }
        elif self.env.context.get('stage_view'):
            action = self.env.ref('project.open_task_type_form').read()[0]
        else:
            action = self.env.ref('project.action_view_all_task').read()[0]

        action['target'] = 'main'
        return action
