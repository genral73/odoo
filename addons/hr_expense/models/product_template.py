# -*- coding: utf-8 -*-
# Part of Odoo. See LICENSE file for full copyright and licensing details.

from odoo import api, fields, models


class ProductTemplate(models.Model):
    _inherit = "product.template"

    can_be_expensed = fields.Boolean(string="Can be Expensed", compute='_compute_can_be_expensed', store=True, readonly=False, help="Specify whether the product can be selected in an expense.")

    @api.model
    def create(self, vals):
        # When creating an expense product on the fly, you don't expect to
        # have taxes on it
        if vals.get('can_be_expensed', False):
            vals.update({'supplier_taxes_id': False})
        return super(ProductTemplate, self).create(vals)

    @api.depends('type')
    def _compute_can_be_expensed(self):
        for product_template in self:
            if product_template.type not in ['consu', 'service']:  # storable can not be expensed.
                product_template.can_be_expensed = False
