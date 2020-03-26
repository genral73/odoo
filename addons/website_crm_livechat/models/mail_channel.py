# -*- coding: utf-8 -*-
# Part of Odoo. See LICENSE file for full copyright and licensing details.

from odoo import models
from urllib import parse


class MailChannel(models.Model):
    _inherit = 'mail.channel'

    def _convert_visitor_to_lead(self, partner, channel_partners, key):
        """ When website is installed, we can link the created lead from /lead command
         to the current website_visitor. We do not use the lead name as it does not correspond
         to the lead contact name."""
        lead = super(MailChannel, self)._convert_visitor_to_lead(partner, channel_partners, key)
        visitor_sudo = self.livechat_visitor_id.sudo()
        if visitor_sudo:
            visitor_sudo.write({'lead_ids': [(4, lead.id)]})
            utm_page_view = self.env['website.track'].search([
                '&', ('visitor_id', '=', visitor_sudo.id),
                '|', '|',
                ('url', 'like', '%%utm_campaign%%'),
                ('url', 'like', '%%utm_source%%'),
                ('url', 'like', '%%utm_medium%%')
            ], limit=1, order='visit_datetime')
            utm_data = dict(parse.parse_qsl(parse.urlsplit(utm_page_view.url).query)) if utm_page_view else False
            if utm_data:
                campaign_id = self.env['utm.campaign'].search([('name', '=', utm_data.get('utm_campaign'))])
                source_id = self.env['utm.source'].search([('name', '=', utm_data.get('utm_source'))])
                medium_id = self.env['utm.medium'].search([('name', '=', utm_data.get('utm_medium'))])
                lead.write({
                    'campaign_id': campaign_id.id or lead.campaign_id.id,
                    'medium_id': medium_id.id or lead.medium_id.id,
                    'source_id': source_id.id or lead.source_id.id
                })
        return lead
