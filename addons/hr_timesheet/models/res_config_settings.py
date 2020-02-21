# -*- coding: utf-8 -*-
# Part of Odoo. See LICENSE file for full copyright and licensing details.

from odoo import fields, models, api


class ResConfigSettings(models.TransientModel):
    _inherit = 'res.config.settings'

    module_project_timesheet_synchro = fields.Boolean("Awesome Timesheet")
    module_project_timesheet_holidays = fields.Boolean("Record Time Off")

    @api.model
    def _default_encoding_uom_id(self):
        uom = self.env.ref('uom.product_uom_hour', raise_if_not_found=False)
        wtime = self.env.ref('uom.uom_categ_wtime')
        if not uom:
            uom = self.env['uom.uom'].search([('category_id', '=', wtime.id), ('uom_type', '=', 'reference')], limit=1)
        if not uom:
            uom = self.env['uom.uom'].search([('category_id', '=', wtime.id)], limit=1)
        self.env['ir.config_parameter'].sudo().set_param('hr_timesheet.project_time_mode_id', uom.id)
        self.env['ir.config_parameter'].sudo().set_param('hr_timesheet.timesheet_encode_uom_id', uom.id)
        return uom

    project_time_mode_id = fields.Many2one('uom.uom', string='Project Time Unit',
        config_parameter='hr_timesheet.project_time_mode_id',
        domain=lambda self: [('category_id', '=', self.env.ref('uom.uom_categ_wtime').id)],
        help="This will set the unit of measure used in projects and tasks.\n"
             "If you use the timesheet linked to projects, don't "
             "forget to setup the right unit of measure in your employees.")
    timesheet_encode_uom_id = fields.Many2one('uom.uom', string="Timesheet Encoding Unit",
        config_parameter='hr_timesheet.timesheet_encode_uom_id',
        domain=lambda self: [('category_id', '=', self.env.ref('uom.uom_categ_wtime').id)],
        help="""This will set the unit of measure used to encode timesheet. This will simply provide tools
        and widgets to help the encoding. All reporting will still be expressed in hours (default value).""")
    timesheet_min_duration = fields.Integer('Minimal duration', default=15, config_parameter='hr_timesheet.timesheet_min_duration')
    timesheet_rounding = fields.Integer('Rounding up', default=15, config_parameter='hr_timesheet.timesheet_rounding')
