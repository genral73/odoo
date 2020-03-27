# -*- coding: utf-8 -*-
# Part of Odoo. See LICENSE file for full copyright and licensing details.

{
    'name': 'OdooBot',
    'version': '1.0',
    'category': 'Productivity/Discuss',
    'summary': 'Add OdooBot in discussions',
    'description': "",
    'website': 'https://www.odoo.com/page/discuss',
    'depends': ['mail', 'mail_bot_hr'],
    'installable': True,
    'application': False,
    'auto_install': True,
    'data': [
        'views/assets.xml',
        'data/mailbot_data.xml',
    ],
    'qweb': [
        'views/discuss.xml',
    ],
}
