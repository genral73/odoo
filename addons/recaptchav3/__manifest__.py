# -*- coding: utf-8 -*-
# Part of Odoo. See LICENSE file for full copyright and licensing details.

{
    'name': 'reCaptchaV3',
    'category': 'Hidden',
    'summary': 'reCaptchaV3 integration',
    'version': '1.0',
    'description': """
        This module implements reCaptchaV3 so that you can prevent bot spam on your website.
    """,
    'depends': ['base_setup'],
    'data': [
        'views/assets.xml',
        'views/res_config_settings_view.xml',
    ],
    'installable': True,
}
