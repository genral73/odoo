from odoo.tests.common import SingleTransactionCase
from odoo.tests import tagged


@tagged('-standard', '-at_install', 'post_install', 'l10nall')
class Test2Cleanup(SingleTransactionCase):

    def test_2_access_custom_model(self):
        self.env['x_test.cleanup']
