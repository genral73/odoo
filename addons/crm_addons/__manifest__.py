# -*- coding: utf-8 -*-
# Part of Odoo. See LICENSE file for full copyright and licensing details.

{
    'name': 'CRM Add-ons',
    'version': '1.0',
    'category': 'Sales/CRM',
    'sequence': 5,
    'summary': 'Services to connect web add-ons to the CRM',
    'description': "",
    'website': 'https://www.odoo.com/page/crm',
    'depends': [
        'crm',
    ],
    'data': [
        'views/crm_addons_login.xml',
        'views/crm_addons_lead.xml',
    ],
    'installable': True,
    'application': False,
    'auto_install': False
}
