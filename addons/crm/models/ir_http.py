import base64
from odoo import models
from odoo.http import request
import odoo.http
from werkzeug import exceptions
from hashlib import sha256
import json
import hmac
import time

class IrHttp(models.AbstractModel):
    _inherit = 'ir.http'

    @classmethod
    def _auth_method_crmaddon(cls):
        if request.httprequest.method == "OPTIONS":
            return True

########################
        #raise exceptions.BadRequest("invalid token")
        #raise odoo.http.SessionExpiredException("Invalid token")
        #raise exceptions.Unauthorized('Invalid token')
###########################
        token = dict(request.httprequest.headers).get('Authorization')
        b64_encoded_header, b64_encoded_payload, b64_encoded_signature = token.split('.')

        # Check signature.
        database_secret = request.env['ir.config_parameter'].sudo().get_param('database.secret')
        signature = hmac.new(('%s.%s' % (b64_encoded_header, b64_encoded_payload)).encode(), database_secret.encode(), sha256).hexdigest()
        signature_provided = base64.b64decode(b64_encoded_signature).decode() # decode b64, then decode the resulting binary string
        if not hmac.compare_digest(signature, signature_provided):
            raise odoo.exceptions.AccessError("Invalid token")#raise exceptions.Unauthorized('Invalid token')

        payload_string = base64.b64decode(b64_encoded_payload).decode()
        payload_json = json.loads(payload_string)

        user_id = payload_json.get('user_id')
        expiration_time = payload_json.get('time_valid')

        if not user_id or not expiration_time:
            raise exceptions.Unauthorized('Invalid token')

        if int(expiration_time) < time.time():
            raise exceptions.Unauthorized('Expired token')

        user = request.env['res.users'].browse(user_id)
        if not user:
            raise exceptions.Unauthorized('No user found')

        request.env.user = user.id # HOW DID IT WORK FOR QMO WITH request.env.user = user???
        return True