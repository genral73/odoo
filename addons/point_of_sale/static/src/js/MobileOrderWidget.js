odoo.define('point_of_sale.MobileOrderWidget', function(require) {
    'use strict';

    const { PosComponent } = require('point_of_sale.PosComponent');

    // const { ConfirmDialog } = require('point_of_sale.ConfirmDialog');

    class MobileOrderWidget extends PosComponent {
        constructor() {
            super(...arguments);
            this.pane = this.props.pane;
            this.update();
        }
        get order() {
            return this.env.pos.get_order();
        }
        mounted() {
          this.order.on('change', () => {
              this.update();
              this.render();
          });
          this.order.orderlines.on('change', () => {
              this.update();
              this.render();
          });
        }
        update() {
            const total = this.order ? this.order.get_total_with_tax() : 0;
            const tax = this.order ? total - this.order.get_total_without_tax() : 0;
            this.total = this.env.pos.format_currency(total);
            this.tax = this.env.pos.format_currency(tax);
            this.items_number = this.order ? this.order.orderlines.reduce((items_number,line) => items_number + line.quantity, 0) : 0;
        }
    }

    return { MobileOrderWidget };
});
