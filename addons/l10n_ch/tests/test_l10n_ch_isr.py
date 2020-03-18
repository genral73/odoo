# -*- coding: utf-8 -*-
# Part of Odoo. See LICENSE file for full copyright and licensing details.

import time

import odoo
from odoo import api
from odoo.addons.account.tests.common import AccountTestInvoicingCommon
from odoo.exceptions import ValidationError
from odoo.tests import tagged, Form


@tagged('post_install', '-at_install')
class ISRTest(AccountTestInvoicingCommon):

    @classmethod
    def setUpClass(cls):
        super(ISRTest, cls).setUpClass()
        cls.env.company.write({
            'chart_template_id': cls.env.ref('l10n_ch.l10nch_chart_template').id
        })
        cls.company_data = cls.setup_company_data('company_Ch_data', country_id=cls.env.ref('base.ch').id)
        cls.company = cls.company_data['company']

        # ==== Partner ====
        cls.partner_a = cls.env['res.partner'].create({
            'name': 'Partner A'
        })
        # ==== Products ====
        cls.product_a = cls.env['product.product'].create({
            'name': 'product_a',
        })
        cls.product_b = cls.env['product.product'].create({
            'name': 'product_b',
        })

    def create_account(self, number):
        """ Generates a test res.partner.bank. """
        partner_form = Form(self.env['res.partner.bank'])
        partner_form.acc_number = number
        partner_form.partner_id = self.partner_a
        return partner_form.save()

    def print_isr(self, invoice):
        try:
            invoice.isr_print()
            return True
        except ValidationError:
            return False

    def isr_not_generated(self, invoice):
        """ Prints the given invoice and tests that no ISR generation is triggered. """
        self.assertFalse(self.print_isr(invoice), 'No ISR should be generated for this invoice')

    def isr_generated(self, invoice):
        """ Prints the given invoice and tests that an ISR generation is triggered. """
        self.assertTrue(self.print_isr(invoice), 'An ISR should have been generated')

    def test_l10n_ch_postals(self):
        #An account whose number is set to a valid postal number becomes a 'postal'
        #account and sets its postal reference field.
        account_test_postal_ok = self.create_account('010391391')
        self.assertEqual(account_test_postal_ok.acc_type, 'postal', "A valid postal number in acc_number should set its type to 'postal'")
        self.assertEqual(account_test_postal_ok.l10n_ch_postal, '010391391', "A postal account should have a postal reference identical to its account number")

        #An account whose number is set to a non-postal value should not get the
        #'postal' type
        account_test_postal_wrong = self.create_account('010391394')
        self.assertNotEqual(account_test_postal_wrong.acc_type, 'postal', "A non-postal account cannot be of type 'postal'")

        #A swiss IBAN account contains a postal reference
        account_test_iban_ok = self.create_account('CH6309000000250097798')
        self.assertEqual(account_test_iban_ok.acc_type, 'iban', "The IBAN must be valid")
        self.assertEqual(account_test_iban_ok.l10n_ch_postal, '000250097798', "A valid swiss IBAN should set the postal reference")

        #A non-swiss IBAN must not allow the computation of a postal reference
        account_test_iban_wrong = self.create_account('GR1601101250000000012300695')
        self.assertEqual(account_test_iban_wrong.acc_type, 'iban', "The IBAN must be valid")
        self.assertFalse(account_test_iban_wrong.l10n_ch_postal, "A valid swiss IBAN should set the postal reference")

    def test_isr(self):
        #Let us test the generation of an ISR for an invoice, first by showing an
        #ISR report is only generated when Odoo has all the data it needs.
        invoice_1 = self.init_invoice('out_invoice')
        invoice_1.write({
            'currency_id': self.env.ref('base.CHF').id,
            'invoice_date': time.strftime('%Y') + '-12-22',
        })
        self.isr_not_generated(invoice_1)

        #Now we add an account for payment to our invoice, but still cannot generate the ISR
        test_account = self.create_account('250097798')
        invoice_1.invoice_partner_bank_id = test_account
        self.isr_not_generated(invoice_1)
        invoice_1.invoice_partner_bank_id.write({
            'l10n_ch_postal': '010391391',
            'l10n_ch_isr_subscription_chf': 'CHF'
        })

        #Finally, we add bank coordinates to our account. The ISR should now be available to generate
        test_bank = self.env['res.bank'].create({
                'name':'Money Drop',
        })

        test_account.bank_id = test_bank
        self.isr_generated(invoice_1)

        #Now, let us show that, with the same data, an invoice in euros does not generate any ISR (because the bank does not have any EUR postal reference)
        invoice_2 = self.init_invoice('out_invoice')
        invoice_2.write({
            'currency_id': self.env.ref('base.EUR').id,
            'invoice_date': time.strftime('%Y') + '-12-22',
        })
        invoice_2.partner_bank_id = test_account
        self.isr_not_generated(invoice_2)
