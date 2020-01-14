odoo.define('web.ControlPanelWrapper', function (require) {
"use strict";

    const { ComponentWrapper } = require('web.OwlCompatibility');

    class ControlPanelWrapper extends ComponentWrapper {

        constructor() {
            super(...arguments);
            this._extractAdditionnalContent(this.props);
        }

        mounted() {
            this._attachAdditionnalContent();
        }

        patched() {
            this._attachAdditionnalContent();
        }

        //--------------------------------------------------------------------------
        // Public
        //--------------------------------------------------------------------------

        /**
         * @override
         */
        async update(newProps) {
            this._extractAdditionnalContent(newProps);
            return super.update(newProps);
        }

        //--------------------------------------------------------------------------
        // Private
        //--------------------------------------------------------------------------

        /**
         * @private
         */
        _attachAdditionnalContent() {
            const controlPanel = Object.values(this.__owl__.children)[0];
            for (const key in this.additionnalContent) {
                console.log('Coucou Mathieu');
                const target = controlPanel.contentRefs[key].el;
                target.innerHTML = "";
                target.append(...this.additionnalContent[key]);
                delete this.additionnalContent[key];
            }
        }

        /**
         * @private
         * @param {Object} props
         */
        _extractAdditionnalContent(props) {
            this.additionnalContent = {};
            if ('buttons' in props) {
                this.additionnalContent.buttons = props.buttons;
                delete props.buttons;
            }
            if ('searchView' in props) {
                this.additionnalContent.searchView = props.searchView;
                delete props.searchView;
            }
            if ('searchViewButtons' in props) {
                this.additionnalContent.searchViewButtons = props.searchViewButtons;
                delete props.searchViewButtons;
            }
        }
    }

    return ControlPanelWrapper;

});