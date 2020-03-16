odoo.define('barcodes.barcode_parser', function (require) {
"use strict";

var BarcodeParser = require('barcodes.BarcodeParser');
var testUtils = require('web.test_utils');
var Widget = require('web.Widget');


QUnit.module('Barcodes', {}, function () {
QUnit.module('Barcode Parser', {
    beforeEach: function () {
        this.data = {
            'barcode.nomenclature': {
                fields: {
                    name: {type: 'char', string:'Barcode Nomenclature'},
                    rule_ids: {type: 'one2many', relation: 'barcode.rule'},
                    upc_ean_conv: {type: 'selection', string:'UPC/EAN Conversion'},
                },
                records: [
                    {id: 1, name: "normal", upc_ean_conv: "always"},
                ],
            },
            'barcode.rule': { 
                fields: {
                    name: {type: 'char', string: 'Barcode Nomenclature'},
                    barcode_nomenclature_id: {type: 'many2one', relation: 'barcode.nomenclature'},
                    sequence: {type: 'integer', string: 'Sequence'},
                    encoding: {type: 'selection', string: 'Encoding'},
                    type: {type: 'selection', string: 'Type'},
                    pattern: {type: 'Char', string: 'Pattern'},
                    alias: {type: 'Char', string: 'Alias'},
                },
                records: [
                    {id: 1, name: "Product Barcodes", barcode_nomenclature_id: 1, sequence: 90, type: 'product', encoding: 'any', pattern:".*"},
                ],
            }
        };
    }
}, function () {
    QUnit.test('Test check digit', async function (assert) {
        assert.expect(2);
        var TestWid = Widget.extend({
            init: function () {
                this._super.apply(this, arguments);
            },
            loadParser: function() {
                this.parser = new BarcodeParser({'nomenclature_id': 1});
            }
        });
        var parent = new TestWid();
        
        testUtils.mock.addMockEnvironment(parent, {data: this.data});
        parent.loadParser();

        // var barcodeNomenclature = new BarcodeParser({'nomenclature_id': 1});

        var ean8 = "87111125";
        assert.equal(parent.parser.get_barcode_check_digit("0".repeat(10) + ean8), ean8.charAt(ean8.length - 1));
        var ean13 = "1234567891231";
        assert.equal(parent.parser.get_barcode_check_digit("0".repeat(5) + ean13), ean13.charAt(ean13.length - 1));
    });
});
});
});
