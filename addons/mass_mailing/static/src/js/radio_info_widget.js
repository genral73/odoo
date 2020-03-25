odoo.define('mass_mailing.radio_info', function (require) {
    "use strict";
    
    var relational_fields = require('web.relational_fields');
    var registry = require('web.field_registry');
    var core = require('web.core');
    var _t = core._t;
    
    var FieldRadio = relational_fields.FieldRadio;

    var FieldRadioInfo = FieldRadio.extend({

        /**
         * @override
         */
        _renderEdit: function () {
            this._super.apply(this, arguments);
            var self = this;
            this.$el.find(".o_radio_item").each(function(){
                var dataValue = $(this).find('input').first().attr('data-value');
                var elem = this;
                self.nodeOptions.info_labels.forEach(function(val){
                    if(val[0] === dataValue){
                        $(elem).append('<span class="fa fa-info-circle" title="'+_t(val[1])+'"/>');
                    }
                });

             });
        },
    });

    registry.add('radio_info', FieldRadioInfo);

    return FieldRadioInfo;
});