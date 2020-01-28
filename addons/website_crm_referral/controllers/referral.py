from odoo import http, tools, SUPERUSER_ID
from odoo.http import request
from ast import literal_eval
import uuid
from odoo.addons.website_sale_referral.controllers.referral import Referral


class CrmReferral(Referral):

    @http.route(['/referral/send'], type='json', auth='public', method='POST')
    def referral_send(self, **post):
        r = super(CrmReferral, self).referral_send(**post)
        if(post.get('channel') == 'direct' and post.get('name') and post.get('email')):
            lead_type = 'lead' if request.env['res.users'].with_user(SUPERUSER_ID).has_group('crm.group_use_lead') else 'opportunity'

            request.env['crm.lead'].sudo().create({
                'name': 'Referral for ' + post.get('name'),
                'type': lead_type,
                'contact_name': post.get('name'),
                'partner_name': post.get('company'),
                'phone': post.get('phone'),
                'email_from': post.get('email'),
                'user_id': literal_eval(request.env['ir.config_parameter'].sudo().get_param('website_sale_referral.salesperson') or 'None'),
                'team_id': literal_eval(request.env['ir.config_parameter'].sudo().get_param('website_sale_referral.salesteam') or 'None'),
                'tag_ids': [(6, 0, literal_eval(request.env['ir.config_parameter'].sudo().get_param('website_sale_referral.lead_tag_ids') or '[]'))],
                'description': post.get('comment'),
                'source_id': self.referral_tracking.utm_source_id.id,  # TODO
                'campaign_id': request.env.ref('website_sale_referral.utm_campaign_referral').id,
                'medium_id': request.env.ref('utm.utm_medium_direct').id
            })

        return r

    # OVERRIDE
    def _get_referral_status(self, utm_source_id):
        if not request.env['res.users'].with_user(SUPERUSER_ID).has_group('website_crm_referral.group_lead_referral'):
            leads = request.env['crm.lead'].sudo().get_referral_statuses(utm_source_id)
            result = request.env['sale.order'].sudo().get_referral_statuses(utm_source_id)
            for k, _ in leads.items():
                if(k not in result):
                    result[k] = 'new'
        return result

        return request.env['crm.lead'].sudo().get_referral_statuses(utm_source_id)
