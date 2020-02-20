# -*- coding: utf-8 -*-

from odoo import api, fields, models, _
from odoo.tools import float_compare, float_is_zero
from odoo.exceptions import UserError
import re
from math import copysign
import itertools
from collections import defaultdict

class AccountReconcileModelLine(models.Model):
    _name = 'account.reconcile.model.line'
    _description = 'Rules for the reconciliation model'
    _order = 'sequence, id'

    model_id = fields.Many2one('account.reconcile.model', readonly=True)
    match_total_amount = fields.Boolean(related='model_id.match_total_amount')
    match_total_amount_param = fields.Float(related='model_id.match_total_amount_param')
    rule_type = fields.Selection(related='model_id.rule_type')
    company_id = fields.Many2one(related='model_id.company_id')
    sequence = fields.Integer(required=True, default=10)
    account_id = fields.Many2one('account.account', string='Account', ondelete='cascade', domain=[('deprecated', '=', False)], required=True)
    journal_id = fields.Many2one('account.journal', string='Journal', ondelete='cascade', help="This field is ignored in a bank statement reconciliation.")
    label = fields.Char(string='Journal Item Label')
    amount_type = fields.Selection([
        ('fixed', 'Fixed'),
        ('percentage', 'Percentage of balance'),
        ('regex', 'From label'),
    ], required=True, default='percentage')
    show_force_tax_included = fields.Boolean(compute='_compute_show_force_tax_included', help='Technical field used to show the force tax included button')
    force_tax_included = fields.Boolean(string='Tax Included in Price', help='Force the tax to be managed as a price included tax.')
    amount = fields.Float(string="Float Amount", compute='_compute_float_amount', store=True, help="Technical shortcut to parse the amount to a float")
    amount_string = fields.Char(string="Amount", default='100', required=True, help="""Value for the amount of the writeoff line
    * Percentage: Percentage of the balance, between 0 and 100.
    * Fixed: The fixed value of the writeoff. The amount will count as a debit if it is negative, as a credit if it is positive.
    * From Label: There is no need for regex delimiter, only the regex is needed. For instance if you want to extract the amount from\nR:9672938 10/07 AX 9415126318 T:5L:NA BRT: 3358,07 C:\nYou could enter\nBRT: ([\d,]+)""")
    tax_ids = fields.Many2many('account.tax', string='Taxes', ondelete='restrict')
    analytic_account_id = fields.Many2one('account.analytic.account', string='Analytic Account', ondelete='set null')
    analytic_tag_ids = fields.Many2many('account.analytic.tag', string='Analytic Tags',
                                        relation='account_reconcile_model_analytic_tag_rel')

    @api.onchange('tax_ids')
    def _onchange_tax_ids(self):
        # Multiple taxes with force_tax_included results in wrong computation, so we
        # only allow to set the force_tax_included field if we have one tax selected
        if len(self.tax_ids) != 1:
            self.force_tax_included = False

    @api.depends('tax_ids')
    def _compute_show_force_tax_included(self):
        for record in self:
            record.show_force_tax_included = False if len(record.tax_ids) != 1 else True

    @api.onchange('amount_type')
    def _onchange_amount_type(self):
        self.amount_string = ''
        if self.amount_type == 'percentage':
            self.amount_string = '100'
        elif self.amount_type == 'regex':
            self.amount_string = '([\d,]+)'

    @api.depends('amount_string')
    def _compute_float_amount(self):
        for record in self:
            try:
                record.amount = float(record.amount_string)
            except ValueError:
                record.amount = 0

    @api.constrains('amount_string')
    def _validate_amount(self):
        for record in self:
            if record.amount_type == 'fixed' and record.amount == 0:
                raise UserError(_('The amount is not a number'))
            if record.amount_type == 'percentage' and not 0 < record.amount <= 100:
                raise UserError(_('The amount is not a percentage'))
            if record.amount_type == 'regex':
                try:
                    re.compile(record.amount_string)
                except re.error:
                    raise UserError(_('The regex is not valid'))


class AccountReconcileModel(models.Model):
    _name = 'account.reconcile.model'
    _description = 'Preset to create journal entries during a invoices and payments matching'
    _order = 'sequence, id'

    # Base fields.
    name = fields.Char(string='Name', required=True)
    sequence = fields.Integer(required=True, default=10)
    company_id = fields.Many2one('res.company', string='Company', required=True, default=lambda self: self.env.company)

    rule_type = fields.Selection(selection=[
        ('writeoff_button', 'Manually create a write-off on clicked button.'),
        ('writeoff_suggestion', 'Suggest counterpart values.'),
        ('invoice_matching', 'Match existing invoices/bills.')
    ], string='Type', default='writeoff_button', required=True)
    auto_reconcile = fields.Boolean(string='Auto-validate',
        help='Validate the statement line automatically (reconciliation based on your rule).')
    to_check = fields.Boolean(string='To Check', default=False, help='This matching rule is used when the user is not certain of all the informations of the counterpart.')

    # ===== Conditions =====
    match_journal_ids = fields.Many2many('account.journal', string='Journals',
        domain="[('type', 'in', ('bank', 'cash'))]",
        help='The reconciliation model will only be available from the selected journals.')
    match_nature = fields.Selection(selection=[
        ('amount_received', 'Amount Received'),
        ('amount_paid', 'Amount Paid'),
        ('both', 'Amount Paid/Received')
    ], string='Amount Nature', required=True, default='both',
        help='''The reconciliation model will only be applied to the selected transaction type:
        * Amount Received: Only applied when receiving an amount.
        * Amount Paid: Only applied when paying an amount.
        * Amount Paid/Received: Applied in both cases.''')
    match_amount = fields.Selection(selection=[
        ('lower', 'Is Lower Than'),
        ('greater', 'Is Greater Than'),
        ('between', 'Is Between'),
    ], string='Amount',
        help='The reconciliation model will only be applied when the amount being lower than, greater than or between specified amount(s).')
    match_amount_min = fields.Float(string='Amount Min Parameter')
    match_amount_max = fields.Float(string='Amount Max Parameter')
    match_label = fields.Selection(selection=[
        ('contains', 'Contains'),
        ('not_contains', 'Not Contains'),
        ('match_regex', 'Match Regex'),
    ], string='Label', help='''The reconciliation model will only be applied when the label:
        * Contains: The proposition label must contains this string (case insensitive).
        * Not Contains: Negation of "Contains".
        * Match Regex: Define your own regular expression.''')
    match_label_param = fields.Char(string='Label Parameter')
    match_note = fields.Selection(selection=[
        ('contains', 'Contains'),
        ('not_contains', 'Not Contains'),
        ('match_regex', 'Match Regex'),
    ], string='Note', help='''The reconciliation model will only be applied when the note:
        * Contains: The proposition note must contains this string (case insensitive).
        * Not Contains: Negation of "Contains".
        * Match Regex: Define your own regular expression.''')
    match_note_param = fields.Char(string='Note Parameter')
    match_transaction_type = fields.Selection(selection=[
        ('contains', 'Contains'),
        ('not_contains', 'Not Contains'),
        ('match_regex', 'Match Regex'),
    ], string='Transaction Type', help='''The reconciliation model will only be applied when the transaction type:
        * Contains: The proposition transaction type must contains this string (case insensitive).
        * Not Contains: Negation of "Contains".
        * Match Regex: Define your own regular expression.''')
    match_transaction_type_param = fields.Char(string='Transaction Type Parameter')
    match_same_currency = fields.Boolean(string='Same Currency Matching', default=True,
        help='Restrict to propositions having the same currency as the statement line.')
    match_total_amount = fields.Boolean(string='Amount Matching', default=True,
        help='The sum of total residual amount propositions matches the statement line amount.')
    match_total_amount_param = fields.Float(string='Amount Matching %', default=100,
        help='The sum of total residual amount propositions matches the statement line amount under this percentage.')
    match_partner = fields.Boolean(string='Partner Is Set',
        help='The reconciliation model will only be applied when a customer/vendor is set.')
    match_partner_ids = fields.Many2many('res.partner', string='Restrict Partners to',
        help='The reconciliation model will only be applied to the selected customers/vendors.')
    match_partner_category_ids = fields.Many2many('res.partner.category', string='Restrict Partner Categories to',
        help='The reconciliation model will only be applied to the selected customer/vendor categories.')

    line_ids = fields.One2many('account.reconcile.model.line', 'model_id')

    decimal_separator = fields.Char(default=lambda self: self.env['res.lang']._lang_get(self.env.user.lang).decimal_point, help="Every character that is nor a digit nor this separator will be removed from the matching string")
    show_decimal_separator = fields.Boolean(compute='_compute_show_decimal_separator', help="Technical field to decide if we should show the decimal separator for the regex matching field.")
    number_entries = fields.Integer(string='Number of entries related to this model', compute='_compute_number_entries')

    def action_reconcile_stat(self):
        self.ensure_one()
        action = self.env.ref('account.action_move_journal_line').read()[0]
        self._cr.execute('''
            SELECT ARRAY_AGG(DISTINCT move_id)
            FROM account_move_line
            WHERE reconcile_model_id = %s
        ''', [self.id])
        action.update({
            'context': {},
            'domain': [('id', 'in', self._cr.fetchone()[0])],
            'help': """<p class="o_view_nocontent_empty_folder">{}</p>""".format(_('This reconciliation model has created no entry so far')),
        })
        return action

    def _compute_number_entries(self):
        data = self.env['account.move.line'].read_group([('reconcile_model_id', 'in', self.ids)], ['reconcile_model_id'], 'reconcile_model_id')
        mapped_data = dict([(d['reconcile_model_id'][0], d['reconcile_model_id_count']) for d in data])
        for model in self:
            model.number_entries = mapped_data.get(model.id, 0)

    @api.depends('line_ids.amount_type')
    def _compute_show_decimal_separator(self):
        for record in self:
            record.show_decimal_separator = any(l.amount_type == 'regex' for l in record.line_ids)

    @api.onchange('match_total_amount_param')
    def _onchange_match_total_amount_param(self):
        if self.match_total_amount_param < 0 or self.match_total_amount_param > 100:
            self.match_total_amount_param = min(max(0, self.match_total_amount_param), 100)

    ####################################################
    # RECONCILIATION PROCESS
    ####################################################

    def _get_taxes_move_lines_dict(self, tax, base_line_dict):
        ''' Get move.lines dict (to be passed to the create()) corresponding to a tax.
        :param tax:             An account.tax record.
        :param base_line_dict:  A dict representing the move.line containing the base amount.
        :return: A list of dict representing move.lines to be created corresponding to the tax.
        '''
        self.ensure_one()
        balance = base_line_dict['balance']

        res = tax.compute_all(balance)

        new_aml_dicts = []
        for tax_res in res['taxes']:
            tax = self.env['account.tax'].browse(tax_res['id'])

            new_aml_dicts.append({
                'account_id': tax_res['account_id'] or base_line_dict['account_id'],
                'name': tax_res['name'],
                'partner_id': base_line_dict.get('partner_id'),
                'balance': tax_res['amount'],
                'analytic_account_id': tax.analytic and base_line_dict['analytic_account_id'],
                'analytic_tag_ids': tax.analytic and base_line_dict['analytic_tag_ids'],
                'tax_exigible': tax_res['tax_exigibility'],
                'tax_repartition_line_id': tax_res['tax_repartition_line_id'],
                'tax_ids': [(6, 0, tax_res['tax_ids'])],
                'tag_ids': [(6, 0, tax_res['tag_ids'])],
                'currency_id': False,
                'reconcile_model_id': self.id,
            })

            # Handle price included taxes.
            base_line_dict['balance'] = tax_res['base']
        base_line_dict['tag_ids'] = [(6, 0, res['base_tags'])]
        return new_aml_dicts

    def _get_write_off_move_lines_dict(self, st_line, residual_balance):
        ''' Get move.lines dict (to be passed to the create()) corresponding to the reconciliation model's write-off lines.
        :param st_line:             An account.bank.statement.line record.(possibly empty, if performing manual reconciliation)
        :param residual_balance:    The residual balance of the statement line.
        :return: A list of dict representing move.lines to be created corresponding to the write-off lines.
        '''
        self.ensure_one()

        if self.rule_type == 'invoice_matching' and (not self.match_total_amount or (self.match_total_amount_param == 100)):
            return []

        lines_vals_list = []

        for line in self.line_ids:

            if not line.account_id or st_line.company_currency_id.is_zero(residual_balance):
                return []

            if line.amount_type == 'percentage':
                balance = residual_balance * (line.amount / 100.0)
            elif line.amount_type == "regex":
                match = re.search(line.amount_string, st_line.payment_ref)
                if match:
                    sign = 1 if residual_balance > 0.0 else -1
                    extracted_balance = float(re.sub(r'\D' + self.decimal_separator, '', match.group(1)).replace(self.decimal_separator, '.'))
                    balance = copysign(extracted_balance * sign, residual_balance)
                else:
                    balance = 0
            else:
                balance = line.amount * (1 if residual_balance > 0.0 else -1)

            writeoff_line = {
                'name': line.label or st_line.payment_ref,
                'balance': balance,
                'account_id': line.account_id.id,
                'currency_id': False,
                'analytic_account_id': line.analytic_account_id.id,
                'analytic_tag_ids': [(6, 0, line.analytic_tag_ids.ids)],
                'reconcile_model_id': self.id,
            }
            lines_vals_list.append(writeoff_line)

            residual_balance -= balance

            if line.tax_ids:
                writeoff_line['tax_ids'] = [(6, None, line.tax_ids.ids)]
                tax = line.tax_ids
                # Multiple taxes with force_tax_included results in wrong computation, so we
                # only allow to set the force_tax_included field if we have one tax selected
                if line.force_tax_included:
                    tax = tax[0].with_context(force_price_include=True)
                lines_vals_list += self._get_taxes_move_lines_dict(tax, writeoff_line)

        return lines_vals_list

    def _prepare_reconciliation(self, st_line, aml_ids=[], partner=None):
        ''' Prepare the reconciliation of the statement line with some counterpart line but
        also with some auto-generated write-off lines.

        The complexity of this method comes from the fact the reconciliation will be soft meaning
        it will be done only if the reconciliation will not trigger an error.
        For example, the reconciliation will be skipped if we need to create an open balance but we
        don't have a partner to get the receivable/payable account.

        This method works in two major steps. First, simulate the reconciliation of the account.move.line.
        Then, add some write-off lines depending the rule's fields.

        :param st_line: An account.bank.statement.line record.
        :param aml_ids: The ids of some account.move.line to reconcile.
        :param partner: An optional res.partner record. If not specified, fallback on the statement line's partner.
        :return: A list of dictionary to be passed to the account.bank.statement.line's 'reconcile' method.
        '''
        self.ensure_one()

        partner = partner or st_line.partner_id
        lines_vals_list = [{'id': aml_id} for aml_id in aml_ids]
        to_create, open_balance_vals, existing_lines = st_line._prepare_reconciliation(lines_vals_list) # TODO OCO tu n'y toucheras sans doute pas; mais si jamais, un petit renommage de fct serait sans doute cool ...

        if not open_balance_vals:
            return lines_vals_list

        residual_balance = open_balance_vals['debit'] - open_balance_vals['credit']
        writeoff_vals_list = self._get_write_off_move_lines_dict(st_line, residual_balance)

        balance = st_line.company_currency_id.round(open_balance_vals['debit'] - open_balance_vals['credit'])
        for line_vals in writeoff_vals_list:
            balance += st_line.company_currency_id.round(line_vals['balance'])

        # Check we have enough information to create an open balance.
        if not st_line.company_currency_id.is_zero(balance):
            if st_line.amount > 0:
                open_balance_account = partner.property_account_receivable_id
            else:
                open_balance_account = partner.property_account_payable_id
            if not open_balance_account:
                return []

        return lines_vals_list + writeoff_vals_list

    ####################################################
    # RECONCILIATION CRITERIA
    ####################################################

    def _apply_conditions(self, query, params): # TODO OCO ce nom ...
        self.ensure_one()
        rule = self
        # Filter on journals.
        if rule.match_journal_ids:
            query += ' AND st_line_move.journal_id IN %s'
            params += [tuple(rule.match_journal_ids.ids)]

        # Filter on amount nature.
        if rule.match_nature == 'amount_received':
            query += ' AND st_line.amount >= 0.0'
        elif rule.match_nature == 'amount_paid':
            query += ' AND st_line.amount <= 0.0'

        # Filter on amount.
        if rule.match_amount:
            query += ' AND ROUND(ABS(st_line.amount), jnl_precision.dp) '
            if rule.match_amount == 'lower':
                query += '< %s'
                params += [self.match_amount_max]
            elif rule.match_amount == 'greater':
                query += '> %s'
                params += [self.match_amount_min]
            else:
                # if self.match_amount == 'between'
                query += 'BETWEEN %s AND %s'
                params += [rule.match_amount_min, rule.match_amount_max]

        # Filter on label, note and transaction_type
        for table, field, column in [('st_line', 'label', 'payment_ref'), ('st_line_move', 'note', 'narration'), ('st_line', 'transaction_type', 'transaction_type')]:
            if rule['match_' + field] == 'contains':
                query += ' AND {}.{} ILIKE %s'.format(table, column)
                params += ['%%%s%%' % rule['match_' + field + '_param']] #TODO OCO eeeeuuuuaaaaaaagh !
            elif rule['match_' + field] == 'not_contains':
                query += ' AND {}.{} NOT ILIKE %s'.format(table, column)
                params += ['%%%s%%' % rule['match_' + field + '_param']]
            elif rule['match_' + field] == 'match_regex':
                query += ' AND {}.{} ~* %s'.format(table, column)
                params += [rule['match_' + field + '_param']]

        #TODO OCO Pour le truc de fhe,c'est probablement quelque part par ici ^ (le code est générique, donc peut-être plutôt à la suite? Quoique, en fait il faudrait p-ê le faire partout) => en fait, il ne faut pas matcher que le nom de la st line

        # Filter on partners.
        if rule.match_partner:
            query += ' AND line_partner.partner_id != 0'

            if rule.match_partner_ids:
                query += ' AND line_partner.partner_id IN %s'
                params += [tuple(rule.match_partner_ids.ids)]

            if rule.match_partner_category_ids:
                query += '''
                    AND line_partner.partner_id IN (
                        SELECT DISTINCT categ.partner_id FROM res_partner_res_partner_category_rel categ WHERE categ.category_id IN %s
                    )
                '''
                params += [tuple(rule.match_partner_category_ids.ids)]

        return query, params

    def _get_with_tables(self, st_lines, partner_map=None):
        with_tables = '''
            WITH jnl_precision AS (
                SELECT
                    j.id AS journal_id, currency.decimal_places AS dp
                FROM account_journal j
                LEFT JOIN res_company c ON j.company_id = c.id
                LEFT JOIN res_currency currency ON COALESCE(j.currency_id, c.currency_id) = currency.id
                WHERE j.type IN ('bank', 'cash')
            )'''
        # Compute partners values table.
        # This is required since some statement line's partners could be shadowed in the reconciliation widget.
        partners_list = []
        for line in st_lines:
            partner_id = partner_map and partner_map.get(line.id) or line.partner_id.id or 0
            partners_list.append('(%d, %d)' % (line.id, partner_id))
        partners_table = 'SELECT * FROM (VALUES %s) AS line_partner (line_id, partner_id)' % ','.join(partners_list)
        with_tables += ', partners_table AS (' + partners_table + ')'
        return with_tables

    def _get_invoice_matching_query(self, st_lines, excluded_ids=None, partner_map=None): #TODO OCO refactorer ? + renommer pour le contexte d'appel ?
        ''' Get the query applying all rules trying to match existing entries with the given statement lines.
        :param st_lines:        Account.bank.statement.lines recordset.
        :param excluded_ids:    Account.move.lines to exclude.
        :param partner_map:     Dict mapping each line with new partner eventually.
        :return:                (query, params)
        '''
        if any(m.rule_type != 'invoice_matching' for m in self):
            raise UserError(_('Programmation Error: Can\'t call _get_invoice_matching_query() for different rules than \'invoice_matching\''))

        queries = []
        all_params = []
        for rule in self:
            # N.B: 'communication_flag' is there to distinguish invoice matching through the number/reference
            # (higher priority) from invoice matching using the partner (lower priority).
            query = r'''
            SELECT
                %s                                  AS sequence,
                %s                                  AS model_id,
                st_line.id                          AS id,
                aml.id                              AS aml_id,
                aml.currency_id                     AS aml_currency_id,
                aml.date_maturity                   AS aml_date_maturity,
                aml.amount_residual                 AS aml_amount_residual,
                aml.amount_residual_currency        AS aml_amount_residual_currency,
                aml.balance                         AS aml_balance,
                aml.amount_currency                 AS aml_amount_currency,
                account.internal_type               AS account_internal_type,

                -- Determine a matching or not with the statement line communication using the aml.name, move.name or move.ref.
                (
                    aml.name IS NOT NULL
                    AND
                    substring(REGEXP_REPLACE(aml.name, '[^0-9|^\s]', '', 'g'), '\S(?:.*\S)*') != ''
                    AND
                        regexp_split_to_array(substring(REGEXP_REPLACE(aml.name, '[^0-9|^\s]', '', 'g'), '\S(?:.*\S)*'),'\s+')
                        && regexp_split_to_array(substring(REGEXP_REPLACE(st_line.payment_ref, '[^0-9|^\s]', '', 'g'), '\S(?:.*\S)*'), '\s+')
                )
                OR
                    regexp_split_to_array(substring(REGEXP_REPLACE(move.name, '[^0-9|^\s]', '', 'g'), '\S(?:.*\S)*'),'\s+')
                    && regexp_split_to_array(substring(REGEXP_REPLACE(st_line.payment_ref, '[^0-9|^\s]', '', 'g'), '\S(?:.*\S)*'), '\s+')
                OR
                (
                    move.ref IS NOT NULL
                    AND
                    substring(REGEXP_REPLACE(move.ref, '[^0-9|^\s]', '', 'g'), '\S(?:.*\S)*') != ''
                    AND
                        regexp_split_to_array(substring(REGEXP_REPLACE(move.ref, '[^0-9|^\s]', '', 'g'), '\S(?:.*\S)*'),'\s+')
                        && regexp_split_to_array(substring(REGEXP_REPLACE(st_line.payment_ref, '[^0-9|^\s]', '', 'g'), '\S(?:.*\S)*'), '\s+')
                )                                   AS communication_flag,
                -- Determine a matching or not with the statement line communication using the move.invoice_payment_ref.
                (
                    move.invoice_payment_ref IS NOT NULL
                    AND
                    regexp_replace(move.invoice_payment_ref, '\s+', '', 'g') = regexp_replace(st_line.payment_ref, '\s+', '', 'g')
                )                                   AS payment_reference_flag
            FROM account_bank_statement_line st_line
            JOIN account_move st_line_move          ON st_line_move.id = st_line.move_id
            JOIN account_journal journal            ON journal.id = st_line_move.journal_id
            LEFT JOIN jnl_precision                 ON jnl_precision.journal_id = journal.id
            JOIN res_company company                ON company.id = st_line_move.company_id
            LEFT JOIN partners_table line_partner   ON line_partner.line_id = st_line.id
            , account_move_line aml
            LEFT JOIN account_move move             ON move.id = aml.move_id AND move.state = 'posted'
            LEFT JOIN account_account account       ON account.id = aml.account_id
            WHERE st_line.id IN %s
                AND aml.company_id = st_line_move.company_id
                AND move.state = 'posted'
                AND (
                        -- the field match_partner of the rule might enforce the second part of
                        -- the OR condition, later in _apply_conditions()
                        line_partner.partner_id = 0
                        OR
                        aml.partner_id = line_partner.partner_id
                    )
                AND CASE WHEN st_line.amount > 0.0
                         THEN aml.balance > 0
                         ELSE aml.balance < 0
                    END

                -- if there is a partner, propose all aml of the partner, otherwise propose only the ones
                -- matching the statement line communication
                AND
                (
                    (
                        line_partner.partner_id != 0
                        AND
                        aml.partner_id = line_partner.partner_id
                    )
                    OR
                    (
                        line_partner.partner_id = 0
                        AND
                        substring(REGEXP_REPLACE(st_line.payment_ref, '[^0-9|^\s]', '', 'g'), '\S(?:.*\S)*') != ''
                        AND
                        (
                            (
                                aml.name IS NOT NULL
                                AND
                                substring(REGEXP_REPLACE(aml.name, '[^0-9|^\s]', '', 'g'), '\S(?:.*\S)*') != ''
                                AND
                                    regexp_split_to_array(substring(REGEXP_REPLACE(aml.name, '[^0-9|^\s]', '', 'g'), '\S(?:.*\S)*'),'\s+')
                                    && regexp_split_to_array(substring(REGEXP_REPLACE(st_line.payment_ref, '[^0-9|^\s]', '', 'g'), '\S(?:.*\S)*'), '\s+')
                            )
                            OR
                                regexp_split_to_array(substring(REGEXP_REPLACE(move.name, '[^0-9|^\s]', '', 'g'), '\S(?:.*\S)*'),'\s+')
                                && regexp_split_to_array(substring(REGEXP_REPLACE(st_line.payment_ref, '[^0-9|^\s]', '', 'g'), '\S(?:.*\S)*'), '\s+')
                            OR
                            (
                                move.ref IS NOT NULL
                                AND
                                substring(REGEXP_REPLACE(move.ref, '[^0-9|^\s]', '', 'g'), '\S(?:.*\S)*') != ''
                                AND
                                    regexp_split_to_array(substring(REGEXP_REPLACE(move.ref, '[^0-9|^\s]', '', 'g'), '\S(?:.*\S)*'),'\s+')
                                    && regexp_split_to_array(substring(REGEXP_REPLACE(st_line.payment_ref, '[^0-9|^\s]', '', 'g'), '\S(?:.*\S)*'), '\s+')
                            )
                            OR
                            (
                                move.invoice_payment_ref IS NOT NULL
                                AND
                                regexp_replace(move.invoice_payment_ref, '\s+', '', 'g') = regexp_replace(st_line.payment_ref, '\s+', '', 'g')
                            )
                        )
                    )
                )
                AND account.reconcile IS TRUE
                AND aml.reconciled IS FALSE
            '''
            # Filter on the same currency.
            if rule.match_same_currency:
                query += '''
                    AND COALESCE(st_line.foreign_currency_id, st_line_move.currency_id) = COALESCE(aml.currency_id, company.currency_id)
                '''

            params = [rule.sequence, rule.id, tuple(st_lines.ids)]
            # Filter out excluded account.move.line.
            if excluded_ids:
                query += 'AND aml.id NOT IN %s'
                params += [tuple(excluded_ids)]
            query, params = rule._apply_conditions(query, params)
            queries.append(query)
            all_params += params
        full_query = self._get_with_tables(st_lines, partner_map=partner_map)
        full_query += ' UNION ALL '.join(queries)
        # Oldest due dates come first.
        full_query += ' ORDER BY aml_date_maturity, aml_id'
        return full_query, all_params

    def _get_writeoff_suggestion_query(self, st_lines, excluded_ids=None, partner_map=None): #TODO OCO refactorer ? > + renommer pour correspondre plus au contexte d'appel ?
        ''' Get the query applying all reconciliation rules.
        :param st_lines:        Account.bank.statement.lines recordset.
        :param excluded_ids:    Account.move.lines to exclude.
        :param partner_map:     Dict mapping each line with new partner eventually.
        :return:                (query, params)
        '''
        if any(m.rule_type != 'writeoff_suggestion' for m in self):
            raise UserError(_("Programmation Error: Can't call _get_writeoff_suggestion_query() for different rules than 'writeoff_suggestion'"))

        queries = []
        all_params = []
        for rule in self:
            query = '''
                SELECT
                    %s                                  AS sequence,
                    %s                                  AS model_id,
                    st_line.id                          AS id
                FROM account_bank_statement_line st_line
                JOIN account_move st_line_move          ON st_line_move.id = st_line.move_id
                LEFT JOIN account_journal journal       ON journal.id = st_line_move.journal_id
                LEFT JOIN jnl_precision                 ON jnl_precision.journal_id = journal.id
                LEFT JOIN res_company company           ON company.id = st_line_move.company_id
                LEFT JOIN partners_table line_partner   ON line_partner.line_id = st_line.id
                WHERE st_line.id IN %s
            '''
            params = [rule.sequence, rule.id, tuple(st_lines.ids)]

            query, params = rule._apply_conditions(query, params)
            queries.append(query)
            all_params += params

        full_query = self._get_with_tables(st_lines, partner_map=partner_map)
        full_query += ' UNION ALL '.join(queries)
        return full_query, all_params

    def _get_candidates(self, st_lines, excluded_ids, partner_map): #TODO OCO DOC
        #TODO OCO rendre ensure_one ?
        treatment_map = {
            self.filtered(lambda m: m.rule_type == 'invoice_matching'): lambda x: x._get_invoice_matching_query(st_lines, excluded_ids, partner_map),
            self.filtered(lambda m: m.rule_type == 'writeoff_suggestion'): lambda x: x._get_writeoff_suggestion_query(st_lines, excluded_ids, partner_map),
        }

        rslt = []
        for rules, query_generator in treatment_map.items():
            if rules:
                query, params = query_generator(rules)
                self._cr.execute(query, params)
                rslt += self._cr.dictfetchall()

        return rslt

    def _check_rule_propositions(self, statement_line, candidates):
        ''' Check restrictions that can't be handled for each move.line separately.
        /!\ Only used by models having a type equals to 'invoice_matching'.
        :param statement_line:  An account.bank.statement.line record.
        :param candidates:      Fetched account.move.lines from query (dict).
        :return:                True if the reconciliation propositions are accepted. False otherwise.
        '''
        if not self.match_total_amount: #TODO OCO oui, en fait, ça ne check que le match_total_amount si le modèle l'utilise => changer le nom de la fonction me semble indiqué
            return True
        if not candidates:
            return False

        # Match total residual amount.
        total_residual = 0.0
        for aml in candidates:
            if aml['account_internal_type'] == 'liquidity':
                total_residual += aml['aml_currency_id'] and aml['aml_amount_currency'] or aml['aml_balance']
            else:
                total_residual += aml['aml_currency_id'] and aml['aml_amount_residual_currency'] or aml['aml_amount_residual']
        line_residual = statement_line.currency_id and statement_line.amount_currency or statement_line.amount
        line_currency = statement_line.currency_id or statement_line.journal_id.currency_id or statement_line.company_id.currency_id

        # Statement line amount is equal to the total residual.
        if float_is_zero(total_residual - line_residual, precision_rounding=line_currency.rounding):
            return True

        line_residual_to_compare = line_residual if line_residual > 0.0 else -line_residual
        total_residual_to_compare = total_residual if line_residual > 0.0 else -total_residual

        if line_residual_to_compare > total_residual_to_compare:
            amount_percentage = (total_residual_to_compare / line_residual_to_compare) * 100
        elif total_residual:
            amount_percentage = (line_residual_to_compare / total_residual_to_compare) * 100 if total_residual_to_compare else 0.0
        else:
            return False
        return amount_percentage >= self.match_total_amount_param

    @api.model
    def _sort_reconciliation_candidates_by_priority(self, candidates, already_proposed_aml_ids, already_reconciled_aml_ids):
        candidates_by_priority = defaultdict(lambda: []) #TODO OCO 1=highest priority

        for candidate in filter(lambda x: x['aml_id'] not in already_reconciled_aml_ids, candidates):

            if candidate['payment_reference_flag']:
                priority = 1
            elif candidate['communication_flag']:
                priority = 3
            else:
                priority = 5

            if candidate['aml_id'] in already_proposed_aml_ids:
                priority += 1

            candidates_by_priority[priority].append(candidate)

        if candidates_by_priority[1]:
            # We ignore candidates with lowest priorities if highest priority ones are avalaible
            candidates_by_priority[5] = []
            candidates_by_priority[6] = []

        return candidates_by_priority

    def _apply_rules(self, st_lines, excluded_ids=None, partner_map=None): #TODO OCO selon comment tu modifies la méthode, pour l'isoler, il faudra sans doute passer param de plus qui prend les lignes déjà sélectionnées (l'équivalent de amls_ids_to_exclude, avant la boucle un peu plus bas)
        #TODO OCO peut-être reconsidérer la façon dont on passe la partner_map ?
        ''' Apply criteria to get candidates for all reconciliation models.
        :param st_lines:        Account.bank.statement.lines recordset.
        :param excluded_ids:    Account.move.lines to exclude.
        :param partner_map:     Dict mapping each line with new partner eventually.
        :return:                A dict mapping each statement line id with:
            * aml_ids:      A list of account.move.line ids.
            * model:        An account.reconcile.model record (optional).
            * status:       'reconciled' if the lines has been already reconciled, 'write_off' if the write-off must be
                            applied on the statement line.
        '''
        results = {line.id: {'aml_ids': []} for line in st_lines}

        available_models = self.filtered(lambda m: m.rule_type != 'writeoff_button').sorted(key=lambda m: (m.sequence, m.id))
        amls_ids_to_exclude = set() # Keep track of already processed amls. #TODO OCO renommer already_treated; plus clair
        reconciled_amls_ids = set() # Keep track of already reconciled amls. #TODO OCO renommer
        for st_line in st_lines:
            for rec_model in available_models:
                # If we don't have any candidate for this model, jump to the next one.
                candidates = rec_model._get_candidates(st_line, excluded_ids, partner_map)
                if candidates:
                    model_rslt, new_reconciled_aml_ids, new_treated_aml_ids = rec_model._get_rule_result(st_line, candidates, amls_ids_to_exclude, reconciled_amls_ids, partner_map)

                    if model_rslt:
                        results[st_line.id] = model_rslt
                        reconciled_amls_ids |= new_reconciled_aml_ids
                        amls_ids_to_exclude |= new_treated_aml_ids
                        break

        return results

    def _get_rule_result(self, st_line, candidates, amls_ids_to_exclude, reconciled_amls_ids, partner_map): #TODO OCO DOC
        self.ensure_one()

        if self.rule_type == 'invoice_matching':
            return self._get_invoice_matching_rule_result(st_line, candidates, amls_ids_to_exclude, reconciled_amls_ids, partner_map)
        elif self.rule_type == 'writeoff_suggestion':
            return self._get_writeoff_suggestion_rule_result(st_line, partner_map), set(), set()
        else:
            return None, set(), set()

    def _get_invoice_matching_rule_result(self, st_line, candidates, amls_ids_to_exclude, reconciled_amls_ids, partner_map):# TODO OCO DOC
        new_reconciled_aml_ids = set()
        new_treated_aml_ids = set()
        candidates, candidates_by_priority = self._filter_candidates(candidates, amls_ids_to_exclude, reconciled_amls_ids)

        # Special case: the amount are the same, submit the line directly. #TODO OCO rendre le commentaire + clair ?
        st_line_currency = st_line.currency_id or st_line.journal_id.currency_id or st_line.company_id.currency_id
        st_line_residual = st_line.currency_id and st_line.amount_currency or st_line.amount
        for candidate in candidates:
            residual_amount = candidate['aml_currency_id'] and candidate['aml_amount_residual_currency'] or candidate['aml_amount_residual']
            if st_line_currency.is_zero(residual_amount - st_line_residual):
                candidates, candidates_by_priority = self._filter_candidates([candidate], amls_ids_to_exclude, reconciled_amls_ids)
                break

        # TODO OCO comment
        if candidates_by_priority[1] or candidates_by_priority[2] or self._check_rule_propositions(st_line, candidates):
            rslt = {
                'model': self,
                'aml_ids': [candidate['aml_id'] for candidate in candidates],
            }
            new_treated_aml_ids = set(rslt['aml_ids'])

            # Create write-off lines.
            partner = partner_map and partner_map.get(st_line.id) and self.env['res.partner'].browse(partner_map[st_line.id])
            lines_vals_list = self._prepare_reconciliation(st_line, aml_ids=rslt['aml_ids'], partner=partner)

            # A write-off must be applied since there are some 'new' lines to propose.
            if not lines_vals_list or any(not line_vals.get('id') for line_vals in lines_vals_list):
                rslt['status'] = 'write_off'

            # Process auto-reconciliation.
            if lines_vals_list and (candidates_by_priority[1] or candidates_by_priority[2]) and self.auto_reconcile:
                if not st_line.partner_id and partner:
                    st_line.partner_id = partner

                st_line.reconcile(lines_vals_list)
                rslt['status'] = 'reconciled'
                rslt['reconciled_lines'] = st_line.line_ids
                new_reconciled_aml_ids = new_treated_aml_ids
        else:
            rslt = None

        return rslt, new_reconciled_aml_ids, new_treated_aml_ids

    def _filter_candidates(self, candidates, amls_ids_to_exclude, reconciled_amls_ids):
        candidates_by_priority = self._sort_reconciliation_candidates_by_priority(candidates, amls_ids_to_exclude, reconciled_amls_ids)
        candidates = itertools.chain.from_iterable(candidates_by_priority.values()) # candidates_by_priority may have filtered out less interesting candidates
        return list(candidates), candidates_by_priority

    def _get_writeoff_suggestion_rule_result(self, st_line, partner_map):
        rslt = {
            'model': self,
            'status': 'write_off',
            'aml_ids': [],
        }

        # Create write-off lines.
        partner = partner_map and partner_map.get(st_line.id) and self.env['res.partner'].browse(partner_map[st_line.id])
        lines_vals_list = self._prepare_reconciliation(st_line, partner=partner)

        # Process auto-reconciliation.
        if lines_vals_list and self.auto_reconcile:
            if not st_line.partner_id and partner:
                st_line.partner_id = partner

            st_line.reconcile(lines_vals_list)
            rslt['status'] = 'reconciled'
            rslt['reconciled_lines'] = st_line.line_ids

        return rslt