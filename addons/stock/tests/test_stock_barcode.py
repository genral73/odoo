# -*- coding: utf-8 -*-
from odoo.tests import common


class TestBarcodeNomenclature(common.TransactionCase):

    def test_gs1_extanded_barcode_1(self):
        barcode_nomenclature = self.env['barcode.nomenclature'].browse(self.ref('barcodes.default_barcode_nomenclature'))
        # (01)94019097685457(10)33650100138(3102)002004(15)131018
        code128 = "01940190976854571033650100138\x1D310200200415131018"
        results = barcode_nomenclature.gs1_decompose_extanded(code128)
        self.assertEqual(len(results), 4)
        # (01)94019097685457(13)170119(30)17
        code128 = "0194019097685457131701193017"
        results = barcode_nomenclature.gs1_decompose_extanded(code128)
        self.assertEqual(len(results), 3)
        # TODO: To continued
