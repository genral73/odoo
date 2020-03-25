# -*- coding: utf-8 -*-
# Part of Odoo. See LICENSE file for full copyright and licensing details.
{
    'name': 'POS Adyen',
    'version': '1.0',
    'category': 'Sales/Point of Sale',
    'sequence': 6,
    'summary': 'Integrate your POS with an Adyen payment terminal',
    'description': '',
    'data': [
        'data/pos_adyen_data.xml',
        'security/ir.model.access.csv',
        'views/adyen_marketpay_views.xml',
        'views/pos_config_views.xml',
        'views/pos_payment_method_views.xml',
        'views/point_of_sale_assets.xml',
        'views/res_config_settings_views.xml',
    ],
    'depends': ['adyen_marketpay', 'point_of_sale'],
    'qweb': ['static/src/xml/pos.xml'],
    'installable': True,
    'license': 'OEEL-1',
}
