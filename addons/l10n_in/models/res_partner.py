# -*- coding: utf-8 -*-
# Part of Odoo. See LICENSE file for full copyright and licensing details.

import re

from odoo import api, fields, models, _
from odoo.addons.base_vat.models.res_partner import _ref_vat


_ref_vat.update({'in': "12AAAAA1234AAZA"})

class ResPartner(models.Model):
    _inherit = 'res.partner'

    # Use in view attrs. Need to required state_id if Country is India.
    l10n_in_company_country_code = fields.Char(related="property_account_payable_id.company_id.country_id.code", string="Country code")
    l10n_in_gst_treatment = fields.Selection([
        ('regular', 'Registered Business - Regular'),
        ('composition', 'Registered Business - Composition'),
        ('unregistered', 'Unregistered Business'),
        ('consumer', 'Consumer'),
        ('overseas', 'Overseas'),
        ('special_economic_zone', 'Special Economic Zone'),
        ('deemed_export', 'Deemed Export'),
    ],string="GST Treatment")
    l10n_in_pan_number = fields.Char(string="PAN Number")
    l10n_in_place_of_supply_id = fields.Many2one('res.country.state', string="Place of supply", domain=[('l10n_in_tin', '!=', False)])

    @api.model
    def check_vat_in(self, vat):
        if vat and len(vat) == 15:
            all_gstin_re = [
                r'[0-9]{2}[a-zA-Z]{5}[0-9]{4}[a-zA-Z]{1}[1-9A-Za-z]{1}[Zz1-9A-Ja-j]{1}[0-9a-zA-Z]{1}', # Normal, Composite, Casual GSTIN
                r'[0-9]{4}[A-Z]{3}[0-9]{5}[UO]{1}[N][A-Z0-9]{1}', #UN/ON Body GSTIN
                r'[0-9]{4}[a-zA-Z]{3}[0-9]{5}[N][R][0-9a-zA-Z]{1}', #NRI GSTIN
                r'[0-9]{2}[a-zA-Z]{4}[a-zA-Z0-9]{1}[0-9]{4}[a-zA-Z]{1}[1-9A-Za-z]{1}[DK]{1}[0-9a-zA-Z]{1}', #TDS GSTIN
                r'[0-9]{2}[a-zA-Z]{5}[0-9]{4}[a-zA-Z]{1}[1-9A-Za-z]{1}[C]{1}[0-9a-zA-Z]{1}' #TCS GSTIN
            ]
            return any(re.compile(rx).match(vat) for rx in all_gstin_re)
        return False

    @api.onchange('vat')
    def onchange_vat(self):
        if self.vat and self.check_vat_in(self.vat):
            self.l10n_in_pan_number = self.vat[2:13]
            find_place_of_supply = self.env['res.country.state'].search([('l10n_in_tin', '=', self.vat[:2])], limit=1)
            if find_place_of_supply:
                self.l10n_in_place_of_supply_id = find_place_of_supply
        else:
            self.l10n_in_pan_number = ''

    @api.onchange('l10n_in_gst_treatment')
    def onchange_l10n_in_gst_treatment(self):
        if self.l10n_in_company_country_code == 'IN' and self._origin.l10n_in_gst_treatment:
            self.vat = False
            self.l10n_in_pan_number = False
            self.l10n_in_place_of_supply_id = False
