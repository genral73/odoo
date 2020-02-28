# -*- coding: utf-8 -*-
# Part of Odoo. See LICENSE file for full copyright and licensing details.

from odoo import api, fields, models, _


class SaleOrder(models.Model):
    _inherit = 'sale.order'

    @api.depends('order_line.product_id', 'order_line.project_id')
    def _compute_project_ids(self):
        super()._compute_project_ids()
        for order in self:
            projects = order.order_line.mapped('bom_project_ids')
            order.project_ids |= projects


class SaleOrderLine(models.Model):
    _inherit = 'sale.order.line'

    bom_project_ids = fields.Many2many('project.project', help="project\
                                        generated by services in a kit")
    is_kit = fields.Boolean('is a kit', compute='_compute_is_kit', help='A\
                            project/task should be generated if product is\
                            a kit and said kit contains a service')
    bom_id = fields.Many2one('mrp.bom', compute='_compute_bom_id', help='Bom related\
                             to the product if a Bom exist')

    @api.depends('product_id')
    def _compute_bom_id(self):
        for line in self:
            line.bom_id = self.env['mrp.bom']._bom_find(product=line.product_id, company_id=line.product_id.company_id, bom_type='phantom')

    @api.depends('product_id')
    def _compute_is_kit(self):
        for line in self:
            if line.bom_id.type == 'phantom':
                line.is_kit = True
            else:
                line.is_kit = False

    def _timesheet_create_project_from_template(self, bom_line, values):
        values['name'] = "%s - %s" % (values['name'], bom_line.product_id.project_template_id.name)
        project = bom_line.product_id.project_template_id.copy(values)
        project.tasks.write({
            'sale_line_id': self.id,
            'partner_id': self.order_id.partner_id.id,
            'email_from': self.order_id.partner_id.email,
        })
        # duplicating a project doesn't set the SO on sub-tasks
        project.tasks.filtered(lambda task: task.parent_id != False).write({
            'sale_line_id': self.id,
        })
        return project

    def _timesheet_create_project_prepare_values_for_kit_line(self, bom_line):
        self.ensure_one()
        account = self.order_id.analytic_account_id
        if not account:
            self.order_id._create_analytic_account(prefix=self.product_id.default_code or None)
            account = self.order_id.analytic_account_id
        values = {
            'name': '%s - %s' % (self.order_id.client_order_ref, self.order_id.name) if self.order_id.client_order_ref else self.order_id.name,
            'analytic_account_id': account.id,
            'partner_id': self.order_id.partner_id.id,
            'sale_line_id': self.id,
            'sale_order_id': self.order_id.id,
            'active': True,
            'company_id': self.company_id.id,
            'bom_line_id': bom_line.id
        }
        return values

    def _timesheet_create_task_prepare_values_for_kit_line(self, project, bom_line):
        self.ensure_one()
        values = super()._timesheet_create_task_prepare_values(project)
        bom_line_name_parts = bom_line.product_id.name.split('\n')
        values['name'] = bom_line_name_parts[0] or bom_line.product_id.name
        values['description'] = '<br/>'.join(bom_line_name_parts[1:])
        values['planned_hours'] = bom_line.product_qty
        values['bom_line_id'] = bom_line.id
        values['company_id'] = self.company_id.id
        return values

    def _timesheet_create_task_for_kit_line(self, project, bom_line):
        values = self._timesheet_create_task_prepare_values_for_kit_line(project, bom_line)
        task = self.env['project.task'].create(values)
        task_msg = _("This task has been created from: <a href=# data-oe-model=sale.order data-oe-id=%d>%s</a> (%s)") % (self.order_id.id, self.order_id.name, self.product_id.name)
        task.message_post(body=task_msg)
        return task

    def _timesheet_service_generation(self):
        super()._timesheet_service_generation()
        bom_line_generate = {'task_in_project': [], 'task_global_project': [], 'project_only': []}
        for line in self:
            if line.is_kit:
                for key in bom_line_generate:
                    bom_line_generate[key] = line.bom_id.bom_line_ids.filtered(lambda boml: boml.is_service and boml.product_id.service_tracking == key)

                boml_new_task = bom_line_generate['task_global_project'] + bom_line_generate['task_in_project']

                for bom_line in boml_new_task:
                    task = self.env['project.task'].search([('bom_line_id', '=', bom_line.id), ('sale_line_id', '=', line.id)])
                    if not task:
                        if bom_line.product_id.service_tracking == 'task_in_project':
                            task_project = line.order_id.project_id
                            if not task_project:
                                values = line._timesheet_create_project_prepare_values_for_kit_line(bom_line)
                                if bom_line.product_id.project_template_id:
                                    task_project = line._timesheet_create_project_from_template(bom_line, values)
                                else:
                                    task_project = self.env['project.project'].create(values)
                                line.order_id.project_id = task_project
                        else:
                            task_project = bom_line.product_id.project_id
                        task = line._timesheet_create_task_for_kit_line(task_project, bom_line)
                        line.bom_project_ids |= task_project

                for bom_line in bom_line_generate['project_only']:
                    project_generated = self.env['project.project'].search([('bom_line_id', '=', bom_line.id), ('sale_line_id', '=', line.id)])
                    if not project_generated:
                        values = line._timesheet_create_project_prepare_values_for_kit_line(bom_line)
                        # If a project_template is set, create project based on template
                        if bom_line.product_id.project_template_id:
                            project = line._timesheet_create_project_from_template(bom_line, values)
                        else:
                            project = self.env['project.project'].create(values)
                        line.bom_project_ids |= project
