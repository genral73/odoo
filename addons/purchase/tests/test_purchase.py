# -*- coding: utf-8 -*-
# Part of Odoo. See LICENSE file for full copyright and licensing details.

from datetime import timedelta

from odoo.tests.common import SavepointCase
from odoo.tests import Form


class TestPurchase(SavepointCase):
    @classmethod
    def setUpClass(cls):
        super(TestPurchase, cls).setUpClass()
        cls.product_consu = cls.env['product.product'].create({
            'name': 'Product A',
            'type': 'consu',
        })
        cls.product_consu2 = cls.env['product.product'].create({
            'name': 'Product B',
            'type': 'consu',
        })
        cls.vendor = cls.env['res.partner'].create({'name': 'vendor1'})
        cls.uom_unit = cls.env.ref('uom.product_uom_unit')

    def test_purchase_order_sequence(self):
        PurchaseOrder = self.env['purchase.order'].with_context(tracking_disable=True)
        company = self.env.user.company_id
        self.env['ir.sequence'].search([
            ('code', '=', 'purchase.order'),
        ]).write({
            'use_date_range': True, 'prefix': 'PO/%(range_year)s/',
        })
        vals = {
            'partner_id': self.vendor.id,
            'company_id': company.id,
            'currency_id': company.currency_id.id,
            'date_order': '2019-01-01',
        }
        purchase_order = PurchaseOrder.create(vals.copy())
        self.assertTrue(purchase_order.name.startswith('PO/2019/'))
        vals['date_order'] = '2020-01-01'
        purchase_order = PurchaseOrder.create(vals.copy())
        self.assertTrue(purchase_order.name.startswith('PO/2020/'))
        # In EU/BXL tz, this is actually already 01/01/2020
        vals['date_order'] = '2019-12-31 23:30:00'
        purchase_order = PurchaseOrder.with_context(tz='Europe/Brussels').create(vals.copy())
        self.assertTrue(purchase_order.name.startswith('PO/2020/'))
