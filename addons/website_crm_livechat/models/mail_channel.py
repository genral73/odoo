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
                [('visitor_id', '=', visitor_sudo.id)]).filtered(lambda track: 'utm_campaign' in track.url).mapped('url')
            utm_data = dict(parse.parse_qsl(parse.urlsplit(visited_url[0]).query)) if visited_url else False
            if utm_data:
                campaign_id = self.env['utm.campaign'].search([('name', '=', utm_data.get('utm_campaign'))])
                source_id = self.env['utm.source'].search([('name', '=', utm_data.get('utm_source'))])
                medium_id = self.env['utm.medium'].search([('name', '=', utm_data.get('utm_medium'))])
                lead.write({
                    'campaign_id': campaign_id and campaign_id.id or lead.campaign_id,
                    'medium_id': medium_id and medium_id.id or lead.medium_id,
                    'source_id': source_id and source_id.id or lead.source_id
                })
        return lead
