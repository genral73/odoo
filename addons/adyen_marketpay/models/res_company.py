# -*- coding: utf-8 -*-
# Part of Odoo. See LICENSE file for full copyright and licensing details.

import requests
from werkzeug.urls import url_join

from odoo import fields, models, _
from odoo.http import request

class ResCompany(models.Model):
    _inherit = "res.company"

    adyen_account_ids = fields.One2many('adyen.account', 'company_id', string='Adyen Accounts')
    adyen_account_id = fields.Many2one('adyen.account', string='Selected Adyen Account')
