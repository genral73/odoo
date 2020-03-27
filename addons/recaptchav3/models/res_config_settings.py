# -*- coding: utf-8 -*-
# Part of Odoo. See LICENSE file for full copyright and licensing details.
import requests

from odoo import _, api, fields, models


class ResConfigSettings(models.TransientModel):
    _inherit = 'res.config.settings'

    recaptcha_public_key = fields.Char("Public Key", config_parameter='recaptcha_public_key', groups='base.group_system')
    recaptcha_private_key = fields.Char("Private Key", config_parameter='recaptcha_private_key', groups='base.group_system')
    recaptcha_min_score = fields.Float("Minimum score", config_parameter='recaptcha_min_score', groups='base.group_system', default="0.5", help="Should be between 0.0 and 1.0")
    is_recaptcha_keys_set = fields.Boolean("reCaptcha has api keys")

    def get_values(self):
        res = super().get_values()
        params = self.env['ir.config_parameter']
        api_keys = params.get_param('recaptcha_public_key', False) and params.get_param('recaptcha_private_key', False)
        res.update(is_recaptcha_keys_set=bool(api_keys))
        return res

    def confirm_setup_recaptcha(self):
        params = self.env['ir.config_parameter']
        recaptcha_public_key_before = params.get_param('recaptcha_public_key')
        recaptcha_private_key_before = params.get_param('recaptcha_private_key')

        errors = []
        if self.recaptcha_public_key != recaptcha_public_key_before:
            r = requests.get('https://www.google.com/recaptcha/api.js?render=%s' % self.recaptcha_public_key)
            if "push('%s')" % self.recaptcha_public_key not in r.text:
                errors.append("Your public key is not recognised by Google")

        if self.recaptcha_private_key != recaptcha_private_key_before:
            r = requests.post('https://www.recaptcha.net/recaptcha/api/siteverify', {
                'secret': self.recaptcha_private_key,
            }, timeout=2)
            result = r.json()
            if 'invalid-input-secret' in result['error-codes']:
                errors.append("Your private key is not recognised by Google")

        if self.recaptcha_min_score < 0 or self.recaptcha_min_score > 1:
            errors.append("The minimum score should be between 0 and 1")

        if len(errors):
            message = '\n'.join(errors)
            raise self.env['res.config.settings'].get_config_warning(message)
        else:
            params.set_param('recaptcha_public_key', self.recaptcha_public_key)
            params.set_param('recaptcha_private_key', self.recaptcha_private_key)
            params.set_param('recaptcha_min_score', self.recaptcha_min_score)

    def action_setup_recaptcha(self):
        self.ensure_one()
        template = self.env.ref('recaptchav3.recaptcha_api_key_wizard')
        return {
            'name': _('Set up api keys'),
            'type': 'ir.actions.act_window',
            'res_model': 'res.config.settings',
            'views': [(template.id, 'form')],
            'target': 'new',
        }
