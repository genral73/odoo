# -*- coding: utf-8 -*-
# Part of Odoo. See LICENSE file for full copyright and licensing details.

from odoo import fields, models


class StockWarehouseOrderpoint(models.Model):
    _inherit = 'stock.warehouse.orderpoint'

    show_bom = fields.Boolean('Show BoM column', compute='_compute_show_bom')
    bom_id = fields.Many2one(
        'mrp.bom', string='Bill of Materials',
        domain="[('type', '=', 'normal'), '|', ('product_id', '=', product_id), '&', ('product_id', '=', False), ('product_tmpl_id', '=', product_tmpl_id)]")

    def _compute_show_bom(self):
        for orderpoint in self:
            orderpoint.show_bom = any(ru.action == 'manufacture' for ru in orderpoint.route_id.rule_ids)

    def _get_default_route_id(self):
        if self.product_id.bom_ids:
            route_id = self.env['stock.rule'].search([
                ('action', '=', 'manufacture')
            ]).route_id
            if route_id:
                return route_id[0]
        return super()._get_default_route_id()

    def _prepare_procurement_values(self, date=False, group=False):
        values = super()._prepare_procurement_values(date=date, group=group)
        values['bom_id'] = self.bom_id
        return values
