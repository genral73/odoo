# -*- coding: utf-8 -*-
{
    'name': "mail_bot_hr",
    'summary': """Add OdooBot state and notifications in user form.""",
    'description': "",
    'website': "https://www.odoo.com/page/discuss",
    'category': 'Productivity/Discuss',
    'version': '1.0',
    'depends': ['base', 'mail'],
    'application': False,
    'installable': True,
    'auto_install': False,
    'data': [
        'views/assets.xml',
        'views/res_users_views.xml',
    ],
    'demo': [
        'demo/demo.xml',
    ],
    'qweb': [
        'views/templates.xml',
    ],
}
