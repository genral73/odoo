# -*- coding: utf-8 -*-
# Part of Odoo. See LICENSE file for full copyright and licensing details.

from odoo import api, fields, models


class ResConfigSettings(models.TransientModel):
    _inherit = 'res.config.settings'

    adyen_account_ids = fields.One2many(string='Adyen Accounts', related='company_id.adyen_account_ids')
    adyen_account_id = fields.Many2one(string='Adyen Account', related='company_id.adyen_account_id', readonly=False)

    def create_adyen_account(self):
        return self.env['adyen.account'].action_create_redirect()
