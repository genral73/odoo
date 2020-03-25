# -*- coding: utf-8 -*-
# Part of Odoo. See LICENSE file for full copyright and licensing details.

{
    'name': 'Adyen MarketPay',
    'version': '1.0',
    'category': '',
    'summary': 'Base Module for Adyen MarketPay',
    'description': 'Base Module for Adyen MarketPay, used in eCommerce and PoS',
    'depends': ['web'],
    'data': [
        'data/adyen_marketpay_data.xml',
        'views/adyen_marketpay_templates.xml',
        'views/adyen_marketpay_views.xml',
        'views/assets.xml',
        'security/ir.model.access.csv',
    ],
    'qweb': [
        "static/src/xml/adyen_marketpay_fields.xml",
        "static/src/xml/adyen_marketpay_transactions_views.xml",
    ],
    'installable': True,
    'license': 'OEEL-1',
}
