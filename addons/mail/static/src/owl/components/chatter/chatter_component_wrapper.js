odoo.define('mail.component.ChatterComponentWrapper', function (require) {
'use strict';

const { ComponentWrapper } = require('web.OwlCompatibility');
const { xml } = owl.tags;

class ChatterComponentWrapper extends ComponentWrapper {}

Object.assign(ChatterComponentWrapper, {
    props: {
        chatterLocalId: {
            type: String,
            optional: true,
        },
    },
    template: xml`
        <div>
            <t t-if="props.chatterLocalId">
                <t t-component="Component" t-props="props" t-ref="component"/>
            </t>
        </div>
    `,
});

return ChatterComponentWrapper;

});
