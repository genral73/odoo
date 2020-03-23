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
        visited_url = self.env['website.track'].search(
                    [('visitor_id', 'in', lead.visitor_ids.ids)]).filtered(lambda x: 'utm_campaign' in x.url).mapped('url')
        if visited_url:
            utm_data = parse.parse_qs(parse.urlsplit(visited_url[0]).query)
            campaign_id = self.env['utm.campaign'].search([('name', '=', utm_data.get('utm_campaign')[0])])
            source_id = self.env['utm.source'].search([('name', '=', utm_data.get('utm_source')[0])])
            medium_id = self.env['utm.medium'].search([('name', '=', utm_data.get('utm_medium')[0])])
            lead.write({
                'campaign_id': campaign_id and campaign_id.id or lead.campaign_id,
                'medium_id': medium_id and medium_id.id or lead.medium_id,
                'source_id': source_id and source_id.id or lead.source_id
            })
        return lead
