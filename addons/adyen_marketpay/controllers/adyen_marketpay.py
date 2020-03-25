# -*- coding: utf-8 -*-
# Part of Odoo. See LICENSE file for full copyright and licensing details.

from odoo import http
from odoo.http import request


class AdyenMarketpayController(http.Controller):

    @http.route('/adyen_marketpay/create_account', type='http', auth='user', website=True)
    def adyen_marketpay_create_account(self, creation_token):
        request.session['adyen_creation_token'] = creation_token
        return request.redirect('/web?#action=adyen_marketpay.adyen_account_action_create')
