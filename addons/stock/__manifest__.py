# -*- coding: utf-8 -*-
# Part of Odoo. See LICENSE file for full copyright and licensing details.

{
    'name': 'Inventory',
    'version': '1.1',
    'summary': 'Manage your stock and logistics activities',
    'description': "",
    'website': 'https://www.odoo.com/page/warehouse',
    'depends': ['product', 'barcodes'],
    'category': 'Operations/Inventory',
    'sequence': 13,
    'demo': [
        'data/stock_demo_pre.xml',
        'data/procurement_demo.xml',
        'data/stock_demo.xml',
        'data/stock_orderpoint_demo.xml',
        'data/stock_demo2.xml',
        'data/stock_location_demo_cpu1.xml',
        'data/stock_location_demo_cpu3.xml',
    ],
    'data': [
        'security/stock_security.xml',
        'security/ir.model.access.csv',
        'views/stock_menu_views.xml',
        'data/stock_traceability_report_data.xml',
        'data/procurement_data.xml',

        'report/report_stock_quantity.xml',
        'report/stock_report_views.xml',
        'report/report_package_barcode.xml',
        'report/report_lot_barcode.xml',
        'report/report_location_barcode.xml',
        'report/report_stockpicking_operations.xml',
        'report/report_deliveryslip.xml',
        'report/report_stockinventory.xml',
        'report/report_stock_rule.xml',
        'report/package_templates.xml',
        'report/picking_templates.xml',
        'report/product_templates.xml',
        'report/product_packaging.xml',
        'data/mail_template_data.xml',

        'wizard/stock_assign_serial_views.xml',
        'wizard/stock_change_product_qty_views.xml',
        'wizard/stock_picking_return_views.xml',
        'wizard/stock_scheduler_compute_views.xml',
        'wizard/stock_immediate_transfer_views.xml',
        'wizard/stock_backorder_confirmation_views.xml',
        'wizard/stock_overprocessed_transfer_views.xml',
        'wizard/stock_quantity_history.xml',
        'wizard/stock_rules_report_views.xml',
        'wizard/stock_warn_insufficient_qty_views.xml',
        'wizard/product_replenish_views.xml',
        'wizard/stock_track_confirmation_views.xml',
        'wizard/stock_package_destination_views.xml',

        'views/res_partner_views.xml',
        'views/product_strategy_views.xml',
        'views/stock_production_lot_views.xml',
        'views/stock_picking_views.xml',
        'views/stock_scrap_views.xml',
        'views/stock_inventory_views.xml',
        'views/stock_quant_views.xml',
        'views/stock_location_views.xml',
        'views/stock_warehouse_views.xml',
        'views/stock_move_line_views.xml',
        'views/stock_move_views.xml',
        'views/product_views.xml',
        'views/res_config_settings_views.xml',
        'views/report_stock_traceability.xml',
        'views/stock_template.xml',
        'views/stock_rule_views.xml',
        'views/stock_package_level_views.xml',

        'data/default_barcode_patterns.xml',
        'data/stock_data.xml',
        'data/stock_sequence_data.xml',
    ],
    'qweb': [
        'static/src/xml/inventory_report.xml',
        'static/src/xml/inventory_lines.xml',
        'static/src/xml/stock_traceability_report_backend.xml',
    ],
    'installable': True,
    'application': True,
    'auto_install': False,
    'pre_init_hook': 'pre_init_hook',
    'post_init_hook': '_assign_default_mail_template_picking_id',
    'uninstall_hook': 'uninstall_hook',
    'exclude_from_loc_count': ['__all__'],
}
