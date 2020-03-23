from odoo.tests.common import SingleTransactionCase
from odoo.tests import tagged


@tagged('-standard', '-at_install', 'post_install', 'l10nall')
class Test1Cleanup(SingleTransactionCase):

    def test_create_custom_model(self):
        self.env['ir.model'].create({
            'model': 'x_test.cleanup',
            'name': 'Test Cleanup',
            'field_id': [(0, 0, {
                'name': 'x_name',
                'field_description': 'Name',
                'state': 'manual',
                'ttype': 'char',
                })],
            })
