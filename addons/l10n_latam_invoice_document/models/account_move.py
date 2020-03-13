# Part of Odoo. See LICENSE file for full copyright and licensing details.

from odoo import models, fields, api, _
from odoo.exceptions import UserError, ValidationError
from functools import partial
import re
from odoo.tools.misc import formatLang


class AccountMove(models.Model):

    _inherit = "account.move"

    l10n_latam_amount_untaxed = fields.Monetary(compute='_compute_l10n_latam_amount_and_taxes')
    l10n_latam_tax_ids = fields.One2many(compute="_compute_l10n_latam_amount_and_taxes", comodel_name='account.move.line')
    l10n_latam_available_document_type_ids = fields.Many2many('l10n_latam.document.type', compute='_compute_l10n_latam_available_document_types')
    l10n_latam_document_type_id = fields.Many2one(
        'l10n_latam.document.type', string='Document Type', readonly=False, auto_join=True, index=True,
        states={'posted': [('readonly', True)]}, compute='_compute_l10n_latam_document_type', store=True)
    l10n_latam_use_documents = fields.Boolean(related='journal_id.l10n_latam_use_documents')

    @api.model
    def _deduce_sequence_number_reset(self, name):
        if self.l10n_latam_use_documents:
            return 'never'
        return super(AccountMove, self)._deduce_sequence_number_reset(name)

    def _get_last_sequence_domain(self, relaxed=False):
        where_string, param = super(AccountMove, self)._get_last_sequence_domain(relaxed)
        if self.l10n_latam_use_documents:
            where_string += " AND l10n_latam_document_type_id = %(l10n_latam_document_type_id)s "
            param['l10n_latam_document_type_id'] = self.l10n_latam_document_type_id.id or 0
        return where_string, param

    def _get_starting_sequence(self):
        if self.l10n_latam_use_documents:
            return "%s 0001-00000000" % (self.l10n_latam_document_type_id.doc_code_prefix)
        return super(AccountMove, self)._get_starting_sequence()

    def _compute_l10n_latam_amount_and_taxes(self):
        recs_invoice = self.filtered(lambda x: x.is_invoice())
        for invoice in recs_invoice:
            tax_lines = invoice.line_ids.filtered('tax_line_id')
            included_taxes = invoice.l10n_latam_document_type_id and \
                invoice.l10n_latam_document_type_id._filter_taxes_included(tax_lines.mapped('tax_line_id'))
            if not included_taxes:
                l10n_latam_amount_untaxed = invoice.amount_untaxed
                not_included_invoice_taxes = tax_lines
            else:
                included_invoice_taxes = tax_lines.filtered(lambda x: x.tax_line_id in included_taxes)
                not_included_invoice_taxes = tax_lines - included_invoice_taxes
                if invoice.is_inbound():
                    sign = -1
                else:
                    sign = 1
                l10n_latam_amount_untaxed = invoice.amount_untaxed + sign * sum(included_invoice_taxes.mapped('balance'))
            invoice.l10n_latam_amount_untaxed = l10n_latam_amount_untaxed
            invoice.l10n_latam_tax_ids = not_included_invoice_taxes
        remaining = self - recs_invoice
        remaining.l10n_latam_amount_untaxed = False
        remaining.l10n_latam_tax_ids = [(5, 0)]

    def post(self):
        for rec in self.filtered(lambda x: x.l10n_latam_use_documents and (not x.name or x.name == '/')):
            if rec.move_type in ('in_receipt', 'out_receipt'):
                raise UserError(_('We do not accept the usage of document types on receipts yet. '))
        return super().post()

    @api.constrains('name', 'journal_id', 'state')
    def _check_unique_sequence_number(self):
        """ This uniqueness verification is only valid for customer invoices, and vendor bills that does not use
        documents. A new constraint method _check_unique_vendor_number has been created just for validate for this purpose """
        vendor = self.filtered(lambda x: x.is_purchase_document() and x.l10n_latam_use_documents)
        return super(AccountMove, self - vendor)._check_unique_sequence_number()

    @api.constrains('state', 'l10n_latam_document_type_id')
    def _check_l10n_latam_documents(self):
        """ This constraint checks that if a invoice is posted and does not have a document type configured will raise
        an error. This only applies to invoices related to journals that has the "Use Documents" set as True.

        And if the document type is set then check if the invoice number has been set, because a posted invoice
        without a document number is not valid in the case that the related journals has "Use Docuemnts" set as True """
        validated_invoices = self.filtered(lambda x: x.l10n_latam_use_documents and x.state == 'posted')
        without_doc_type = validated_invoices.filtered(lambda x: not x.l10n_latam_document_type_id)
        if without_doc_type:
            raise ValidationError(_(
                'The journal require a document type but not document type has been selected on invoices %s.' % (
                    without_doc_type.ids)))
        valid = re.compile(r'[A-Z\-]+\s*\d{1,5}\-\d{1,8}')
        without_number = validated_invoices.filtered(lambda x: not valid.match(x.name))
        if without_number:
            raise ValidationError(_('The document number on the following invoices is not correct %s.' % (
                without_number.ids)))

    @api.constrains('move_type', 'l10n_latam_document_type_id')
    def _check_invoice_type_document_type(self):
        for rec in self.filtered('l10n_latam_document_type_id.internal_type'):
            internal_type = rec.l10n_latam_document_type_id.internal_type
            invoice_type = rec.move_type
            if internal_type in ['debit_note', 'invoice'] and invoice_type in ['out_refund', 'in_refund'] and \
               rec.l10n_latam_document_type_id.code != '99':
                raise ValidationError(_('You can not use a %s document type with a refund invoice') % internal_type)
            elif internal_type == 'credit_note' and invoice_type in ['out_invoice', 'in_invoice']:
                raise ValidationError(_('You can not use a %s document type with a invoice') % (internal_type))

    def _get_l10n_latam_documents_domain(self):
        self.ensure_one()
        if self.move_type in ['out_refund', 'in_refund']:
            internal_types = ['credit_note']
        else:
            internal_types = ['invoice', 'debit_note']
        return [('internal_type', 'in', internal_types), ('country_id', '=', self.company_id.country_id.id)]

    @api.depends('journal_id', 'partner_id', 'company_id', 'move_type')
    def _compute_l10n_latam_available_document_types(self):
        self.l10n_latam_available_document_type_ids = False
        for rec in self.filtered(lambda x: x.journal_id and x.l10n_latam_use_documents and x.partner_id):
            rec.l10n_latam_available_document_type_ids = self.env['l10n_latam.document.type'].search(rec._get_l10n_latam_documents_domain())

    @api.depends('l10n_latam_available_document_type_ids')
    @api.depends_context('internal_type')
    def _compute_l10n_latam_document_type(self):
        internal_type = self._context.get('internal_type', False)
        for rec in self.filtered(lambda x: x.state == 'draft'):
            document_types = rec.l10n_latam_available_document_type_ids._origin
            document_types = internal_type and document_types.filtered(lambda x: x.internal_type == internal_type) or document_types
            rec.l10n_latam_document_type_id = document_types and document_types[0].id

    def _compute_invoice_taxes_by_group(self):
        report_or_portal_view = 'commit_assetsbundle' in self.env.context or \
            not self.env.context.get('params', {}).get('view_type') == 'form'
        if not report_or_portal_view:
            return super()._compute_invoice_taxes_by_group()

        move_with_doc_type = self.filtered('l10n_latam_document_type_id')
        for move in move_with_doc_type:
            lang_env = move.with_context(lang=move.partner_id.lang).env
            tax_lines = move.l10n_latam_tax_ids
            res = {}
            # There are as many tax line as there are repartition lines
            done_taxes = set()
            for line in tax_lines:
                res.setdefault(line.tax_line_id.tax_group_id, {'base': 0.0, 'amount': 0.0})
                res[line.tax_line_id.tax_group_id]['amount'] += line.price_subtotal
                tax_key_add_base = tuple(move._get_tax_key_for_group_add_base(line))
                if tax_key_add_base not in done_taxes:
                    # The base should be added ONCE
                    res[line.tax_line_id.tax_group_id]['base'] += line.tax_base_amount
                    done_taxes.add(tax_key_add_base)
            res = sorted(res.items(), key=lambda l: l[0].sequence)
            move.amount_by_group = [(
                group.name, amounts['amount'],
                amounts['base'],
                formatLang(lang_env, amounts['amount'], currency_obj=move.currency_id),
                formatLang(lang_env, amounts['base'], currency_obj=move.currency_id),
                len(res),
                group.id,
            ) for group, amounts in res]
        super(AccountMove, self - move_with_doc_type)._compute_invoice_taxes_by_group()

    @api.constrains('name', 'partner_id', 'company_id', 'posted_before')
    def _check_unique_vendor_number(self):
        """ The constraint _check_unique_sequence_number is valid for customer bills but not valid for us on vendor
        bills because the uniqueness must be per partner """
        for rec in self.filtered(lambda x: x.is_purchase_document() and x.l10n_latam_use_documents):
            domain = [
                ('move_type', '=', rec.move_type),
                # by validating name we validate l10n_latam_document_type_id
                ('name', '=', rec.name),
                ('company_id', '=', rec.company_id.id),
                ('id', '!=', rec.id),
                ('commercial_partner_id', '=', rec.commercial_partner_id.id),
                ('posted_before', '=', True),
            ]
            if rec.search(domain):
                raise ValidationError(_('Vendor bill number must be unique per vendor and company.'))

    def unlink(self):
        """ When using documents, on vendor bills the document_number is set manually by the number given from the vendor,
        the odoo sequence is not used. In this case We allow to delete vendor bills with document_number/move_name """
        self.filtered(lambda x: x.is_purchase_document() and x.state in ('draft', 'cancel') and x.l10n_latam_use_documents).write({'name': '/'})
        return super().unlink()
