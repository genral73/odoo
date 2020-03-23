# -*- coding: utf-8 -*-
from odoo import api, SUPERUSER_ID
from odoo.tests.common import SingleTransactionCase
from odoo.tests import tagged


@tagged('-standard', '-at_install', 'post_install', 'l10nall')
class Test1Cleanup(SingleTransactionCase):

    def test1(self):
        model_test = self.env['ir.model'].create({
            'model': 'x_test.cleanup',
            'name': 'Test Cleanup',
            'field_id': [(0, 0, {
                'name': 'x_name',
                'field_description': 'Name',
                'state': 'manual',
                'ttype': 'char',
                })],
            })
        print("MODEL CREATED(fields)", model_test.mapped('field_id.name'))
        self.env['ir.model.fields'].create({
            'name': 'x_name1',
            'model_id': model_test.id,
            'field_description': 'Name1',
            'state': 'manual',
            'ttype': 'char',
        })
        print("NEW FIELD ADDED.......", model_test.mapped('field_id.name'))

    def test2(self):
        print(self.env['x_test.cleanup'].read([]))
