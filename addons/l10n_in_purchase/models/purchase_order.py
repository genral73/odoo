# -*- coding: utf-8 -*-
# Part of Odoo. See LICENSE file for full copyright and licensing details.

from odoo import api, fields, models, _
from odoo.exceptions import ValidationError
from odoo.addons.purchase.models.purchase import PurchaseOrder as Purchase


class PurchaseOrder(models.Model):
    _inherit = "purchase.order"

    l10n_in_journal_id = fields.Many2one('account.journal', string="Journal", \
        states=Purchase.READONLY_STATES, domain="[('type','=', 'purchase')]")
    l10n_in_gst_treatment = fields.Selection([
        ('regular', 'Registered Business - Regular'),
        ('composition', 'Registered Business - Composition'),
        ('unregistered', 'Unregistered Business'),
        ('consumer', 'Consumer'),
        ('overseas', 'Overseas'),
        ('special_economic_zone', 'Special Economic Zone'),
        ('deemed_export', 'Deemed Export'),
    ],string = "GST Treatment", states = Purchase.READONLY_STATES)
    l10n_in_place_of_supply_id = fields.Many2one('res.country.state', string="Destination of Supply",
        domain=[('l10n_in_tin','!=', False)], states=Purchase.READONLY_STATES)
    l10n_in_gstin = fields.Char(string="GSTIN", states = Purchase.READONLY_STATES)
    l10n_in_company_country_code = fields.Char(related = 'company_id.country_id.code', string = "Country code")

    @api.constrains('l10n_in_gstin', 'company_id')
    def _check_l10n_in_gstin(self):
        check_vat_in = self.env['res.partner'].check_vat_in
        wrong_gstin_moves = self.filtered(lambda move:
            move.l10n_in_company_country_code == 'IN' and
            move.l10n_in_gst_treatment in ['regular', 'composition', 'special_economic_zone', 'deemed_export'] and
            move.l10n_in_gstin != False and
            not check_vat_in(move.l10n_in_gstin))
        if wrong_gstin_moves:
            raise ValidationError(_("The GSTIN number [%s] does not seem to be valid")%(",".join(m.l10n_in_gstin for m in wrong_gstin_moves)))

    @api.onchange('company_id')
    def l10n_in_onchange_company_id(self):
        if self.l10n_in_company_country_code == 'IN':
            domain = [('company_id', '=', self.company_id.id), ('type', '=', 'purchase')]
            journal = self.env['account.journal'].search(domain, limit=1)
            if journal:
                self.l10n_in_journal_id = journal.id

    @api.onchange('l10n_in_journal_id')
    def onchange_l10n_in_journal_id(self):
        if self.l10n_in_company_country_code == 'IN':
            journal_gstin_partner_id = self.l10n_in_journal_id.l10n_in_gstin_partner_id
            self.l10n_in_place_of_supply_id = journal_gstin_partner_id.l10n_in_place_of_supply_id or journal_gstin_partner_id.state_id

    @api.onchange('partner_id', 'company_id')
    def onchange_partner_id(self):
        if self.l10n_in_company_country_code == 'IN':
            self.l10n_in_gst_treatment = self.partner_id.l10n_in_gst_treatment
            self.onchange_l10n_in_gst_treatment()
        return super().onchange_partner_id()

    @api.onchange('l10n_in_gst_treatment')
    def onchange_l10n_in_gst_treatment(self):
        if self.l10n_in_company_country_code == 'IN':
            if self.l10n_in_gst_treatment == self.partner_id.l10n_in_gst_treatment:
                self.l10n_in_gstin = self.partner_id.vat
            else:
                self.l10n_in_gstin = False
