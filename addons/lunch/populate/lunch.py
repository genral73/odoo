# -*- coding: utf-8 -*-
# Part of Odoo. See LICENSE file for full copyright and licensing details.
import logging
from datetime import datetime, timedelta

from odoo import models
from odoo.tools import populate

_logger = logging.getLogger(__name__)


class LunchProductCategory(models.Model):
    _inherit = "lunch.product.category"
    _populate_sizes = {"small": 20, "medium": 150, "large": 400}
    _populate_dependencies = ["res.company"]

    def _populate_factories(self):
        # TODO topping_ids_{1,2,3}, toppping_label_{1,2,3}, topping_quantity{1,2,3}
        company_ids = self.env.registry.populated_models["res.company"]

        return [
            ("name", populate.constant("lunch_product_category_{counter}")),
            ("company_id", populate.randomize(company_ids)),
        ]


class LunchProduct(models.Model):
    _inherit = "lunch.product"
    _populate_sizes = {"small": 10, "medium": 2000, "large": 10000}
    _populate_dependencies = ["lunch.product.category", "lunch.supplier", "lunch.topping"]

    def _populate_factories(self):
        prices = [float(p) for p in range(100)]
        category_ids = self.env.registry.populated_models["lunch.product.category"]
        supplier_ids = self.env.registry.populated_models["lunch.supplier"]

        return [
            ("name", populate.constant("lunch_product_{counter}")),
            ("category_id", populate.randomize(category_ids)),
            ("price", populate.randomize([False] + prices)),
            ("supplier_id", populate.randomize(supplier_ids)),
            ("active", populate.cartesian([True, False], [0.9, 0.1])),
        ]


class LunchLocation(models.Model):
    _inherit = "lunch.location"

    _populate_sizes = {"small": 10, "medium": 50, "large": 500}
    _populate_dependencies = ["res.company"]

    def _populate_factories(self):
        company_ids = self.env.registry.populated_models['res.company']

        return [
            ("name", populate.constant("lunch_location_{counter}")),
            ("address", populate.constant("lunch_address_location_{counter}")),
            ("company_id", populate.randomize(company_ids))
        ]


class LunchSupplier(models.Model):
    _inherit = "lunch.supplier"

    _populate_sizes = {"small": 50, "medium": 300, "large": 1500}
    _populate_dependencies = ["res.partner", "res.users", "lunch.location"]

    def _populate_factories(self):
        # TODO recurrency_end_date, tz

        partner_ids = self.env.registry.populated_models["res.partner"]
        user_ids = self.env.registry.populated_models["res.users"]
        location_ids = self.env.registry.populated_models["lunch.location"]

        def get_email_time(values=None, counter=0, complete=False, random=None, **kwargs):
            return random.uniform(0.0, 12.0)

        def get_location_ids(values=None, counter=0, complete=False, random=None, **kwargs):
            nb_max = len(location_ids)
            start = random.randint(0, nb_max)
            end = random.randint(start, nb_max)
            return location_ids[start:end]

        return [
            ("partner_id", populate.randomize(partner_ids)),
            ("responsible_id", populate.randomize(user_ids)),
            ("send_by", populate.randomize(['phone', 'mail'])),
            ("automatic_email_time", populate.compute(get_email_time)),  # what the hell is that
            ("recurrency_monday", populate.randomize([True, False])),
            ("recurrency_tuesday", populate.randomize([True, False])),
            ("recurrency_wednesday", populate.randomize([True, False])),
            ("recurrency_thursday", populate.randomize([True, False])),
            ("recurrency_friday", populate.randomize([True, False])),
            ("recurrency_saturday", populate.randomize([True, False])),
            ("recurrency_sunday", populate.randomize([True, False])),
            ("available_location_ids", populate.compute(get_location_ids)),
            ("active", populate.randomize([True, False])),
            ("moment", populate.randomize(['am', 'pm'])),
            ("delivery", populate.randomize(['delivery', 'no_delivery']))
        ]


class LunchOrder(models.Model):
    _inherit = "lunch.order"
    _populate_sizes = {"small": 20, "medium": 3000, "large": 15000}
    _populate_dependencies = ["lunch.product", "res.users", "res.company"]

    def _populate_factories(self):
        # TODO topping_ids_{1,2,3}, topping_label_{1,3}, topping_quantity_{1,3}
        user_ids = self.env.registry.populated_models["res.users"]
        product_ids = self.env.registry.populated_models["lunch.product"]
        company_ids = self.env.registry.populated_models["res.company"]

        return [
            ("active", populate.cartesian([True, False])),
            ("state", populate.cartesian(['new', 'confirmed', 'ordered', 'cancelled'])),
            ("product_id", populate.randomize(product_ids)),
            ("user_id", populate.randomize(user_ids)),
            ("note", populate.constant("lunch_note_{counter}")),
            ("company_id", populate.randomize(company_ids)),
            ("quantity", populate.randint(0, 10)),
        ]


class LunchAlert(models.Model):
    _inherit = "lunch.alert"
    _populate_sizes = {"small": 10, "medium": 40, "large": 150}
    _populate_dependencies = ["lunch.location"]

    def _populate_factories(self):

        location_ids = self.env.registry.populated_models["lunch.location"]

        def get_notification_time(values=None, counter=0, complete=False, random=None, **kwargs):
            return random.uniform(0.0, 12.0)

        def get_until_date(values=None, counter=0, complete=False, random=None, **kwargs):
            delta = random.randint(-731, 731)
            return datetime(2020, 1, 1) + timedelta(days=delta)

        def get_location_ids(values=None, counter=0, complete=False, random=None, **kwargs):
            nb_max = len(location_ids)
            start = random.randint(0, nb_max)
            end = random.randint(start, nb_max)
            return location_ids[start:end]

        return [
            ("notification_moment", populate.cartesian(['am', 'pm'])),
            ("active", populate.cartesian([True, False])),
            ("mode", populate.cartesian(['alert', 'chat'])),
            ("recipients", populate.cartesian(['everyone', 'last_week', 'last_month', 'last_year'])),
            ("recurrency_monday", populate.randomize([True, False])),
            ("recurrency_tuesday", populate.randomize([True, False])),
            ("recurrency_wednesday", populate.randomize([True, False])),
            ("recurrency_thursday", populate.randomize([True, False])),
            ("recurrency_friday", populate.randomize([True, False])),
            ("recurrency_saturday", populate.randomize([True, False])),
            ("recurrency_sunday", populate.randomize([True, False])),
            ("available_today", populate.randomize([True, False])),
            ("name", populate.constant("alert_{counter}")),
            ("message", populate.constant("<strong>alert message {counter}</strong>")),
            ("notification_time", populate.compute(get_notification_time)),
            ("until", populate.compute(get_until_date)),
            ("location_ids", populate.compute(get_location_ids))
        ]
