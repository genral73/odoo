# -*- coding: utf-8 -*-
# Part of Odoo. See LICENSE file for full copyright and licensing details.

from odoo import http, _
from odoo.http import request
from odoo.exceptions import AccessError

from odoo.addons.website_slides.controllers.main import WebsiteSlides


class WebsiteSlidesSurvey(WebsiteSlides):
    @http.route(['/slides_survey/certification/fetch_certification_info'], type='json', auth='user', methods=['POST'], website=True)
    def slides_fetch_certification_info(self, fields):
        can_create = request.env['survey.survey'].check_access_rights('create', raise_exception=False)
        return {
            'read_results': request.env['survey.survey'].search_read([('certification', '=', True)], fields),
            'can_create': can_create,
        }

    # -----------------------------
    #          Overrides
    # -----------------------------

    @http.route(['/slides/add_slide'], type='json', auth='user', methods=['POST'], website=True)
    def create_slide(self, *args, **post):
        Survey = request.env['survey.survey']
        create_new_survey = post['slide_type'] == "certification" and post.get('survey') and not post['survey']['id']

        if create_new_survey:
            # If user cannot create a new survey, no need to create the slide either.
            if not Survey.check_access_rights('create', raise_exception=False):
                return {'error': _('You are not allowed to create a survey.')}

            # Create survey first as certification slide needs a survey_id (constraint)
            post['survey_id'] = Survey.create({
                'title': post['survey']['title'],
                'background_image': post['image_1920'],
                'questions_layout': 'page_per_question',
                'is_attempts_limited': True,
                'attempts_limit': 1,
                'is_time_limited': False,
                'scoring_type': 'scoring_without_answers',
                'certification': True,
                'scoring_success_min': 70.0,
                'certification_mail_template_id': request.env.ref('survey.mail_template_certification').id,
            }).id
        elif post.get('survey', {}).get('id'):
            post['survey_id'] = post['survey']['id']

        # Then create the slide
        result = super(WebsiteSlidesSurvey, self).create_slide(*args, **post)

        if create_new_survey:
            # Set the redirect_url used in toaster
            action_id = request.env.ref('survey.action_survey_form').id
            result.update({
                'redirect_url': '/web#id=%s&action=%s&model=survey.survey&view_type=form' % (post['survey_id'], action_id),
                'is_new_survey': True
            })

        return result

    def _get_valid_slide_post_values(self):
        return super(WebsiteSlidesSurvey, self)._get_valid_slide_post_values() + ['survey_id']
