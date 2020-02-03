# -*- coding: utf-8 -*-
# Part of Odoo. See LICENSE file for full copyright and licensing details.
import logging

from addons.iap import InsufficientCreditError
from odoo import http, _,  tools

from odoo.http import request
import json
import base64
import odoo
import werkzeug
import hmac
from hashlib import sha256
import time

_logger = logging.getLogger(__name__)


class CrmAddonsController(http.Controller):

    @staticmethod
    def _authorize(request):
        token = dict(request.httprequest.headers).get('Authorization')
        b64_encoded_header, b64_encoded_payload, b64_encoded_signature = token.split('.')

        # Check signature.
        database_secret = request.env['ir.config_parameter'].sudo().get_param('database.secret')
        signature = hmac.new(database_secret.encode(),
                             ('%s.%s' % (b64_encoded_header, b64_encoded_payload)).encode(),
                             sha256).hexdigest()
        signature_provided = base64.b64decode(
            b64_encoded_signature).decode()  # decode b64, then decode the resulting binary string
        if not hmac.compare_digest(signature, signature_provided):
            return False

        payload_string = base64.b64decode(b64_encoded_payload).decode()
        payload_json = json.loads(payload_string)

        user_id = payload_json.get('user_id')
        expiration_time = payload_json.get('time_valid')

        if not user_id or not expiration_time:
            return False

        if int(expiration_time) < time.time():
            return False

        user = request.env['res.users'].browse(user_id)
        if not user:
            return False

        request.env.user = user.id
        return True

    @http.route('/crm/addons/login', type='http', auth="none")
    def web_login(self, redirect=None, **kw):
        request.params['login_success'] = False

        if not request.uid:
            request.uid = odoo.SUPERUSER_ID

        values = request.params.copy()
        try:
            values['databases'] = http.db_list()
        except odoo.exceptions.AccessDenied:
            values['databases'] = None

        if request.httprequest.method == 'POST':
            try:
                uid = request.session.authenticate(request.session.db, request.params['login'], request.params['password'])
                request.params['login_success'] = True
                code = self._generate_code(uid, int(time.time()) + 30 * 1000)
                redirect = "%s?success=1&response_type=%s&state=%s&code=%s" % (redirect, kw.get('response_type'), kw.get('state'), code)
                return http.redirect_with_hash(redirect)
            except odoo.exceptions.AccessDenied as e:
                if e.args == odoo.exceptions.AccessDenied().args:
                    values['error'] = _("Wrong login/password")
                else:
                    values['error'] = e.args[0]
        else:
            if 'error' in request.params and request.params.get('error') == 'access':
                values['error'] = _('Only employee can access this database. Please contact the administrator.')

        if 'login' not in values and request.session.get('auth_login'):
            values['login'] = request.session.get('auth_login')

        if not odoo.tools.config['list_db']:
            values['disable_database_manager'] = True

        response = request.render('crm_addons.login', values)
        response.headers['X-Frame-Options'] = 'DENY'
        return response

    def _generate_code(self, uid, time_valid):
        secret = request.env['ir.config_parameter'].sudo().get_param('database.secret')
        encoded_payload = ('%s.%s' % (uid, time_valid)).encode()
        signature = hmac.new(secret.encode(), encoded_payload, sha256).hexdigest()

        return '%s.%s.%s' % (uid, time_valid, signature)

    def _check_signature(self, code):
        secret = request.env['ir.config_parameter'].sudo().get_param('database.secret')
        uid, time_valid, signature = code.split('.')
        check_signature = hmac.new(secret.encode(), ('%s.%s' % (uid, time_valid)).encode(), sha256).hexdigest()
        if not hmac.compare_digest(check_signature, signature):
            return False

        if int(time_valid) < time.time():
            return False

        return uid

    @http.route('/crm/addons/token', type='http', csrf=False, auth="none", cors="*")
    def exchange_code_with_token(self, **kw):
        code = request.params['code']

        uid = self._check_signature(code)
        if not uid:
            return json.dumps({
                "error": "Invalid code",
            })

        # GENERATE TOKEN
        header = json.dumps({
            "alg": "SHA256",
            "typ": "JWT"
        })
        # TODO see JWT claims: https://exante.eu/clientsarea/tutorials/jwt/#payload
        payload = json.dumps({
            "user_id": uid,
            'time_valid': time.time() + 2592000 * 1000 # 30 days
        })

        b64_encoded_string = "%s.%s" % (base64.b64encode(header.encode()).decode(), base64.b64encode(payload.encode()).decode())
        secret = request.env['ir.config_parameter'].sudo().get_param('database.secret')
        signature = hmac.new(secret.encode(), b64_encoded_string.encode(), sha256).hexdigest()
        b64_encoded_signature = base64.b64encode(signature.encode()).decode()
        return json.dumps({
            "access_token": b64_encoded_string + "." + b64_encoded_signature,
            "expires_in": 2592000
        })

    def _iap_enrich(self, env, partner):
        normalized_email = tools.email_normalize(partner.email)
        if not normalized_email:
            return {}
        emails = {0: normalized_email.split('@')[1]}

        enriched_data = {}
        enriched_data["enrichment_error"] = {'type': 'none', 'info': ''}
        try:
            response = env['iap.enrich.api'].with_user(env.user)._request_enrich(emails)
            enriched_data = response.get("0")
        except InsufficientCreditError:
            _logger.info('Enrich request: failed because of credit')
            enriched_data['enrichment_error'] = {'type': 'insufficient_credit', 'info': env['iap.account'].with_user(env.user).get_credits_url('reveal')}
        except Exception as e:
            enriched_data["enrichment_error"] = {'type': 'other', 'info': 'Unknown reason'}
        else:
            _logger.info('Enrich request: success')
            if enriched_data == False:
                enriched_data["enrichment_error"] = {'type': 'no_data', 'info': 'The enrichment API found no data for the email provided.'}
        return enriched_data

    def _iap_enrich_partner_from_response(self, env, iap_data, partner):
        enriched = {}
        if not partner.name and iap_data.get("name"): # only valid for companies, but a regular user should already have a name at creation time
            enriched["name"] = iap_data.get("name")
        if not partner.street and iap_data.get("location"):
            enriched["street"] = iap_data.get("location")
        if not partner.city and iap_data.get("city"):
            enriched["city"] = iap_data.get("city")
        if not partner.zip and iap_data.get("postal_code"):
            enriched["zip"] = iap_data.get("postal_code")
        if not partner.phone and iap_data.get('phone_numbers'):
            enriched['phone'] = iap_data['phone_numbers'][0]
        if not partner.website and iap_data.get("domain"):
            enriched['website'] = iap_data['domain']
        country = partner.country_id
        if not partner.country_id and iap_data.get('country_code'):
            country = env['res.country'].search([('code', '=', iap_data['country_code'].upper())])
            enriched['country_id'] = country.id
        if not partner.state_id and country and iap_data.get('state_code'):
            state = env['res.country.state'].search([
                ('code', '=', iap_data['state_code']),
                ('country_id', '=', country.id)
            ])
            enriched['state_id'] = state.id

        # TODO: website
        partner.write(enriched)

    @http.route('/crm/addons/partner/get', type="json", auth="none", csrf=False, cors="*")
    def res_partner_get_by_email(self,  **kwargs):
        if not CrmAddonsController._authorize(request):
            return {'authorized': False}

        email = request.jsonrequest.get("email")
        name = request.jsonrequest.get("name") # Name as stated by the email sender.

        # Search for the partner based on the email.
        partners = request.env['res.partner'].with_user(request.env.user).search([('email', '=', email)])
        partner_created = False

        # Create the partner if needed.
        if not partners:
            partners = request.env['res.partner'].with_user(request.env.user).create({
                'name': name,
                'email': email,
            })
            partner_created = True

        # Even if multiple partner were found, they all share the same mail, so only enrich once for all.
        iap_data = self._iap_enrich(request.env, partners[0])

        response = {
            'authorized': True,
            'created': partner_created,
            'enrichment_error': iap_data.get('enrichment_error'),
            'partners': []
        }
        for partner in partners:
            # Enrich the partner and its parent company.
            enriched_company = {}
            # If the contact is not attached to a company yet, find the right company based on the name or create it.
            if not partner.parent_id and iap_data.get("name"):
                companies = request.env['res.partner'].with_user(request.env.user).search([('name', '=', iap_data['name'])])
                # Create the company if needed.
                if not companies:
                    companies = request.env['res.partner'].with_user(request.env.user).create({
                        'name': name
                    })
                partner.parent_id = companies[0].id
                # Enrich the company of the sender
                self._iap_enrich_partner_from_response(request.env, iap_data, partner.parent_id)

            # Enrich the sender of the email
            self._iap_enrich_partner_from_response(request.env, iap_data, partner)

            # Gather additional information on the company.
            if iap_data.get("employees"):
                enriched_company["employees"] = iap_data.get("employees")
            annual_revenue = iap_data.get("annual_revenue")
            if annual_revenue and annual_revenue > 0:
                enriched_company["annual_revenue"] = annual_revenue
            elif iap_data.get("estimated_annual_revenue"):
                enriched_company["estimated_revenue"] = iap_data.get("estimated_annual_revenue")
            if iap_data.get("company_type"):
                enriched_company["type"] = iap_data.get("company_type")
            if iap_data.get("tag"):
                enriched_company["markets"] = ', '.join(iap_data.get("tag"))

            response['partners'].append({
                'id': partner.id,
                'name': partner.name,
                'address': {
                    'street': partner.street,
                    'city': partner.city,
                    'zip': partner.zip,
                    'country': partner.country_id.name
                },
                'title': partner.function,
                'phone': partner.phone,
                'mobile': partner.mobile,
                'email': partner.email,
                'image': partner.image_128,
                'company': {
                    'id': partner.parent_id.id,
                    'name': partner.parent_name,
                    'website': partner.parent_id.website,
                    'additional_information': enriched_company
                },
                'leads': self._get_leads_for_partner_id(request, partner.id)
            })

        return response

    @http.route('/crm/addons/log_single_mail_content', type="json", auth="none", csrf=False, cors="*")
    def log_single_mail_content(self, **kw):
        if not CrmAddonsController._authorize(request):
            return {'authorized': False}

        partner_ids = request.jsonrequest.get("partner_ids")
        lead_ids = request.jsonrequest.get("lead_ids")
        message = request.jsonrequest.get("message")

        author_id = int(request.env.user)

        partners = request.env['res.partner'].with_user(request.env.user).browse(int(idStr) for idStr in partner_ids)
        leads = request.env['crm.lead'].with_user(request.env.user).browse(int(idStr) for idStr in lead_ids)

        errors = []
        for p in partners:
            try:
                p._message_log(body=message, author_id=author_id)
            except:# Exception as e:
                errors.append({
                    'id': p.id,
                    'name': p.name
                })

        for l in leads:
            try:
                l._message_log(body=message, author_id=author_id)
            except:# Exception as e:
                errors.append({
                    'id': l.id,
                    'name': l.name
                })

        return {
            'authorized': True,
            'success': not len(errors),
            'errors': errors
        }

    def _get_leads_for_partner_id(self, request, id):

        partner_leads = request.env['crm.lead'].with_user(request.env.user).search([('partner_id', '=', id)])
        leads = []
        for lead in partner_leads:
            leads.append({
                'id': lead.id,
                'name': lead.name,
                'expected_revenue': str(lead.expected_revenue),
                'planned_revenue': str(lead.planned_revenue),
                'currency_symbol': lead.company_currency.symbol
            })
        return leads

    @http.route('/crm/addons/lead/get_by_partner_id', type="json", auth="none", csrf=False, cors="*")
    def crm_lead_get_by_partner_id(self, **kwargs):
        if not CrmAddonsController._authorize(request):
            return {'authorized': False}

        partner_id = request.jsonrequest.get("partner_id")
        return {
            'authorized': True,
            'leads': self._get_leads_for_partner_id(request, partner_id)
        }


    @http.route('/crm/addons/lead/create', type="json", auth="none", csrf=False, cors="*")
    def crm_lead_create(self, **kwargs):
        if not CrmAddonsController._authorize(request):
            return {'authorized': False}

        lead_values = request.jsonrequest#.get("lead_values")
        lead = request.env['crm.lead'].with_user(request.env.user).create({
            'name': lead_values['name'],
            'partner_id': int(lead_values['partner_id']),
            'planned_revenue': int(lead_values['expected_revenue']),
            'priority': lead_values['priority']
        })

        return {
            'authorized': True,
            'success': True if lead else False
        }

    #@http.route('/crm/addons/lead/delete', type="json", auth="none", csrf=False, cors="*")
    def _crm_lead_delete(self, **kwargs):
        if not CrmAddonsController._authorize(request):
            return {'authorized': False}

        lead_id = request.jsonrequest.get("id")
        lead = request.env['crm.lead'].with_user(request.env.user).search([('id', '=', lead_id)])
        if not lead:
            return {
                'success': False
            }

        partner_id = lead.partner_id.id
        lead.unlink()

        return {
            'authorized': True,
            'success': True,
            'leads': self._get_leads_for_partner_id(request, partner_id)
        }

    @http.route('/crm/addons/lead/redirect_form_view', type='http', auth='user', methods=['GET'])
    def crm_lead_redirect_form_view(self, partner_id):
        # localhost:8069/crm/lead/redirect_form_view?partner_id=42
        server_action = http.request.env.ref("crm_addons.lead_creation_prefilled_action")
        return werkzeug.utils.redirect('/web?&#action=%s&model=crm.lead&view_type=form&partner_id=%s' % (server_action.id, partner_id))