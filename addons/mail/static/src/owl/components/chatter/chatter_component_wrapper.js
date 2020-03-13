odoo.define('mail.component.ChatterComponentWrapper', function (require) {
'use strict';

const { ComponentWrapper } = require('web.OwlCompatibility');
const { tags: { xml } } = owl;

class ChatterComponentWrapper extends ComponentWrapper {}

ChatterComponentWrapper.template = xml`<div>
    <t t-if="props.chatterLocalId">
        <t t-component="Component" t-props="props" t-ref="component"/>
    </t>
</div>`;

return ChatterComponentWrapper;

});
