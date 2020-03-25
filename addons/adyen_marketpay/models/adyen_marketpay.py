# -*- coding: utf-8 -*-
# Part of Odoo. See LICENSE file for full copyright and licensing details.

from datetime import datetime
from pytz import UTC
import requests
import uuid
from werkzeug.exceptions import Forbidden
from werkzeug.urls import url_join

from odoo import api, fields, models, _
from odoo.http import request
from odoo.exceptions import ValidationError
from odoo.tools import DEFAULT_SERVER_DATETIME_FORMAT

from ..util import AdyenAuth

ADYEN_AVAILABLE_COUNTRIES = ['US', 'AT', 'AU', 'BE', 'CA', 'CH', 'CZ', 'DE', 'ES', 'FI', 'FR', 'GB', 'GR', 'HR', 'IE', 'IT', 'LT', 'LU', 'NL', 'PL', 'PT']


class AdyenAddressMixin(models.AbstractModel):
    _name = 'adyen.address.mixin'
    _description = 'Adyen Address Mixin'

    country_id = fields.Many2one('res.country', string='Country', domain=[('code', 'in', ADYEN_AVAILABLE_COUNTRIES)], required=True)
    country_code = fields.Char(related='country_id.code')
    state_id = fields.Many2one('res.country.state', string='State', domain="[('country_id', '=?', country_id)]")
    city = fields.Char('City', required=True)
    zip = fields.Char('ZIP', required=True)
    street = fields.Char('Street', required=True)
    house_number_or_name = fields.Char('House Number Or Name', required=True)


class AdyenIDMixin(models.AbstractModel):
    _name = 'adyen.id.mixin'
    _description = 'Adyen ID Mixin'

    id_type = fields.Selection(string='Photo ID type', selection=[
        ('PASSPORT', 'Passport'),
        ('ID_CARD', 'ID Card'),
        ('DRIVING_LICENSE', 'Driving License'),
    ])
    id_front = fields.Binary('Photo ID Front', help="Allowed formats: jpg, pdf, png. Maximum allowed size: 4MB.")
    id_front_filename = fields.Char()
    id_back = fields.Binary('Photo ID Back', help="Allowed formats: jpg, pdf, png. Maximum allowed size: 4MB.")
    id_back_filename = fields.Char()

    def write(self, vals):
        res = super(AdyenIDMixin, self).write(vals)
        if 'id_front' in vals:
            document_type = self.id_type
            if self.id_type in ['ID_CARD', 'DRIVING_LICENSE']:
                document_type += '_FRONT'
            self._upload_document(document_type, self.id_front, self.id_front_filename)
        if 'id_back' in vals:
            document_type = self.id_type + '_BACK'
            self._upload_document(document_type, self.id_back, self.id_back_filename)
        return res

    def _upload_document(self, document_type, content, filename):
        self.adyen_account_id._adyen_rpc('upload_document', {
            'documentDetail': {
                'accountHolderCode': self.adyen_account_id.account_holder_code,
                'shareholderCode': self.shareholder_uuid or None,
                'documentType': document_type,
                'filename': self.id_back_filename,
            },
            'documentContent': self.id_back,
        })


class AdyenAccount(models.Model):
    _name = 'adyen.account'
    _inherit = ['adyen.id.mixin', 'adyen.address.mixin']
    _description = 'Adyen MarketPay Account'
    _rec_name = 'full_name'

    # Credentials
    proxy_token = fields.Char('Proxy Token')
    adyen_uuid = fields.Char('Adyen UUID')
    account_holder_code = fields.Char('Account Holder Code', default=lambda self: uuid.uuid4().hex)

    company_id = fields.Many2one('res.company', default=lambda self: self.env.company)
    payout_ids = fields.One2many('adyen.payout', 'adyen_account_id', string='Payouts')
    shareholder_ids = fields.One2many('adyen.shareholder', 'adyen_account_id', string='Shareholders')
    shareholder_count = fields.Integer(string='Number of Shareholders', compute='_compute_shareholder_count', store=True)
    bank_account_ids = fields.One2many('adyen.bank.account', 'adyen_account_id', string='Bank Accounts')
    transaction_ids = fields.One2many('adyen.transaction', 'adyen_account_id', string='Transactions')
    transactions_count = fields.Integer(compute='_compute_transactions_count')

    is_business = fields.Boolean('Is a business', required=True)
    full_name = fields.Char(compute='_compute_full_name')

    # Contact Info
    email = fields.Char('Email', required=True)
    phone_number = fields.Char('Phone Number', required=True)

    # Individual
    first_name = fields.Char('First Name')
    last_name = fields.Char('Last Name')
    date_of_birth = fields.Date('Date of birth')
    document_number = fields.Char('ID Number', help="The type of ID Number required depends on the country:\nUS: Social Security Number (9 digits or last 4 digits)\nCanada: Social Insurance Number\nItaly: Codice fiscale\nAustralia: Document Number")
    document_type = fields.Selection(string='Document Type', selection=[
        ('ID', 'ID'),
        ('PASSPORT', 'Passport'),
        ('VISA', 'Visa'),
        ('DRIVINGLICENSE', 'Driving license'),
    ])

    # Business
    legal_business_name = fields.Char('Legal Business Name')
    doing_business_as = fields.Char('Doing Business As')
    registration_number = fields.Char('Registration Number')

    # KYC
    kyc_status = fields.Selection(string='KYC Status', selection=[
        ('awaiting_data', 'Data to provide'),
        ('pending', 'Waiting for validation'),
        ('passed', 'Confirmed'),
        ('failed', 'Failed'),
    ], required=True, default='awaiting_data')
    kyc_error_message = fields.Char('KYC Error Message', readonly=True)

    _sql_constraints = [
        ('adyen_uuid_uniq', 'UNIQUE(adyen_uuid)', 'Adyen UUID should be unique'),
        ('shareholders_required', 'CHECK(shareholder_count>0 OR NOT is_business)', 'You should provide at least one provider for businesses.'),
    ]

    @api.depends('shareholder_ids')
    def _compute_shareholder_count(self):
        for adyen_account_id in self:
            adyen_account_id.shareholder_count = len(adyen_account_id.shareholder_ids)

    @api.depends('transaction_ids')
    def _compute_transactions_count(self):
        for adyen_account_id in self:
            adyen_account_id.transactions_count = len(adyen_account_id.transaction_ids)

    @api.depends('first_name', 'last_name', 'legal_business_name')
    def _compute_full_name(self):
        for adyen_account_id in self:
            if adyen_account_id.is_business:
                adyen_account_id.full_name = adyen_account_id.legal_business_name
            else:
                adyen_account_id.full_name = "%s %s" % (adyen_account_id.first_name, adyen_account_id.last_name)

    @api.model
    def create(self, values):
        adyen_account_id = super(AdyenAccount, self).create(values)
        if not adyen_account_id.env.context.get('update_from_adyen'):
            response = adyen_account_id._adyen_rpc('create_account_holder', {
                **adyen_account_id._format_data(),
                'processingTier': 1,
            })
            adyen_account_id.with_context(update_from_adyen=True).write({
                'adyen_uuid': response['adyen_uuid'],
                'proxy_token': response['adyen_proxy_token'],
            })
            adyen_account_id.env['adyen.payout'].with_context(update_from_adyen=True).create({
                'code': response['adyen_data']['accountCode'],
                'adyen_account_id': adyen_account_id.id,
            })
        return adyen_account_id

    def write(self, vals):
        res = super(AdyenAccount, self).write(vals)
        if not self.env.context.get('update_from_adyen'):
            self._adyen_rpc('update_account_holder', self._format_data())
        return res

    def unlink(self):
        for adyen_account_id in self:
            adyen_account_id._adyen_rpc('close_account_holder', {
                'accountHolderCode': adyen_account_id.account_holder_code,
            })
        return super(AdyenAccount, self).unlink()

    @api.model
    def action_create_redirect(self):
        '''
        Accessing the FormView to create an Adyen account needs to be done through this action.
        The action will redirect the user to accounts.odoo.com to link an Odoo user_id to the Adyen
        account. After logging in on odoo.com the user will be redirected to his DB with a token in
        the URL. This token is then needed to create the Adyen account.
        '''
        return_url = url_join(self.env['ir.config_parameter'].sudo().get_param('web.base.url'), 'adyen_marketpay/create_account')
        onboarding_url = self.env['ir.config_parameter'].sudo().get_param('adyen_marketpay.onboarding_url')
        return {
            'type': 'ir.actions.act_url',
            'url': url_join(onboarding_url, 'get_creation_token?return_url=%s' % return_url),
        }

    def action_show_transactions(self):
        return {
            'name': _('Transactions'),
            'view_mode': 'tree,form',
            'domain': [('adyen_account_id', '=', self.id)],
            'res_model': 'adyen.transaction',
            'type': 'ir.actions.act_window',
        }

    def _format_data(self):
        data = {
            'accountHolderCode': self.account_holder_code,
            'accountHolderDetails': {
                'address': {
                    'country': self.country_id.code,
                    'stateOrProvince': self.state_id.code or None,
                    'city': self.city,
                    'postalCode': self.zip,
                    'street': self.street,
                    'houseNumberOrName': self.house_number_or_name,
                },
                'email': self.email,
                'fullPhoneNumber': self.phone_number,
            },
            'legalEntity': 'Business' if self.is_business else 'Individual',
        }

        if self.is_business:
            data['accountHolderDetails']['businessDetails'] = {
                'legalBusinessName': self.legal_business_name,
                'doingBusinessAs': self.doing_business_as,
                'registrationNumber': self.registration_number,
            }
        else:
            data['accountHolderDetails']['individualDetails'] = {
                'name': {
                    'firstName': self.first_name,
                    'lastName': self.last_name,
                    'gender': 'UNKNOWN',
                },
                'personalData': {
                    'dateOfBirth': str(self.date_of_birth),
                }
            }

            # documentData cannot be present if not set
            if self.document_number:
                data['accountHolderDetails']['businessDetails']['shareholders'][0]['personalData']['documentData'] = [{
                    'number': self.document_number,
                    'type': self.document_type,
                }]

        return data

    def _adyen_rpc(self, operation, adyen_data={}):
        if operation == 'create_account_holder':
            url = self.env['ir.config_parameter'].sudo().get_param('adyen_marketpay.onboarding_url')
            params = {
                'creation_token': request.session.pop('adyen_creation_token'),
                'adyen_data': adyen_data,
            }
            auth = None
        else:
            url = self.env['ir.config_parameter'].sudo().get_param('adyen_marketpay.proxy_url')
            params = {
                'adyen_uuid': self.adyen_uuid,
                'adyen_data': adyen_data,
            }
            auth = AdyenAuth(self)

        payload = {
            'jsonrpc': '2.0',
            'params': params,
        }
        req = requests.post(url_join(url, operation), json=payload, auth=auth)
        response = req.json()

        if 'error' in response:
            name = response['error']['data'].get('name').rpartition('.')[-1]
            message = response['error']['data'].get('message')
            if name == 'Forbidden':
                raise Forbidden()
            else:
                raise requests.exceptions.ConnectionError()

        result = response.get('result')

        if type(result) is not str and result.get('invalidFields'):
            msg = ''
            for error in result['invalidFields']:
                msg += '%s\n' % error.get('errorDescription')
            raise ValidationError(msg)

        return result

    @api.model
    def _sync_adyen_kyc_status(self, data=None):
        for adyen_account_id in self.search([]):
            if not data:
                data = adyen_account_id._adyen_rpc('get_account_holder', {
                    'accountHolderCode': adyen_account_id.account_holder_code,
                })

            checks = data.get('verification', {})
            all_checks_status = []

            # Account Holder Checks
            account_holder_checks = checks.get('accountHolder', {})
            account_holder_errors = []
            for check in account_holder_checks.get('checks'):
                all_checks_status.append(check['status'])
                if check['status'] not in ['PASSED', 'DATA_PROVIDED', 'PENDING']:
                    account_holder_errors.append(self._get_kyc_message(check))

            # Shareholders Checks
            shareholder_checks = checks.get('shareholders', {})
            shareholder_errors = []
            kyc_error_message = False
            for sc in shareholder_checks:
                shareholder_status = []
                shareholder_id = adyen_account_id.shareholder_ids.filtered(lambda shareholder: shareholder.shareholder_uuid == sc['shareholderCode'])
                for check in sc.get('checks'):
                    all_checks_status.append(check['status'])
                    shareholder_status.append(check['status'])
                    if check['status'] not in ['PASSED', 'DATA_PROVIDED', 'PENDING']:
                        kyc_error_message = self._get_kyc_message(check)
                        shareholder_errors.append('[%s] %s' % (shareholder_id.display_name, kyc_error_message))
                shareholder_id.with_context(update_from_adyen=True).write({
                    'kyc_status': self.get_status(shareholder_status),
                    'kyc_error_message': kyc_error_message,
                })

            # Bank Account Checks
            bank_account_checks = checks.get('bankAccounts', {})
            bank_account_errors = []
            kyc_error_message = False
            for bac in bank_account_checks:
                bank_account_status = []
                bank_account_id = adyen_account_id.bank_account_ids.filtered(lambda bank_account: bank_account.bank_account_uuid == bac['bankAccountUUID'])
                for check in bac.get('checks'):
                    all_checks_status.append(check['status'])
                    bank_account_status.append(check['status'])
                    if check['status'] not in ['PASSED', 'DATA_PROVIDED', 'PENDING']:
                        kyc_error_message = self._get_kyc_message(check)
                        bank_account_errors.append('[%s] %s' % (bank_account_id.display_name, kyc_error_message))
                bank_account_id.with_context(update_from_adyen=True).write({
                    'kyc_status': self.get_status(bank_account_status),
                    'kyc_error_message': kyc_error_message,
                })

            adyen_account_id.with_context(update_from_adyen=True).write({
                'kyc_status': self.get_status(all_checks_status),
                'kyc_error_message': self.env['ir.qweb'].render('adyen_marketpay.kyc_error_message', {
                        'account_holder_errors': account_holder_errors,
                        'shareholder_errors': shareholder_errors,
                        'bank_account_errors': bank_account_errors,
                    }),
            })

    @api.model
    def get_status(self, statuses):
        if any(status in ['FAILED'] for status in statuses):
            return 'failed'
        if any(status in ['INVALID_DATA', 'RETRY_LIMIT_REACHED', 'AWAITING_DATA'] for status in statuses):
            return 'awaiting_data'
        if any(status in ['DATA_PROVIDED', 'PENDING'] for status in statuses):
            return 'pending'
        return 'passed'

    @api.model
    def _get_kyc_message(self, check):
        if check.get('summary', {}).get('kycCheckDescription'):
            return check['summary']['kycCheckDescription']
        if check['type'] == 'BANK_ACCOUNT_VERIFICATION':
            return _('Missing bank statement')
        if check['type'] == 'PASSPORT_VERIFICATION':
            return _('Missing photo ID')
        if check.get('requiredFields', {}):
            return _('Missing required fields: ') + ', '.join(check.get('requiredFields'))
        return ''


class AdyenShareholder(models.Model):
    _name = 'adyen.shareholder'
    _inherit = ['adyen.id.mixin', 'adyen.address.mixin']
    _description = 'Adyen MarketPay Shareholder'
    _rec_name = 'full_name'

    adyen_account_id = fields.Many2one('adyen.account')
    shareholder_uuid = fields.Char('UUID')
    shareholder_reference = fields.Char('Reference', default=lambda self: uuid.uuid4().hex)
    first_name = fields.Char('First Name', required=True)
    last_name = fields.Char('Last Name', required=True)
    full_name = fields.Char(compute='_compute_full_name')
    date_of_birth = fields.Date('Date of birth', required=True)
    document_number = fields.Char('ID Number', help="The type of ID Number required depends on the country:\nUS: Social Security Number (9 digits or last 4 digits)\nItaly: Codice fiscale")

    # KYC
    kyc_status = fields.Selection(string='KYC Status', selection=[
        ('awaiting_data', 'Data to provide'),
        ('pending', 'Waiting for validation'),
        ('passed', 'Confirmed'),
        ('failed', 'Failed'),
    ], required=True, default='awaiting_data')
    kyc_error_message = fields.Char('KYC Error Message', readonly=True)

    @api.depends('first_name', 'last_name')
    def _compute_full_name(self):
        for adyen_shareholder_id in self:
            adyen_shareholder_id.full_name = '%s %s' % (adyen_shareholder_id.first_name, adyen_shareholder_id.last_name)

    @api.model
    def create(self, values):
        adyen_shareholder_id = super(AdyenShareholder, self).create(values)
        if not adyen_shareholder_id.env.context.get('update_from_adyen'):
            response = adyen_shareholder_id.adyen_account_id._adyen_rpc('update_account_holder', adyen_shareholder_id._format_data())
            shareholders = response['accountHolderDetails']['businessDetails']['shareholders']
            created_shareholder = next(shareholder for shareholder in shareholders if shareholder['shareholderReference'] == adyen_shareholder_id.shareholder_reference)
            adyen_shareholder_id.with_context(update_from_adyen=True).write({
                'shareholder_uuid': created_shareholder['shareholderCode'],
            })
        return adyen_shareholder_id

    def write(self, vals):
        res = super(AdyenShareholder, self).write(vals)
        if not self.env.context.get('update_from_adyen'):
            self.adyen_account_id._adyen_rpc('update_account_holder', self._format_data())
        return res

    def unlink(self):
        for shareholder_id in self:
            shareholder_id.adyen_account_id._adyen_rpc('delete_shareholders', {
                'accountHolderCode': shareholder_id.adyen_account_id.account_holder_code,
                'shareholderCodes': [shareholder_id.shareholder_uuid],
            })
        return super(AdyenShareholder, self).unlink()

    def _format_data(self):
        data = {
            'accountHolderCode': self.adyen_account_id.account_holder_code,
            'accountHolderDetails': {
                'businessDetails': {
                    'shareholders': [{
                        'shareholderCode': self.shareholder_uuid or None,
                        'shareholderReference': self.shareholder_reference,
                        'address': {
                            'city': self.city,
                            'country': self.country_code,
                            'houseNumberOrName': self.house_number_or_name,
                            'postalCode': self.zip,
                            'stateOrProvince': self.state_id.code or None,
                            'street': self.street,
                        },
                        'name': {
                            'firstName': self.first_name,
                            'lastName': self.last_name,
                            'gender': 'UNKNOWN'
                        },
                        'personalData': {
                            'dateOfBirth': str(self.date_of_birth),
                        }
                    }]
                }
            }
        }

        # documentData cannot be present if not set
        if self.document_number:
            data['accountHolderDetails']['businessDetails']['shareholders'][0]['personalData']['documentData'] = [{
                'number': self.document_number,
                'type': 'ID',
            }]

        return data

class AdyenBankAccount(models.Model):
    _name = 'adyen.bank.account'
    _description = 'Adyen MarketPay Bank Account'

    adyen_account_id = fields.Many2one('adyen.account')
    bank_account_uuid = fields.Char('UUID')
    bank_account_reference = fields.Char('Reference', default=lambda self: uuid.uuid4().hex)
    owner_name = fields.Char('Owner Name', required=True)
    country_id = fields.Many2one('res.country', string='Country', domain=[('code', 'in', ADYEN_AVAILABLE_COUNTRIES)], required=True)
    country_code = fields.Char(related='country_id.code')
    currency_id = fields.Many2one('res.currency', string='Currency', required=True)
    iban = fields.Char('IBAN')
    account_number = fields.Char('Account Number')
    branch_code = fields.Char('Branch Code')
    bank_code = fields.Char('Bank Code')
    bank_bic_swift = fields.Char('Bank BIC Swift')
    bank_name = fields.Char('Bank Name')
    bank_city = fields.Char('Bank City')
    account_type = fields.Selection(string='Account Type', selection=[
        ('checking', 'Checking'),
        ('savings', 'Savings'),
    ])
    owner_country_id = fields.Many2one('res.country', string='Owner Country')
    owner_state_id = fields.Many2one('res.country.state', 'Owner State')
    owner_street = fields.Char('Owner Street')
    owner_city = fields.Char('Owner City')
    owner_zip = fields.Char('Owner ZIP')
    owner_house_number_or_name = fields.Char('Owner House Number or Name')

    bank_statement = fields.Binary('Bank Statement', help="You need to provide a bank statement to allow payouts. \
        The file must be a bank statement, a screenshot of your online banking environment, a letter from the bank or a cheque and must contain \
        the logo of the bank or it's name in a unique font, the bank account details, the name of the account holder.\
        Allowed formats: jpg, pdf, png. Maximum allowed size: 10MB.")
    bank_statement_filename = fields.Char()

    # KYC
    kyc_status = fields.Selection(string='KYC Status', selection=[
        ('awaiting_data', 'Data to provide'),
        ('pending', 'Waiting for validation'),
        ('passed', 'Confirmed'),
        ('failed', 'Failed'),
    ], required=True, default='awaiting_data')
    kyc_error_message = fields.Char('KYC Error Message', readonly=True)

    _sql_constraints = [
        ('adyen_payout_currency_uniq', 'UNIQUE(adyen_account_id, currency_id)', 'You can only have one Payout per currency.')
    ]

    @api.model
    def create(self, values):
        adyen_bank_account_id = super(AdyenBankAccount, self).create(values)
        if not adyen_bank_account_id.env.context.get('update_from_adyen'):
            response = adyen_bank_account_id.adyen_account_id._adyen_rpc('update_account_holder', adyen_bank_account_id._format_data())
            bank_accounts = response['accountHolderDetails']['bankAccountDetails']
            created_bank_account = next(bank_account for bank_account in bank_accounts if bank_account['bankAccountReference'] == adyen_bank_account_id.bank_account_reference)
            adyen_bank_account_id.with_context(update_from_adyen=True).write({
                'bank_account_uuid': created_bank_account['bankAccountUUID'],
            })
        return adyen_bank_account_id

    def write(self, vals):
        res = super(AdyenBankAccount, self).write(vals)
        if not self.env.context.get('update_from_adyen'):
            self.adyen_account_id._adyen_rpc('update_account_holder', self._format_data())
        if 'kyc_bank_statement' in vals:
            self.adyen_account_id._adyen_rpc('upload_document', {
                'documentDetail': {
                    'accountHolderCode': self.adyen_account_id.account_holder_code,
                    'bankAccountUUID': self.bank_account_uuid,
                    'documentType': 'BANK_STATEMENT',
                    'filename': vals['kyc_bank_statement_filename'],
                },
                'documentContent': vals['kyc_bank_statement'],
            })
        return res

    def unlink(self):
        for bank_account_id in self:
            bank_account_id.adyen_account_id._adyen_rpc('delete_bank_accounts', {
                'accountHolderCode': bank_account_id.adyen_account_id.account_holder_code,
                'bankAccountUUIDs': [bank_account_id.bank_account_uuid],
            })
        return super(AdyenBankAccount, self).unlink()

    def _format_data(self):
        return {
            'accountHolderCode': self.adyen_account_id.account_holder_code,
            'accountHolderDetails': {
                'bankAccountDetails': [{
                    'accountNumber': self.account_number or None,
                    'accountType': self.account_type or None,
                    'bankAccountReference': self.bank_account_reference,
                    'bankAccountUUID': self.bank_account_uuid or None,
                    'bankBicSwift': self.bank_bic_swift or None,
                    'bankCity': self.bank_city or None,
                    'bankCode': self.bank_code or None,
                    'bankName': self.bank_name or None,
                    'branchCode': self.branch_code or None,
                    'countryCode': self.country_code,
                    'currencyCode': self.currency_id.name,
                    'iban': self.iban or None,
                    'ownerCity': self.owner_city or None,
                    'ownerCountryCode': self.owner_country_id.code or None,
                    'ownerHouseNumberOrName': self.owner_house_number_or_name or None,
                    'ownerName': self.owner_name,
                    'ownerPostalCode': self.owner_zip or None,
                    'ownerState': self.owner_state_id.code or None,
                    'ownerStreet': self.owner_street or None,
                }],
            }
        }


class AdyenPayout(models.Model):
    _name = 'adyen.payout'
    _description = 'Adyen MarketPay Payout'

    adyen_account_id = fields.Many2one('adyen.account')
    name = fields.Char('Name', default='Default', required=True)
    code = fields.Char('Account Code')
    payout_schedule = fields.Selection(string='Schedule', selection=[
        ('DAILY', 'Daily'),
        ('WEEKLY', 'Weekly'),
        ('MONTHLY', 'Monthly'),
        ('HOLD', 'Hold'),
    ], default='HOLD', required=True)
    transaction_ids = fields.One2many('adyen.transaction', 'adyen_account_id', string='Transactions')

    @api.model
    def create(self, values):
        adyen_payout_id = super(AdyenPayout, self).create(values)
        if not adyen_payout_id.env.context.get('update_from_adyen'):
            response = adyen_payout_id.adyen_account_id._adyen_rpc('create_payout', {
                'payoutSchedule': adyen_payout_id.payout_schedule,
                'payoutScheduleReason': 'Manual' if adyen_payout_id.payout_schedule == 'HOLD' else None,
                'accountHolderCode': adyen_payout_id.adyen_account_id.account_holder_code,
            })
            adyen_payout_id.with_context(update_from_adyen=True).write({
                'code': response['accountCode'],
            })
        return adyen_payout_id

    def write(self, vals):
        res = super(AdyenPayout, self).write(vals)
        if not self.env.context.get('update_from_adyen'):
            self.adyen_account_id._adyen_rpc('update_payout', {
                'payoutSchedule': self.payout_schedule,
                'payoutScheduleReason': 'Manual' if self.payout_schedule == 'HOLD' else None,
                'accountCode': self.code,
            })
        return res

    def unlink(self):
        for adyen_payout_id in self:
            adyen_payout_id.adyen_account_id._adyen_rpc('close_payout', {
                'accountCode': adyen_payout_id.code,
            })
        return super(AdyenPayout, self).unlink()

    def _fetch_transactions(self, page=1):
        response = self.adyen_account_id._adyen_rpc('get_transactions', {
            'accountHolderCode': self.adyen_account_id.account_holder_code,
            'transactionListsPerAccount': [{
                'accountCode': self.code,
                'page': page,
            }]
        })
        transaction_list = response['accountTransactionLists'][0]
        return transaction_list['transactions'], transaction_list['hasNextPage']


class AdyenTransaction(models.Model):
    _name = 'adyen.transaction'
    _description = 'Adyen MarketPay Transaction'

    adyen_account_id = fields.Many2one('adyen.account')
    reference = fields.Char('Reference')
    amount = fields.Float('Amount')
    currency_id = fields.Many2one('res.currency', string='Currency')
    date = fields.Datetime('Date')
    description = fields.Char('Description')
    status = fields.Selection(string='Status', selection=[
        ('PendingCredit', 'Pending Credit'),
        ('CreditFailed', 'Credit Failed'),
        ('Credited', 'Credited'),
        ('Converted', 'Converted'),
        ('PendingDebit', 'Pending Debit'),
        ('DebitFailed', 'Debit Failed'),
        ('Debited', 'Debited'),
        ('DebitReversedReceived', 'Debit Reversed Received'),
        ('DebitedReversed', 'Debit Reversed'),
        ('ChargebackReceived', 'Chargeback Received'),
        ('Chargeback', 'Chargeback'),
        ('ChargebackReversedReceived', 'Chargeback Reversed Received'),
        ('ChargebackReversed', 'Chargeback Reversed'),
        ('Payout', 'Payout'),
        ('PayoutReversed', 'Payout Reversed'),
        ('FundTransfer', 'Fund Transfer'),
        ('PendingFundTransfer', 'Pending Fund Transfer'),
        ('ManualCorrected', 'Manual Corrected'),
    ])
    payout_id = fields.Many2one('adyen.payout')

    @api.model
    def sync_adyen_transactions(self):
        ''' Method called by cron to sync transactions from Adyen.
            Updates the status of pending transactions and create missing ones.
        '''
        for payout_id in self.env['adyen.payout'].search([]):
            page = 1
            has_next_page = True
            new_transactions = True
            pending_statuses = ['PendingCredit', 'PendingDebit', 'DebitReversedReceived', 'ChargebackReceived', 'ChargebackReversedReceived', 'PendingFundTransfer']
            pending_transaction_ids = payout_id.transaction_ids.filtered(lambda tr: tr.status in pending_statuses)

            while has_next_page and (new_transactions or pending_transaction_ids):
                # Fetch next transaction page
                transactions, has_next_page = payout_id._fetch_transactions(page)
                for transaction in transactions:
                    transaction_id = payout_id.transaction_ids.filtered(lambda tr: tr.reference == transaction['paymentPspReference'])
                    if transaction_id:
                        new_transactions = False
                        if transaction_id in pending_transaction_ids:
                            # Update transaction status
                            transaction_id.sudo().write({
                                'status': transaction['transactionStatus'],
                            })
                            pending_transaction_ids -= transaction_id
                    else:
                        # New transaction
                        self.env['adyen.transaction'].sudo().create({
                            'adyen_account_id': payout_id.adyen_account_id.id,
                            'reference': transaction['paymentPspReference'],
                            'amount': transaction['amount']['value'] / 100,
                            'currency_id': self.env['res.currency'].search([('name', '=', transaction['amount']['currency'])]).id,
                            'date': datetime.strptime(transaction['creationDate'], '%Y-%m-%dT%H:%M:%S%z').astimezone(UTC).strftime(DEFAULT_SERVER_DATETIME_FORMAT),
                            'description': transaction['description'],
                            'status': transaction['transactionStatus'],
                            'payout_id': payout_id.id,
                        })
                page += 1
