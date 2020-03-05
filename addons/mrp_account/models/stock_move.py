# -*- coding: utf-8 -*-
# Part of Odoo. See LICENSE file for full copyright and licensing details.

from odoo import models


class StockMove(models.Model):
    _inherit = 'stock.move'

    def _create_in_svl(self, forced_quantity=None):
        res = super()._create_in_svl(forced_quantity=forced_quantity)
        for move in self:
            if not move.production_id:
                continue
            move.stock_valuation_layer_ids.description = move.note
        return res

