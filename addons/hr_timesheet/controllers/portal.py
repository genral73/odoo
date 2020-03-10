# -*- coding: utf-8 -*-
# Part of Odoo. See LICENSE file for full copyright and licensing details.

from collections import OrderedDict
from dateutil.relativedelta import relativedelta
from operator import itemgetter

from odoo import fields, http, _
from odoo.http import request
from odoo.tools import date_utils, groupby as groupbyelem
from odoo.osv.expression import AND, OR

from odoo.addons.portal.controllers.portal import CustomerPortal, pager as portal_pager


class TimesheetCustomerPortal(CustomerPortal):

    def _prepare_portal_layout_values(self):
        values = super(TimesheetCustomerPortal, self)._prepare_portal_layout_values()
        domain = request.env['account.analytic.line']._timesheet_get_portal_domain()
        values['timesheet_count'] = request.env['account.analytic.line'].sudo().search_count(domain)
        return values

    @http.route(['/my/timesheets', '/my/timesheets/page/<int:page>'], type='http', auth="user", website=True)
    def portal_my_timesheets(self, page=1, sortby=None, filterby=None, search=None, search_in='all', groupby='project', **kw):
        Timesheet_sudo = request.env['account.analytic.line'].sudo()
        values = self._prepare_portal_layout_values()
        domain = request.env['account.analytic.line']._timesheet_get_portal_domain()

        searchbar_sortings = {
            'date': {'label': _('Newest'), 'order': 'date desc'},
            'name': {'label': _('Name'), 'order': 'name'},
        }

        searchbar_inputs = {
            'all': {'input': 'all', 'label': _('Search in All')},
            'project': {'input': 'project', 'label': _('Search in Project')},
            'name': {'input': 'name', 'label': _('Search in Name')},
            'employee': {'input': 'employee', 'label': _('Search in Employee')},
            'task': {'input': 'task', 'label': _('Search in Task')},
        }

        searchbar_groupby = {
            'none': {'input': 'none', 'label': _('None')},
            'project': {'input': 'project', 'label': _('Project')},
            'task': {'input': 'task', 'label': _('Task')},
            'date': {'input': 'date', 'label': _('Date')},
            'employee': {'input': 'employee', 'label': _('Employee')},
        }

        today = fields.Date.today()
        quarter_start, quarter_end = date_utils.get_quarter(today)
        last_week = today + relativedelta(weeks=-1)
        last_month = today + relativedelta(months=-1)
        last_year = today + relativedelta(years=-1)

        searchbar_filters = {
            'all': {'label': _('All'), 'domain': []},
            'today': {'label': _('Today'), 'domain': [("date", "=", today)]},
            'week': {'label': _('This week'), 'domain': [('date', '>=', date_utils.start_of(today, "week")), ('date', '<=', date_utils.end_of(today, 'week'))]},
            'month': {'label': _('This month'), 'domain': [('date', '>=', date_utils.start_of(today, 'month')), ('date', '<=', date_utils.end_of(today, 'month'))]},
            'year': {'label': _('This year'), 'domain': [('date', '>=', date_utils.start_of(today, 'year')), ('date', '<=', date_utils.end_of(today, 'year'))]},
            'quarter': {'label': _('This Quarter'), 'domain': [('date', '>=', quarter_start), ('date', '<=', quarter_end)]},
            'last_week': {'label': _('Last week'), 'domain': [('date', '>=', date_utils.start_of(last_week, "week")), ('date', '<=', date_utils.end_of(last_week, 'week'))]},
            'last_month': {'label': _('Last month'), 'domain': [('date', '>=', date_utils.start_of(last_month, 'month')), ('date', '<=', date_utils.end_of(last_month, 'month'))]},
            'last_year': {'label': _('Last year'), 'domain': [('date', '>=', date_utils.start_of(last_year, 'year')), ('date', '<=', date_utils.end_of(last_year, 'year'))]},
        }
        # default sort by value
        if not sortby:
            sortby = 'date'
        order = searchbar_sortings[sortby]['order']
        # default filter by value
        if not filterby:
            filterby = 'all'
        domain = AND([domain, searchbar_filters[filterby]['domain']])

        if search and search_in:
            search_domain = []
            if search_in in ('project', 'all'):
                search_domain = OR([search_domain, [('project_id', 'ilike', search)]])
            if search_in in ('name', 'all'):
                search_domain = OR([search_domain, [('name', 'ilike', search)]])
            if search_in in ('employee', 'all'):
                search_domain = OR([search_domain, [('employee_id', 'ilike', search)]])
            if search_in in ('task', 'all'):
                search_domain = OR([search_domain, [('task_id', 'ilike', search)]])
            domain += search_domain

        timesheet_count = Timesheet_sudo.search_count(domain)
        # pager
        pager = portal_pager(
            url="/my/timesheets",
            url_args={'sortby': sortby, 'search_in': search_in, 'search': search, 'filterby': filterby, 'groupby': groupby},
            total=timesheet_count,
            page=page,
            step=self._items_per_page
        )

        if groupby == 'project':
            order = "project_id, %s" % order
        elif groupby == 'task':
            order = "task_id, %s" % order
        elif groupby == 'date':
            order = "date, %s" % order
        elif groupby == 'employee':
            order = "employee_id, %s" % order
        timesheets = Timesheet_sudo.search(domain, order=order, limit=self._items_per_page, offset=pager['offset'])
        if groupby == 'project':
            grouped_timesheets = [(
                Timesheet_sudo.concat(*g),
                sum(Timesheet_sudo.search(AND([domain, [('project_id', '=', k.id)]])).mapped('unit_amount')))
                for k, g in groupbyelem(timesheets, itemgetter('project_id'))]
        elif groupby == 'task':
            grouped_timesheets = [(
                Timesheet_sudo.concat(*g),
                sum(Timesheet_sudo.search(AND([domain, [('task_id', '=', k.id)]])).mapped('unit_amount')))
                for k, g in groupbyelem(timesheets, itemgetter('task_id'))]
        elif groupby == 'date':
            grouped_timesheets = [(
                Timesheet_sudo.concat(*g),
                sum(Timesheet_sudo.search(AND([domain, [('date', '=', k)]])).mapped('unit_amount')))
                for k, g in groupbyelem(timesheets, itemgetter('date'))]
        elif groupby == 'employee':
            grouped_timesheets = [(
                Timesheet_sudo.concat(*g),
                sum(Timesheet_sudo.search(AND([domain, [('employee_id', '=', k.id)]])).mapped('unit_amount')))
                for k, g in groupbyelem(timesheets, itemgetter('employee_id'))]
        else:
            grouped_timesheets = [(
                timesheets,
                sum(Timesheet_sudo.search(domain).mapped('unit_amount'))
            )]

        values.update({
            'timesheets': timesheets,
            'grouped_timesheets': grouped_timesheets,
            'page_name': 'timesheet',
            'default_url': '/my/timesheets',
            'pager': pager,
            'searchbar_sortings': searchbar_sortings,
            'search_in': search_in,
            'search': search,
            'sortby': sortby,
            'groupby': groupby,
            'searchbar_inputs': searchbar_inputs,
            'searchbar_groupby': searchbar_groupby,
            'searchbar_filters': OrderedDict(sorted(searchbar_filters.items())),
            'filterby': filterby,
        })
        return request.render("hr_timesheet.portal_my_timesheets", values)
