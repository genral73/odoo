# -*- coding: utf-8 -*-
# Part of Odoo. See LICENSE file for full copyright and licensing details.

{
    'name': 'Event CRM',
    'version': '1.0',
    'category': 'Marketing/Events',
    'website': 'https://www.odoo.com/page/events',
    'description': "Create leads from event registrations.",
    'depends': ['event', 'crm'],
    'data': [
        'security/event_crm_security.xml',
        'security/ir.model.access.csv',
        'views/event_views.xml',
        'views/crm_lead_views.xml',
        'views/event_lead_views.xml',
    ],
    'installable': True,
    'auto_install': True,
}
