# -*- coding: utf-8 -*-

from odoo import api, models, fields, _
from odoo.exceptions import UserError
from odoo.tools import safe_eval

from odoo.tools.float_utils import float_round

import logging
_logger = logging.getLogger(__name__)


class AccountTax(models.Model):
    _inherit = 'account.tax'

    @api.model
    def create_invoice(self, partner, tax, amount=100, type='out_invoice'):
        account_domain = [('user_type_id.type', '=', type in ('in_invoice', 'in_refund') and 'payable' or 'receivable')]
        """ Returns an open invoice """
        invoice = self.env['account.invoice'].create({
            'partner_id': partner.id,
            'currency_id': tax.company_id.currency_id.id,
            'name': type,
            'account_id': self.env['account.account'].search(account_domain, limit=1).id,
            'type': type,
            'date_invoice': fields.Date.today(),
            'company_id': tax.company_id.id,
        })
        self.env['account.invoice.line'].create({
            'quantity': 1,
            'price_unit': amount,
            'invoice_id': invoice.id,
            'name': 'Papa a vu le fifi de lolo',
            'invoice_line_tax_ids': [(6, 0, tax.ids)],
            'account_id': self.env['account.account'].search([('user_type_id.type', 'not in', ('payable', 'receivable'))], limit=1).id,
        })
        invoice._onchange_invoice_line_ids()
        invoice.action_invoice_open()
        return invoice

    @api.model
    def get_aml_domain(self, invoice, domain):
        line_domain = safe_eval(domain)

        # We need to use the backup table in order to know which tax corresponds to which tag
        for index, condition in enumerate(line_domain):
            if condition[0] in ('tax_ids.tag_ids', 'tax_line_id.tag_ids'):
                new_condition = ('tag_ids', condition[1], condition[2])

                if condition[1] not in ('=', '!=', 'in', 'not in'):
                    raise UserError("Wrong operator in domain: %s" % condition[1])

                tag_values = condition[2]
                if isinstance(tag_values, list):
                        tag_values = tuple(tag_values)

                self.env.cr.execute("""
                    select array_agg(account_tax_id)
                    from account_tax_account_tag_v12_bckp
                    where account_account_tag_id """ + condition[1] + """ %(values)s
                """, {'values': tag_values})
                target_taxes = self.env.cr.fetchall()[0][0]

                line_domain[index] = (condition[0].partition('.')[0], 'in', target_taxes or [])

        return line_domain + [('move_id.state', '=', 'posted'), ('move_id', '=', invoice.move_id.id)]

    @api.model
    def get_financial_reports_grids_mapping(self):
        """ To be implemented specifically for each l10n_module.
        Returns a map between financial report line ids and the corresponding
        tax report line's tag_name in v13.
        """
        rslt = {}

        for company in self.env['res.company'].search([]):
            if not company.country_id:
                raise UserError(_("Company with id %(company_id)s has no country set. Please define one before running the migration script.") % {'company_id': company.id})

            filler_fun_to_call = getattr(self, '_fill_grids_mapping_for_' + company.country_id.code.lower()) # So, such a function needs to be defined for each country
            filler_fun_to_call(rslt)

        return rslt

    @api.model
    def _fill_grids_mapping_for_be(self, dict_to_fill):
        code_prefix = 'BETAX'
        self.env.cr.execute("""
            select id, regexp_replace(code, '%(prefix)s', '')
            from financial_report_lines_v12_bckp
            where code like '%(prefix)s%%'
            and domain is not null;
        """ % {'prefix': code_prefix})

        dict_to_fill.update(dict(self.env.cr.fetchall()))

    @api.model
    def backup_v12_tables(self): #TODO NSE: To be done in pre and cancelled in post by migration script
        env.cr.execute("""
            select *
            into financial_report_lines_v12_bckp
            from account_financial_html_report_line;

            select *
            into account_tax_account_tag_v12_bckp
            from account_tax_account_tag;

            select id, account_id, refund_account_id
            into tax_accounts_v12_bckp
            from account_tax;
        """)

    @api.model
    def get_v13_migration_dicts(self):
        """
        TO BE RETURNED

        [{'tax': tax, 'inv_account_id': acc1, 'ref_account_id': acc2, 'invoice': {'base': {'+': set<tag_names>, '-': set<tag_names>}}, 'refund': {'tax': {'-': set<tag_names>}}}, ... other taxes ...]
        """

        self.env.cr.execute("savepoint v13_migration_dict;")


        #If a tax is type_tax_use 'none', we artifically switch it to its parent type temporarily, to check what grids to impact for it
        self.env.cr.execute("""
            update account_tax
            set type_tax_use = parent.type_tax_use
            from account_tax_filiation_rel tx_rel, account_tax parent
            where tx_rel.child_tax = account_tax.id
            and parent.id = tx_rel.parent_tax
            and account_tax.type_tax_use = 'none';
        """) #Groups with type_tax_use = 'none' are not supported, so no group of group here

        #So that tags targetting tax lines of 0% taxes are treated properly (otherwise, 0 taxes create no tax aml)
        self.env.cr.execute("update account_tax set amount=10 where amount=0 and amount_type in ('percent', 'fixed');")

        partner = self.env['res.partner'].create({
            'name': 'Tax migrator',
        })

        tax_line_selector = lambda x: x.tax_line_id
        base_line_selector = lambda x: x.tax_ids and not x.tax_line_id # tax_ids and tax_line_id are set together for tax lines affected by previous taxes

        financial_reports_grids_mapping = self.get_financial_reports_grids_mapping()

        rslt = []
        treated_count = 0
        self.env.cr.execute("""
            select account_tax.id, case when count(account_account_tag_id) > 0 then array_agg(account_account_tag_id) else '{}' end
            from account_tax
            left join account_tax_account_tag_v12_bckp
            on account_tax.id = account_tax_account_tag_v12_bckp.account_tax_id
            group by account_tax.id
        """)
        taxes_data = self.env.cr.fetchall()
        for tax_id, tax_tag_ids in taxes_data: # So, they can belong to different companies

            tax = self.env['account.tax'].browse(tax_id)
            treated_count += 1
            _logger.info("Treating tax %s of %s... (id %s)" % (treated_count, len(taxes_data), tax.id))

            # get account_id and refund_account_id in SQL, since they have been removed between 12.2 and 12.3
            self.env.cr.execute("""
                select account_id, refund_account_id
                from tax_accounts_v12_bckp
                where id=%(tax_id)s;
            """, {'tax_id': tax_id})
            tax_accounts_dict = self.env.cr.dictfetchall()[0]

            tax_rslt = {
                'tax': tax.id,
                'invoice': {'base': {'+': set(), '-': set()}, 'tax': {'+': set(), '-': set()}},
                'refund': {'base': {'+': set(), '-': set()}, 'tax':{'+': set(), '-': set()}},
                'inv_account_id': tax_accounts_dict['account_id'],
                'ref_account_id': tax_accounts_dict['refund_account_id'],
            }
            rslt.append(tax_rslt)

            inv = self.create_invoice(partner, tax, type= tax.type_tax_use == 'sale' and 'out_invoice' or 'in_invoice')
            ref = self.create_invoice(partner, tax, type= tax.type_tax_use == 'sale' and 'out_refund' or 'in_refund')

            for tag_id in tax_tag_ids:
                # We want to see where v12 tags go, in order to prepare v13 tags assignation
                self.env.cr.execute("""
                    select id, domain, formulas
                    from financial_report_lines_v12_bckp
                    where domain like '%%.tag\_ids%%%(tag_id)s%%'
                """, {'tag_id': tag_id})
                tag_report_lines_data = self.env.cr.fetchall()

                if not tag_report_lines_data:
                    _logger.warn("No financial report line found for tag with id %(tag_id)s. Is it normal?" % {'tag_id': tag_id})

                for tax_report_line_id, domain, formulas in tag_report_lines_data:

                    if tax_id==137:
                        _logger.warn(str(tax_report_line_id) + "   "+str(domain))

                    # aml considered by this report line for both invoice and refund
                    inv_aml = self.env['account.move.line'].search(self.get_aml_domain(inv, domain))
                    ref_aml = self.env['account.move.line'].search(self.get_aml_domain(ref, domain))

                    #Treat tax lines
                    inv_tax_line = inv_aml.filtered(tax_line_selector) #if len > 1, it's weird, so we let it crash later
                    ref_tax_line = ref_aml.filtered(tax_line_selector)

                    split_formula = self._split_formulas_to_dict(formulas)

                    if tax.type_tax_use == 'adjustment' and (inv_tax_line or ref_tax_line): # We treat tax adjustment in a dedicated way, as they are not supposed to be used on invoices
                        tax_rslt['invoice']['tax']['+'].add(financial_reports_grids_mapping[tax_report_line_id])
                        tax_rslt['refund']['tax']['-'].add(financial_reports_grids_mapping[tax_report_line_id])
                        continue

                    if inv_tax_line:
                        formula_inv_tax = safe_eval(split_formula['balance'], {'sum': inv_tax_line})
                        tax_rslt['invoice']['tax'][formula_inv_tax < 0 and '-' or '+'].add(financial_reports_grids_mapping[tax_report_line_id])
                    if ref_tax_line:
                        # We take add a negative sign to multiplier, since we are on a refund
                        formula_ref_tax = safe_eval(split_formula['balance'], {'sum': ref_tax_line})
                        tax_rslt['refund']['tax'][formula_ref_tax < 0 and '-' or '+'].add(financial_reports_grids_mapping[tax_report_line_id])

                    #Treat base lines
                    inv_base_line = inv_aml.filtered(base_line_selector)
                    ref_base_line = ref_aml.filtered(base_line_selector)

                    if inv_base_line:
                        formula_inv_base = safe_eval(split_formula['balance'], {'sum': inv_base_line})
                        tax_rslt['invoice']['base'][formula_inv_base < 0 and '-' or '+'].add(financial_reports_grids_mapping[tax_report_line_id])
                    if ref_base_line:
                        formula_ref_base = safe_eval(split_formula['balance'], {'sum': ref_base_line})
                        tax_rslt['refund']['base'][formula_ref_base < 0 and '-' or '+'].add(financial_reports_grids_mapping[tax_report_line_id])

        self.env.cr.execute("rollback to savepoint v13_migration_dict;")
        self.env.clear() # Reset the cache because of the rollback that just occured

        return rslt

    @api.model
    def _split_formulas_to_dict(self, formulas):
        result = {}
        for f in formulas.split(';'):
            [column, formula] = f.split('=')
            column = column.strip()
            result.update({column: formula})
        return result

    @api.model
    def _get_tax_group_percent(self, tax_group):
        sum_plus = 0
        sum_minus = 0
        for child in tax_group.children_tax_ids:
            if child.amount < 0:
                sum_minus += child.amount
            else:
                sum_plus += child.amount
        return max(abs(sum_minus), sum_plus)

    @api.model
    def fix_basic_subsequent_taxes_tags(self, move):
        for subseq_tax_aml in move.line_ids.filtered(lambda x: x.tax_line_id.include_base_amount):
            for affected_aml in move.line_ids.filtered(lambda x: subseq_tax_aml.tax_line_id in x.tax_ids):
                affected_aml.tag_ids |= subseq_tax_aml.tag_ids

    @api.model
    def migrate_taxes_to_v13(self):
        # Abracadabra !

        #We consider the module was only updated. So, now, some tax_line_id are set while there is not tax_repartition_line_id
        #on the move lines. tax_line_id is supposed to be related on tax_repartition_line_id, so we have to fix this
        #inconsistency first
        for tax in self.env['account.tax'].with_context(active_test=False).search([]):
            if not tax.invoice_repartition_line_ids and not tax.refund_repartition_line_ids:
                tax.write(tax.with_context(default_company_id=tax.company_id).default_get(['invoice_repartition_line_ids', 'refund_repartition_line_ids', 'company_id']))
            else:
                raise UserError(_("Tax %s has already some repartition lines. It should not at this point.") % tax.id)

        self.env.cr.execute("""
            update account_move_line
            set tax_repartition_line_id = tx_rep.id
            from account_invoice invoice, account_tax_repartition_line tx_rep
            where (invoice.id = invoice_id or invoice_id is null)
            and tax_line_id = case when invoice_id is not null and invoice.type in ('in_refund', 'out_refund') then tx_rep.refund_tax_id else tx_rep.invoice_tax_id end
            and tx_rep.repartition_type = 'tax';
        """)

        # We generate the migration dict, now that basic consistency of taxes is ensured
        migration_dicts_list = self.get_v13_migration_dicts()

        # Assign tags and accounts to repartition lines
        for migration_dict in migration_dicts_list:
            tax = self.env['account.tax'].browse(migration_dict['tax'])

            for rep_inv_type in ('invoice', 'refund'):
                rep_vals = migration_dict[rep_inv_type]
                for rep_type, rep_tags in rep_vals.items():
                    tags = self.env['account.account.tag']

                    for tag_sign, tag_names in rep_tags.items():
                        to_add = self.env['account.account.tag'].search([('name', 'in', [tag_sign + name for name in tag_names]), ('tax_negate', '=', (tag_sign == '-'))])

                        if len(to_add) != len(tag_names):
                            raise UserError(_("Missing tag. Some tag name is probably wrong"))

                        tags += to_add

                    getattr(tax, rep_inv_type + '_repartition_line_ids').filtered(lambda x: x.repartition_type == rep_type).write({
                        'account_id': migration_dict[rep_inv_type == 'invoice' and 'inv_account_id' or 'ref_account_id'],
                        'tag_ids': [(6, 0, tags.ids)],
                    })

        # Assign repartition lines and tags to account.invoice.tax
        self.env.cr.execute("""
            update account_invoice_tax
            set tax_repartition_line_id = tx_rep.id
            from account_tax_repartition_line tx_rep, account_invoice inv
            where account_invoice_tax.invoice_id = inv.id
            and account_invoice_tax.tax_id = case when inv.type in ('in_refund', 'out_refund')
                                             then tx_rep.refund_tax_id
                                             else tx_rep.invoice_tax_id end
        """)

        self.env.cr.execute("""
            insert into account_account_tag_account_invoice_tax_rel
            select inv_tx.id, rep_tag.account_account_tag_id
            from account_invoice_tax inv_tx
            join account_account_tag_account_tax_repartition_line_rel rep_tag
            on inv_tx.tax_repartition_line_id = rep_tag.account_tax_repartition_line_id
        """)

        # Merge child taxes into their parent
        tax_groups = self.env['account.tax'].with_context(active_test=False).search([('amount_type', '=', 'group')])

        for group_to_treat in tax_groups.filtered(lambda x: all(child_tax.type_tax_use == 'none' and child_tax.amount_type == 'percent' for child_tax in x.children_tax_ids)):
            # The tax repartition lines of the group are useless
            inv_tax_line = group_to_treat.invoice_repartition_line_ids.filtered(lambda x: x.repartition_type == 'tax')
            ref_tax_line = group_to_treat.refund_repartition_line_ids.filtered(lambda x: x.repartition_type == 'tax')
            group_to_treat.write({'invoice_repartition_line_ids': [(2, inv_tax_line.id, 0)], 'refund_repartition_line_ids': [(2, ref_tax_line.id, 0)]})

            group_to_treat.amount = self._get_tax_group_percent(group_to_treat)
            group_to_treat.amount_type = 'percent'

            # Changing the tax to which repartition lines belong will change the (now related) tax_line_id field of account.move.line
            for child_tax in group_to_treat.children_tax_ids:
                new_inv_rep = child_tax.invoice_repartition_line_ids.filtered(lambda x: x.repartition_type == 'tax')
                new_ref_rep = child_tax.refund_repartition_line_ids.filtered(lambda x: x.repartition_type == 'tax')

                new_inv_rep.invoice_tax_id = group_to_treat
                new_inv_rep.factor_percent = float_round(100 * child_tax.amount / group_to_treat.amount, precision_digits=4)

                new_ref_rep.refund_tax_id = group_to_treat
                new_ref_rep.factor_percent = float_round(100 * child_tax.amount / group_to_treat.amount, precision_digits=4)

                # Before deleting the old child taxes, we also need to replace them on account.invoice.tax entries
                self.env.cr.execute("""
                    update account_invoice_tax
                    set tax_repartition_line_id = tx_rep.id, tax_id = %(group_to_treat_id)s
                    from account_invoice invoice, account_tax_repartition_line tx_rep
                    where invoice.id = invoice_id
                    and tax_id = %(child_tax_id)s
                    and tx_rep.id = case when invoice.type in ('in_refund', 'out_refund') then %(new_ref_rep_id)s else %(new_inv_rep_id)s end;
                """, {'group_to_treat_id': group_to_treat.id, 'child_tax_id': child_tax.id, 'new_ref_rep_id': new_ref_rep.id, 'new_inv_rep_id': new_inv_rep.id})

                # in case account.invoice.tax objects contain taxes to remove, we replace them by their parent
                self.env.cr.execute("""
                    update account_invoice_tax_account_tax_rel
                    set account_tax_id = %(group_to_treat_id)s
                    where account_tax_id = %(child_tax_id)s
                """, {'group_to_treat_id': group_to_treat.id, 'child_tax_id': child_tax.id})

            group_to_treat.write({'children_tax_ids': [(2, child.id, 0) for child in group_to_treat.children_tax_ids]})

        # Add tags on account move lines

        #Tax lines
        self.env.cr.execute("""
            insert into account_account_tag_account_move_line_rel
            select aml.id as account_move_line_id, rep_tags.account_account_tag_id as account_account_tag_id
            from account_move_line aml
            join account_account_tag_account_tax_repartition_line_rel rep_tags
            on rep_tags.account_tax_repartition_line_id = aml.tax_repartition_line_id;
        """)

        # Base lines
        self.env.cr.execute("""
            insert into account_account_tag_account_move_line_rel
            select aml_tx.account_move_line_id as account_move_line_id, rep_tags.account_account_tag_id as account_account_tag_id
            from account_tax_repartition_line tx_rep, account_account_tag_account_tax_repartition_line_rel rep_tags, account_move_line_account_tax_rel aml_tx
            join account_move_line aml
            on aml.id = aml_tx.account_move_line_id
            left join account_invoice invoice
            on aml.invoice_id = invoice.id
            where tx_rep.repartition_type = 'base'
            and aml_tx.account_tax_id = coalesce(tx_rep.invoice_tax_id, tx_rep.refund_tax_id)
            and rep_tags.account_tax_repartition_line_id  = tx_rep.id
            and ((invoice.type in ('in_refund', 'out_refund') and tx_rep.refund_tax_id is not null)
                 or (tx_rep.invoice_tax_id is not null and invoice.type not in ('in_refund', 'out_refund')))
            on conflict do nothing; -- for lines that are the base of multiple taxes sharing some tags
        """)

        #Basic consistency check for taxes associated with a template xmlid
        all_templates_data = self.env['ir.model.data'].search([('model', '=', 'account.tax.template')])
        for tax_template_data in all_templates_data:
            tax_template = self.env['account.tax.template'].browse(tax_template_data.res_id)
            template_instance_data = self.env['ir.model.data'].search([('name', '=like', "%%\_%(name)s" % {'module': tax_template_data.module, 'name': tax_template_data.name}), ('model', '=', 'account.tax')])

            for inv_type in ('invoice', 'refund'):
                template_rep_lines = getattr(tax_template, inv_type + '_repartition_line_ids')
                template_accounts = sorted([account.code.ljust(account.chart_template_id.code_digits, '0') for account in template_rep_lines.mapped('account_id')])
                template_tags = sorted(set(template_rep_lines.mapped('tag_ids.name') \
                                       + ['+' + tag for tag in template_rep_lines.mapped('plus_report_line_ids.tag_name')] \
                                       + ['-' + tag for tag in template_rep_lines.mapped('minus_report_line_ids.tag_name')]))

                for data in template_instance_data:
                    tax_instance = self.env['account.tax'].browse(data.res_id)
                    tax_rep_lines = getattr(tax_instance, inv_type + '_repartition_line_ids')

                    tax_accounts = sorted(tax_rep_lines.mapped('account_id.code'))
                    tax_tags = sorted(tax_rep_lines.mapped('tag_ids.name'))

                    if len(template_rep_lines) != len(tax_rep_lines) or template_accounts != tax_accounts or template_tags != tax_tags:
                        _logger.warn("Tax %(tax_name)s (id %(tax_id)s)'s %(type)s repartition does not seem to match its related template. Manual verification advised." % {'tax_id': tax_instance.id, 'tax_name': tax_instance.name, 'type': inv_type})
