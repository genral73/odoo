odoo.define('web.ControlPanelX2Many', function (require) {

    const ControlPanel = require('web.ControlPanel');

    class ControlPanelX2Many extends ControlPanel { }

    ControlPanelX2Many.defaultProps = {};
    ControlPanelX2Many.props = {
        cp_content: { type: Object, optional: 1 },
        pager: Object,
    };
    ControlPanelX2Many.template = 'ControlPanelX2Many';

    return ControlPanelX2Many;
});
