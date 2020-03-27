# -*- coding: utf-8 -*-
# Part of Odoo. See LICENSE file for full copyright and licensing details.
import logging
import requests

from odoo import api, models
from odoo.http import request

logger = logging.getLogger(__name__)


class Http(models.AbstractModel):
    _inherit = 'ir.http'

    @api.model
    def verify_recaptcha_token(self, ip_addr, token, action=False):
        private_key = request.env['ir.config_parameter'].sudo().get_param('recaptcha_private_key')
        if not private_key:
            return True
        min_score = request.env['ir.config_parameter'].sudo().get_param('recaptcha_min_score')
        try:
            r = requests.post('https://www.recaptcha.net/recaptcha/api/siteverify', {
                'secret': private_key,
                'response': token,
                'remoteip': ip_addr,
            }, timeout=2)  # it takes ~50ms to retrieve the response
        except requests.exceptions.Timeout:
            logger.error("Trial captcha verification timeout for ip address %s", ip_addr)
            return False
        result = r.json()

        if result['success'] is True:
            score = result.get('score', False)
            if score < float(min_score):
                logger.info("Trial captcha verification for ip address %s failed with score %f.", ip_addr, score)
                return False
            if action and result['action'] != action:
                logger.info("Trial captcha verification for ip address %s failed with action %f, expected: %s.", ip_addr, score, action)
                return False
            logger.info("Trial captcha verification for ip address %s succeeded with score %f.", ip_addr, score)
            return True
        logger.error("Trial captcha verification for ip address %s failed error codes %r. token was: [%s]", ip_addr, result.get('error-codes', 'None'), token)
        return False
